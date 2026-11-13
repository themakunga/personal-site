import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire, stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'

test('renders grouped social buttons, accessible comment provider icons and a distinct logout button', async () => {
  const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
  const vue = require('vue')
  const { parse, compileScript } = require('vue/compiler-sfc')
  const { renderToString } = require('vue/server-renderer')
  const { descriptor } = parse(
    readFileSync(new URL('../apps/web/app/components/PostComments.vue', import.meta.url), 'utf8'),
  )
  const compiled = compileScript(descriptor, {
    id: 'comment-presentation',
    genDefaultAs: 'component',
    inlineTemplate: true,
  })
  const script = stripTypeScriptTypes(compiled.content).replace(
    /import \{([^}]+)\} from ['"]vue['"]/g,
    (_import, bindings: string) => 'const {' + bindings.replace(/\bas\b/g, ':') + '} = Vue;',
  )
  const render = async (user: { name: string } | null) => {
    const fetch = async (path: string) => {
      if (path.endsWith('get-session')) return user ? { user } : null
      if (path.endsWith('providers')) return { providers: ['github', 'google', 'linkedin'] }
      return {
        comments: ['github', 'google', 'linkedin', null, '../../unexpected'].map(
          (provider_id, index) => ({
            id: String(index),
            user_name: '<Author>',
            body_markdown: 'Fixture comment',
            created_at: 1,
            provider_id,
          }),
        ),
      }
    }
    const component = new Function(
      'Vue',
      'ref',
      'computed',
      'onMounted',
      'useAppConfig',
      '$fetch',
      script + '\nreturn component;',
    )(
      vue,
      vue.ref,
      vue.computed,
      (callback: () => void) => callback(),
      () => ({ site: { language: 'en-US' } }),
      fetch,
    )
    const setup = component.setup
    component.setup = async (...args: unknown[]) => {
      const result = setup(...args)
      await Promise.resolve()
      return result
    }
    return renderToString(
      vue.createSSRApp(component, { slug: 'fixture', show: true, enable: true }),
    )
  }
  const anonymous = await render(null)
  assert.match(anonymous, /class="comments__providers"[^>]*role="group"/)
  for (const provider of ['github', 'google', 'linkedin']) {
    assert.ok(anonymous.includes(`/icons/mdi/mdi-${provider}.svg`))
  }
  for (const label of ['GitHub', 'Google', 'LinkedIn'])
    assert.ok(anonymous.includes(`aria-label="Signed in with ${label}"`))
  assert.ok(anonymous.includes('aria-label="Login provider unavailable"'))
  assert.ok(anonymous.includes('/icons/mdi/mdi-account.svg'))
  assert.equal(anonymous.includes('/icons/mdi/mdi-../../unexpected.svg'), false)
  assert.ok(anonymous.includes('&lt;Author&gt;'))
  const signedIn = await render({ name: 'Fixture User' })
  assert.ok(signedIn.includes('class="btn btn--logout"'))
  assert.ok(signedIn.includes('/icons/mdi/mdi-logout.svg'))
  assert.equal(signedIn.includes('class="comments__providers"'), false)
})
