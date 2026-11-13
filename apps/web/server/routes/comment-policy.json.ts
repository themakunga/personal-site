import { queryCollection } from '@nuxt/content/server'

export default defineEventHandler(async (event) => {
  const posts = await queryCollection(event, 'post')
    .where('draft', '=', false)
    .select('path', 'show_comments', 'enable_comments')
    .all()
  return Object.fromEntries(
    posts.map((post) => [
      post.path.replace(/^\/post\//, ''),
      { show_comments: !!post.show_comments, enable_comments: !!post.enable_comments },
    ]),
  )
})
