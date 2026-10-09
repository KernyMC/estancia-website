/**
 * Test run: creates ONE ship document (Bonita Yacht) from the migrated WP
 * data, linking its gallery/banner/activity images to the assets already
 * uploaded to the Sanity media library (looked up by original filename).
 *
 * Run with: npx sanity exec scripts/create-one-ship.mjs --with-user-token
 */
import fs from 'node:fs'
import path from 'node:path'
import {getCliClient} from 'sanity/cli'
import {cleanText} from './lib/clean-text.mjs'

const client = getCliClient({apiVersion: '2024-01-01'})
const root = path.resolve(process.cwd(), '..')
const ships = JSON.parse(fs.readFileSync(path.join(root, 'web', 'src', 'data', 'ships.json'), 'utf8'))
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'migration', 'data', 'photo-manifest.json'), 'utf8'))

const SHIP_SLUG = 'bonita-yacht'
const ship = ships.find((s) => s.slug === SHIP_SLUG)
if (!ship) throw new Error(`Ship ${SHIP_SLUG} not found in ships.json`)

const categoryMap = {
  Luxury: 'luxury',
  'First Class': 'first-class',
  'Tourist Superior': 'tourist-superior',
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

/**
 * Looks up the Sanity asset for a manifest entry by re-uploading its local
 * file. Sanity dedupes by content hash, so this never creates a duplicate —
 * it just returns the existing asset. More reliable than querying by
 * `originalFilename`, since that field reflects whichever upload call
 * happened to create the asset first when two different entities share
 * byte-identical stock photos (confirmed to happen in this dataset).
 */
async function findAssetRef(entitySlug, sectionSlug, originalUrl) {
  const entry = manifest.find(
    (m) => m.entitySlug === entitySlug && m.sectionSlug === sectionSlug && m.originalUrl === originalUrl
  )
  if (!entry) {
    console.warn(`  no manifest entry for ${entitySlug}/${sectionSlug} <- ${originalUrl}`)
    return null
  }
  const localPath = path.join(root, 'migration', 'photos', entry.relativePath)
  if (!fs.existsSync(localPath)) {
    console.warn(`  local file missing for ${entry.relativePath}`)
    return null
  }
  const asset = await client.assets.upload('image', fs.createReadStream(localPath), {filename: entry.filename})
  return {_type: 'image', asset: {_type: 'reference', _ref: asset._id}}
}

async function main() {
  const destinationId = await getOrCreateDestination()

  const slugify = (s) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

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

  const doc = {
    _type: 'ship',
    name: ship.name,
    slug: {_type: 'slug', current: ship.slug},
    destination: {_type: 'reference', _ref: destinationId},
    boatType: ship.boatType,
    category: categoryMap[ship.category] ?? 'tourist-superior',
    capacity: 16, // confirmed in description/FAQ text: "accommodates up to 16 guests"
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

  // Remove any pre-existing test doc with the same slug so re-runs don't duplicate.
  const existingId = await client.fetch(`*[_type == "ship" && slug.current == $slug][0]._id`, {slug: ship.slug})
  if (existingId) {
    await client.delete(existingId)
    console.log(`Deleted existing ship doc ${existingId} before re-creating`)
  }

  const created = await client.create(doc)
  console.log(`\nCreated ship document: ${created._id}`)
  console.log(`Gallery groups: ${galleryTabs.map((g) => `${g.label} (${g.images.length})`).join(', ')}`)
  console.log(`Activities: ${activities.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
