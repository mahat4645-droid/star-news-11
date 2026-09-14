// Deletes stories and web stories older than the limit set in the admin panel
// (Settings → "पुरानी खबरें अपने-आप हटाएं", saved as auto_delete_days in src/data/settings.json).
// 0 or empty = keep everything. The newest stories are always kept, so the site is never left empty.
//
// On a client site this runs by itself on GitHub (.github/workflows/auto-delete-old-stories.yml):
// every night, and whenever a story is published. Deleted stories stay in the GitHub history.
//
//   node scripts/cleanup-old-stories.mjs            delete
//   node scripts/cleanup-old-stories.mjs --dry-run  only list what would be deleted
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const dryRun = process.argv.includes('--dry-run');
const settings = JSON.parse(readFileSync(join(ROOT, 'src/data/settings.json'), 'utf8'));
const days = Number(settings.auto_delete_days) || 0;

if (days <= 0) {
  console.log('Auto-delete is off (auto_delete_days is 0).');
  process.exit(0);
}

const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

/** Story folders with their date, newest first. Folders without a readable date are never touched. */
function stories(dir) {
  const base = join(ROOT, dir);
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(base, e.name, 'index.md')))
    .map((e) => {
      const front = readFileSync(join(base, e.name, 'index.md'), 'utf8').match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
      const raw = front.match(/^date:\s*['"]?([^'"\n]+)['"]?\s*$/m)?.[1];
      return { folder: join(base, e.name), name: e.name, date: raw ? Date.parse(raw) : NaN };
    })
    .filter((s) => !Number.isNaN(s.date))
    .sort((a, b) => b.date - a.date);
}

let deleted = 0;
for (const [dir, keepAtLeast] of [
  ['src/content/articles', 20],
  ['src/content/webstories', 5],
]) {
  const list = stories(dir);
  for (const story of list.slice(keepAtLeast)) {
    if (story.date >= cutoff) continue;
    console.log(`${dryRun ? 'Would delete' : 'Deleted'}: ${dir}/${story.name} (${new Date(story.date).toISOString().slice(0, 10)})`);
    if (!dryRun) rmSync(story.folder, { recursive: true, force: true });
    deleted++;
  }
}
console.log(deleted ? `${deleted} old stor${deleted === 1 ? 'y' : 'ies'} older than ${days} days.` : `Nothing older than ${days} days.`);
