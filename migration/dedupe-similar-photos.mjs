/**
 * Detects near-duplicate / burst-shot photos using a perceptual hash
 * (dHash) — no AI model involved, deterministic and fast (uses ffmpeg,
 * already required by webp-batch-app).
 *
 * For each photo already in the manifest: downscale to 9x8 grayscale via
 * ffmpeg, compute a 64-bit difference hash. Group photos (within the same
 * ship/tour) whose hashes differ by <= HAMMING_THRESHOLD bits — these are
 * near-identical burst shots. Keep the FIRST photo in each group, delete
 * the rest (file + manifest entry).
 *
 * Usage: node migration/dedupe-similar-photos.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const root = path.dirname(fileURLToPath(import.meta.url));
const photosDir = path.join(root, 'photos');
const manifestPath = path.join(root, 'data', 'photo-manifest.json');

const HAMMING_THRESHOLD = 6; // out of 64 bits — conservative, catches true near-duplicates
const dryRun = process.argv.includes('--dry-run');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

async function dHash(filePath) {
  const { stdout } = await execFileAsync(
    'ffmpeg',
    ['-i', filePath, '-vf', 'scale=9:8:flags=area,format=gray', '-f', 'rawvideo', '-'],
    { encoding: 'buffer', maxBuffer: 1024 * 1024 }
  );
  const px = stdout; // 9x8 = 72 grayscale bytes
  let bits = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = px[row * 9 + col];
      const right = px[row * 9 + col + 1];
      bits += left < right ? '1' : '0';
    }
  }
  return bits;
}

function hamming(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

console.log(`Hashing ${manifest.filter((m) => !m.error).length} photos...`);
const hashes = [];
for (let i = 0; i < manifest.length; i++) {
  const item = manifest[i];
  if (item.error) continue;
  const filePath = path.join(photosDir, item.relativePath);
  try {
    const hash = await dHash(filePath);
    hashes.push({ index: i, entityType: item.entityType, entitySlug: item.entitySlug, hash, item });
  } catch (err) {
    console.log(`  hash failed for ${item.relativePath}: ${err.message}`);
  }
  if ((i + 1) % 50 === 0) process.stdout.write(`  ...${i + 1}/${manifest.length}\n`);
}

// Group by entity, then find near-duplicate clusters within that entity.
const byEntity = new Map();
for (const h of hashes) {
  const key = `${h.entityType}|${h.entitySlug}`;
  if (!byEntity.has(key)) byEntity.set(key, []);
  byEntity.get(key).push(h);
}

const toRemove = new Set();
const groupsReport = [];

for (const [entityKey, items] of byEntity) {
  const used = new Set();
  for (let i = 0; i < items.length; i++) {
    if (used.has(i)) continue;
    const cluster = [items[i]];
    used.add(i);
    for (let j = i + 1; j < items.length; j++) {
      if (used.has(j)) continue;
      if (hamming(items[i].hash, items[j].hash) <= HAMMING_THRESHOLD) {
        cluster.push(items[j]);
        used.add(j);
      }
    }
    if (cluster.length > 1) {
      groupsReport.push({ entityKey, kept: cluster[0].item.filename, removed: cluster.slice(1).map((c) => c.item.filename) });
      for (const c of cluster.slice(1)) toRemove.add(c.index);
    }
  }
}

console.log(`\nNear-duplicate groups found: ${groupsReport.length}`);
console.log(`Photos to remove: ${toRemove.size}`);
for (const g of groupsReport) {
  console.log(`  [${g.entityKey}] keep "${g.kept}" -> remove: ${g.removed.join(', ')}`);
}

if (dryRun) {
  console.log('\n--dry-run: no files or manifest entries were changed.');
} else {
  let deleted = 0;
  for (const idx of toRemove) {
    const item = manifest[idx];
    const filePath = path.join(photosDir, item.relativePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      deleted++;
    }
  }
  const cleaned = manifest.filter((_, idx) => !toRemove.has(idx));
  fs.writeFileSync(manifestPath, JSON.stringify(cleaned, null, 2));
  console.log(`\nDeleted ${deleted} files. Manifest: ${manifest.length} -> ${cleaned.length}`);
}
