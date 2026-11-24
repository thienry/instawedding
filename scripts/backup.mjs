// Copies the database tables and the media to a local folder. Only reads from
// the services. The copy has personal data: keep it out of the repository.
//
// Usage: node --env-file=.env.production.local scripts/backup.mjs [folder]
import { mkdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'

import {
  compareReferences,
  describeFile,
  isMislabeled,
  readAll,
  resolveKey,
  saveObject,
  TABLES,
  writeJson,
} from './backup.lib.mjs'

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const root = path.resolve(process.argv[2] ?? path.join(os.homedir(), 'instawedding-backups'))
if (root === repository || root.startsWith(repository + path.sep)) {
  fail('The backup has personal data: choose a folder outside the repository.')
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

/** First variable that is set and is not an example value. */
function env(...names) {
  const value = names.map((name) => process.env[name]).find(Boolean)
  if (!value || /your-/.test(value)) fail(`Missing variable: ${names.join(' or ')}`)
  return value
}

const supabase = createClient(
  env('SUPABASE_URL', 'VITE_SUPABASE_URL'),
  // The public key would silently leave out hidden posts
  env('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false, autoRefreshToken: false } }
)
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env('R2_ACCESS_KEY_ID'),
    secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
  },
})
const Bucket = env('R2_BUCKET_NAME')

function readTable(table) {
  return readAll(async (lastId, limit) => {
    let query = supabase.from(table).select('*').order('id').limit(limit)
    if (lastId !== null) query = query.gt('id', lastId)
    const { data, error } = await query
    if (error) throw new Error(`${table}: ${error.message}`)
    return data
  })
}

async function listObjects() {
  const objects = []
  let ContinuationToken
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket, ContinuationToken }))
    for (const { Key, Size } of page.Contents ?? []) {
      if (!Key.endsWith('/')) objects.push({ key: Key, size: Size })
    }
    ContinuationToken = page.NextContinuationToken
  } while (ContinuationToken)
  return objects
}

const fetchBody = async (Key) => (await s3.send(new GetObjectCommand({ Bucket, Key }))).Body

async function main() {
  const startedAt = new Date().toISOString()
  const mediaFolder = path.join(root, 'media')
  const snapshot = path.join(root, 'snapshots', startedAt.replaceAll(':', '-'))
  await mkdir(snapshot, { recursive: true, mode: 0o700 })

  const rows = {}
  for (const table of TABLES) {
    const data = await readTable(table)
    rows[table] = data.length
    await writeJson(path.join(snapshot, `${table}.json`), data)
    if (table === 'posts') rows.allPosts = data
    console.log(`${table}: ${data.length} rows`)
  }
  const { allPosts, ...rowCounts } = rows

  // Listed after the posts, so every post found already has its file
  const objects = await listObjects()
  const media = []
  const failures = []
  for (const [index, object] of objects.entries()) {
    try {
      await saveObject(mediaFolder, object, fetchBody)
      const details = await describeFile(resolveKey(mediaFolder, object.key))
      media.push({ ...object, ...details })
    } catch (error) {
      failures.push({ key: object.key, error: error.message })
    }
    if ((index + 1) % 50 === 0) console.log(`media: ${index + 1}/${objects.length}`)
  }

  const references = compareReferences(
    allPosts,
    objects.map(({ key }) => key)
  )
  const mislabeled = media.filter(({ key, type }) => isMislabeled(key, type))
  await writeJson(path.join(snapshot, 'manifest.json'), {
    startedAt,
    isComplete: failures.length === 0 && references.missing.length === 0,
    rowCounts,
    media,
    mislabeled: mislabeled.map(({ key, type }) => ({ key, type })),
    failures,
    ...references,
  })

  const megabytes = media.reduce((total, { size }) => total + size, 0) / 1024 / 1024
  console.log(`media: ${media.length}/${objects.length} files, ${megabytes.toFixed(1)} MB`)
  console.log(`extension does not match the content: ${mislabeled.length}`)
  console.log(`not used by any post: ${references.unreferenced.length}`)
  console.log(`posts with media elsewhere: ${references.externalPostIds.length}`)
  console.log(`posts whose file is missing: ${references.missing.length}`)
  console.log(`failed downloads: ${failures.length}`)
  console.log(`saved in ${snapshot}`)
  if (failures.length > 0 || references.missing.length > 0) {
    fail('INCOMPLETE BACKUP: see manifest.json and run it again.')
  }
  console.log('backup ok')
}

await main().catch((error) => fail(`BACKUP FAILED: ${error.message}`))
