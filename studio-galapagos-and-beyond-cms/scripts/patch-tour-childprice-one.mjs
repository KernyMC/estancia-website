/**
 * Test run: PATCHes real `childPrice` (from tours.json) onto ONE existing
 * trip document in Sanity. Uses .patch().set() — never delete+recreate.
 *
 * Run with: npx sanity exec scripts/patch-tour-childprice-one.mjs --with-user-token
 */
import fs from 'node:fs'
import path from 'node:path'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})
const root = path.resolve(process.cwd(), '..')
const tours = JSON.parse(fs.readFileSync(path.join(root, 'web', 'src', 'data', 'tours.json'), 'utf8'))

const TOUR_SLUG = 'floreana-island-day-trip'
const tour = tours.find((t) => t.slug === TOUR_SLUG)
if (!tour) throw new Error(`Tour ${TOUR_SLUG} not found in tours.json`)
if (tour.childPrice == null) throw new Error(`Tour ${TOUR_SLUG} has no childPrice in tours.json`)

async function main() {
  const doc = await client.fetch(`*[_type == "trip" && slug.current == $slug && !(_id in path("drafts.**"))][0]{_id, title}`, {
    slug: TOUR_SLUG,
  })
  if (!doc) throw new Error(`No published trip doc found for slug ${TOUR_SLUG}`)

  const result = await client.patch(doc._id).set({childPrice: tour.childPrice}).commit()
  console.log(`Patched ${doc.title} (${doc._id})`)
  console.log('childPrice:', result.childPrice)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
