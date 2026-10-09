// Convierte el dump de la API REST de WordPress (posts.json) en src/data/posts.json.
// Uso: node scripts/build-posts.mjs <ruta/posts.json> <ruta/cats.json>
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { basename } from 'node:path';

const [, , postsPath, catsPath] = process.argv;
const raw = JSON.parse(readFileSync(postsPath, 'utf8'));
const cats = JSON.parse(readFileSync(catsPath, 'utf8'));
const catById = new Map(cats.map((c) => [c.id, c]));
const webImgs = new Set(readdirSync('public/img/w'));

const decode = (s) =>
  s
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#038;|&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&hellip;|&#8230;/g, '…')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const text = (h) => decode(h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
const slugSet = new Set(raw.map((p) => p.slug));

function cleanHtml(h) {
  return h
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s(class|style|id|data-[a-z-]+|srcset|sizes|loading|decoding|fetchpriority|width|height)="[^"]*"/g, '')
    // enlaces internos a otros posts -> /news/slug/
    .replace(/href="https?:\/\/(?:www\.)?estancia\.com\/([a-z0-9-]+)\/?"/g, (m, s) => {
      if (slugSet.has(s)) return `href="/news/${s}/"`;
      const map = {
        menu: '/menu/', takeout: '/order/', 'group-dining': '/private-dining/', 'gift-card': '/gift-cards/',
        'reserve-your-table': '/reserve/', contact: '/contact/', faq: '/faq/', austin: '/austin/', leander: '/leander/',
        brunch: '/menu/brunch/', bar: '/menu/bar/', 'salad-bar': '/menu/salad-bar/', dessert: '/menu/dessert/',
        sides: '/menu/sides/', 'prime-meat-steakhouse': '/menu/churrasco/', 'weekly-specials': '/specials/',
        'group-dining-leander': '/leander/private-dining/', holidays: '/events/', locations: '/locations/',
      };
      return map[s] ? `href="${map[s]}"` : 'href="/"';
    })
    .replace(/<img[^>]*src="([^"]+)"[^>]*>/g, (m, src) => {
      const f = basename(src).toLowerCase().replace(/-\d+x\d+(?=\.)/, '').replace(/\.[a-z]+$/, '.jpg');
      const alt = (m.match(/alt="([^"]*)"/) || [, ''])[1];
      return webImgs.has(f) ? `<img src="/img/w/${f}" alt="${alt}" loading="lazy">` : '';
    })
    .replace(/<figure>\s*<\/figure>/g, '')
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const posts = raw
  .map((p) => {
    const feat = p._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    const f = feat ? basename(feat).toLowerCase().replace(/\.[a-z]+$/, '.jpg') : null;
    const topics = p.categories.map((id) => catById.get(id)?.slug).filter((s) => s && s !== 'uncategorised');
    const html = cleanHtml(p.content.rendered);
    return {
      slug: p.slug,
      title: text(p.title.rendered),
      date: p.date,
      excerpt: text(p.excerpt.rendered).slice(0, 220),
      topics,
      image: f && webImgs.has(f) ? `/img/w/${f}` : null,
      readMin: Math.max(1, Math.round(text(html).split(' ').length / 200)),
      html,
    };
  })
  .sort((a, b) => b.date.localeCompare(a.date));

writeFileSync('src/data/posts.json', JSON.stringify(posts));
console.log(posts.length, 'posts;', posts.filter((p) => !p.image).length, 'sin imagen');
