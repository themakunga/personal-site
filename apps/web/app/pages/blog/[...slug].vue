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

    <PostNavigation :previous="surroundings[0]" :next="surroundings[1]" />

    <PostBody :value="post" class="post__body" />

    <PostNavigation :previous="surroundings[0]" :next="surroundings[1]" />

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
</style>
