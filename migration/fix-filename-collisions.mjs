/**
 * One-off repair: the naming model sometimes proposed the same generic
 * filename for two DIFFERENT photos in the same ship/tour folder (e.g. 9
 * different cabin photos all named "bonita-yacht-galapagos-cabin-interior
 * .webp"). Since writes happened in manifest order, only the LAST entry in
 * each colliding group has its real bytes on disk — earlier entries in the
 * group point to someone else's photo.
 *
 * This keeps only that verified-correct survivor per group and removes the
 * rest from the manifest, so the (now collision-safe, see
 * run-photo-pipeline.mjs's claimUniqueFilename) pipeline reprocesses them
 * properly with guaranteed-unique names.
 *
 * Usage: node migration/fix-filename-collisions.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(root, 'data', 'photo-manifest.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const byPath = new Map();
manifest.forEach((item, idx) => {
  if (item.error) return;
  if (!byPath.has(item.relativePath)) byPath.set(item.relativePath, []);
  byPath.get(item.relativePath).push(idx);
});

const toRemove = new Set();
let groupsFixed = 0;
for (const [relPath, idxs] of byPath) {
  if (idxs.length <= 1) continue;
  groupsFixed++;
  // Keep only the LAST index (its write survived on disk); drop the rest.
  const keep = idxs[idxs.length - 1];
  for (const i of idxs) {
    if (i !== keep) toRemove.add(i);
  }
}

const cleaned = manifest.filter((_, idx) => !toRemove.has(idx));

console.log(`Colliding groups: ${groupsFixed}`);
console.log(`Removed (corrupted) entries: ${toRemove.size}`);
console.log(`Manifest: ${manifest.length} -> ${cleaned.length}`);

fs.writeFileSync(manifestPath, JSON.stringify(cleaned, null, 2));
console.log('Wrote cleaned manifest. Re-run migration/run-photo-pipeline.mjs to reprocess the removed tuples with unique filenames.');
