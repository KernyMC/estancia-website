/**
 * PATCHes `description` + `faq` onto tours that had neither in the source
 * WP data. Every sentence here is synthesized ONLY from fields already on
 * the document (highlights, include, exclude, price, duration) — no new
 * facts invented. 3 tours were deliberately skipped because their stored
 * highlights/include don't actually match their own title (copy-paste
 * errors already present in the WP source — writing prose on top of wrong
 * data would compound the error, not fix it):
 *   - espanola-island-day-trip (has Tintoreras/Tortuga Rock content)
 *   - tour-to-the-tunnels-all-inclusive (has the 3-day Isabela package content)
 *   - diving-tour-north-seymour (has Gordon Rocks content)
 *
 * Uses .patch().set() — never delete+recreate.
 * Run with: npx sanity exec scripts/patch-tour-descriptions-faq.mjs --with-user-token
 */
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

const CONTENT = {
  'kicker-rock': {
    description:
      "A full-day, 7-hour snorkeling adventure around the iconic Kicker Rock channel off San Cristóbal Island. Two open-water snorkeling sessions bring you face to face with hammerhead sharks, Galápagos sharks, sea turtles, rays, and playful sea lions, while the towering rock walls host nesting blue-footed boobies and frigatebirds. The day includes a stop at a secluded beach (Cerro Brujo, Manglecito, or Puerto Grande) and departs at 8:00 AM from Puerto Baquerizo Moreno, returning at 3:00 PM. A diving upgrade is available for those who'd rather scuba than snorkel.",
    faq: [
      {question: "What's included in the Kicker Rock Tour?", answer: 'A bilingual professional guide, hotel pick-up/drop-off, snorkeling equipment, and lunch.'},
      {question: 'Do I need to bring my own wetsuit?', answer: 'Yes — a wetsuit is not included, so bring your own or arrange a rental.'},
      {question: 'Can I go diving instead of snorkeling?', answer: 'Yes, a diving upgrade is available: two open-water scuba dives in the Kicker Rock channel with full diving equipment, on the same schedule.'},
    ],
  },
  'tour-to-the-tunnels-isabela-island': {
    description:
      "A snorkeling and walking tour to Los Túneles, a lava-tube rock formation off Isabela Island. In the water you may spot seahorses and sea turtles inside the tunnels; on an 800-meter walk along the lava formations you'll see marine iguanas, sea lions, and blue-footed boobies. Departure and return times vary by week (7:30 AM–1:00 PM on week 1, 11:00 AM–5:00 PM on week 2), with lunch served aboard the boat.",
    faq: [
      {question: 'What time does this tour leave?', answer: 'It depends on the week: 7:30 AM (back at 1:00 PM) on week 1, or 11:00 AM (back at 5:00 PM) on week 2.'},
      {question: "What's included?", answer: 'A bilingual guide, snorkeling equipment, and a box lunch.'},
    ],
  },
  'day-land-tour-santa-cruz-2': {
    description:
      'A land tour through the Santa Cruz Highlands to see giant Galápagos tortoises in their natural habitat. The day includes walking through lava tubes formed by ancient flows, a stop at the Twin Craters, and — time permitting — an afternoon visit to German Beach. Lunch is served at the private tortoise farm.',
    faq: [
      {question: 'Will I see giant tortoises in the wild?', answer: 'Yes — the highlands stop is at a private farm where giant tortoises roam freely.'},
      {question: 'Is German Beach always included?', answer: "It's visited in the afternoon if time permits."},
    ],
  },
  'day-snorkeling-at-pinzon-island-and-landing-on-santa-cruz-tour': {
    description:
      "A full-day (7–8 hour) snorkeling trip to Pinzón Island, one of the best snorkel sites in the archipelago — landing isn't permitted on Pinzón itself, but you'll snorkel alongside sea lions, sea turtles, reef sharks, rays, and tropical fish. The day also includes time on a beach on Santa Cruz Island, with lunch served aboard the boat.",
    faq: [
      {question: 'Can we land on Pinzón Island?', answer: "No — landing isn't allowed on Pinzón; it's a snorkel-only site."},
      {question: 'Do I need my own wetsuit?', answer: "Yes, a wetsuit isn't included."},
    ],
  },
  'day-land-tour-north-seymour-2': {
    description:
      'A day trip to North Seymour Island, home to one of the largest colonies of magnificent frigatebirds in Galápagos alongside blue-footed boobies, sea lions, and marine iguanas. A roughly 2-kilometer trail crosses the island (moderate difficulty, unpaved and rocky), followed by snorkeling with white-tip sharks, Galápagos sharks, and rays.',
    faq: [
      {question: 'How difficult is the hike?', answer: 'Moderate — the 2-mile trail crosses unpaved, rocky terrain.'},
      {question: "What's included?", answer: 'A bilingual guide, hotel transport, snorkeling equipment, and a box lunch. A wetsuit is not included.'},
    ],
  },
  'isabela-island-all-inclusive': {
    description:
      'A flexible 2–3 day all-inclusive package to Isabela Island. Day 1: travel by speedboat from Puerto Ayora to Puerto Villamil, check into your hotel, and visit the Flamingo Lagoon and beach. Day 2: boat tour to Los Túneles. Day 3: walking tour of Tintoreras and snorkeling at Tortuga (Turtle) Rock, before returning to Santa Cruz in the afternoon. Includes a bilingual guide, snorkeling equipment, and box lunches.',
    faq: [
      {question: 'How do I get to Isabela Island?', answer: 'By speedboat from Puerto Ayora, Santa Cruz.'},
      {question: "What's included?", answer: 'Transportation, accommodation, boat tours, a bilingual guide, snorkeling equipment, and box lunches.'},
    ],
  },
  '7-day-adventure': {
    description:
      'A 7-day, fully inclusive Galápagos adventure package covering accommodations, all meals, guided excursions, and transportation throughout. Snorkeling equipment and wetsuits are provided, along with cocktails, wine, soda, and water. The Galápagos National Park entrance fee is not included.',
    faq: [
      {question: "What's included in the 7-day package?", answer: 'All meals, excursions, accommodations, transportation, snorkeling equipment (including wetsuit), and drinks (cocktails, wine, soda, water).'},
      {question: 'Is the park entrance fee included?', answer: 'No, the Galápagos National Park entrance fee is paid separately.'},
    ],
  },
  'snorkeling-santa-fe': {
    description:
      'A full-day (7–8 hour) snorkeling trip to Santa Fe, with two different snorkel sites and a chance to fish along the way. Expect sea lions, sea turtles, reef sharks, rays, and tropical fish in the water. On the way back to Puerto Ayora, the boat stops at Playa Escondida on Santa Cruz Island, with lunch served aboard.',
    faq: [
      {question: 'Is snorkeling equipment included?', answer: 'Yes, snorkeling equipment is included; a wetsuit is not.'},
      {question: 'How many snorkel sites are visited?', answer: 'Two different sites around Santa Fe.'},
    ],
  },
  'gordonrocks-diving-tour': {
    description:
      'A single-day scuba diving trip to Gordon Rocks, one of the most sought-after dive sites in the Galápagos. The trip includes two dives with full gear (5–7mm wetsuit, regulator, BCD, mask, fins, weight belt, and tanks), pick-up/drop-off at the dive center, and a box lunch between dives.',
    faq: [
      {question: 'How many dives are included?', answer: 'Two dives, with complete gear provided (wetsuit, regulator, BCD, mask, fins, tanks).'},
      {question: 'Is the park entrance fee included?', answer: 'No — the Galápagos National Park entry fee, air tickets, and a dive computer (rentable for $15/day) are not included.'},
    ],
  },
  'tour-to-bartolome-island': {
    description:
      'A day trip to Bartolomé, a volcanic islet off Santiago Island known for one of the most photographed landscapes in Galápagos. Climb the volcanic cone via a staircase with handrails for sweeping views over Pinnacle Rock and the surrounding islands, then snorkel with Galápagos penguins, sea lions, sharks, and sea turtles. The tour departs the hotel at 6:30 AM; difficulty is moderate, with some hiking on a slope.',
    faq: [
      {question: 'What time does the tour start?', answer: 'Pick-up from the hotel is at 6:30 AM.'},
      {question: 'Will I see Galápagos penguins?', answer: "Yes — Bartolomé's waters are one of the best places to see them while snorkeling, along with sea lions and marine iguanas."},
    ],
  },
  '8-day-adventure': {
    description:
      'An 8-day, fully inclusive Galápagos adventure package covering accommodations, all meals, guided excursions, and transportation throughout. Snorkeling equipment and wetsuits are provided, along with cocktails, wine, soda, and water. The Galápagos National Park entrance fee is not included.',
    faq: [
      {question: "What's included in the 8-day package?", answer: 'All meals, excursions, accommodations, transportation, snorkeling equipment (including wetsuit), and drinks (cocktails, wine, soda, water).'},
      {question: 'Is the park entrance fee included?', answer: 'No, the Galápagos National Park entrance fee is paid separately.'},
    ],
  },
  'floreana-island-day-trip': {
    description:
      'A full-day boat trip to Floreana Island (about 1 hour 45 minutes each way). Highlights include a wet landing at Cormorant Point, a walk to the Flamingo Lagoon and a white-sand beach, and two snorkeling stops — one near Cormorant Point and one at Enderby Rock — where you may see sea lions, sea turtles, sharks, rays, and blue-footed boobies and frigatebirds overhead. The boat returns to Puerto Ayora by 5:00 PM.',
    faq: [
      {question: 'How long is the boat ride to Floreana?', answer: 'About 1 hour 45 minutes each way.'},
      {question: "What's included?", answer: 'A bilingual guide, snorkeling equipment, and lunch on the boat.'},
    ],
  },
  'tintoreras-and-tortuga-rock': {
    description:
      'A half-day trip from Puerto Villamil combining a 1.5-hour walk at Tintoreras — home to white-tip reef sharks, marine iguanas, sea lions, blue-footed boobies, and penguins — with snorkeling or diving at Tortuga (Turtle) Rock, where you can see sharks, rays, sea turtles, and tropical fish. Departs at 7:30 AM, back in Puerto Villamil by 1:00 PM, with lunch served aboard the boat.',
    faq: [
      {question: 'What time does this tour depart and return?', answer: 'Departure is 7:30 AM, back in Puerto Villamil by 1:00 PM.'},
      {question: "What's included?", answer: 'A bilingual guide, snorkeling equipment, and a box lunch.'},
    ],
  },
  'day-land-tour-south-plaza': {
    description:
      "A walking tour of South Plaza, a small island off the east coast of Santa Cruz known for its population of Galápagos land iguanas, a large sea lion colony, and nesting red-billed tropicbirds and swallow-tailed gulls. The trail is rated moderate difficulty due to rocky terrain on one side of the island, and the island's carpet-like Sesuvium ground cover shifts from green in the rainy season to red in the dry season. Note: snorkeling is not permitted on South Plaza.",
    faq: [
      {question: 'Can I snorkel on South Plaza?', answer: 'No — snorkeling is prohibited on the island.'},
      {question: 'How difficult is the walk?', answer: 'Moderate, due to rocky terrain on one side of the island.'},
    ],
  },
}

async function main() {
  const testSlug = 'kicker-rock'
  const testDoc = await client.fetch(`*[_type == "trip" && slug.current == $slug && !(_id in path("drafts.**"))][0]{_id, title}`, {slug: testSlug})
  const testResult = await client
    .patch(testDoc._id)
    .set({description: CONTENT[testSlug].description, faq: CONTENT[testSlug].faq.map((f, i) => ({...f, _type: 'faqItem', _key: `faq-${i}`}))})
    .commit()
  console.log(`TEST: patched ${testDoc.title} (${testDoc._id})`)
  console.log('description:', testResult.description)
  console.log('faq:', JSON.stringify(testResult.faq, null, 2))
  console.log('\n--- proceeding to batch the rest ---\n')

  const slugs = Object.keys(CONTENT).filter((s) => s !== testSlug)
  for (const slug of slugs) {
    const doc = await client.fetch(`*[_type == "trip" && slug.current == $slug && !(_id in path("drafts.**"))][0]{_id, title}`, {slug})
    if (!doc) {
      console.log(`SKIP ${slug} — no published doc found`)
      continue
    }
    const {description, faq} = CONTENT[slug]
    await client
      .patch(doc._id)
      .set({description, faq: faq.map((f, i) => ({...f, _type: 'faqItem', _key: `faq-${i}`}))})
      .commit()
    console.log(`Patched: ${doc.title}`)
  }
  console.log(`\nDone. ${Object.keys(CONTENT).length} tours patched with description + faq.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
