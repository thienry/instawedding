import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { PGlite } from '@electric-sql/pglite'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

const DIR = path.join(import.meta.dirname, 'migrations')
const FILES = readdirSync(DIR).sort()
const ANA = '11111111-1111-1111-1111-111111111111'
const BOB = '22222222-2222-2222-2222-222222222222'
const POST = '33333333-3333-3333-3333-333333333333'
const HIDDEN = '44444444-4444-4444-4444-444444444444'

let db: PGlite

const apply = (file: string) => db.exec(readFileSync(path.join(DIR, file), 'utf8'))

// Runs SQL as a Supabase role, the way PostgREST does.
async function as(role: 'anon' | 'authenticated' | 'service_role', sql: string, uid = '') {
  return db.transaction(async (tx) => {
    await tx.exec(`SET LOCAL ROLE ${role}`)
    await tx.query(`SELECT set_config('test.uid', $1, true)`, [uid])
    return (await tx.query<Record<string, unknown>>(sql)).rows
  })
}
const ana = (sql: string) => as('authenticated', sql, ANA)
const bob = (sql: string) => as('authenticated', sql, BOB)
const anon = (sql: string) => as('anon', sql)

const insertPost = (owner: string, extra: Record<string, string> = {}) => {
  const row: Record<string, string> = {
    author_name: `'Ana'`,
    media_url: `'/media/uploads/2026/12/${POST}.webp'`,
    client_session_id: `'${owner}'`,
    ...extra,
  }
  return `INSERT INTO posts (${Object.keys(row)}) VALUES (${Object.values(row)}) RETURNING id`
}

beforeAll(async () => {
  db = new PGlite()
  // The parts of Supabase the migrations rely on, including its broad grants.
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES
      TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES
      TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS
      TO anon, authenticated, service_role;
    CREATE PUBLICATION supabase_realtime;
  `)
  for (const file of FILES) await apply(file)
}, 60_000)

beforeEach(async () => {
  await db.exec(`
    TRUNCATE posts, likes, ceremonialists, rate_limits CASCADE;
    INSERT INTO posts (id, author_name, media_url, client_session_id, is_approved)
    VALUES ('${POST}', 'Ana', '/media/a.webp', '${ANA}', true),
           ('${HIDDEN}', 'Ana', '/media/b.webp', '${ANA}', false);
    INSERT INTO ceremonialists (email) VALUES ('c@x.test');
  `)
})

describe('posts', () => {
  it('shows hidden posts only to their owner', async () => {
    expect(await anon('SELECT id FROM posts')).toHaveLength(1)
    expect(await bob('SELECT id FROM posts')).toHaveLength(1)
    expect(await ana('SELECT id FROM posts')).toHaveLength(2)
  })

  it('lets a signed-in guest publish as themself only', async () => {
    expect(await ana(insertPost(ANA))).toHaveLength(1)
    await expect(ana(insertPost(BOB))).rejects.toThrow('row-level security')
    await expect(anon(insertPost('anonymous'))).rejects.toThrow()
  })

  it('accepts the id chosen by the guest, but only once', async () => {
    const id = `'55555555-5555-5555-5555-555555555555'`
    expect(await ana(insertPost(ANA, { id }))).toHaveLength(1)
    await expect(ana(insertPost(ANA, { id }))).rejects.toThrow('duplicate key')
    await expect(bob(insertPost(BOB, { id }))).rejects.toThrow('duplicate key')
  })

  it.each([
    ['media_url', `'javascript:alert(1)'`],
    ['media_url', `'https://x.test/a.webp'`],
    ['author_avatar_url', `'http://x.test/a.png'`],
    ['author_name', `'  '`],
    ['author_name', `repeat('a', 121)`],
    ['caption', `repeat('a', 2001)`],
  ])('rejects a forged %s', async (column, value) => {
    await expect(ana(insertPost(ANA, { [column]: value }))).rejects.toThrow('row-level security')
  })

  it.each([
    ['likes_count', '99'],
    ['is_approved', 'false'],
    ['created_at', `'2030-01-01'`],
  ])('does not let guests choose %s', async (column, value) => {
    await expect(ana(insertPost(ANA, { [column]: value }))).rejects.toThrow('permission denied')
  })

  it('lets guests delete only their own posts, even hidden ones', async () => {
    const del = (id: string) => `DELETE FROM posts WHERE id='${id}' RETURNING id`
    expect(await anon(del(POST))).toEqual([])
    expect(await bob(del(POST))).toEqual([])
    expect(await ana(del(POST))).toHaveLength(1)
    expect(await ana(del(HIDDEN))).toHaveLength(1)
  })

  it('lets nobody update, not even the owner', async () => {
    const sql = `UPDATE posts SET is_approved = true RETURNING id`
    expect(await anon(sql)).toEqual([])
    expect(await ana(sql)).toEqual([])
  })
})

it('keeps challenges read-only', async () => {
  expect((await anon('SELECT id FROM challenges WHERE NOT is_moment')).length).toBe(5)
  expect(await ana('DELETE FROM challenges RETURNING id')).toEqual([])
  expect(await ana(`UPDATE challenges SET title = 'x' RETURNING id`)).toEqual([])
  await expect(
    ana(`INSERT INTO challenges (title, description) VALUES ('a', 'b')`)
  ).rejects.toThrow('row-level security')
})

it('numbers new challenges after the seeded ones', async () => {
  const rows = await as(
    'service_role',
    `INSERT INTO challenges (title, description) VALUES ('a', 'b') RETURNING id`
  )
  expect(Number(rows[0]?.id)).toBeGreaterThan(5)
  await db.exec(`DELETE FROM challenges WHERE id = ${Number(rows[0]?.id)}`)
})

describe('moments', () => {
  const live = (id: string) =>
    as('service_role', `UPDATE challenges SET live_since = now() WHERE id = ${id} RETURNING id`)
  const moments = () => anon('SELECT id, live_since FROM challenges WHERE is_moment ORDER BY id')

  it('come seeded, off air', async () => {
    const rows = await moments()
    expect(rows).toHaveLength(5)
    expect(rows.every((row) => row.live_since === null)).toBe(true)
  })

  it('go on air one at a time, and only through the server', async () => {
    const [first, second] = (await moments()).map((row) => String(row.id))
    expect(await ana(`UPDATE challenges SET live_since = now() RETURNING id`)).toEqual([])
    expect(await live(first!)).toHaveLength(1)
    await expect(live(second!)).rejects.toThrow('duplicate key')
    await db.exec('UPDATE challenges SET live_since = NULL')
  })
})

it('hides ceremonialists and blocks self-promotion', async () => {
  for (const run of [anon, ana]) {
    expect(await run('SELECT * FROM ceremonialists')).toEqual([])
    expect(await run('DELETE FROM ceremonialists RETURNING id')).toEqual([])
    await expect(run(`INSERT INTO ceremonialists (email) VALUES ('evil@x.test')`)).rejects.toThrow(
      'row-level security'
    )
  }
})

describe('likes', () => {
  const like = (owner: string) =>
    `INSERT INTO likes (post_id, client_session_id) VALUES ('${POST}', '${owner}')`
  const count = (fn: string) => `SELECT likes_count FROM ${fn}('${POST}')`

  it('belong to their owner', async () => {
    await ana(like(ANA))
    await expect(bob(like(ANA))).rejects.toThrow('row-level security')
    expect(await bob('SELECT * FROM likes')).toEqual([])
    expect(await bob('DELETE FROM likes RETURNING id')).toEqual([])
    expect(await ana('DELETE FROM likes RETURNING id')).toHaveLength(1)
  })

  it('cannot be inflated by calling the function repeatedly', async () => {
    await ana(like(ANA))
    await bob(like(BOB))
    for (let i = 0; i < 3; i++) {
      expect(await ana(count('increment_likes'))).toEqual([{ likes_count: 2 }])
    }
    await bob('DELETE FROM likes')
    expect(await bob(count('decrement_likes'))).toEqual([{ likes_count: 1 }])
    await expect(anon(count('increment_likes'))).rejects.toThrow('permission denied')
  })
})

describe('rate limits', () => {
  const hit = `SELECT consume_rate_limit('k', 2, 60) AS ok`

  it('block after the limit and reset after the window', async () => {
    const results: unknown[] = []
    for (let i = 0; i < 3; i++) {
      results.push((await as('service_role', hit))[0]?.ok)
    }
    expect(results).toEqual([true, true, false])
    await db.exec(`UPDATE rate_limits SET expires_at = now() - interval '1 s'`)
    expect((await as('service_role', hit))[0]?.ok).toBe(true)
  })

  it('are out of reach for clients', async () => {
    for (const run of [anon, ana]) {
      await expect(run(hit)).rejects.toThrow('permission denied')
      await expect(run('SELECT * FROM rate_limits')).rejects.toThrow('permission denied')
    }
  })
})

it('gives the server full access', async () => {
  expect(await as('service_role', 'SELECT id FROM posts')).toHaveLength(2)
  expect(await as('service_role', 'SELECT id FROM ceremonialists')).toHaveLength(1)
})

it('can be rolled back by the baseline and applied again', async () => {
  await apply(FILES[0]!)
  expect(await anon(`UPDATE posts SET caption='x' RETURNING id`)).not.toEqual([])
  await apply(FILES[2]!)
  expect(await anon(`UPDATE posts SET caption='x' RETURNING id`)).toEqual([])
})
