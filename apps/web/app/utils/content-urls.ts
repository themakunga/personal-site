import type { MinimarkNode, MinimarkTree } from '@nuxt/content'

export function absoluteContentUrls(
  body: MinimarkTree,
  articleUrl: string,
  internalLinks: 'absolute' | 'relative' = 'absolute',
): MinimarkTree {
  const origin = new URL(articleUrl).origin
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
        if (
          key === 'href' &&
          props[key] &&
          internalLinks === 'relative' &&
          url.origin === origin &&
          !url.pathname.startsWith('//')
        ) {
          props[key] = url.pathname + url.search + url.hash
        }
      } catch {
        props[key] = undefined
      }
    }
    return [tag, props, ...children.map(visit)]
  }
  return { ...body, value: body.value.map(visit) }
}
