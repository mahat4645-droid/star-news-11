import type { APIRoute, GetStaticPaths } from 'astro';
import { getImage } from 'astro:assets';
import { brandColor, formatDate, getWebStories, resolveImage, settings, webStoryUrl, type WebStory } from '../../../lib/content';
import { lang, t } from '../../../lib/i18n';
import { url } from '../../../lib/url';

// Web Stories are published in Google's AMP story format so they can appear in Google Discover.
// This is an endpoint rather than an .astro page so that no site scripts are added — AMP pages must stay script-free.

export const getStaticPaths = (async () =>
  (await getWebStories()).map((story) => ({ params: { slug: story.id }, props: { story } }))) satisfies GetStaticPaths;

type Img = { src: string; width: number; height: number };

const esc = (s = '') =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

async function portrait(story: WebStory, value: string | undefined, width: number): Promise<Img | undefined> {
  const image = resolveImage(value, story.filePath);
  if (!image) return;
  if (image.kind === 'url') return { src: image.src, width: 720, height: 1280 };
  const out = await getImage({ src: image.src, width: Math.min(width, image.src.width), format: 'webp', quality: 72 });
  return { src: out.src, width: Number(out.attributes.width), height: Number(out.attributes.height) };
}

const BOILERPLATE =
  '<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>';

export const GET: APIRoute = async ({ props, site }) => {
  const story = props.story as WebStory;
  const { data } = story;
  const abs = (path: string) => new URL(path, site).href;
  const canonical = abs(webStoryUrl(story));
  const accent = brandColor ?? '#d21f26';
  const poster = await portrait(story, data.cover ?? data.slides[0]?.image, 640);
  const slides = await Promise.all(data.slides.map(async (s) => ({ ...s, img: await portrait(story, s.image, 720) })));

  // Root-relative so slides load on any domain (preview, pages.dev, custom domain).
  const picture = (img?: Img) =>
    img ? `<amp-img src="${esc(img.src)}" width="${img.width}" height="${img.height}" layout="responsive" alt=""></amp-img>` : '';
  const outlink = data.link
    ? `<amp-story-page-outlink layout="nodisplay"><a href="${esc(abs(data.link.startsWith('/') ? url(data.link) : data.link))}">${esc(t('readFull'))}</a></amp-story-page-outlink>`
    : '';

  const pages = [
    `<amp-story-page id="cover" auto-advance-after="6s">
  <amp-story-grid-layer template="fill">${picture(poster)}</amp-story-grid-layer>
  <amp-story-grid-layer template="vertical" class="shade">
    <div class="brand"><span class="mark">${esc([...settings.site_title][0] ?? '')}</span>${esc(settings.site_title)}</div>
    <h1 animate-in="fly-in-bottom">${esc(data.title)}</h1>
    <p class="date">${esc(formatDate(data.date))}</p>
  </amp-story-grid-layer>
</amp-story-page>`,
    ...slides.map(
      (s, i) => `<amp-story-page id="p${i + 1}" auto-advance-after="7s">
  <amp-story-grid-layer template="fill">${picture(s.img)}</amp-story-grid-layer>
  <amp-story-grid-layer template="vertical" class="shade">
    <span class="bar"></span>
    ${s.heading ? `<h2 animate-in="fly-in-bottom">${esc(s.heading)}</h2>` : ''}
    ${s.text ? `<p animate-in="fade-in" animate-in-delay="0.3s">${esc(s.text)}</p>` : ''}
    ${s.credit ? `<small class="credit">${esc(s.credit)}</small>` : ''}
  </amp-story-grid-layer>
  ${i === slides.length - 1 ? outlink : ''}
</amp-story-page>`,
    ),
  ];

  const css = `
amp-story{font-family:'Noto Sans Devanagari',Mukta,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#fff}
.shade{align-content:end;padding:32px 22px 72px;background:linear-gradient(180deg,rgba(0,0,0,0) 38%,rgba(0,0,0,.55) 62%,rgba(0,0,0,.9) 100%)}
.brand{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:800}
.mark{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;background:${accent};font-size:17px}
h1{margin:14px 0 8px;font-size:29px;line-height:1.4;font-weight:800}
h2{margin:10px 0 8px;font-size:25px;line-height:1.4;font-weight:800}
p{margin:0;font-size:17px;line-height:1.65;font-weight:500}
.date{font-size:13px;opacity:.8}
.bar{display:block;width:44px;height:4px;border-radius:2px;background:${accent}}
.credit{display:block;margin-top:14px;font-size:11px;opacity:.7}`;

  const html = `<!doctype html>
<html amp lang="${lang}">
<head>
<meta charset="utf-8">
<title>${esc(data.title)} | ${esc(settings.site_title)}</title>
<link rel="canonical" href="${esc(canonical)}">
<meta name="viewport" content="width=device-width">
<meta name="description" content="${esc(data.slides[0]?.text ?? data.title)}">
<meta property="og:title" content="${esc(data.title)}">
<meta property="og:type" content="article">
${poster ? `<meta property="og:image" content="${esc(abs(poster.src))}">` : ''}
<link rel="icon" href="${url('favicon.svg')}">
<script async src="https://cdn.ampproject.org/v0.js"></script>
<script async custom-element="amp-story" src="https://cdn.ampproject.org/v0/amp-story-1.0.js"></script>
${BOILERPLATE}
<style amp-custom>${css}</style>
</head>
<body>
<amp-story standalone title="${esc(data.title)}" publisher="${esc(settings.site_title)}" publisher-logo-src="${esc(abs(url('icons/icon-192.png')))}" poster-portrait-src="${esc(poster ? abs(poster.src) : abs(url('icons/icon-512.png')))}">
${pages.join('\n')}
</amp-story>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
