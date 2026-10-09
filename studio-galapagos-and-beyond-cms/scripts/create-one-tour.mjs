/**
 * Test run: creates ONE trip document (Day Land Tour Bartolomé) from the
 * migrated WP tour data. Deliberately does NOT set banner or gallery —
 * Kevin wants to pick tour photos himself later; this only uploads the
 * text content (title, price, highlights, include/exclude).
 *
 * Run with: npx sanity exec scripts/create-one-tour.mjs --with-user-token
 */
import fs from 'node:fs'
import path from 'node:path'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})
const root = path.resolve(process.cwd(), '..')
const tours = JSON.parse(fs.readFileSync(path.join(root, 'web', 'src', 'data', 'tours.json'), 'utf8'))

const TOUR_SLUG = 'tour-to-bartolome-island'
const tour = tours.find((t) => t.slug === TOUR_SLUG)
if (!tour) throw new Error(`Tour ${TOUR_SLUG} not found in tours.json`)

const stripBullet = (s) => s.replace(/^[•\s]+/, '').trim()

const kindMap = {
  'day-tours': 'day-tour',
  'multi-day': 'multi-day',
  diving: 'day-tour',
}

async function getOrCreateDestination() {
  const existing = await client.fetch(`*[_type == "destination" && slug.current == "galapagos-islands"][0]{_id}`)
  if (existing?._id) return existing._id
  const created = await client.create({
    _type: 'destination',
    name: 'Galápagos Islands',
    slug: {_type: 'slug', current: 'galapagos-islands'},
    country: 'Ecuador',
  })
  return created._id
}

async function main() {
  const destinationId = await getOrCreateDestination()

  const doc = {
    _type: 'trip',
    title: tour.name,
    slug: {_type: 'slug', current: tour.slug},
    kind: kindMap[tour.category] ?? 'day-tour',
    price: tour.price ?? undefined,
    durationDays: tour.durationDays ?? 1,
    description: tour.description || '',
    destinations: [{_type: 'reference', _ref: destinationId, _key: 'dest-1'}],
    highlights: (tour.highlights ?? []).map(stripBullet),
    include: (tour.include ?? []).map(stripBullet),
    exclude: (tour.exclude ?? []).map(stripBullet),
    // Deliberately NOT set: banner, gallery — Kevin picks tour photos manually later.
  }

  const existingId = await client.fetch(`*[_type == "trip" && slug.current == $slug][0]._id`, {slug: tour.slug})
  if (existingId) {
    await client.delete(existingId)
    console.log(`Deleted existing trip doc ${existingId} before re-creating`)
  }

  const created = await client.create(doc)
  console.log(`\nCreated trip document: ${created._id}`)
  console.log(`Title: ${doc.title} | kind: ${doc.kind} | price: ${doc.price} | duration: ${doc.durationDays}d`)
  console.log(`Highlights: ${doc.highlights.length}, Include: ${doc.include.length}, Exclude: ${doc.exclude.length}`)
  console.log('Banner/gallery: intentionally left empty')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
