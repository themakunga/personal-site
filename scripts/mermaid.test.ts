import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire, stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'

const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const vue = require('vue')
const { parse, compileScript } = require('vue/compiler-sfc')

test('Mermaid renders after mount in strict mode and preserves source on failure', async () => {
  const { descriptor } = parse(
    readFileSync(new URL('../apps/web/app/components/MermaidDiagram.vue', import.meta.url), 'utf8'),
  )
  const compiled = compileScript(descriptor, { id: 'mermaid-test', genDefaultAs: 'component' })
  const script = stripTypeScriptTypes(compiled.content)
    .replace(/^import \{ defineComponent as _defineComponent \} from 'vue'\s*/, '')
    .replace("import('mermaid')", 'Promise.resolve({ default: renderer })')
  const calls: string[] = []
  const jobs: { resolve: (value: { svg: string }) => void; reject: (error: Error) => void }[] = []
  const renderer = {
    initialize: (config: { securityLevel: string; startOnLoad: boolean }) => {
      assert.equal(config.securityLevel, 'strict')
      assert.equal(config.startOnLoad, false)
    },
    render: (_id: string, code: string) => {
      calls.push(code)
      return new Promise((resolve, reject) => jobs.push({ resolve, reject }))
    },
  }
  let mount = () => {}
  const component = new Function(
    '_defineComponent',
    'ref',
    'watch',
    'onMounted',
    'useId',
    'renderer',
    script + '\nreturn component;',
  )(
    vue.defineComponent,
    vue.ref,
    vue.watch,
    (callback: () => void) => {
      mount = callback
    },
    () => 'fixture',
    renderer,
  )
  const props = vue.reactive({ code: 'flowchart TD\n A --> B' })
  const scope = vue.effectScope()
  const state = scope.run(() => component.setup(props, { expose() {} }))
  assert.equal(calls.length, 0, 'SSR must not import or render Mermaid')
  scope.run(mount)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(calls[0], props.code)
  props.code = 'sequenceDiagram\n A->>B: hello'
  await vue.nextTick()
  await new Promise((resolve) => setImmediate(resolve))
  jobs[0]!.resolve({ svg: '<svg>stale</svg>' })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(state.svg.value, '', 'A stale render must not replace the current diagram')
  jobs[1]!.resolve({ svg: '<svg>current</svg>' })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(state.svg.value, '<svg>current</svg>')
  props.code = 'invalid diagram'
  await vue.nextTick()
  await new Promise((resolve) => setImmediate(resolve))
  jobs[2]!.reject(new Error('Invalid diagram'))
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(state.svg.value, '')
  assert.equal(state.failed.value, true)
  scope.stop()
})
