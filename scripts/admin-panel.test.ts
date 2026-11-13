import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createContext, runInContext } from 'node:vm'
import { test } from 'node:test'

test('LAN panel authenticates, renders plain text, approves, deletes and clears access on logout', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'admin-panel-'))
  process.env.DATA_DIR = directory
  process.env.COMMENTS_ADMIN_TOKEN = 'fixture-private-admin-key-over-32-characters'
  const { db } = await import('../apps/api/src/db.ts')
  const { default: admin } = await import('../apps/api/src/admin/index.ts')
  const { adminScript } = await import('../apps/api/src/admin/page.ts')
  t.after(() => {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  })
  const now = Date.now()
  db.prepare('INSERT INTO "user" (id,name,email,"createdAt","updatedAt") VALUES (?,?,?,?,?)').run(
    'fixture',
    '<img src=x onerror=alert(1)>',
    'fixture@example.com',
    now,
    now,
  )
  db.prepare(
    'INSERT INTO comments (id,post_slug,user_id,body_markdown,status,created_at) VALUES (?,?,?,?,?,?)',
  ).run(
    'fixture-comment',
    '2026/example',
    'fixture',
    '<script>literal text</script>',
    'pending',
    now,
  )
  const nodes: Element[] = []
  class Element {
    textContent = ''
    value = ''
    hidden = false
    disabled = false
    type = ''
    children: Element[] = []
    events = new Map<string, (event: { preventDefault: () => void }) => unknown>()
    constructor(public tag: string) {
      nodes.push(this)
    }
    set innerHTML(_value: string) {
      throw new Error('User content must be rendered as text')
    }
    append(...children: Element[]) {
      this.children.push(...children)
    }
    replaceChildren() {
      this.children = []
    }
    addEventListener(name: string, callback: (event: { preventDefault: () => void }) => unknown) {
      this.events.set(name, callback)
    }
    fire(name: string) {
      return this.events.get(name)?.({ preventDefault() {} })
    }
    focus() {}
  }
  const elements = Object.fromEntries(
    ['login', 'panel', 'token', 'status', 'comments', 'message', 'refresh', 'logout'].map((id) => [
      id,
      new Element(id === 'status' ? 'select' : 'div'),
    ]),
  )
  elements.panel!.hidden = true
  elements.status!.value = 'pending'
  const document = {
    querySelector: (selector: string) => elements[selector.slice(1)],
    querySelectorAll: () => nodes.filter((node) => ['button', 'select'].includes(node.tag)),
    createElement: (tag: string) => new Element(tag),
  }
  let requests = 0
  let cookie = ''
  const browser = {
    document,
    fetch: async (path: string, options: RequestInit) => {
      requests++
      const headers = new Headers(options.headers)
      if (cookie) headers.set('Cookie', cookie)
      const response = await admin.request(new URL(path, 'https://admin.fixture/'), {
        ...options,
        headers,
      })
      const setCookie = response.headers.get('Set-Cookie')
      if (setCookie) cookie = setCookie.split(';')[0]!
      return response
    },
  }
  const context = createContext({ ...browser })
  runInContext(adminScript, context)
  const settle = async (target = context) => {
    for (let attempt = 0; attempt < 100 && runInContext('busy', target); attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    assert.equal(runInContext('busy', target), false, 'Panel action did not finish')
  }
  await settle()
  requests = 0
  for (const invalid of [
    'a'.repeat(37) + '│',
    'a'.repeat(37) + 'é',
    'a'.repeat(37) + '\nextra',
    'COMMENTS_ADMIN_TOKEN=' + process.env.COMMENTS_ADMIN_TOKEN,
    '"' + process.env.COMMENTS_ADMIN_TOKEN + '"',
    '',
  ]) {
    elements.token!.value = invalid
    elements.login!.fire('submit')
    await settle()
    assert.equal(requests, 0, 'Malformed keys must not reach fetch or a header constructor')
    assert.ok(elements.message!.textContent.includes('Paste only the key value'))
    assert.equal(runInContext('typeof token', context), 'undefined')
    assert.equal(elements.token!.value, invalid)
    assert.equal(elements.panel!.hidden, true)
  }
  elements.token!.value = 'incorrect'
  elements.login!.fire('submit')
  await settle()
  assert.equal(elements.panel!.hidden, true)
  assert.ok(elements.message!.textContent.includes('Access denied'))
  assert.equal(runInContext('typeof token', context), 'undefined')
  elements.token!.value = process.env.COMMENTS_ADMIN_TOKEN
  elements.login!.fire('submit')
  await settle()
  assert.equal(elements.panel!.hidden, false)
  assert.equal(elements.token!.value, '')
  assert.ok(cookie.startsWith('__Host-comments-admin='))
  assert.equal(db.prepare('SELECT count(*) AS count FROM admin_session').get().count, 1)
  assert.ok(!cookie.includes(process.env.COMMENTS_ADMIN_TOKEN!))
  const article = elements.comments!.children[0]!
  assert.equal(article.children[0]!.textContent, '<img src=x onerror=alert(1)>')
  assert.equal(article.children[3]!.textContent, '<script>literal text</script>')
  await article.children.find((node) => node.textContent === 'Approve')!.fire('click')
  assert.equal(db.prepare('SELECT status FROM comments').get().status, 'visible')
  assert.equal(elements.comments!.children.length, 0)
  elements.status!.value = 'visible'
  elements.status!.fire('change')
  await settle()
  await elements
    .comments!.children[0]!.children.find((node) => node.textContent === 'Delete')!
    .fire('click')
  assert.equal(db.prepare('SELECT status FROM comments').get().status, 'deleted')
  assert.equal(elements.comments!.children.length, 0)
  const replayCookie = cookie
  const reloaded = createContext({ ...browser })
  runInContext(adminScript, reloaded)
  await settle(reloaded)
  assert.equal(elements.panel!.hidden, false, 'Reload must restore the session')
  elements.logout!.fire('click')
  await settle(reloaded)
  assert.equal((await admin.request('/stats', { headers: { Cookie: replayCookie } })).status, 401)
  assert.equal(runInContext('typeof token', context), 'undefined')
  assert.equal(elements.login!.hidden, false)
  assert.equal(elements.panel!.hidden, true)
  assert.equal(elements.comments!.children.length, 0)
  const signIn = () =>
    admin.request('/session', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.COMMENTS_ADMIN_TOKEN },
    })
  const response = await signIn()
  const header = response.headers.get('Set-Cookie')!
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Max-Age=604800', 'Path=/'])
    assert.ok(header.includes(attribute), attribute)
  const saved = header.split(';')[0]!
  assert.equal((await admin.request('/stats', { headers: { Cookie: saved } })).status, 200)
  assert.equal(
    (await admin.request('/session', { method: 'DELETE', headers: { Cookie: saved } })).status,
    403,
  )
  assert.equal(
    (await admin.request('/stats', { headers: { Cookie: saved + 'tampered' } })).status,
    401,
  )
  db.prepare('UPDATE admin_session SET expires_at = ?').run(Date.now() - 1)
  assert.equal((await admin.request('/stats', { headers: { Cookie: saved } })).status, 401)
  const fresh = (await signIn()).headers.get('Set-Cookie')!.split(';')[0]!
  process.env.COMMENTS_ADMIN_TOKEN = 'rotated-fixture-key-over-32-characters'
  assert.equal((await admin.request('/stats', { headers: { Cookie: fresh } })).status, 401)
})
