import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire, stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'

test('code blocks label their language and preserve highlighted content, attributes and Mermaid dispatch', async () => {
  const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
  const vue = require('vue')
  const { parse, compileScript } = require('vue/compiler-sfc')
  const { renderToString } = require('vue/server-renderer')
  const { descriptor } = parse(
    readFileSync(
      new URL('../apps/web/app/components/content/ProsePre.vue', import.meta.url),
      'utf8',
    ),
  )
  const compiled = compileScript(descriptor, {
    id: 'code-presentation',
    genDefaultAs: 'component',
    inlineTemplate: true,
  })
  const script = stripTypeScriptTypes(compiled.content).replace(
    /import \{([^}]+)\} from ['"]vue['"]/g,
    (_import, bindings: string) => 'const {' + bindings.replace(/\bas\b/g, ':') + '} = Vue;',
  )
  const component = new Function('Vue', script + '\nreturn component;')(vue)
  const render = (language?: string) => {
    const app = vue.createSSRApp({
      render: () =>
        vue.h(
          component,
          {
            language,
            code: 'flowchart TD\nA --> B',
            class: 'language-lua shiki',
            tabindex: 0,
            style: 'color:#a9b1d6;background-color:#1a1b26',
          },
          {
            default: () =>
              vue.h('code', null, vue.h('span', { style: 'color:#bb9af7' }, '<local>')),
          },
        ),
    })
    app.component('MermaidDiagram', {
      props: ['code'],
      setup: (props: { code: string }) => () => vue.h('figure', null, props.code),
    })
    return renderToString(app)
  }
  const html = await render('lua')
  assert.match(html, /class="code-block__language">lua<\/span>/)
  assert.match(html, /<pre[^>]*class="[^"]*language-lua shiki[^"]*"/)
  assert.match(html, /<pre[^>]*tabindex="0"/)
  assert.ok(html.includes('color:#a9b1d6'))
  assert.ok(html.includes('background-color:var(--bg)'))
  assert.ok(html.includes('<span style="color:#bb9af7">&lt;local&gt;</span>'))
  assert.match(await render(), /class="code-block__language">text<\/span>/)
  const mermaid = await render('mermaid')
  assert.ok(mermaid.includes('<figure>flowchart TD\nA --&gt; B</figure>'))
  assert.equal(mermaid.includes('code-block__language'), false)
})
