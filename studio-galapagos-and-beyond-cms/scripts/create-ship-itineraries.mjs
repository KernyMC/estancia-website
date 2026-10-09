/**
 * Creates a `trip` document (kind: cruise-itinerary) for EVERY itinerary
 * route of EVERY ship — e.g. "Galaxy Sirius — Southern Route". Each
 * references its ship (not embedded), per the content model: a cruise
 * itinerary is independently searchable/filterable, while cabins/specs/
 * gallery/FAQ stay on the ship document and are read through the reference
 * (never duplicated onto the itinerary).
 *
 * price is intentionally left unset — cruise pricing is live (per
 * departure, from the external availability API via ship.apiShipId +
 * apiItineraryCode), not a static number like a day tour's price.
 *
 * Requires create-all-ships.mjs to have run first (looks up each ship by
 * slug). Re-runnable: deletes existing itineraries for a ship before
 * recreating them.
 *
 * Run with: npx sanity exec scripts/create-ship-itineraries.mjs --with-user-token
 */
import fs from 'node:fs'
import path from 'node:path'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})
const root = path.resolve(process.cwd(), '..')
const ships = JSON.parse(fs.readFileSync(path.join(root, 'web', 'src', 'data', 'ships.json'), 'utf8'))

const slugify = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

function parseDurationDays(durationStr) {
  const m = (durationStr || '').match(/(\d+)\s*Days?/i)
  return m ? Number(m[1]) : undefined
}

/**
 * Matches the live availability API's itinerary "name" field. Naturalist
 * ships use single letters (A/B/C); the two dive liveaboards use the word
 * "Diving" instead (confirmed against migration/data/availability-snapshot.json
 * — their route label in ships.json is "Diving Itinerary", but the live API
 * just calls it "Diving").
 */
function parseItineraryCode(label) {
  const m = (label || '').match(/([A-Z])\s*$/)
  if (m) return m[1]
  return (label || '').replace(/\s*Itinerary\s*$/i, '').trim() || label
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

  let created = 0
  let failed = 0
  let skippedNoShip = 0

  for (const ship of ships) {
    const shipDoc = await client.fetch(`*[_type == "ship" && slug.current == $slug][0]{_id}`, {slug: ship.slug})
    if (!shipDoc?._id) {
      console.log(`${ship.name}: ship document not found in Sanity yet — skipping its itineraries`)
      skippedNoShip += (ship.itineraryRoutes ?? []).length
      continue
    }

    for (const route of ship.itineraryRoutes ?? []) {
      const title = `${ship.name} — ${route.route_name}`
      const slug = slugify(title)
      process.stdout.write(`${title}... `)

      try {
        const itineraryDays = (route.days ?? []).map((d) => ({
          _type: 'itineraryDay',
          dayLabel: d.day_label,
          am: d.am,
          pm: d.pm,
        }))

        const doc = {
          _type: 'trip',
          title,
          slug: {_type: 'slug', current: slug},
          kind: 'cruise-itinerary',
          durationDays: parseDurationDays(route.duration) ?? 1,
          destinations: [{_type: 'reference', _ref: destinationId, _key: 'dest-1'}],
          ship: {_type: 'reference', _ref: shipDoc._id},
          apiItineraryCode: parseItineraryCode(route.label),
          itineraryDays,
        }

        const existingId = await client.fetch(`*[_type == "trip" && slug.current == $slug][0]._id`, {slug})
        if (existingId) await client.delete(existingId)

        const result = await client.create(doc)
        created++
        console.log(`OK (${result._id}, ${itineraryDays.length} days, code=${doc.apiItineraryCode})`)
      } catch (err) {
        failed++
        console.log(`FAILED: ${err.message || err}`)
      }
    }
  }

  console.log(`\nDone. Created: ${created}, Failed: ${failed}, Skipped (ship not in Sanity): ${skippedNoShip}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
