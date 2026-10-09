/**
 * One-off cleanup: the pipeline's resume-dedup had a bug (checked m.url
 * instead of m.originalUrl), causing ~81 photos to be reprocessed and 35 of
 * them to land under a second, differently-named file (model naming isn't
 * fully deterministic). This script:
 *   1. Keeps only the FIRST manifest entry per originalUrl.
 *   2. Deletes any file on disk under migration/photos/ that isn't
 *      referenced by the deduplicated manifest (the orphaned re-runs).
 *
 * Usage: node migration/clean-manifest-dupes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const photosDir = path.join(root, 'photos');
const manifestPath = path.join(root, 'data', 'photo-manifest.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const seen = new Set();
const deduped = [];
for (const item of manifest) {
  if (seen.has(item.originalUrl)) continue;
  seen.add(item.originalUrl);
  deduped.push(item);
}

console.log(`Manifest: ${manifest.length} -> ${deduped.length} (removed ${manifest.length - deduped.length} duplicate entries)`);

const keepPaths = new Set(deduped.map((item) => item.relativePath).filter(Boolean));

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const allFiles = fs.existsSync(photosDir) ? walk(photosDir) : [];
let deleted = 0;
for (const file of allFiles) {
  const rel = path.relative(photosDir, file).replace(/\\/g, '/');
  if (!keepPaths.has(rel)) {
    fs.unlinkSync(file);
    deleted++;
  }
}
console.log(`Deleted ${deleted} orphaned files on disk (out of ${allFiles.length} total).`);

fs.writeFileSync(manifestPath, JSON.stringify(deduped, null, 2));
console.log(`Wrote cleaned manifest: ${deduped.length} entries.`);
