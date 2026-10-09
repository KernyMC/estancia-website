/**
 * Generates a REVIEW SAMPLE (not the full batch) of proposed SEO filenames +
 * alt text for photos, using a local text-only model (qwen3-coder:30b via
 * Ollama) grounded with real context (ship/tour name, gallery section,
 * original filename). No vision model involved — validated too slow on this
 * hardware (gemma4:26b and qwen3-vl:30b both exceeded 5 min per image).
 *
 * Output: migration/data/photo-review-sample.json + a visual HTML report
 * at migration/photo-review-sample.html for Kevin to eyeball before the
 * full batch runs.
 *
 * Usage: node migration/photo-naming-sample.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const webData = path.join(root, '..', 'web', 'src', 'data');

const ships = JSON.parse(fs.readFileSync(path.join(webData, 'ships.json'), 'utf8'));
const tours = JSON.parse(fs.readFileSync(path.join(webData, 'tours.json'), 'utf8'));

const AMBIGUOUS_PATTERN = /^(IMG_|DSC|WhatsApp-Image|AnyDesk|CIMG|P\d{4,}|PC\d+)/i;

function isAmbiguous(url) {
  const base = url.split('/').pop() ?? '';
  return AMBIGUOUS_PATTERN.test(base);
}

/* ---- Build the full candidate pool (entity, section, url) ------------- */

const pool = [];

for (const ship of ships) {
  for (const tab of ship.galleryTabs ?? []) {
    for (const url of tab.images) {
      pool.push({ entityType: 'ship', entityName: ship.name, section: tab.label, url });
    }
  }
  for (const act of ship.activities ?? []) {
    if (act.main_image) {
      pool.push({ entityType: 'ship-activity', entityName: `${ship.name} — ${act.name}`, section: 'Onboard activity', url: act.main_image });
    }
  }
}

for (const tour of tours) {
  for (const url of tour.gallery ?? []) {
    pool.push({ entityType: 'tour', entityName: tour.name, section: 'Gallery', url });
  }
}

console.log(`Total candidate pool: ${pool.length} images`);

/* ---- Pick a representative sample (~18) -------------------------------- */

const ambiguous = pool.filter((p) => isAmbiguous(p.url));
const normal = pool.filter((p) => !isAmbiguous(p.url));

function sampleEvenly(arr, n) {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]);
}

const sample = [
  ...sampleEvenly(normal.filter((p) => p.entityType === 'ship'), 8),
  ...sampleEvenly(normal.filter((p) => p.entityType === 'ship-activity'), 3),
  ...sampleEvenly(normal.filter((p) => p.entityType === 'tour'), 5),
  ...sampleEvenly(ambiguous, 3),
];

console.log(`Sample selected: ${sample.length} images (${sample.filter((p) => isAmbiguous(p.url)).length} flagged ambiguous)`);

/* ---- Call the local model for each sample item ------------------------- */

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const MODEL = 'qwen3-coder:30b';

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

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    return { filename: parsed.filename, alt: parsed.alt, flagged, raw: false };
  } catch {
    return { filename: originalFilename, alt: '(model output unparseable — see raw)', flagged, raw: text };
  }
}

const results = [];
let i = 0;
for (const item of sample) {
  i++;
  process.stdout.write(`[${i}/${sample.length}] ${item.entityName} (${item.section})... `);
  const start = Date.now();
  try {
    const proposal = await proposeNaming(item);
    const ms = Date.now() - start;
    console.log(`${ms}ms — ${proposal.filename}`);
    results.push({ ...item, ...proposal, originalFilename: item.url.split('/').pop(), tookMs: ms });
  } catch (err) {
    console.log(`FAILED: ${err}`);
    results.push({ ...item, filename: null, alt: null, flagged: isAmbiguous(item.url), error: String(err) });
  }
}

fs.mkdirSync(path.join(root, 'data'), { recursive: true });
fs.writeFileSync(path.join(root, 'data', 'photo-review-sample.json'), JSON.stringify(results, null, 2));
console.log(`\nWrote migration/data/photo-review-sample.json (${results.length} items)`);
