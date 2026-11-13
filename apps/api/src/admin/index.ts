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
admin.use('*', async (c, next) => {
  const token = process.env.COMMENTS_ADMIN_TOKEN
  if (!token || token.length < 32) return c.json({ error: 'Admin access is not configured' }, 503)
  return bearerAuth({ token })(c, next)
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
