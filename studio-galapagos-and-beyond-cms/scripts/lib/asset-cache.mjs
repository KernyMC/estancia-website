import fs from 'node:fs'
import path from 'node:path'

/**
 * Fetches every existing image asset's originalFilename -> _id mapping in
 * ONE query, instead of re-uploading a file's bytes just to "find" it via
 * Sanity's content-hash dedup (which still costs a real upload request each
 * time, against the 25 req/s /assets/ rate limit and real bandwidth).
 *
 * Note: originalFilename is not a perfectly unique key (two entities can
 * share a byte-identical stock photo, and only the FIRST upload's filename
 * survives dedup — see run-photo-pipeline.mjs's notes). This cache is a
 * fast-path; genuinely uncached files still fall back to a real upload in
 * findAssetRefCached, so correctness never depends on the filename match
 * alone — the fallback handles it, just at the cost of one real upload
 * instead of zero.
 */
export async function buildAssetCache(client) {
  const rows = await client.fetch(`*[_type == "sanity.imageAsset" && defined(originalFilename)]{_id, originalFilename}`)
  const cache = new Map()
  for (const row of rows) {
    if (!cache.has(row.originalFilename)) cache.set(row.originalFilename, row._id)
  }
  console.log(`Asset cache built: ${cache.size} existing assets (1 query, 0 uploads)`)
  return cache
}

/**
 * Looks up a manifest entry's Sanity asset ref via the cache first (zero
 * network cost beyond the one query already done). Only uploads for real
 * when the file is genuinely not yet in Sanity.
 */
export async function findAssetRefCached(cache, manifest, root, entitySlug, sectionSlug, originalUrl, client) {
  const entry = manifest.find(
    (m) => m.entitySlug === entitySlug && m.sectionSlug === sectionSlug && m.originalUrl === originalUrl
  )
  if (!entry) return null

  const cachedId = cache.get(entry.filename)
  if (cachedId) {
    return {_type: 'image', asset: {_type: 'reference', _ref: cachedId}}
  }

  const localPath = path.join(root, 'migration', 'photos', entry.relativePath)
  if (!fs.existsSync(localPath)) return null

  const asset = await client.assets.upload('image', fs.createReadStream(localPath), {filename: entry.filename})
  cache.set(entry.filename, asset._id)
  return {_type: 'image', asset: {_type: 'reference', _ref: asset._id}}
}
