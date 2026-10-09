/**
 * Creates a `trip` document for EVERY tour in web/src/data/tours.json,
 * including banner + gallery — reusing photos already uploaded to the
 * Sanity media library (matched via migration/data/photo-manifest.json).
 * Uses idempotent content-based upload (Sanity dedupes by hash), so this
 * never creates duplicate assets even though it "uploads" again.
 *
 * Re-runnable: deletes any existing trip with the same slug before
 * recreating it, so re-runs don't duplicate.
 *
 * Run with: npx sanity exec scripts/create-all-tours.mjs --with-user-token
 */
import fs from 'node:fs'
import path from 'node:path'
import {getCliClient} from 'sanity/cli'
import {buildAssetCache, findAssetRefCached} from './lib/asset-cache.mjs'

const client = getCliClient({apiVersion: '2024-01-01'})
const root = path.resolve(process.cwd(), '..')
const tours = JSON.parse(fs.readFileSync(path.join(root, 'web', 'src', 'data', 'tours.json'), 'utf8'))
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'migration', 'data', 'photo-manifest.json'), 'utf8'))

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
  const assetCache = await buildAssetCache(client)
  const findAssetRef = (entitySlug, sectionSlug, originalUrl) =>
    findAssetRefCached(assetCache, manifest, root, entitySlug, sectionSlug, originalUrl, client)

  let created = 0
  let failed = 0

  for (const tour of tours) {
    process.stdout.write(`${tour.name} (${tour.slug})... `)
    try {
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
        kind: kindMap[tour.category] ?? 'day-tour',
        price: tour.price ?? undefined,
        durationDays: tour.durationDays ?? 1,
        description: tour.description || '',
        destinations: [{_type: 'reference', _ref: destinationId, _key: 'dest-1'}],
        highlights: (tour.highlights ?? []).map(stripBullet),
        include: (tour.include ?? []).map(stripBullet),
        exclude: (tour.exclude ?? []).map(stripBullet),
        ...(banner ? {banner} : {}),
        gallery,
      }

      const existingId = await client.fetch(`*[_type == "trip" && slug.current == $slug][0]._id`, {
        slug: tour.slug,
      })
      if (existingId) await client.delete(existingId)

      const result = await client.create(doc)
      created++
      console.log(`OK (${result._id}, ${images.length} photos)`)
    } catch (err) {
      failed++
      console.log(`FAILED: ${err.message || err}`)
    }
  }

  console.log(`\nDone. Created: ${created}, Failed: ${failed}, Total tours: ${tours.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
