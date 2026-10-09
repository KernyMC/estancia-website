/**
 * Creates a `ship` document for EVERY ship in web/src/data/ships.json,
 * linking gallery/banner/activity images to assets already in the Sanity
 * media library (idempotent content-based upload — Sanity dedupes by hash).
 *
 * capacity/cabinsCount/crewCount/guidesCount are extracted from the prose
 * description via regex where the wording allows it; left undefined
 * (never guessed) when no confident match is found.
 *
 * Re-runnable: deletes any existing ship with the same slug before
 * recreating it.
 *
 * Run with: npx sanity exec scripts/create-all-ships.mjs --with-user-token
 */
import fs from 'node:fs'
import path from 'node:path'
import {getCliClient} from 'sanity/cli'
import {cleanText} from './lib/clean-text.mjs'
import {buildAssetCache, findAssetRefCached} from './lib/asset-cache.mjs'

const client = getCliClient({apiVersion: '2024-01-01'})
const root = path.resolve(process.cwd(), '..')
const ships = JSON.parse(fs.readFileSync(path.join(root, 'web', 'src', 'data', 'ships.json'), 'utf8'))
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'migration', 'data', 'photo-manifest.json'), 'utf8'))

const categoryMap = {
  Luxury: 'luxury',
  'First Class': 'first-class',
  'Tourist Superior': 'tourist-superior',
}

const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

function extractNumber(text, patterns) {
  for (const re of patterns) {
    const m = text.match(re)
    if (m) return Number(m[1])
  }
  return undefined
}

function extractSpecs(ship) {
  const combined = [ship.description, ...(ship.highlights ?? []), ...(ship.faq ?? []).map((f) => f.answer)].join(' ')
  const text = combined.replace(/<[^>]+>/g, ' ')
  const capacity = extractNumber(text, [
    /accommodates up to (\d+) guests/i,
    /maximum of (?:around )?(\d+) guests/i,
    /only (\d+) guests/i,
    /up to (\d+) guests/i,
    /for (\d+) guests/i,
  ])
  const cabinsCount = extractNumber(text, [/across (\d+) cabins/i, /(\d+) cabins/i])
  const crewCount = extractNumber(text, [/crew of (\d+)/i])
  const guidesCount = extractNumber(text, [/(\d+) (?:bilingual )?naturalist guides/i])
  return {capacity, cabinsCount, crewCount, guidesCount}
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

  for (const ship of ships) {
    process.stdout.write(`${ship.name} (${ship.slug})... `)
    try {
      const galleryTabs = []
      for (const tab of ship.galleryTabs ?? []) {
        const sectionSlug = slugify(tab.label)
        const images = []
        for (const url of tab.images) {
          const ref = await findAssetRef(ship.slug, sectionSlug, url)
          if (ref) images.push(ref)
        }
        galleryTabs.push({_type: 'galleryGroup', label: tab.label, images})
      }

      const activities = []
      for (const act of ship.activities ?? []) {
        const ref = await findAssetRef(ship.slug, 'activities', act.main_image)
        activities.push({_type: 'activity', name: act.name, ...(ref ? {image: ref} : {})})
      }

      const bannerImage = galleryTabs.find((g) => g.images.length > 0)?.images[0]
      const specs = extractSpecs(ship)

      const doc = {
        _type: 'ship',
        name: ship.name,
        slug: {_type: 'slug', current: ship.slug},
        destination: {_type: 'reference', _ref: destinationId},
        boatType: ship.boatType,
        category: categoryMap[ship.category] ?? 'tourist-superior',
        ...specs,
        description: cleanText(ship.description),
        highlights: ship.highlights ?? [],
        include: ship.include ?? [],
        exclude: ship.exclude ?? [],
        faq: (ship.faq ?? []).map((f) => ({_type: 'faqItem', question: f.question, answer: cleanText(f.answer)})),
        ...(bannerImage ? {banner: bannerImage} : {}),
        gallery: galleryTabs,
        activities,
        apiShipId: ship.apiShipId,
        apiName: ship.apiName,
      }

      const existingId = await client.fetch(`*[_type == "ship" && slug.current == $slug][0]._id`, {
        slug: ship.slug,
      })
      if (existingId) await client.delete(existingId)

      const result = await client.create(doc)
      created++
      const photoCount = galleryTabs.reduce((a, g) => a + g.images.length, 0)
      console.log(
        `OK (${result._id}, ${photoCount} photos, specs: cap=${specs.capacity ?? '?'} cabins=${specs.cabinsCount ?? '?'} crew=${specs.crewCount ?? '?'} guides=${specs.guidesCount ?? '?'})`
      )
    } catch (err) {
      failed++
      console.log(`FAILED: ${err.message || err}`)
    }
  }

  console.log(`\nDone. Created: ${created}, Failed: ${failed}, Total ships: ${ships.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
