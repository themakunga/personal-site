import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.DATA_DIR ?? resolve(__dirname, '../../data')
mkdirSync(dataDir, { recursive: true })

export const db = new Database(resolve(dataDir, 'app.sqlite'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Better Auth tables
db.exec(`
  CREATE TABLE IF NOT EXISTS "user" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    "emailVerified" INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    "expiresAt" INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" INTEGER,
    "refreshTokenExpiresAt" INTEGER,
    scope TEXT,
    password TEXT,
    "createdAt" INTEGER NOT NULL,
    "updatedAt" INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    "expiresAt" INTEGER NOT NULL,
    "createdAt" INTEGER,
    "updatedAt" INTEGER
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_slug TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES comments(id),
    body_markdown TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'visible' CHECK(status IN ('visible','pending','hidden','deleted')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_slug, status);
  CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
`)
