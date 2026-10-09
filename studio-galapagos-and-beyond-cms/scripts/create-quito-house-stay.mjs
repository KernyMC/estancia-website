/**
 * Compresses the Quito House photos (via the local webp-batch-app, same
 * convention as migration/run-photo-pipeline.mjs: width 1600, targetKb 200,
 * webp), uploads them to Sanity, and patches the existing `quito-condos`
 * stay draft (drafts.s2wDSUpWBbCAmLaTqR7LVj) with description, highlights,
 * amenities, gallery groups, rooms, and a dedicated "Quito" destination
 * (was pointing at "Galápagos Islands" by mistake).
 *
 * Leaves the document as a DRAFT — does not publish.
 *
 * Run with: npx sanity exec scripts/create-quito-house-stay.mjs --with-user-token
 * (from studio-galapagos-and-beyond-cms/, webp-batch-app must be running on :8787)
 */
import fs from 'node:fs'
import path from 'node:path'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

const SOURCE_DIR =
  'E:/USERS/KEVIN/Downloads/quito-hotel-galapagosandbeyond/quito-hotel-galapagosandbeyond'
const root = path.resolve(process.cwd(), '..')
const OUTPUT_DIR = path.join(root, 'migration', 'photos', 'stays', 'quito-house')
const WEBP_APP_URL = 'http://127.0.0.1:8787/api/process'
const DRAFT_ID = 'drafts.s2wDSUpWBbCAmLaTqR7LVj'

fs.mkdirSync(OUTPUT_DIR, {recursive: true})

const PHOTOS = [
  {
    src: 'habitacion1-Cama QueenSábanasPersianas o cortinas opacasEspacio para guardar la ropaServicios básicosAlmohadas y mantas adicionales.avif',
    out: 'quito-house-bedroom-1.webp',
    alt: 'Bedroom 1 with queen bed — Quito House, Galápagos & Beyond',
    role: 'room1-main',
  },
  {
    src: 'bano-completo 1 - agua caliente- secadora - productos de limpieza.avif',
    out: 'quito-house-bathroom-1.webp',
    alt: 'Full en-suite bathroom for Bedroom 1 — Quito House',
    role: 'room1-bath',
  },
  {
    src: 'habitacion 2 - cama queen.avif',
    out: 'quito-house-bedroom-2.webp',
    alt: 'Bedroom 2 with queen bed — Quito House, Galápagos & Beyond',
    role: 'room2-main',
  },
  {
    src: 'bano - completo 2.avif',
    out: 'quito-house-bathroom-2.webp',
    alt: 'Full en-suite bathroom for Bedroom 2 — Quito House',
    role: 'room2-bath',
  },
  {
    src: 'cocina-completa-LicuadoraCaféCafeteraPlatos y cubiertosMicroondasHervidor de agua.avif',
    out: 'quito-house-kitchen.webp',
    alt: 'Fully equipped kitchen — Quito House, Galápagos & Beyond',
    role: 'gallery',
    group: 'Kitchen',
  },
  {
    src: 'sala-2 sillones-television-libros y material de lectura.avif',
    out: 'quito-house-living-room.webp',
    alt: 'Living room with TV and reading nook — Quito House',
    role: 'gallery',
    group: 'Living room',
  },
  {
    src: 'Exterior - cafetera, utesinlios basicos para cocinar - zona de trabajo - televisino.avif',
    out: 'quito-house-exterior-workspace.webp',
    alt: 'Exterior area with coffee station, workspace and TV — Quito House',
    role: 'gallery',
    group: 'Exterior',
  },
  {
    src: 'zona exterior 1.jpeg',
    out: 'quito-house-exterior-1.webp',
    alt: 'Exterior area — Quito House, Galápagos & Beyond',
    role: 'gallery',
    group: 'Exterior',
  },
  {
    src: 'zona exterior 2.avif',
    out: 'quito-house-exterior-2.webp',
    alt: 'Exterior area — Quito House, Galápagos & Beyond',
    role: 'gallery',
    group: 'Exterior',
  },
  {
    src: 'zona exterior 3.avif',
    out: 'quito-house-exterior-3.webp',
    alt: 'Exterior area — Quito House, Galápagos & Beyond',
    role: 'gallery',
    group: 'Exterior',
  },
  {
    src: 'zona exterior 4.jpeg',
    out: 'quito-house-exterior-4.webp',
    alt: 'Exterior area — Quito House, Galápagos & Beyond',
    role: 'gallery',
    group: 'Exterior',
  },
  {
    src: 'zona exterior 5.jpeg',
    out: 'quito-house-exterior-5.webp',
    alt: 'Exterior area — Quito House, Galápagos & Beyond',
    role: 'gallery',
    group: 'Exterior',
  },
]

async function compress(srcPath, filename) {
  const buf = fs.readFileSync(srcPath)
  const params = new URLSearchParams({
    filename,
    width: '1600',
    targetKb: '200',
    allowUpscale: '0',
    format: 'webp',
  })
  const res = await fetch(`${WEBP_APP_URL}?${params}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/octet-stream'},
    body: buf,
    signal: AbortSignal.timeout(60000),
  })
  if (!res.ok) throw new Error(`compress failed ${res.status}: ${await res.text().catch(() => '')}`)
  return Buffer.from(await res.arrayBuffer())
}

async function getOrCreateQuitoDestination() {
  const existing = await client.fetch(`*[_type == "destination" && slug.current == "quito"][0]{_id}`)
  if (existing?._id) return existing._id
  const created = await client.create({
    _type: 'destination',
    name: 'Quito',
    slug: {_type: 'slug', current: 'quito'},
    country: 'Ecuador',
  })
  return created._id
}

function imgRef(assetId, alt) {
  return {_type: 'image', asset: {_type: 'reference', _ref: assetId}, alt}
}

async function main() {
  const destinationId = await getOrCreateQuitoDestination()
  console.log(`Destination "Quito" -> ${destinationId}`)

  const assets = {}
  for (const photo of PHOTOS) {
    process.stdout.write(`${photo.src}... `)
    const srcPath = path.join(SOURCE_DIR, photo.src)
    if (!fs.existsSync(srcPath)) {
      console.log('SKIP (not found)')
      continue
    }
    try {
      const compressed = await compress(srcPath, photo.src)
      fs.writeFileSync(path.join(OUTPUT_DIR, photo.out), compressed)
      const asset = await client.assets.upload('image', compressed, {filename: photo.out})
      assets[photo.out] = {id: asset._id, alt: photo.alt, role: photo.role, group: photo.group}
      console.log(`OK (${Math.round(compressed.length / 1024)}KB, ${asset._id})`)
    } catch (err) {
      console.log(`FAILED: ${err.message || err}`)
    }
  }

  const byOut = (name) => assets[name]

  const galleryGroupsMap = new Map()
  for (const [, a] of Object.entries(assets)) {
    if (a.role !== 'gallery') continue
    if (!galleryGroupsMap.has(a.group)) galleryGroupsMap.set(a.group, [])
    galleryGroupsMap.get(a.group).push(imgRef(a.id, a.alt))
  }
  const gallery = [...galleryGroupsMap.entries()].map(([label, images]) => ({label, images}))

  const room1Gallery = []
  const room2Gallery = []
  for (const [, a] of Object.entries(assets)) {
    if (a.role === 'room1-main' || a.role === 'room1-bath') room1Gallery.push(imgRef(a.id, a.alt))
    if (a.role === 'room2-main' || a.role === 'room2-bath') room2Gallery.push(imgRef(a.id, a.alt))
  }

  const rooms = [
    {
      _type: 'room',
      name: 'Bedroom 1',
      beds: '1 queen bed',
      amenities: [
        'Sheets',
        'Blackout blinds or curtains',
        'Closet space',
        'Basic amenities',
        'Extra pillows and blankets',
        'Hot water',
        'Dryer',
        'Basic cleaning supplies',
      ],
      gallery: room1Gallery,
    },
    {
      _type: 'room',
      name: 'Bedroom 2',
      beds: '1 queen bed',
      amenities: [],
      gallery: room2Gallery,
    },
  ]

  const patch = {
    name: 'Quito House — Galápagos & Beyond',
    location: 'Quito, Ecuador',
    destination: {_type: 'reference', _ref: destinationId},
    description:
      'Entire home rental in Quito, Ecuador, sleeping up to 4 guests. Two bedrooms each with a queen bed, two full bathrooms, a fully equipped kitchen, and a living room with TV and a dedicated workspace.',
    highlights: ['Entire home', '4 guests', '2 bedrooms · 2 beds', '2 bathrooms'],
    amenities: [
      'Fully equipped kitchen (blender, coffee maker, dishware, microwave, kettle)',
      'Living room with TV and reading nook',
      'Dedicated workspace',
      'Hot water',
      'Washer/dryer',
      'Basic cleaning supplies provided',
    ],
    gallery,
    rooms,
  }

  await client
    .patch(DRAFT_ID)
    .set(patch)
    .commit({autoGenerateArrayKeys: true})

  console.log(`\nPatched draft ${DRAFT_ID}. Review in Studio before publishing.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
