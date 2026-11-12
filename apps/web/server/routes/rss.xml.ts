import { queryCollection } from '@nuxt/content/server'
import { renderFeedContent } from '../utils/feed-content'

export default defineEventHandler(async (event) => {
  const { site } = useAppConfig()
  const posts = await queryCollection(event, 'post')
    .where('draft', '=', false)
    .order('updated_at', 'DESC')
    .order('path', 'DESC')
    .select('path', 'title', 'body', 'date', 'updated_at')
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
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${xml(site.name)}</title>
    <link>${xml(site.url)}</link>
    <description>${xml(site.description ?? site.title)}</description>
    <language>${xml(site.language)}</language>
    <atom:link href="${xml(new URL('/rss.xml', site.url).href)}" rel="self" type="application/rss+xml" />
    ${posts[0] ? `<lastBuildDate>${new Date(posts[0].updated_at).toUTCString()}</lastBuildDate>` : ''}
    ${(
      await Promise.all(
        posts.map(async (post) => {
          const articleUrl = new URL(post.path.replace(/^\/post/, '/blog'), site.url).href
          const url = xml(articleUrl)
          const content = xml(await renderFeedContent(post.body, articleUrl))
          return `<item>
      <title>${xml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${content}</description>
      <content:encoded>${content}</content:encoded>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    </item>`
        }),
      )
    ).join('\n')}
  </channel>
</rss>`
})
