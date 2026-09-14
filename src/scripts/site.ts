// Tiny progressive enhancements shared by every theme. The site works fully without JavaScript.
import { url } from '../lib/url';

// Offline reading + installable app — on the live site only. On a local preview, a stopped server would
// otherwise show the "offline" page, and cached files could hide fresh changes; there we remove it instead.
const isLocalHost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD && !isLocalHost) {
    addEventListener('load', () => navigator.serviceWorker.register(url('sw.js')).catch(() => {}));
  } else {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => registrations.forEach((r) => r.unregister()))
      .catch(() => {});
  }
}

const root = document.documentElement;
const locale = root.dataset.locale || 'en-US';
const timeZone = root.dataset.tz || undefined;

/* ---------------------------------------------------------------- theme */
const prefersDark = matchMedia('(prefers-color-scheme: dark)');
const currentTheme = () => root.dataset.theme ?? (prefersDark.matches ? 'dark' : 'light');
document.querySelectorAll('[data-theme-toggle]').forEach((btn) =>
  btn.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {}
  }),
);

/* ------------------------------------------------------- date & header */
document.querySelectorAll<HTMLElement>('[data-today]').forEach((el) => {
  el.textContent = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(new Date());
});

const sentinel = document.querySelector('.nav-sentinel');
const stickyNav = document.querySelector('[data-sticky]');
if (sentinel && stickyNav) {
  new IntersectionObserver(([entry]) => stickyNav.classList.toggle('is-stuck', !entry.isIntersecting)).observe(sentinel);
}

// Keep the active section visible in horizontally-scrolling menus.
document
  .querySelectorAll('[data-scroll-active] [aria-current="page"]')
  .forEach((el) => el.scrollIntoView({ block: 'nearest', inline: 'center' }));

/* --------------------------------------------------- slide-out menu */
const drawer = document.querySelector<HTMLDialogElement>('dialog[data-drawer]');
if (drawer) {
  document.querySelectorAll('[data-drawer-open]').forEach((btn) => btn.addEventListener('click', () => drawer.showModal()));
  drawer.querySelectorAll('[data-drawer-close]').forEach((btn) => btn.addEventListener('click', () => drawer.close()));
  // Clicking the dimmed backdrop closes the menu.
  drawer.addEventListener('click', (e) => {
    if (e.target === drawer) drawer.close();
  });
}

/* ---------------------------------------------------------------- tabs */
document.querySelectorAll<HTMLElement>('[data-tabs]').forEach((group) => {
  const tabs = [...group.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const select = (tab: HTMLButtonElement) => {
    for (const other of tabs) {
      const on = other === tab;
      other.setAttribute('aria-selected', String(on));
      other.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(other.getAttribute('aria-controls') ?? '');
      if (panel) panel.hidden = !on;
    }
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      const next = tabs[(i + step + tabs.length) % tabs.length];
      select(next);
      next.focus();
    });
  });
});

/* ------------------------------------------------------ quote of the day */
document.querySelectorAll<HTMLElement>('[data-quotes]').forEach((el) => {
  try {
    const quotes: string[] = JSON.parse(el.dataset.quotes ?? '[]');
    const day = Math.floor(Date.now() / 86_400_000);
    const text = el.querySelector('[data-quote-text]');
    if (quotes.length && text) text.textContent = quotes[day % quotes.length];
  } catch {}
});

/* ------------------------------------------------------ relative times */
const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
document.querySelectorAll<HTMLTimeElement>('time[data-rel]').forEach((el) => {
  const seconds = (Date.now() - Date.parse(el.dateTime)) / 1000;
  if (!(seconds >= 0 && seconds < 172_800)) return;
  el.title = el.textContent ?? '';
  if (seconds < 60) el.textContent = rtf.format(0, 'second');
  else if (seconds < 3600) el.textContent = rtf.format(-Math.floor(seconds / 60), 'minute');
  else if (seconds < 86_400) el.textContent = rtf.format(-Math.floor(seconds / 3600), 'hour');
  else el.textContent = rtf.format(-1, 'day');
});

/* ------------------------------------------------------------ YouTube */
const PLAY_ICON = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>';

function parseYouTubeId(input = ''): string | undefined {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.endsWith('youtu.be')) return u.pathname.slice(1, 12);
    return u.searchParams.get('v')?.slice(0, 11) ?? u.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/)?.[1];
  } catch {
    return;
  }
}

// Videos inserted inside a story body from the admin panel.
document.querySelectorAll<HTMLElement>('.yt-embed[data-yt]').forEach((el) => {
  const id = parseYouTubeId(el.dataset.yt);
  if (!id) return el.remove();
  const box = document.createElement('div');
  box.className = 'yt';
  box.dataset.yt = id;
  box.innerHTML = `<button type="button" class="yt__btn" aria-label="Play video"><div class="media" style="aspect-ratio:16 / 9"><img src="https://i.ytimg.com/vi/${id}/maxresdefault.jpg" data-yt-thumb="${id}" alt="" loading="lazy" decoding="async"></div><span class="yt__play" aria-hidden="true">${PLAY_ICON}</span></button>`;
  el.replaceWith(box);
});

// Not every video has a max-resolution thumbnail; YouTube then serves a 120px grey placeholder.
document.querySelectorAll<HTMLImageElement>('img[data-yt-thumb]').forEach((img) => {
  const fallback = () => {
    const hq = `https://i.ytimg.com/vi/${img.dataset.ytThumb}/hqdefault.jpg`;
    if (img.src !== hq) img.src = hq;
  };
  const check = () => img.naturalWidth > 0 && img.naturalWidth <= 120 && fallback();
  if (img.complete) check();
  else img.addEventListener('load', check, { once: true });
  img.addEventListener('error', fallback, { once: true });
});

let warmed = false;
document.addEventListener('pointerover', (e) => {
  if (warmed || !(e.target as Element).closest?.('.yt')) return;
  warmed = true;
  for (const href of ['https://www.youtube-nocookie.com', 'https://www.google.com', 'https://static.doubleclick.net']) {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    document.head.append(link);
  }
});

document.addEventListener('click', (e) => {
  const box = (e.target as Element).closest?.('.yt__btn')?.closest<HTMLElement>('.yt');
  if (!box?.dataset.yt) return;
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(box.dataset.yt)}?autoplay=1&rel=0&playsinline=1`;
  iframe.title = box.dataset.title || 'YouTube video player';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  box.replaceChildren(iframe);
  box.classList.add('is-playing');
});

/* -------------------------------------------------------------- share */
document.querySelectorAll<HTMLButtonElement>('[data-native-share]').forEach((btn) => {
  if (!navigator.share) return;
  btn.hidden = false;
  btn.addEventListener('click', () => navigator.share({ url: btn.dataset.url, title: btn.dataset.title }).catch(() => {}));
});

document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) =>
  btn.addEventListener('click', async () => {
    const toast = btn.querySelector('.share__toast');
    try {
      await navigator.clipboard.writeText(btn.dataset.copy ?? location.href);
      if (toast) toast.textContent = btn.dataset.msgOk ?? 'Copied';
    } catch {
      if (toast) toast.textContent = btn.dataset.msgFail ?? 'Copy failed';
    }
    btn.classList.add('is-copied');
    setTimeout(() => {
      btn.classList.remove('is-copied');
      if (toast) toast.textContent = '';
    }, 1800);
  }),
);

/* --------------------------------------------------------- web stories */
// Tapping a web story card opens it on top of the page in Google's AMP story player, which has a
// close (✕) button. Back, Escape or a click outside the story also close it. If the player can't
// load, the link simply opens the story page as before.
type StoryPlayerClass = new (win: Window, el: HTMLElement) => { load(): void };

let storyScript: Promise<void> | undefined;
let storyViewer: HTMLElement | undefined;
let storyHistory = false;

function loadStoryPlayer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as unknown as { AmpStoryPlayer?: StoryPlayerClass }).AmpStoryPlayer) return resolve();
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdn.ampproject.org/amp-story-player-v0.css';
    const js = document.createElement('script');
    js.src = 'https://cdn.ampproject.org/amp-story-player-v0.js';
    js.onload = () => resolve();
    js.onerror = () => reject(new Error('Story player failed to load'));
    document.head.append(css, js);
  });
}

async function openStory(url: string) {
  try {
    storyScript ??= loadStoryPlayer();
    await Promise.race([storyScript, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))]);
  } catch {
    location.href = url;
    return;
  }
  storyViewer?.remove();

  const el = document.createElement('amp-story-player');
  const config = document.createElement('script');
  config.type = 'application/json';
  config.textContent = JSON.stringify({ controls: [{ name: 'close', position: 'start' }, { name: 'skip-to-next' }] });
  el.append(config);
  // The tapped story plays first; the page's other stories follow, so readers can swipe on to the next one.
  const cards = [...new Map([...document.querySelectorAll<HTMLAnchorElement>('a.ws-card')].map((a) => [a.href, a])).values()];
  const start = Math.max(0, cards.findIndex((a) => a.href === url));
  for (const card of [...cards.slice(start), ...cards.slice(0, start)]) {
    const link = document.createElement('a');
    link.setAttribute('href', card.href);
    link.textContent = card.textContent?.trim() ?? '';
    el.append(link);
  }

  storyViewer = document.createElement('div');
  storyViewer.className = 'ws-viewer';
  storyViewer.setAttribute('role', 'dialog');
  storyViewer.setAttribute('aria-modal', 'true');
  storyViewer.append(el);
  storyViewer.addEventListener('click', (e) => {
    if (e.target === storyViewer) closeStory();
  });
  el.addEventListener('amp-story-player-close', () => closeStory());
  document.body.append(storyViewer);

  const Player = (window as unknown as { AmpStoryPlayer: StoryPlayerClass }).AmpStoryPlayer;
  new Player(window, el).load();
  root.style.overflow = 'hidden';
  history.pushState({ webStory: true }, '');
  storyHistory = true;
}

function closeStory(fromBackButton = false) {
  if (!storyViewer) return;
  // Removing the player also stops the story and its audio.
  storyViewer.remove();
  storyViewer = undefined;
  root.style.overflow = '';
  if (storyHistory && !fromBackButton) history.back();
  storyHistory = false;
}

document.addEventListener('click', (e) => {
  const card = (e.target as Element).closest?.<HTMLAnchorElement>('a.ws-card');
  if (!card || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  openStory(card.href);
});
addEventListener('popstate', () => closeStory(true));
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeStory();
});

/* ------------------------------------------------------ "/" to search */
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
  if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return;
  const box = document.querySelector<HTMLInputElement>('.pagefind-ui__search-input, [data-search-input]');
  e.preventDefault();
  if (box) box.focus();
  else location.href = url('search/');
});
