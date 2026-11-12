import type { MinimarkNode, MinimarkTree } from '@nuxt/content'

export function absoluteContentUrls(body: MinimarkTree, articleUrl: string): MinimarkTree {
  const visit = (node: MinimarkNode): MinimarkNode => {
    if (typeof node === 'string') return node
    const [tag, properties, ...children] = node
    const props = { ...properties }
    for (const key of ['href', 'src']) {
      if (typeof props[key] !== 'string') continue
      try {
        const url = new URL(props[key], articleUrl)
        const protocols =
          key === 'href' ? ['http:', 'https:', 'mailto:', 'tel:'] : ['http:', 'https:']
        props[key] = protocols.includes(url.protocol) ? url.href : undefined
      } catch {
        props[key] = undefined
      }
    }
    return [tag, props, ...children.map(visit)]
  }
  return { ...body, value: body.value.map(visit) }
}
