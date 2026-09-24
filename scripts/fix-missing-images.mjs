// Runs before every build. Drops references to photos that are not in the story folder.
//
// Why: if the admin panel saves a story whose photo failed to upload, Astro stops the whole build
// ("Could not find requested image"), so the site freezes — no story published after that one ever
// appears, and the owner has no way of knowing why. One story losing a photo must not take the
// whole site down, so the broken reference is removed and the build carries on.
//
// Nothing is lost: the file it points at does not exist. The change happens in the build only
// (the repository is untouched unless you run a build locally), and every fix is printed.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const isLocal = (src) => src && !/^(https?:)?\/\//.test(src) && !src.startsWith('/') && !src.startsWith('data:');

/** Stories and web stories: each is a folder with index.md and its photos. */
function* entries() {
  for (const collection of ['articles', 'webstories']) {
    const base = join(ROOT, 'src/content', collection);
    if (!existsSync(base)) continue;
    for (const name of readdirSync(base)) {
      const dir = join(base, name);
      const file = join(dir, 'index.md');
      if (statSync(dir).isDirectory() && existsSync(file)) yield { dir, file, name };
    }
  }
}

let fixes = 0;

for (const { dir, file, name } of entries()) {
  const original = readFileSync(file, 'utf8');
  const missing = (src) => isLocal(src) && !existsSync(join(dir, src.split('#')[0].split('?')[0]));
  let text = original;

  // ![caption](photo.webp) inside the story text
  text = text.replace(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)\n?/g, (whole, src) => {
    if (!missing(src)) return whole;
    console.warn(`  ${name}: photo "${src}" is missing — removed from the story text`);
    fixes++;
    return '';
  });

  // cover: photo.webp  /  image: photo.webp (inside the "photos" list)
  text = text.replace(/^(\s*)(cover|image):\s*(['"]?)([^\n'"]+)\3\s*$/gm, (whole, indent, key, quote, src) => {
    if (!missing(src)) return whole;
    console.warn(`  ${name}: ${key} "${src}" is missing — left empty`);
    fixes++;
    return `${indent}${key}: ''`;
  });

  if (text !== original) writeFileSync(file, text);
}

if (fixes) console.warn(`\n${fixes} missing photo${fixes > 1 ? 's' : ''} skipped so the site can still be built.\n`);
