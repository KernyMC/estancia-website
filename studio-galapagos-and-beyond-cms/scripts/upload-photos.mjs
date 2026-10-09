/**
 * Uploads all photos from migration/photo-manifest.json into the Sanity
 * media library as assets — sets `altText` (top-level field the
 * sanity-plugin-media plugin manages) and tags each asset (via
 * `opt.media.tags`, the plugin's own field path) with:
 *   - the entity type ("Ships" / "Tours")
 *   - the specific ship/tour name (e.g. "Bonita Yacht")
 * so Kevin can browse/filter in the Media tool by either.
 *
 * Does NOT create ship/trip content documents — this step only populates
 * the media library. Kevin reviews and picks tour photos manually
 * afterwards; ship photos get attached in a later automated step.
 *
 * Run with: npx sanity exec scripts/upload-photos.mjs --with-user-token
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

const root = path.resolve(process.cwd(), '..')
const manifestPath = path.join(root, 'migration', 'data', 'photo-manifest.json')
const photosDir = path.join(root, 'migration', 'photos')

const limit = process.env.UPLOAD_LIMIT ? parseInt(process.env.UPLOAD_LIMIT, 10) : null
const manifestFull = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const manifest = limit ? manifestFull.slice(0, limit) : manifestFull

const tagCache = new Map() // slug -> tag document _id

async function getOrCreateTag(name) {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (tagCache.has(slug)) return tagCache.get(slug)

  const existing = await client.fetch(
    `*[_type == "media.tag" && name.current == $slug][0]{_id}`,
    {slug}
  )
  if (existing?._id) {
    tagCache.set(slug, existing._id)
    return existing._id
  }

  const created = await client.create({
    _type: 'media.tag',
    name: {_type: 'slug', current: slug},
  })
  tagCache.set(slug, created._id)
  return created._id
}

async function tagAsset(assetId, tagIds) {
  const refs = tagIds.map((tagId) => ({
    _key: crypto.randomUUID(),
    _ref: tagId,
    _type: 'reference',
    _weak: true,
  }))

  await client
    .patch(assetId)
    .setIfMissing({opt: {}})
    .setIfMissing({'opt.media': {}})
    .setIfMissing({'opt.media.tags': []})
    .append('opt.media.tags', refs)
    .commit({autoGenerateArrayKeys: true})
}

const typeTagName = {ships: 'Ships', tours: 'Tours'}

let uploaded = 0
let skipped = 0
let failed = 0

for (let i = 0; i < manifest.length; i++) {
  const item = manifest[i]
  if (item.error) {
    skipped++
    continue
  }

  const filePath = path.join(photosDir, item.relativePath)
  if (!fs.existsSync(filePath)) {
    console.log(`[${i + 1}/${manifest.length}] MISSING FILE: ${item.relativePath}`)
    failed++
    continue
  }

  process.stdout.write(`[${i + 1}/${manifest.length}] ${item.entityName} / ${item.section} (${item.filename})... `)

  try {
    const asset = await client.assets.upload('image', fs.createReadStream(filePath), {
      filename: item.filename,
    })

    await client.patch(asset._id).set({altText: item.alt}).commit()

    const typeTagId = await getOrCreateTag(typeTagName[item.entityType] ?? item.entityType)
    const entityBaseName = item.entityName.split(' — ')[0] // strip " — Activity" suffix
    const entityTagId = await getOrCreateTag(entityBaseName)
    await tagAsset(asset._id, [typeTagId, entityTagId])

    uploaded++
    console.log(`OK (${asset._id})`)
  } catch (err) {
    failed++
    console.log(`FAILED: ${err.message || err}`)
  }
}

console.log(`\nDone. Uploaded: ${uploaded}, Skipped (had errors): ${skipped}, Failed: ${failed}`)
