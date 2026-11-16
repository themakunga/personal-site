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
  const palette = Object.fromEntries(
    [
      ...readFileSync(
        new URL('../apps/web/app/assets/css/theme.css', import.meta.url),
        'utf8',
      ).matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi),
    ].map((match) => [match[1], match[2]]),
  )
  let theme: { theme?: string; themeVariables?: Record<string, string | boolean> } = {}
  const renderer = {
    initialize: (config: {
      securityLevel: string
      startOnLoad: boolean
      theme: string
      themeVariables: Record<string, string | boolean>
    }) => {
      assert.equal(config.securityLevel, 'strict')
      assert.equal(config.startOnLoad, false)
      theme = config
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
    'getComputedStyle',
    'document',
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
    () => ({
      fontFamily: 'monospace',
      getPropertyValue: (name: string) => palette[name.slice(2)] ?? '',
    }),
    { documentElement: {} },
  )
  const props = vue.reactive({ code: 'flowchart TD\n A --> B' })
  const scope = vue.effectScope()
  const state = scope.run(() => component.setup(props, { expose() {} }))
  assert.equal(calls.length, 0, 'SSR must not import or render Mermaid')
  scope.run(mount)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(theme.theme, 'base')
  assert.equal(theme.themeVariables?.darkMode, true)
  assert.equal(theme.themeVariables?.background, palette.bg)
  assert.equal(theme.themeVariables?.primaryColor, palette['bg-highlight'])
  assert.equal(theme.themeVariables?.primaryBorderColor, palette.blue)
  assert.equal(theme.themeVariables?.primaryTextColor, palette.fg)
  assert.equal(theme.themeVariables?.lineColor, palette.cyan)
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
