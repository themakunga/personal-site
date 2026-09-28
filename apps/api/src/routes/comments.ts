import { Hono } from 'hono'
import { db } from '../db.ts'
import { auth } from '../auth.ts'
import { validateMarkdown } from '../lib/markdown.ts'
import { rateLimit, getClientIp } from '../lib/rate-limit.ts'
import { verifySolution } from 'altcha-lib'
import { createHash } from 'node:crypto'

type Comment = {
  id: string
  post_slug: string
  user_id: string
  parent_id: string | null
  body_markdown: string
  status: string
  created_at: number
  updated_at: number | null
  user_name: string
}

const app = new Hono()
const hmacKey = process.env.ALTCHA_HMAC_KEY ?? 'dev-key-change-me'

// GET /api/comments/:slug — list visible comments for a post
app.get('/:slug', (c) => {
  const slug = c.req.param('slug')
  const comments = db
    .prepare(
      `SELECT c.*, u.name as user_name
       FROM comments c
       JOIN "user" u ON c.user_id = u.id
       WHERE c.post_slug = ? AND c.status = 'visible'
       ORDER BY c.created_at ASC`,
    )
    .all(slug) as Comment[]

  return c.json({ comments })
})

// POST /api/comments/:slug — create a comment (requires session + CAPTCHA)
app.post('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const ip = getClientIp(c.req.raw)

  if (!rateLimit(ip)) {
    return c.json({ error: 'Rate limit exceeded' }, 429)
  }

  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  let body: { body_markdown?: string; parent_id?: string; altcha?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const { body_markdown = '', parent_id, altcha } = body

  if (!altcha) return c.json({ error: 'CAPTCHA required' }, 400)
  const captchaValid = await verifySolution(altcha, hmacKey)
  if (!captchaValid) return c.json({ error: 'Invalid CAPTCHA' }, 400)

  const mdError = validateMarkdown(body_markdown.trim())
  if (mdError) return c.json({ error: mdError }, 400)

  const id = createHash('sha256')
    .update(`${session.user.id}${slug}${Date.now()}`)
    .digest('hex')
    .slice(0, 16)

  db.prepare(
    `INSERT INTO comments (id, post_slug, user_id, parent_id, body_markdown, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
  ).run(id, slug, session.user.id, parent_id ?? null, body_markdown.trim(), Date.now())

  return c.json({ id }, 201)
})

export default app
