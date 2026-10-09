/**
 * Creates a `stay` document for each property in web/src/data/stays.json.
 *
 * These photos never went through the ship/tour photo pipeline (no
 * compression, no manifest entry) — WP only ever had a single thumbnail URL
 * for each, no gallery, no real description. Fetches that thumbnail
 * directly and uploads it as the banner. description/gallery are left
 * empty rather than invented — matches the "coming soon" honesty already
 * shown on the Astro stays pages.
 *
 * Re-runnable: deletes existing stay with the same slug before recreating.
 *
 * Run with: npx sanity exec scripts/create-all-stays.mjs --with-user-token
 */
import fs from 'node:fs'
import path from 'node:path'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})
const root = path.resolve(process.cwd(), '..')
const stays = JSON.parse(fs.readFileSync(path.join(root, 'web', 'src', 'data', 'stays.json'), 'utf8'))

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

async function uploadFromUrl(url, filename) {
  const res = await fetch(url, {signal: AbortSignal.timeout(30000)})
  if (!res.ok) throw new Error(`download failed ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const asset = await client.assets.upload('image', buf, {filename})
  return {_type: 'image', asset: {_type: 'reference', _ref: asset._id}}
}

async function main() {
  const destinationId = await getOrCreateDestination()

  let created = 0
  let failed = 0

  for (const stay of stays) {
    process.stdout.write(`${stay.name} (${stay.slug})... `)
    try {
      let banner
      try {
        const filename = stay.thumbnail.split('/').pop()
        banner = await uploadFromUrl(stay.thumbnail, filename)
      } catch (err) {
        console.log(`(banner upload failed: ${err.message}) `)
      }

      const doc = {
        _type: 'stay',
        name: stay.name,
        slug: {_type: 'slug', current: stay.slug},
        destination: {_type: 'reference', _ref: destinationId},
        location: stay.location,
        ...(banner ? {banner} : {}),
      }

      const existingId = await client.fetch(`*[_type == "stay" && slug.current == $slug][0]._id`, {
        slug: stay.slug,
      })
      if (existingId) await client.delete(existingId)

      const result = await client.create(doc)
      created++
      console.log(`OK (${result._id}${banner ? ', with banner' : ', no banner'})`)
    } catch (err) {
      failed++
      console.log(`FAILED: ${err.message || err}`)
    }
  }

  console.log(`\nDone. Created: ${created}, Failed: ${failed}, Total stays: ${stays.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
