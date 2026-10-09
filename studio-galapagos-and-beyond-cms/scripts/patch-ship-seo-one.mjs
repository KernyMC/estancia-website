/**
 * Test run: PATCHes real `seo` copy (from ships.json, real WP-sourced SEO
 * text, never fabricated) onto ONE existing ship document in Sanity. Uses
 * .patch().set() — never delete+recreate — so any banner/gallery already
 * uploaded to this document is untouched.
 *
 * Run with: npx sanity exec scripts/patch-ship-seo-one.mjs --with-user-token
 */
import fs from 'node:fs'
import path from 'node:path'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})
const root = path.resolve(process.cwd(), '..')
const ships = JSON.parse(fs.readFileSync(path.join(root, 'web', 'src', 'data', 'ships.json'), 'utf8'))

const SHIP_SLUG = 'bonita-yacht'
const ship = ships.find((s) => s.slug === SHIP_SLUG)
if (!ship) throw new Error(`Ship ${SHIP_SLUG} not found in ships.json`)

async function main() {
  const doc = await client.fetch(`*[_type == "ship" && slug.current == $slug && !(_id in path("drafts.**"))][0]{_id, name}`, {
    slug: SHIP_SLUG,
  })
  if (!doc) throw new Error(`No published ship doc found for slug ${SHIP_SLUG}`)

  const seo = {
    title: ship.seo?.title || undefined,
    description: ship.seo?.description || undefined,
    focusKeyword: ship.seo?.focusKeyword || undefined,
  }

  const result = await client.patch(doc._id).set({seo}).commit()
  console.log(`Patched ${doc.name} (${doc._id})`)
  console.log('seo:', JSON.stringify(result.seo, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
