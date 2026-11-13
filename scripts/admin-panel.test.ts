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
  const context = createContext({
    document,
    fetch: (path: string, options: RequestInit) => {
      requests++
      new Headers(options.headers)
      return admin.request(new URL(path, 'http://admin.fixture/'), options)
    },
  })
  runInContext(adminScript, context)
  const settle = async () => {
    for (let attempt = 0; attempt < 100 && runInContext('busy', context); attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    assert.equal(runInContext('busy', context), false, 'Panel action did not finish')
  }
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
    assert.equal(runInContext('token', context), '')
    assert.equal(elements.token!.value, invalid)
    assert.equal(elements.panel!.hidden, true)
  }
  elements.token!.value = 'incorrect'
  elements.login!.fire('submit')
  await settle()
  assert.equal(elements.panel!.hidden, true)
  assert.ok(elements.message!.textContent.includes('Access denied'))
  assert.equal(runInContext('token', context), '')
  elements.token!.value = process.env.COMMENTS_ADMIN_TOKEN
  elements.login!.fire('submit')
  await settle()
  assert.equal(elements.panel!.hidden, false)
  assert.equal(elements.token!.value, '')
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
  elements.logout!.fire('click')
  assert.equal(runInContext('token', context), '')
  assert.equal(elements.login!.hidden, false)
  assert.equal(elements.panel!.hidden, true)
  assert.equal(elements.comments!.children.length, 0)
})
