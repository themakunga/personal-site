import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

test('logout revokes the current session, clears cookies and rejects replay on comments', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'logout-session-'))
  const secret = 'isolated-logout-fixture-session-secret-over-32-characters'
  const base = 'http://localhost:3000'
  process.env.DATA_DIR = directory
  process.env.BETTER_AUTH_SECRET = secret
  process.env.PUBLIC_URL = base
  process.env.TRUSTED_ORIGINS = base
  const { auth } = await import('../apps/api/src/auth.ts')
  const { db } = await import('../apps/api/src/db.ts')
  const { default: comments } = await import('../apps/api/src/routes/comments.ts')
  t.after(() => {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  })
  const context = await auth.$context
  const user = await context.internalAdapter.createUser({
    name: 'Logout Fixture',
    email: 'logout@example.com',
    emailVerified: true,
  })
  const session = await context.internalAdapter.createSession(user.id)
  const other = await context.internalAdapter.createSession(user.id)
  const cookieFor = (token: string) =>
    `${context.authCookies.sessionToken.name}=${encodeURIComponent(token + '.' + createHmac('sha256', secret).update(token).digest('base64'))}`
  const cookies = new Map(
    cookieFor(session.token)
      .split('; ')
      .map((value) => {
        const equals = value.indexOf('=')
        return [value.slice(0, equals), value.slice(equals + 1)]
      }),
  )
  const cookieHeader = () => [...cookies].map(([key, value]) => `${key}=${value}`).join('; ')
  const current = await auth.handler(
    new Request(`${base}/api/auth/get-session`, { headers: { Cookie: cookieHeader() } }),
  )
  assert.equal(current.status, 200)
  assert.equal((await current.json()).user.id, user.id)
  for (const cookie of current.headers.getSetCookie()) {
    const pair = cookie.split(';')[0]!
    const equals = pair.indexOf('=')
    cookies.set(pair.slice(0, equals), pair.slice(equals + 1))
  }
  const oldCookies = cookieHeader()
  const forbidden = await auth.handler(
    new Request(`${base}/api/auth/sign-out`, {
      method: 'POST',
      headers: { Cookie: oldCookies, Origin: 'https://untrusted.example' },
    }),
  )
  assert.equal(forbidden.status, 403)
  const loggedOut = await auth.handler(
    new Request(`${base}/api/auth/sign-out`, {
      method: 'POST',
      headers: { Cookie: oldCookies, Origin: base },
    }),
  )
  assert.equal(loggedOut.status, 200)
  assert.equal((await loggedOut.json()).success, true)
  assert.ok(
    loggedOut.headers
      .getSetCookie()
      .some(
        (cookie) =>
          cookie.startsWith(context.authCookies.sessionToken.name + '=') &&
          /max-age=0/i.test(cookie),
      ),
  )
  assert.equal(
    db.prepare('SELECT COUNT(*) AS count FROM session WHERE token = ?').get(session.token).count,
    0,
  )
  const replay = await auth.handler(
    new Request(`${base}/api/auth/get-session`, { headers: { Cookie: oldCookies } }),
  )
  assert.equal(
    (await replay.json()) === null,
    true,
    'Revoked sessions must not survive through a cached cookie',
  )
  const denied = await comments.request('/fixture', {
    method: 'POST',
    headers: { Cookie: oldCookies },
    body: '{}',
  })
  assert.equal(denied.status, 401)
  const unaffected = await auth.handler(
    new Request(`${base}/api/auth/get-session`, { headers: { Cookie: cookieFor(other.token) } }),
  )
  assert.equal((await unaffected.json()).user.id, user.id)
  const anonymous = await auth.handler(
    new Request(`${base}/api/auth/sign-out`, { method: 'POST', headers: { Origin: base } }),
  )
  assert.equal(anonymous.status, 200)
})
