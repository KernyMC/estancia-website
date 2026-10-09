/**
 * Creates the `trip` document for Kicker Rock Tour (real merge of the two
 * WP tours "Kicker Rock Tour" and "Kicker Rock Diving Tour" — same
 * itinerary/logistics, only the marine activity + price differ, modeled as
 * `addOns` instead of two documents). Reuses photos already uploaded to the
 * Sanity media library via migration/data/photo-manifest.json + asset-cache.
 *
 * Single-document run (house rule: one test document before any batch).
 *
 * Run with: npx sanity exec scripts/create-kicker-rock-tour.mjs --with-user-token
 */
import fs from 'node:fs'
import path from 'node:path'
import {getCliClient} from 'sanity/cli'
import {buildAssetCache, findAssetRefCached} from './lib/asset-cache.mjs'

const client = getCliClient({apiVersion: '2024-01-01'})
const root = path.resolve(process.cwd(), '..')
const tours = JSON.parse(fs.readFileSync(path.join(root, 'web', 'src', 'data', 'tours.json'), 'utf8'))
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'migration', 'data', 'photo-manifest.json'), 'utf8'))

const TOUR_SLUG = 'kicker-rock'
const tour = tours.find((t) => t.slug === TOUR_SLUG)
if (!tour) throw new Error(`Tour ${TOUR_SLUG} not found in tours.json`)

const stripBullet = (s) => s.replace(/^[•\s]+/, '').trim()

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
  const assetCache = await buildAssetCache(client)
  const findAssetRef = (entitySlug, sectionSlug, originalUrl) =>
    findAssetRefCached(assetCache, manifest, root, entitySlug, sectionSlug, originalUrl, client)

  const images = []
  for (const url of tour.gallery ?? []) {
    const ref = await findAssetRef(tour.slug, 'gallery', url)
    if (ref) images.push(ref)
  }
  const gallery = images.length ? [{_type: 'galleryGroup', label: 'Gallery', images}] : []
  const banner = images[0] ?? undefined

  const doc = {
    _type: 'trip',
    title: tour.name,
    slug: {_type: 'slug', current: tour.slug},
    kind: 'day-tour',
    price: tour.price ?? undefined,
    durationDays: tour.durationDays ?? 1,
    description: tour.description || '',
    destinations: [{_type: 'reference', _ref: destinationId, _key: 'dest-1'}],
    highlights: (tour.highlights ?? []).map(stripBullet),
    include: (tour.include ?? []).map(stripBullet),
    exclude: (tour.exclude ?? []).map(stripBullet),
    addOns: (tour.addOns ?? []).map((a) => ({
      _type: 'tripAddOn',
      _key: a.slug,
      name: a.name,
      slug: {_type: 'slug', current: a.slug},
      description: a.description,
      priceDelta: a.priceDelta,
    })),
    ...(banner ? {banner} : {}),
    gallery,
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
  console.log(`Add-ons: ${doc.addOns.length}, Gallery photos: ${images.length}, Banner: ${banner ? 'set' : 'MISSING'}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
