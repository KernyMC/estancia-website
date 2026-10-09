/**
 * One-off repair: some photos are legitimately reused across multiple
 * ships/tours (86 shared URLs across 390 needed entity+section+url tuples).
 * An earlier cleanup pass deduped the manifest by URL alone and lost the
 * secondary entity associations. This script restores them WITHOUT
 * re-calling the naming model or re-downloading — it reuses the already
 * -compressed bytes and just copies them into each additional entity's
 * folder, adding the corresponding manifest entry.
 *
 * Usage: node migration/backfill-shared-photos.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const webData = path.join(root, '..', 'web', 'src', 'data');
const photosDir = path.join(root, 'photos');
const manifestPath = path.join(root, 'data', 'photo-manifest.json');

const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const ships = JSON.parse(fs.readFileSync(path.join(webData, 'ships.json'), 'utf8'));
const tours = JSON.parse(fs.readFileSync(path.join(webData, 'tours.json'), 'utf8'));

const pool = [];
for (const ship of ships) {
  for (const tab of ship.galleryTabs ?? []) {
    const section = slugify(tab.label);
    for (const url of tab.images) {
      pool.push({ entityType: 'ships', entitySlug: ship.slug, entityName: ship.name, section: tab.label, sectionSlug: section, url });
    }
  }
  for (const act of ship.activities ?? []) {
    if (act.main_image) {
      pool.push({ entityType: 'ships', entitySlug: ship.slug, entityName: `${ship.name} — ${act.name}`, section: 'Onboard activity', sectionSlug: 'activities', url: act.main_image });
    }
  }
}
for (const tour of tours) {
  for (const url of tour.gallery ?? []) {
    pool.push({ entityType: 'tours', entitySlug: tour.slug, entityName: tour.name, section: 'Gallery', sectionSlug: 'gallery', url });
  }
}

// Dedup the pool itself (the 1 exact duplicate row) by tuple key.
const tupleKey = (e) => `${e.entityType}|${e.entitySlug}|${e.sectionSlug}|${e.url}`;
const seenTuple = new Set();
const uniquePool = pool.filter((e) => {
  const k = tupleKey(e);
  if (seenTuple.has(k)) return false;
  seenTuple.add(k);
  return true;
});

console.log(`Pool: ${pool.length} rows -> ${uniquePool.length} unique tuples`);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const manifestByTuple = new Map(manifest.map((m) => [`${m.entityType}|${m.entitySlug}|${m.sectionSlug}|${m.originalUrl}`, m]));

// Source-of-truth for already-processed photo bytes/naming, keyed by URL.
const byUrl = new Map();
for (const m of manifest) {
  if (!byUrl.has(m.originalUrl)) byUrl.set(m.originalUrl, m);
}

let backfilled = 0;
let stillMissing = 0;

for (const item of uniquePool) {
  const key = tupleKey(item);
  if (manifestByTuple.has(key)) continue; // already has its own correct entry

  const source = byUrl.get(item.url);
  if (!source) {
    stillMissing++; // genuinely never processed — leave for the main pipeline
    continue;
  }

  const destRelative = `${item.entityType}/${item.entitySlug}/${item.sectionSlug}/${source.filename}`;
  const destPath = path.join(photosDir, destRelative);
  const sourcePath = path.join(photosDir, source.relativePath);

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(sourcePath, destPath);

  const newEntry = {
    entityType: item.entityType,
    entitySlug: item.entitySlug,
    entityName: item.entityName,
    section: item.section,
    sectionSlug: item.sectionSlug,
    originalUrl: item.url,
    originalFilename: item.url.split('/').pop(),
    filename: source.filename,
    relativePath: destRelative,
    alt: source.alt,
    flagged: source.flagged,
    originalKb: source.originalKb,
    finalKb: source.finalKb,
    reusedFrom: source.relativePath,
  };
  manifest.push(newEntry);
  manifestByTuple.set(key, newEntry);
  backfilled++;
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Backfilled: ${backfilled} entries (reused existing compressed files, no model/download calls)`);
console.log(`Still genuinely missing (never processed): ${stillMissing}`);
console.log(`Manifest now has ${manifest.length} entries.`);
