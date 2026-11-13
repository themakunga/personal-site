import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

test('enforces article policy, validation, CAPTCHA and pending-first moderation', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'comment-flow-'))
  process.env.DATA_DIR = directory
  process.env.BETTER_AUTH_SECRET = 'isolated-comment-test-session-secret-over-32-characters'
  process.env.ALTCHA_HMAC_KEY = 'isolated-comment-test-captcha-secret'
  process.env.COMMENT_POLICY_URL = 'http://fixture/comment-policy.json'
  const { auth } = await import('../apps/api/src/auth.ts')
  const { db } = await import('../apps/api/src/db.ts')
  const { default: comments } = await import('../apps/api/src/routes/comments.ts')
  const { default: admin } = await import('../apps/api/src/admin/index.ts')
  t.after(() => {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  })
  const now = Date.now()
  db.prepare(
    'INSERT INTO "user" (id, name, email, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?)',
  ).run('fixture-user', 'Fixture User', 'fixture@example.com', now, now)
  let signedIn = true
  t.mock.method(auth.api, 'getSession', async () =>
    signedIn ? { user: { id: 'fixture-user' } } : null,
  )
  let unavailable = false
  const policy = {
    disabled: { show_comments: false, enable_comments: false },
    readonly: { show_comments: true, enable_comments: false },
    writeonly: { show_comments: false, enable_comments: true },
    enabled: { show_comments: true, enable_comments: true },
  }
  let policyPayload: unknown = policy
  t.mock.method(globalThis, 'fetch', async () => {
    if (unavailable) throw new Error('Fixture policy unavailable')
    return new Response(JSON.stringify(policyPayload))
  })
  const require = createRequire(new URL('../apps/api/package.json', import.meta.url))
  const { createChallenge } = require('altcha-lib')
  const challenge = await createChallenge({ hmacKey: process.env.ALTCHA_HMAC_KEY, number: 1 })
  const altcha = Buffer.from(JSON.stringify({ ...challenge, number: 1 })).toString('base64')
  let requests = 0
  const submit = (slug: string, body: unknown, ip = `fixture-${requests++}`) =>
    comments.request(`/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
      body: JSON.stringify(body),
    })
  const valid = { body_markdown: 'A fixture comment.', altcha }
  signedIn = false
  assert.equal((await submit('enabled', valid)).status, 401)
  signedIn = true
  for (const slug of ['disabled', 'readonly', 'draft', 'missing', '__proto__']) {
    assert.equal((await submit(slug, valid)).status, 403)
  }
  unavailable = true
  assert.equal((await submit('enabled', valid)).status, 503)
  assert.equal((await comments.request('/enabled')).status, 503)
  unavailable = false
  for (const invalid of [
    null,
    [],
    'invalid',
    { enabled: { show_comments: 'true', enable_comments: true } },
  ]) {
    policyPayload = invalid
    assert.equal((await submit('enabled', valid)).status, 503)
  }
  policyPayload = policy
  for (const body of [
    null,
    [],
    { ...valid, body_markdown: 123 },
    { ...valid, parent_id: [] },
    { ...valid, altcha: 123 },
    { body_markdown: 'Missing CAPTCHA' },
    { ...valid, altcha: 'invalid' },
    { ...valid, altcha: Buffer.from('null').toString('base64') },
    { ...valid, body_markdown: '   ' },
    { ...valid, body_markdown: 'a'.repeat(2001) },
    { ...valid, body_markdown: '<script>test</script>' },
    { ...valid, body_markdown: '[link](https://example.com)' },
    { ...valid, parent_id: 'missing' },
    { ...valid, parent_id: '' },
  ]) {
    assert.equal((await submit('enabled', body)).status, 400, JSON.stringify(body))
  }
  const created = await submit('enabled', valid)
  assert.equal(created.status, 201)
  const { id } = await created.json()
  const saved = db.prepare('SELECT * FROM comments WHERE id = ?').get(id)
  assert.deepEqual(saved, {
    id,
    post_slug: 'enabled',
    user_id: 'fixture-user',
    parent_id: null,
    body_markdown: valid.body_markdown,
    status: 'pending',
    created_at: saved.created_at,
    updated_at: null,
  })
  assert.deepEqual(await (await comments.request('/enabled')).json(), { comments: [] })
  const pending = await (await admin.request('/comments')).json()
  assert.equal(pending.comments[0].id, id)
  const moderate = (status: string) =>
    admin.request(`/comments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  assert.equal((await moderate('visible')).status, 200)
  const visible = (await (await comments.request('/enabled')).json()).comments
  assert.equal(visible.length, 1)
  assert.equal(visible[0].user_name, 'Fixture User')
  policy.enabled.show_comments = false
  policy.enabled.enable_comments = false
  assert.deepEqual(await (await comments.request('/enabled')).json(), { comments: [] })
  assert.equal((await submit('enabled', valid)).status, 403)
  policy.enabled.show_comments = true
  policy.enabled.enable_comments = true
  for (const key of ['email', 'user_email', 'token', 'accessToken', 'refreshToken']) {
    assert.equal(Object.hasOwn(visible[0], key), false)
  }
  assert.equal((await submit('writeonly', { ...valid, parent_id: id })).status, 400)
  assert.equal((await submit('writeonly', valid)).status, 201)
  assert.deepEqual(await (await comments.request('/writeonly')).json(), { comments: [] })
  assert.equal((await moderate('hidden')).status, 200)
  assert.deepEqual(await (await comments.request('/enabled')).json(), { comments: [] })
  assert.equal((await admin.request(`/comments/${id}`, { method: 'DELETE' })).status, 200)
  assert.equal(db.prepare('SELECT status FROM comments WHERE id = ?').get(id).status, 'deleted')
  for (let index = 0; index < 5; index++)
    assert.equal((await submit('enabled', {}, 'rate-limit-fixture')).status, 400)
  assert.equal((await submit('enabled', {}, 'rate-limit-fixture')).status, 429)
})
