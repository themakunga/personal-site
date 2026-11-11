<template>
  <article v-if="post" class="post">
    <header class="post__header">
      <time :datetime="String(post.date)" class="post__date">{{ formatDate(post.date) }}</time>
      <h2 class="post__title">{{ post.title }}</h2>
      <div v-if="post.tags?.length" class="post__tags">
        <NuxtLink v-for="tag in post.tags" :key="tag" :to="`/tags/${tag}`" class="tag">
          #{{ tag }}
        </NuxtLink>
      </div>
      <audio v-if="post.audio" class="post__audio" controls preload="metadata">
        <source :src="audioSrc" type="audio/ogg; codecs=opus" />
        Tu navegador no puede reproducir este audio.
      </audio>
    </header>

    <div class="post__body prose">
      <ContentRenderer :value="post" />
    </div>

    <nav v-if="surroundings?.some(Boolean)" class="post__navigation" aria-label="Post navigation">
      <NuxtLink
        v-if="surroundings?.[0]"
        :to="surroundings[0].path.replace(/^\/post/, '/blog')"
        rel="prev"
        class="post__previous"
      >
        <span>← Previous post</span>
        {{ surroundings[0].title }}
      </NuxtLink>
      <NuxtLink
        v-if="surroundings?.[1]"
        :to="surroundings[1].path.replace(/^\/post/, '/blog')"
        rel="next"
        class="post__next"
      >
        <span>Next post →</span>
        {{ surroundings[1].title }}
      </NuxtLink>
    </nav>

    <PostComments
      v-if="post.show_comments || post.enable_comments"
      :slug="slugParts.join('/')"
      :show="!!post.show_comments"
      :enable="!!post.enable_comments"
    />
  </article>

  <div v-else class="not-found">
    <p>Entrada no encontrada.</p>
    <NuxtLink to="/blog">← Volver al blog</NuxtLink>
  </div>
</template>

<script setup lang="ts">
const config = useAppConfig()
const route = useRoute()

// route.params.slug is string[] for [...slug]
const slugParts = computed(() => {
  const s = route.params.slug
  return Array.isArray(s) ? s : [s]
})

const contentPath = computed(() => `/post/${slugParts.value.join('/')}`)

const { data: post } = await useAsyncData(
  () => `post-${contentPath.value}`,
  () => queryCollection('post').path(contentPath.value).first(),
)

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found' })
}

const { data: navigation } = await useAsyncData('post-navigation', () =>
  queryCollection('post')
    .where('draft', '=', false)
    .order('updated_at', 'ASC')
    .order('path', 'ASC')
    .select('path', 'title')
    .all(),
)
const surroundings = computed(() => {
  const posts = navigation.value ?? []
  const index = posts.findIndex((item) => item.path === contentPath.value)
  return index < 0 ? [] : [posts[index - 1], posts[index + 1]]
})

const audioSrc = computed(
  () =>
    `/audio/${slugParts.value.join('/')}.ogg?v=${encodeURIComponent(post.value?.updated_at ?? '')}`,
)

const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString(config.site.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

useSeoMeta({
  title: () => `${post.value?.title} — ${config.site.name}`,
  description: () => post.value?.description,
  ogTitle: () => post.value?.title,
  ogDescription: () => post.value?.description,
})
</script>

<style scoped>
.post__header {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--bg-highlight);
}

.post__date {
  color: var(--comment);
  font-size: 0.8rem;
}

.post__title {
  color: var(--fg);
  font-size: 1.5rem;
  margin: 0.5rem 0;
}

.post__tags {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.post__audio {
  width: 100%;
  margin-top: 1rem;
}

.post__navigation {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--bg-highlight);
}

.post__navigation a {
  color: var(--blue);
  overflow-wrap: anywhere;
}

.post__navigation span {
  display: block;
  color: var(--fg-muted);
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
}

.post__next {
  grid-column: 2;
  text-align: right;
}

@media (max-width: 600px) {
  .post__navigation {
    grid-template-columns: 1fr;
  }

  .post__next {
    grid-column: 1;
  }
}

.tag {
  color: var(--purple);
  font-size: 0.8rem;
  text-decoration: none;
}

.tag:hover {
  color: var(--cyan);
}

.not-found {
  color: var(--fg-muted);
}

/* prose styles for rendered markdown */
:deep(.prose) {
  color: var(--fg);
  line-height: 1.8;
}

:deep(.prose h1),
:deep(.prose h2),
:deep(.prose h3) {
  color: var(--yellow);
  margin: 1.5rem 0 0.5rem;
}

:deep(.prose code) {
  background: var(--bg-highlight);
  padding: 0.1em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
}

:deep(.prose pre) {
  background: var(--bg-dark);
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
}

:deep(.prose pre code) {
  background: none;
  padding: 0;
}

:deep(.prose blockquote) {
  border-left: 3px solid var(--blue);
  padding-left: 1rem;
  color: var(--fg-muted);
}
</style>
