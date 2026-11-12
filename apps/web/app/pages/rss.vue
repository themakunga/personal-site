<template>
  <main class="reader">
    <header class="reader__header">
      <NuxtLink to="/">← {{ config.site.name }}</NuxtLink>
      <h1>Reading mode</h1>
      <p>Read complete posts here, or subscribe in your RSS app.</p>
      <label for="feed-url">RSS feed URL</label>
      <input id="feed-url" :value="feedUrl" readonly type="url" />
      <SocialLinks />
    </header>

    <article v-for="post in readingPosts" :key="post.path" class="reader__post">
      <header>
        <time :datetime="post.date">{{ formatDate(post.date) }}</time>
        <h2>
          <NuxtLink :to="post.path.replace(/^\/post/, '/blog')">{{ post.title }}</NuxtLink>
        </h2>
      </header>
      <PostBody :value="post" />
    </article>
    <p v-if="!readingPosts.length">No published posts yet.</p>
  </main>
</template>

<script setup lang="ts">
import { absoluteContentUrls } from '../utils/content-urls'

definePageMeta({ layout: false })

const config = useAppConfig()
const feedUrl = new URL('/rss.xml', config.site.url).href
const { data: posts } = await useAsyncData('rss-reading-posts', () =>
  queryCollection('post')
    .where('draft', '=', false)
    .order('updated_at', 'DESC')
    .order('path', 'DESC')
    .all(),
)
const readingPosts = computed(() =>
  (posts.value ?? []).map((post) => ({
    ...post,
    body: absoluteContentUrls(
      post.body,
      new URL(post.path.replace(/^\/post/, '/blog'), config.site.url).href,
    ),
  })),
)
const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(config.site.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

useSeoMeta({ title: `RSS — ${config.site.name}`, description: config.site.description })
useHead({
  link: [{ rel: 'alternate', type: 'application/rss+xml', title: config.site.name, href: feedUrl }],
})
</script>

<style scoped>
.reader {
  max-width: 76ch;
  margin: 0 auto;
  padding: 2rem 1.25rem 4rem;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.125rem;
  line-height: 1.8;
  overflow-wrap: anywhere;
}

.reader__header {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.9rem;
}

.reader__header label {
  display: block;
}

.reader__header input {
  width: 100%;
  padding: 0.6rem;
  color: var(--fg);
  background: var(--bg-dark);
  border: 1px solid var(--fg-muted);
  border-radius: 4px;
  font: inherit;
}

.reader__post {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--fg-muted);
}

.reader__post time {
  color: var(--fg-muted);
  font-size: 0.9rem;
}

.reader__post :deep(code),
.reader__post :deep(pre) {
  font-family: 'JetBrains Mono', monospace;
}
</style>
