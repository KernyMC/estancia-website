/**
 * Transforms the raw WP extraction (migration/data/*.json) into the clean
 * shapes the Astro site consumes (web/src/data/*.json).
 *
 * Re-runnable: safe to execute again after re-extracting from WP.
 * Later, the same clean shapes are what gets uploaded to Sanity — the site's
 * data-access layer (web/src/lib/content.ts) is the only seam that changes.
 *
 * Usage: node migration/transform-to-web.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, 'data');
const outDir = path.join(root, '..', 'web', 'src', 'data');

fs.mkdirSync(outDir, { recursive: true });

const read = (f) => JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
const write = (f, obj) => {
  fs.writeFileSync(path.join(outDir, f), JSON.stringify(obj, null, 2));
  console.log(`wrote web/src/data/${f}`);
};

const lines = (s) =>
  (s || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

/* ---------------------------------------------------------------- ships -- */

const rawShips = read('ships.json');

const ships = rawShips.map((s) => {
  const galleryTabs = (s.gallery_tabs || []).map((t) => ({
    label: t.label,
    images: t.images || [],
  }));
  const allImages = galleryTabs.flatMap((t) => t.images);

  return {
    slug: s.slug,
    name: s.title,
    apiShipId: s.api_ship_id,
    apiName: s.ship_const?.name || s.title,
    boatType: s.boat_type,
    category: s.ship_const?.category || '',
    brandColor: s.ship_const?.color || '',
    description: s.description,
    highlights: lines(s.highlight),
    include: lines(s.include),
    exclude: lines(s.exclude),
    faq: (s.faq || []).map((f) => ({ question: f.title, answer: f.desc })),
    activities: s.activities || [],
    itineraryRoutes: s.itinerary_routes || [],
    galleryTabs,
    heroImage: allImages[0] || s.thumbnail,
    thumbnail: s.thumbnail || allImages[0],
    seo: {
      title: s.seo_title,
      description: s.seo_description,
      focusKeyword: s.seo_focus_keyword,
    },
  };
});

write('ships.json', ships);

/* ---------------------------------------------------------------- tours -- */

const rawTours = read('tours.json');
const galleries = fs.existsSync(path.join(dataDir, 'tour-galleries.json')) ? read('tour-galleries.json') : {};

const isLegacyCruise = (t) => (t.tour_types || []).includes('Cruises');

const categorize = (t) => {
  const types = t.tour_types || [];
  if (types.some((x) => /diving/i.test(x))) return 'diving';
  const days = parseInt(String(t.duration_day || '').match(/\d+/)?.[0] || '1', 10);
  return days > 1 ? 'multi-day' : 'day-tours';
};

const skipped = [];
const bySlugTitle = new Map();

for (const t of rawTours) {
  if (isLegacyCruise(t)) {
    skipped.push({ wp_id: t.wp_id, title: t.title, reason: 'legacy cruise post (ships replace these)' });
    continue;
  }
  const key = t.title.trim().toLowerCase();
  const existing = bySlugTitle.get(key);
  if (existing) {
    const keep = t.wp_id > existing.wp_id ? t : existing;
    const drop = t.wp_id > existing.wp_id ? existing : t;
    skipped.push({ wp_id: drop.wp_id, title: drop.title, reason: `duplicate of wp_id ${keep.wp_id}` });
    bySlugTitle.set(key, keep);
  } else {
    bySlugTitle.set(key, t);
  }
}

const tours = [...bySlugTitle.values()].map((t) => ({
  slug: t.slug,
  name: t.title,
  category: categorize(t),
  tourTypes: t.tour_types,
  durationDays: parseInt(String(t.duration_day || '').match(/\d+/)?.[0] || '1', 10),
  price: parseFloat(t.adult_price) || null,
  childPrice: parseFloat(t.child_price) || null,
  description: t.description,
  excerpt: t.excerpt,
  highlights: lines(t.highlight),
  include: lines(t.include),
  exclude: lines(t.exclude),
  address: t.address,
  thumbnail: t.thumbnail,
  gallery: galleries[String(t.wp_id)] || [],
  seo: { title: t.seo_title, description: t.seo_description },
}));

write('tours.json', tours);

/* --------------------------------------------------------- availability -- */

const availability = read('availability-snapshot.json');
write('availability.json', availability);

/* -------------------------------------------------------------- summary -- */

console.log(`\nships: ${ships.length}`);
console.log(`tours: ${tours.length} (day-tours: ${tours.filter((t) => t.category === 'day-tours').length}, multi-day: ${tours.filter((t) => t.category === 'multi-day').length}, diving: ${tours.filter((t) => t.category === 'diving').length})`);
console.log(`skipped: ${skipped.length}`);
for (const s of skipped) console.log(`  - [${s.wp_id}] ${s.title} — ${s.reason}`);
