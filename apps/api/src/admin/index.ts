import { Hono } from 'hono'
import { db } from '../db.ts'

// ponytail: admin only on 127.0.0.1:3001, no auth needed (loopback only)
const admin = new Hono()

admin.get('/comments', (c) => {
  const status = c.req.query('status') ?? 'pending'
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
  const { status } = await c.req.json<{ status: string }>()
  const allowed = ['visible', 'hidden', 'deleted']
  if (!allowed.includes(status)) return c.json({ error: 'Invalid status' }, 400)
  db.prepare(`UPDATE comments SET status = ?, updated_at = ? WHERE id = ?`).run(
    status,
    Date.now(),
    id,
  )
  return c.json({ ok: true })
})

admin.delete('/comments/:id', (c) => {
  const id = c.req.param('id')
  db.prepare(`UPDATE comments SET status = 'deleted', updated_at = ? WHERE id = ?`).run(
    Date.now(),
    id,
  )
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
