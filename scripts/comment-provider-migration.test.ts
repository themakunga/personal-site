import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

test('adds nullable provider metadata to an existing database without changing historical records', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'comment-provider-migration-'))
  const require = createRequire(new URL('../apps/api/package.json', import.meta.url))
  const Database = require('better-sqlite3')
  const database = new Database(join(directory, 'app.sqlite'))
  t.after(() => {
    database.close()
    rmSync(directory, { recursive: true, force: true })
  })
  database.exec(`
    CREATE TABLE "user" (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, "emailVerified" INTEGER NOT NULL DEFAULT 0, image TEXT, "createdAt" INTEGER NOT NULL, "updatedAt" INTEGER NOT NULL);
    CREATE TABLE session (id TEXT PRIMARY KEY, "expiresAt" INTEGER NOT NULL, token TEXT NOT NULL UNIQUE, "createdAt" INTEGER NOT NULL, "updatedAt" INTEGER NOT NULL, "ipAddress" TEXT, "userAgent" TEXT, "userId" TEXT NOT NULL REFERENCES "user"(id));
    CREATE TABLE comments (id TEXT PRIMARY KEY, post_slug TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES "user"(id), parent_id TEXT, body_markdown TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER);
    INSERT INTO "user" VALUES ('legacy-user', 'Legacy User', 'legacy@example.com', 1, NULL, 1, 1);
    INSERT INTO session VALUES ('legacy-session', 9999999999999, 'legacy-token', 1, 1, NULL, NULL, 'legacy-user');
    INSERT INTO comments VALUES ('legacy-comment', 'legacy-post', 'legacy-user', NULL, 'Existing comment', 'visible', 1, NULL);
  `)
  const existingSession = database.prepare('SELECT * FROM session').get()
  const existingComment = database.prepare('SELECT * FROM comments').get()
  const url = new URL('../apps/api/src/db.ts', import.meta.url).href
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = spawnSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '--input-type=module',
        '-e',
        `const { db } = await import(${JSON.stringify(url)}); db.close();`,
      ],
      {
        encoding: 'utf8',
        env: { ...process.env, DATA_DIR: directory },
      },
    )
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(database.prepare('SELECT * FROM session').get(), {
      ...existingSession,
      loginProvider: null,
    })
    assert.deepEqual(database.prepare('SELECT * FROM comments').get(), {
      ...existingComment,
      provider_id: null,
    })
    assert.equal(database.pragma('integrity_check', { simple: true }), 'ok')
  }
})
