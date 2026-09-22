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

/* --------------------------------------------- Facebook & Instagram posts */
// Added inside a story with the admin panel's "Facebook वीडियो / पोस्ट" and "Instagram पोस्ट / रील" blocks.
function socialFrame(src: string, title: string): HTMLIFrameElement {
  const frame = document.createElement('iframe');
  frame.src = src;
  frame.title = title;
  frame.loading = 'lazy';
  frame.allow = 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share';
  frame.allowFullscreen = true;
  return frame;
}
document.querySelectorAll<HTMLElement>('.fb-embed[data-url]').forEach((el) => {
  let link: URL;
  try {
    link = new URL((el.dataset.url ?? '').trim());
  } catch {
    return el.remove();
  }
  if (!/(^|\.)(facebook\.com|fb\.watch)$/.test(link.hostname)) return el.remove();
  // Share links (facebook.com/share/…) cannot be embedded, and only the build can resolve them
  // (Facebook sends no CORS headers). Inside a story body, show a button to Facebook instead.
  if (link.pathname.startsWith('/share/')) {
    const a = document.createElement('a');
    a.href = link.href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.className = 'fb-embed__link';
    a.textContent = el.dataset.label ?? 'Facebook पर वीडियो देखें';
    el.classList.add('fb-embed--link');
    el.replaceChildren(a);
    return;
  }
  const video = link.hostname.endsWith('fb.watch') || link.searchParams.has('v') || /\/(videos?|watch|reel|share\/v|share\/r)(\/|$)/.test(link.pathname);
  el.classList.add(video ? 'fb-embed--video' : 'fb-embed--post');
  el.replaceChildren(
    socialFrame(`https://www.facebook.com/plugins/${video ? 'video' : 'post'}.php?href=${encodeURIComponent(link.href)}&show_text=${video ? 'false' : 'true'}`, 'Facebook'),
  );
});
document.querySelectorAll<HTMLElement>('.ig-embed[data-url]').forEach((el) => {
  const match = (el.dataset.url ?? '').match(/instagram\.com\/(?:[\w.]+\/)?(p|reels?|tv)\/([\w-]+)/);
  if (!match) return el.remove();
  const kind = match[1].startsWith('reel') ? 'reel' : match[1];
  el.replaceChildren(socialFrame(`https://www.instagram.com/${kind}/${match[2]}/embed/captioned/`, 'Instagram'));
});

/* ------------------------------------------------------ install as an app */
// Android and desktop Chrome/Edge: the browser's own install prompt. iPhone/iPad: Safari has no install
// button, so the bar explains "Share → Add to Home Screen". Hidden once installed, or for a week when closed.
type InstallPrompt = Event & { prompt(): Promise<void> };
const installBar = document.querySelector<HTMLElement>('[data-install-bar]');
const installTriggers = document.querySelectorAll<HTMLElement>('[data-install-trigger]');
const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let installPrompt: InstallPrompt | undefined;

const installDismissed = () => {
  try {
    return Number(localStorage.getItem('install-dismissed')) > Date.now();
  } catch {
    return false;
  }
};
function showInstall(mode: 'prompt' | 'ios' | 'help', force = false) {
  if (!installBar || standalone || (!force && installDismissed())) return;
  installBar.dataset.mode = mode;
  installBar.hidden = false;
}
const hideInstall = () => {
  if (installBar) installBar.hidden = true;
};

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e as InstallPrompt;
  installTriggers.forEach((b) => (b.hidden = false));
  setTimeout(() => showInstall('prompt'), 3000);
});
addEventListener('appinstalled', () => {
  installPrompt = undefined;
  hideInstall();
  installTriggers.forEach((b) => (b.hidden = true));
});
if (ios && !standalone) {
  installTriggers.forEach((b) => (b.hidden = false));
  // A real install button (if the browser offers one) always wins over the iPhone steps.
  setTimeout(() => !installPrompt && showInstall('ios'), 5000);
}

document.addEventListener('click', async (e) => {
  const target = e.target as Element;
  if (target.closest?.('[data-install-close]')) {
    hideInstall();
    try {
      localStorage.setItem('install-dismissed', String(Date.now() + 7 * 86_400_000));
    } catch {}
    return;
  }
  if (!target.closest?.('[data-install-go], [data-install-trigger]')) return;
  drawer?.close();
  if (installPrompt) {
    hideInstall();
    await installPrompt.prompt().catch(() => {});
    installPrompt = undefined;
  } else showInstall(ios ? 'ios' : 'help', true);
});

/* ------------------------------------------------------- copy protection */
// Settings → खबर कॉपी होने से रोकें. The CSS in base.css stops selection; this stops the rest.
// It only makes casual copying harder — the page source and screenshots are still there.
if (document.documentElement.hasAttribute('data-protect')) {
  const editable = (el: EventTarget | null) => !!(el as Element)?.closest?.('input, textarea, select, [contenteditable]');
  for (const type of ['contextmenu', 'copy', 'cut', 'dragstart', 'selectstart'] as const) {
    document.addEventListener(type, (e) => {
      if (!editable(e.target)) e.preventDefault();
    });
  }
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'a', 'u', 's', 'p'].includes(key) && !editable(e.target)) e.preventDefault();
  });
}

/* ------------------------------------------- live YouTube subscriber count */
// widgets/FollowCard.astro shows the numbers typed in Settings. When a channel and an API key are
// filled in, the live numbers replace them here (in the browser, so they stay fresh without a rebuild).
// The answer is cached for six hours to keep well inside the free API quota.
const followCard = document.querySelector<HTMLElement>('[data-follow][data-yt-channel][data-yt-key]');
if (followCard) {
  const channel = followCard.dataset.ytChannel!;
  const key = followCard.dataset.ytKey!;
  const cacheKey = `yt-stats:${channel}`;
  const compact = (n: string) => Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n));

  const paint = (stats: { subscriberCount?: string; viewCount?: string }) => {
    const subs = followCard.querySelector<HTMLElement>('[data-count="youtube"]');
    const views = followCard.querySelector<HTMLElement>('[data-count="views"]');
    if (subs && stats.subscriberCount) subs.textContent = compact(stats.subscriberCount);
    if (views && stats.viewCount) {
      views.textContent = `${compact(stats.viewCount)} ${views.dataset.label ?? ''}`.trim();
      views.hidden = false;
    }
  };

  const cached = (() => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return;
      const { at, stats } = JSON.parse(raw);
      return Date.now() - at < 6 * 3_600_000 ? stats : undefined;
    } catch {
      return;
    }
  })();

  if (cached) paint(cached);
  else {
    const param = channel.startsWith('UC') ? `id=${encodeURIComponent(channel)}` : `forHandle=${encodeURIComponent(channel.replace(/^@/, ''))}`;
    fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&${param}&key=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        const stats = data?.items?.[0]?.statistics;
        if (!stats) return;
        paint(stats);
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), stats }));
        } catch {}
      })
      .catch(() => {}); // a wrong key or no network: the typed numbers stay on screen
  }
}

/* ------------------------------------------------------------ ad slide show */
// A place whose ads are marked "स्लाइड शो" (Settings → विज्ञापन) shows one ad at a time and
// changes every 5 seconds. Without JavaScript they simply stay stacked, as before.
document.querySelectorAll<HTMLElement>('.ad-slot[data-slide]').forEach((slot) => {
  const slides = [...slot.querySelectorAll<HTMLElement>('.ad')];
  if (slides.length < 2) return;
  let current = 0;
  slides.forEach((ad, i) => ad.classList.toggle('is-on', i === 0));
  const tick = () => {
    slides[current].classList.remove('is-on');
    current = (current + 1) % slides.length;
    slides[current].classList.add('is-on');
  };
  let timer = setInterval(tick, 5000);
  // Pause while the reader is looking at something else, or hovering over the ad.
  slot.addEventListener('mouseenter', () => clearInterval(timer));
  slot.addEventListener('mouseleave', () => (timer = setInterval(tick, 5000)));
  document.addEventListener('visibilitychange', () => {
    clearInterval(timer);
    if (!document.hidden) timer = setInterval(tick, 5000);
  });
});

/* ------------------------------------------------------- subscribe popup */
// Settings → फॉलो करने का पॉपअप. Shown once after a few seconds; closing it (or tapping a channel)
// keeps it away for the number of days set in the admin. Nothing is stored anywhere but the browser.
const popup = document.querySelector<HTMLElement>('[data-subscribe-popup]');
if (popup) {
  const KEY = 'subscribe-popup-until';
  const days = Number(popup.dataset.days ?? 7);
  const delay = Number(popup.dataset.delay ?? 6);
  let snoozed = false;
  try {
    snoozed = Number(localStorage.getItem(KEY) ?? 0) > Date.now();
  } catch {}

  const close = () => {
    popup.classList.remove('is-on');
    setTimeout(() => (popup.hidden = true), 300);
    try {
      localStorage.setItem(KEY, String(Date.now() + days * 86_400_000));
    } catch {}
  };

  if (!snoozed) {
    setTimeout(() => {
      popup.hidden = false;
      requestAnimationFrame(() => popup.classList.add('is-on'));
    }, Math.max(0, delay) * 1000);
  }

  popup.addEventListener('click', (e) => {
    const target = e.target as Element;
    if (target.closest('[data-subscribe-close]') || target === popup) close();
    else if (target.closest('[data-subscribe-go]')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !popup.hidden) close();
  });
}
