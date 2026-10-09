/**
 * Regenerates ONLY the alt text (not filenames, not files) for every photo
 * already in the manifest, using a much more conservative prompt.
 *
 * Root cause fixed: the original prompt let the model invent specific
 * wildlife/species/activity claims it had no way to verify from a filename
 * alone (e.g. a shark photo described as "snorkelers", generic seabirds
 * called out by the wrong species). Text-only naming can't see the photo —
 * it must never assert content it can't actually know.
 *
 * Rule now: only ship "activities" entries get a specific activity claim,
 * because that activity name (Snorkeling, Kayak, Scuba Diving...) is real
 * curated WP metadata, not a guess. Every other section (yacht/cabins/deck
 * plan/tour gallery) gets a generic-but-honest description — no invented
 * species, no invented specific activity.
 *
 * Usage: node migration/regenerate-alt-text.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(root, 'data', 'photo-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const MODEL = 'qwen3-coder:30b';

async function proposeAlt(item) {
  const isActivity = item.sectionSlug === 'activities';

  const prompt = isActivity
    ? `Write ONE short alt text (under 125 chars) for a photo of the "${item.section === 'Onboard activity' ? item.entityName.split(' — ')[1] : item.section}" activity aboard "${item.entityName.split(' — ')[0]}", a small-ship Galápagos cruise vessel (an ocean-going boat, not a spaceship), Galápagos Islands, Ecuador. You may name this activity since it is confirmed, but do NOT invent specific animal species, people, or details you cannot know just from this label. Output ONLY the alt text string, no quotes, no JSON, no other text.`
    : item.entityType === 'ships'
      ? `Write ONE short, honest alt text (under 125 chars) for a photo in the "${item.section}" section of "${item.entityName}", a small-ship Galápagos cruise vessel (an ocean-going boat, not a spaceship), Galápagos Islands, Ecuador. You have NOT seen this photo — do NOT invent specific wildlife species, activities, or people that might be in it. Describe only what you can honestly know from the ship name and section (e.g. ship exterior on the water, cabin interior, deck area, onboard amenity). Output ONLY the alt text string, no quotes, no JSON, no other text.`
      : `Write ONE short, honest alt text (under 125 chars) for a photo from the gallery of "${item.entityName}", a Galápagos land/day tour or multi-day package run by Galápagos & Beyond — this is a LAND-BASED TOUR, NOT a cruise ship, NOT a "vessel". You have NOT seen this photo — do NOT invent specific wildlife species, specific activities, people, or claim it shows a boat/ship/vessel unless the tour name itself says so. Describe only what you can honestly know from the tour name (e.g. a scenic Galápagos landscape or island destination related to this tour, without inventing specifics). Output ONLY the alt text string, no quotes, no JSON, no other text.`;

  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      messages: [{ role: 'user', content: prompt }],
      options: { temperature: 0.2, num_predict: 100 },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}`);
  const data = await res.json();
  return (data?.message?.content ?? '').trim().replace(/^["']|["']$/g, '');
}

const onlyEntityType = process.argv.includes('--tours-only') ? 'tours' : null;

let updated = 0;
let failed = 0;

for (let i = 0; i < manifest.length; i++) {
  const item = manifest[i];
  if (item.error) continue;
  if (onlyEntityType && item.entityType !== onlyEntityType) continue;

  process.stdout.write(`[${i + 1}/${manifest.length}] ${item.entityName} / ${item.section}... `);
  try {
    const alt = await proposeAlt(item);
    manifest[i] = { ...item, alt, altRegenerated: true };
    updated++;
    console.log(`"${alt}"`);
  } catch (err) {
    failed++;
    console.log(`FAILED: ${err.message || err} (keeping previous alt)`);
  }

  if ((i + 1) % 25 === 0) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`\nDone. Updated: ${updated}, Failed (kept old alt): ${failed}`);
