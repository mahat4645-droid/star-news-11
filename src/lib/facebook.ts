// Facebook's own share links (facebook.com/share/v/XXXX/) cannot be embedded — the plugin answers
// "Video unavailable". They are short redirects, so at build time we follow the redirect once and
// embed the real address (a /reel/… or /story.php?… URL), which works.
//
// The browser cannot do this itself (Facebook sends no CORS headers), so it happens here, during the
// build, and the answer is remembered for the rest of the build.

const cache = new Map<string, string | undefined>();

const isShareLink = (u: URL) => /(^|\.)facebook\.com$/.test(u.hostname) && u.pathname.startsWith('/share/');

/** A Facebook video, reel or post link. Returns undefined for anything that is not Facebook. */
export function facebookUrl(input?: string | null): string | undefined {
  if (!input) return;
  try {
    const u = new URL(input.trim());
    return /(^|\.)(facebook\.com|fb\.watch|fb\.me)$/.test(u.hostname) ? u.href : undefined;
  } catch {
    return;
  }
}

/** The embeddable address for a Facebook link: share links are resolved, everything else is kept. */
export async function resolveFacebookUrl(input?: string | null): Promise<string | undefined> {
  const href = facebookUrl(input);
  if (!href) return;
  const url = new URL(href);
  if (!isShareLink(url)) return href;
  if (cache.has(href)) return cache.get(href);

  let resolved: string | undefined;
  try {
    const res = await fetch(href, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      signal: AbortSignal.timeout(8000),
    });
    const location = res.headers.get('location');
    if (location) {
      const target = new URL(location, href);
      // Drop Facebook's own share-tracking parameters.
      for (const key of ['rdid', 'share_url', 'mibextid']) target.searchParams.delete(key);
      resolved = facebookUrl(target.href);
    }
  } catch {
    resolved = undefined; // no network during the build, or Facebook said no: fall back to a plain link
  }
  cache.set(href, resolved);
  return resolved;
}

/** True for stories that lead with a video (YouTube or Facebook) — they appear on the Videos page. */
export const hasFacebookVideo = (data: { facebook?: string | null }) => !!facebookUrl(data.facebook);
