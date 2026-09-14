// Every internal link goes through url(), so the site also works from a sub-folder —
// e.g. the theme demos at /demo/<theme>/ on the Ananta Newz website. On a normal site the base is "/".
const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');

export const url = (path = '/') => BASE + path.replace(/^\//, '');

/** For values written in the admin panel: "/uploads/logo.png" gets the base, full URLs stay as they are. */
export const asset = (path: string) => (path.startsWith('/') && !path.startsWith('//') ? url(path) : path);
