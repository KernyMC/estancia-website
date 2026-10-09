/**
 * Batch: PATCHes real `seo` (ships.json) and `childPrice` (tours.json) onto
 * every already-existing ship/trip document in Sanity. Uses .patch().set()
 * only — never delete+recreate — so banners/galleries already uploaded stay
 * untouched. Test-one runs (patch-ship-seo-one.mjs, patch-tour-childprice-one.mjs)
 * already confirmed the shape against bonita-yacht / floreana-island-day-trip.
 *
 * Run with: npx sanity exec scripts/patch-all-seo-and-childprice.mjs --with-user-token
 */
import fs from 'node:fs'
import path from 'node:path'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})
const root = path.resolve(process.cwd(), '..')
const ships = JSON.parse(fs.readFileSync(path.join(root, 'web', 'src', 'data', 'ships.json'), 'utf8'))
const tours = JSON.parse(fs.readFileSync(path.join(root, 'web', 'src', 'data', 'tours.json'), 'utf8'))

async function patchShips() {
  const docs = await client.fetch(`*[_type == "ship" && !(_id in path("drafts.**"))]{_id, name, "slug": slug.current}`)
  let patched = 0
  for (const doc of docs) {
    const ship = ships.find((s) => s.slug === doc.slug)
    if (!ship) {
      console.log(`SKIP ship ${doc.slug} — not in ships.json`)
      continue
    }
    const seo = {
      title: ship.seo?.title || undefined,
      description: ship.seo?.description || undefined,
      focusKeyword: ship.seo?.focusKeyword || undefined,
    }
    await client.patch(doc._id).set({seo}).commit()
    console.log(`Patched ship: ${doc.name}`)
    patched++
  }
  console.log(`\nShips patched: ${patched}/${docs.length}`)
}

async function patchTours() {
  const docs = await client.fetch(
    `*[_type == "trip" && kind != "cruise-itinerary" && !(_id in path("drafts.**"))]{_id, title, "slug": slug.current}`
  )
  let patched = 0
  let skippedNoChildPrice = 0
  for (const doc of docs) {
    const tour = tours.find((t) => t.slug === doc.slug)
    if (!tour) {
      console.log(`SKIP tour ${doc.slug} — not in tours.json`)
      continue
    }
    if (tour.childPrice == null) {
      skippedNoChildPrice++
      continue
    }
    await client.patch(doc._id).set({childPrice: tour.childPrice}).commit()
    console.log(`Patched tour: ${doc.title} -> childPrice ${tour.childPrice}`)
    patched++
  }
  console.log(`\nTours patched: ${patched}/${docs.length} (${skippedNoChildPrice} had no childPrice in source)`)
}

async function main() {
  await patchShips()
  await patchTours()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
