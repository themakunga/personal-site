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
    </header>

    <div class="post__body prose">
      <ContentRenderer :value="post" />
    </div>
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

const { data: post } = await useAsyncData(`post-${contentPath.value}`, () =>
  queryCollection('post').path(contentPath.value).first(),
)

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found' })
}

const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString(config.site.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

useSeoMeta({
  title: `${post.value?.title} — ${config.site.name}`,
  description: post.value?.description,
  ogTitle: post.value?.title,
  ogDescription: post.value?.description,
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
