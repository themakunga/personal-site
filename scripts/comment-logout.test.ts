import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire, stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'

test('comment logout waits for success, clears the draft and preserves a failed session for retry', async () => {
  const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
  const vue = require('vue')
  const { parse, compileScript } = require('vue/compiler-sfc')
  const { descriptor } = parse(
    readFileSync(new URL('../apps/web/app/components/PostComments.vue', import.meta.url), 'utf8'),
  )
  const compiled = compileScript(descriptor, {
    id: 'comment-logout-test',
    genDefaultAs: 'component',
  })
  const script = stripTypeScriptTypes(compiled.content).replace(
    /^import \{ defineComponent as _defineComponent \} from 'vue'\s*/,
    '',
  )
  let succeed = () => {}
  let fail = (_error: Error) => {}
  const requests: { url: string; method: string }[] = []
  const fetch = (url: string, options: { method: string }) => {
    requests.push({ url, method: options.method })
    return new Promise((resolve, reject) => {
      succeed = () => resolve({ success: true })
      fail = reject
    })
  }
  const component = new Function(
    '_defineComponent',
    'ref',
    'computed',
    'onMounted',
    'useAppConfig',
    '$fetch',
    script + '\nreturn component;',
  )(
    vue.defineComponent,
    vue.ref,
    vue.computed,
    () => {},
    () => ({ site: { language: 'en-US' } }),
    fetch,
  )
  const state = component.setup({ slug: 'fixture', show: true, enable: true }, { expose: () => {} })
  state.user.value = { name: 'Logout Fixture' }
  state.draft.value = 'Unsent comment'
  state.formError.value = 'Previous error'
  const pending = state.signOut()
  assert.equal(state.signingOut.value, true)
  assert.equal(state.user.value.name, 'Logout Fixture')
  assert.equal(state.formError.value, '')
  await state.signOut()
  assert.deepEqual(requests, [{ url: '/api/auth/sign-out', method: 'POST' }])
  succeed()
  await pending
  assert.equal(state.user.value, null)
  assert.equal(state.draft.value, '')
  assert.equal(state.signingOut.value, false)
  assert.equal(state.notice.value, 'Signed out.')

  state.user.value = { name: 'Logout Fixture' }
  state.draft.value = 'Keep this draft'
  const failed = state.signOut()
  fail(new Error('Fixture network failure'))
  await failed
  assert.equal(state.user.value.name, 'Logout Fixture')
  assert.equal(state.draft.value, 'Keep this draft')
  assert.equal(state.signingOut.value, false)
  assert.ok(state.formError.value.includes('Try again'))
  state.sending.value = true
  await state.signOut()
  assert.equal(requests.length, 2)
  state.sending.value = false
  const retry = state.signOut()
  succeed()
  await retry
  assert.equal(state.user.value, null)
  assert.equal(state.formError.value, '')
})
