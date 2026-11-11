import { queryCollection } from '@nuxt/content/server'

export default defineEventHandler(async (event) => {
  const { site } = useAppConfig()
  const posts = await queryCollection(event, 'post')
    .where('draft', '=', false)
    .order('updated_at', 'DESC')
    .order('path', 'DESC')
    .select('path', 'title', 'description', 'date', 'updated_at')
    .all()
  const xml = (value: string) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;')

  setResponseHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(site.name)}</title>
    <link>${xml(site.url)}</link>
    <description>${xml(site.description ?? site.title)}</description>
    <language>${xml(site.language)}</language>
    <atom:link href="${xml(new URL('/rss.xml', site.url).href)}" rel="self" type="application/rss+xml" />
    ${posts[0] ? `<lastBuildDate>${new Date(posts[0].updated_at).toUTCString()}</lastBuildDate>` : ''}
    ${posts
      .map((post) => {
        const url = xml(new URL(post.path.replace(/^\/post/, '/blog'), site.url).href)
        return `<item>
      <title>${xml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${xml(post.description ?? '')}</description>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    </item>`
      })
      .join('\n')}
  </channel>
</rss>`
})
