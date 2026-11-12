import type { MinimarkNode, MinimarkTree } from '@nuxt/content'
import { h, type VNodeChild } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { absoluteContentUrls } from '../../app/utils/content-urls'

const tags = new Set(
  'p h1 h2 h3 h4 h5 h6 a img br hr ul ol li strong em del s blockquote pre code table thead tbody tfoot tr th td span div figure figcaption details summary sub sup kbd mark input'.split(
    ' ',
  ),
)
const attributes = new Set(
  'href src alt title id width height colspan rowspan start reversed open class className type checked disabled'.split(
    ' ',
  ),
)

export function renderFeedContent(body: MinimarkTree, articleUrl: string): Promise<string> {
  const render = (node: MinimarkNode): VNodeChild => {
    if (typeof node === 'string') return node
    const [tag, properties, ...children] = node
    if (['script', 'style', 'iframe', 'object', 'embed'].includes(tag)) return null
    // shortcut: custom MDC components keep their text; add feed rendering if posts rely on them.
    if (!tags.has(tag)) return children.map(render)
    if (tag === 'pre' && typeof properties.code === 'string') {
      return h('pre', [h('code', properties.code)])
    }
    const props = Object.fromEntries(
      Object.entries(properties).filter(([key]) => attributes.has(key)),
    )
    if (props.className) {
      props.class = props.className
      delete props.className
    }
    return h(tag, props, children.map(render))
  }
  return renderToString(h('div', absoluteContentUrls(body, articleUrl).value.map(render)))
}
