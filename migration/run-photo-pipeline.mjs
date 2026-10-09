/**
 * Full photo pipeline: for every photo in the ships/tours galleries —
 *   1. Propose SEO filename + alt text (qwen3-coder:30b via Ollama, text-only,
 *      grounded with real entity/section context — no vision, validated too
 *      slow on this hardware).
 *   2. Download the original from WP.
 *   3. Compress to WebP < 200KB via the local webp-batch-app
 *      (http://127.0.0.1:8787 — must be running, see GUIA_PARA_IA.md there).
 *   4. Save to migration/photos/<ships|tours>/<slug>/<section>/<new-name>.webp
 *
 * Writes migration/data/photo-manifest.json — the source of truth for the
 * later Sanity upload step. Folders exist only for human review.
 *
 * Some photos are legitimately reused across multiple ships/tours (~86 of
 * them). The unit of work is the (entityType, entitySlug, section, url)
 * TUPLE, not the URL alone — a shared photo gets one manifest entry (and
 * one file copy) per entity it belongs to, but is only downloaded/named
 * ONCE (cached by URL in-memory for the run).
 *
 * Re-runnable: skips a tuple if its manifest entry already exists.
 *
 * Usage: node migration/run-photo-pipeline.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const webData = path.join(root, '..', 'web', 'src', 'data');
const photosDir = path.join(root, 'photos');
const manifestPath = path.join(root, 'data', 'photo-manifest.json');

const ships = JSON.parse(fs.readFileSync(path.join(webData, 'ships.json'), 'utf8'));
const tours = JSON.parse(fs.readFileSync(path.join(webData, 'tours.json'), 'utf8'));

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const MODEL = 'qwen3-coder:30b';
const WEBP_APP_URL = 'http://127.0.0.1:8787/api/process';

const AMBIGUOUS_PATTERN = /^(IMG_|DSC|WhatsApp-Image|AnyDesk|CIMG|P\d{4,}|PC\d+)/i;
const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const isAmbiguous = (url) => AMBIGUOUS_PATTERN.test(url.split('/').pop() ?? '');
const tupleKey = (e) => `${e.entityType}|${e.entitySlug}|${e.sectionSlug}|${e.url}`;

/* ---- Build the full candidate pool (deduped by exact tuple) ------------- */

const rawPool = [];

for (const ship of ships) {
  for (const tab of ship.galleryTabs ?? []) {
    const section = slugify(tab.label);
    for (const url of tab.images) {
      rawPool.push({ entityType: 'ships', entitySlug: ship.slug, entityName: ship.name, section: tab.label, sectionSlug: section, url });
    }
  }
  for (const act of ship.activities ?? []) {
    if (act.main_image) {
      rawPool.push({ entityType: 'ships', entitySlug: ship.slug, entityName: `${ship.name} — ${act.name}`, section: 'Onboard activity', sectionSlug: 'activities', url: act.main_image });
    }
  }
}
for (const tour of tours) {
  for (const url of tour.gallery ?? []) {
    rawPool.push({ entityType: 'tours', entitySlug: tour.slug, entityName: tour.name, section: 'Gallery', sectionSlug: 'gallery', url });
  }
}

const seenTuple = new Set();
const pool = rawPool.filter((e) => {
  const k = tupleKey(e);
  if (seenTuple.has(k)) return false;
  seenTuple.add(k);
  return true;
});

console.log(`Total unique (entity+section+photo) tuples to process: ${pool.length}`);

/* ---- Resume support (by exact tuple, not just URL) ----------------------- */

let manifest = [];
if (fs.existsSync(manifestPath)) {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}
const doneTuples = new Set(manifest.map((m) => `${m.entityType}|${m.entitySlug}|${m.sectionSlug}|${m.originalUrl}`));

// Reuse cache: URL -> already-processed {filename, alt, flagged, originalKb, finalKb, relativePath}
const byUrl = new Map();
for (const m of manifest) {
  if (!byUrl.has(m.originalUrl)) byUrl.set(m.originalUrl, m);
}

// Filenames already claimed per destination folder (entityType|entitySlug|sectionSlug),
// so two DIFFERENT photos in the same folder never collide and silently overwrite
// each other (this happened before: the naming model can propose the same generic
// name for two different photos of the same ship/section).
const claimedInFolder = new Map();
for (const m of manifest) {
  if (m.error) continue;
  const folderKey = `${m.entityType}|${m.entitySlug}|${m.sectionSlug}`;
  if (!claimedInFolder.has(folderKey)) claimedInFolder.set(folderKey, new Set());
  claimedInFolder.get(folderKey).add(m.filename);
}

function claimUniqueFilename(folderKey, proposed) {
  if (!claimedInFolder.has(folderKey)) claimedInFolder.set(folderKey, new Set());
  const claimed = claimedInFolder.get(folderKey);
  if (!claimed.has(proposed)) {
    claimed.add(proposed);
    return proposed;
  }
  const base = proposed.replace(/\.webp$/, '');
  let n = 2;
  let candidate = `${base}-${n}.webp`;
  while (claimed.has(candidate)) {
    n++;
    candidate = `${base}-${n}.webp`;
  }
  claimed.add(candidate);
  return candidate;
}

/* ---- Naming via local text model ---------------------------------------- */

async function proposeNaming(item) {
  const originalFilename = item.url.split('/').pop();
  const flagged = isAmbiguous(item.url);

  const prompt = flagged
    ? `Context: photo from a Galapagos travel agency (Galápagos & Beyond) related to "${item.entityName}" (${item.section}), touring the Galapagos Islands, Ecuador. Original filename: ${originalFilename} — this filename gives NO useful context (camera/app default name), so make a reasonable generic guess only. Give me ONLY a JSON object with keys "filename" (SEO-friendly kebab-case slug ending .webp) and "alt" (generic but honest alt text under 125 chars, do not overclaim specifics you can't know from a filename alone). No other text, no markdown fences.`
    : `Context: photo of "${item.entityName}" for a Galapagos travel agency (Galápagos & Beyond), an ocean-going boat/tour/activity in the Galapagos Islands, Ecuador — NOT a spaceship even if the name includes a word like "Galaxy". Photo section/category: "${item.section}". Original filename: ${originalFilename}. Give me ONLY a JSON object with keys "filename" (SEO-friendly kebab-case slug ending .webp) and "alt" (descriptive alt text under 125 chars). No other text, no markdown fences.`;

  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      messages: [{ role: 'user', content: prompt }],
      options: { temperature: 0.2, num_predict: 150 },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}`);
  const data = await res.json();
  const text = data?.message?.content ?? '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  let filename = String(parsed.filename || originalFilename).trim();
  if (!filename.endsWith('.webp')) filename = filename.replace(/\.[a-z0-9]+$/i, '') + '.webp';
  return { filename: slugify(filename.replace(/\.webp$/, '')) + '.webp', alt: parsed.alt, flagged };
}

/* ---- Download + compress -------------------------------------------------- */

async function downloadAndCompress(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const originalKb = Math.round(buf.length / 1024);

  const originalName = url.split('/').pop();
  const params = new URLSearchParams({ filename: originalName, width: '1600', targetKb: '200', allowUpscale: '0', format: 'webp' });

  const compressRes = await fetch(`${WEBP_APP_URL}?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: buf,
    signal: AbortSignal.timeout(60000),
  });
  if (!compressRes.ok) throw new Error(`compress failed ${compressRes.status}`);
  const outBuf = Buffer.from(await compressRes.arrayBuffer());

  return { bytes: outBuf, originalKb, finalKb: Math.round(outBuf.length / 1024) };
}

function saveManifest() {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

/* ---- Main loop ------------------------------------------------------------ */

let processed = 0;
let reused = 0;
let failed = 0;

for (const item of pool) {
  const key = tupleKey(item);
  if (doneTuples.has(key)) continue;

  const label = `${item.entityName} / ${item.section}`;
  const destRelative = `${item.entityType}/${item.entitySlug}/${item.sectionSlug}`;
  const folderKey = `${item.entityType}|${item.entitySlug}|${item.sectionSlug}`;

  try {
    const cached = byUrl.get(item.url);
    let filename, alt, flagged, originalKb, finalKb;

    if (cached) {
      process.stdout.write(`[reuse] ${label}... `);
      filename = claimUniqueFilename(folderKey, cached.filename);
      alt = cached.alt;
      flagged = cached.flagged;
      originalKb = cached.originalKb;
      finalKb = cached.finalKb;
      const sourcePath = path.join(photosDir, cached.relativePath);
      const destPath = path.join(photosDir, destRelative, filename);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(sourcePath, destPath);
      reused++;
      console.log(`OK (reused, ${finalKb}KB)`);
    } else {
      process.stdout.write(`[new] ${label}... `);
      const naming = await proposeNaming(item);
      const compressed = await downloadAndCompress(item.url);
      filename = claimUniqueFilename(folderKey, naming.filename);
      alt = naming.alt;
      flagged = naming.flagged;
      originalKb = compressed.originalKb;
      finalKb = compressed.finalKb;
      const destPath = path.join(photosDir, destRelative, filename);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, compressed.bytes);
      processed++;
      console.log(`OK (${originalKb}KB -> ${finalKb}KB)${flagged ? ' [FLAGGED]' : ''}`);
      // Gentle pacing so bursty downloads don't trip the host's bot/rate-limit
      // protection (this exact traffic pattern got Kevin's IP blocked once).
      await new Promise((r) => setTimeout(r, 1500));
    }

    const entry = {
      entityType: item.entityType,
      entitySlug: item.entitySlug,
      entityName: item.entityName,
      section: item.section,
      sectionSlug: item.sectionSlug,
      originalUrl: item.url,
      originalFilename: item.url.split('/').pop(),
      filename,
      relativePath: `${destRelative}/${filename}`,
      alt,
      flagged,
      originalKb,
      finalKb,
    };
    manifest.push(entry);
    doneTuples.add(key);
    if (!byUrl.has(item.url)) byUrl.set(item.url, entry);
    saveManifest();
  } catch (err) {
    failed++;
    console.log(`FAILED: ${err.message || err}`);
    manifest.push({ ...item, error: String(err.message || err) });
    doneTuples.add(key);
    saveManifest();
  }
}

console.log(`\nDone. New: ${processed}, Reused: ${reused}, Failed: ${failed}, Total in manifest: ${manifest.length} / ${pool.length} tuples`);
