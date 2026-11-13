import { createHash, randomBytes } from 'node:crypto'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { Hono } from 'hono'
import { db } from '../db.ts'
import { bearerAuth } from 'hono/bearer-auth'
import { secureHeaders } from 'hono/secure-headers'
import { adminPage, adminScript } from './page.ts'

const admin = new Hono()
admin.use(
  '*',
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
    },
  }),
)
admin.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store')
  await next()
})
admin.get('/', (c) => c.html(adminPage))
admin.get('/admin.js', (c) =>
  c.body(adminScript, 200, { 'Content-Type': 'application/javascript; charset=utf-8' }),
)
const cookieName = '__Host-comments-admin'
const sessionSeconds = 7 * 24 * 60 * 60
const hash = (value: string) => createHash('sha256').update(value).digest('hex')

admin.post('/session', async (c) => {
  const token = process.env.COMMENTS_ADMIN_TOKEN
  if (!token || token.length < 32) return c.json({ error: 'Admin access is not configured' }, 503)
  return bearerAuth({ token })(c, async () => {
    const session = randomBytes(32).toString('hex')
    db.prepare('DELETE FROM admin_session WHERE expires_at <= ?').run(Date.now())
    db.prepare('INSERT INTO admin_session (id, expires_at, key_hash) VALUES (?, ?, ?)').run(
      hash(session),
      Date.now() + sessionSeconds * 1000,
      hash(token),
    )
    setCookie(c, cookieName, session, {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/',
      maxAge: sessionSeconds,
    })
    c.res = c.json({ ok: true })
  })
})
admin.use('*', async (c, next) => {
  const token = process.env.COMMENTS_ADMIN_TOKEN
  if (!token || token.length < 32) return c.json({ error: 'Admin access is not configured' }, 503)
  if (c.req.header('Authorization')) return bearerAuth({ token })(c, next)
  const session = getCookie(c, cookieName)
  const valid =
    session &&
    db
      .prepare('SELECT id FROM admin_session WHERE id = ? AND expires_at > ? AND key_hash = ?')
      .get(hash(session), Date.now(), hash(token))
  if (!valid) return c.json({ error: 'Unauthorized' }, 401)
  if (c.req.method !== 'GET' && c.req.header('X-Admin-Request') !== '1')
    return c.json({ error: 'Forbidden' }, 403)
  await next()
})
admin.delete('/session', (c) => {
  const session = getCookie(c, cookieName)
  if (session) db.prepare('DELETE FROM admin_session WHERE id = ?').run(hash(session))
  deleteCookie(c, cookieName, { secure: true, path: '/' })
  return c.json({ ok: true })
})

admin.get('/comments', (c) => {
  const status = c.req.query('status') ?? 'pending'
  if (!['pending', 'visible', 'hidden', 'deleted'].includes(status))
    return c.json({ error: 'Invalid status' }, 400)
  const comments = db
    .prepare(
      `SELECT c.*, u.name as user_name, u.email as user_email
       FROM comments c JOIN "user" u ON c.user_id = u.id
       WHERE c.status = ?
       ORDER BY c.created_at DESC LIMIT 100`,
    )
    .all(status)
  return c.json({ comments })
})

admin.patch('/comments/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => null)
  const status = body?.status
  const allowed = ['visible', 'hidden', 'deleted']
  if (!allowed.includes(status)) return c.json({ error: 'Invalid status' }, 400)
  const result = db
    .prepare(`UPDATE comments SET status = ?, updated_at = ? WHERE id = ?`)
    .run(status, Date.now(), id)
  if (!result.changes) return c.json({ error: 'Comment not found' }, 404)
  return c.json({ ok: true })
})

admin.delete('/comments/:id', (c) => {
  const id = c.req.param('id')
  const result = db
    .prepare(`UPDATE comments SET status = 'deleted', updated_at = ? WHERE id = ?`)
    .run(Date.now(), id)
  if (!result.changes) return c.json({ error: 'Comment not found' }, 404)
  return c.json({ ok: true })
})

admin.post('/users/:id/ban', (c) => {
  const userId = c.req.param('id')
  db.prepare(
    `UPDATE comments SET status = 'hidden', updated_at = ? WHERE user_id = ? AND status = 'visible'`,
  ).run(Date.now(), userId)
  return c.json({ ok: true })
})

admin.get('/stats', (c) => {
  const stats = db.prepare(`SELECT status, COUNT(*) as count FROM comments GROUP BY status`).all()
  return c.json({ stats })
})

export default admin
