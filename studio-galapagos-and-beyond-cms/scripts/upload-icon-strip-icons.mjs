/**
 * One-off upload of the 3 icon-strip icons (bed / hotel / pool) Kevin
 * designed locally, so they live in Sanity Media instead of web/public —
 * same asset-reuse convention as upload-photos.mjs.
 *
 * Run with: pnpm exec sanity exec scripts/upload-icon-strip-icons.mjs --with-user-token
 */
import fs from 'node:fs'
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2024-01-01'})

const sourceDir = 'E:\\USERS\\KEVIN\\Downloads\\Diseño sin título (2)'
const files = ['bed-icon.webp', 'hotel-icon.webp', 'pool-icon.webp']

for (const filename of files) {
  const filePath = `${sourceDir}\\${filename}`
  const asset = await client.assets.upload('image', fs.createReadStream(filePath), {filename})
  console.log(`${filename} -> ${asset._id} -> ${asset.url}`)
}
