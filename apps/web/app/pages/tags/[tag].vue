<template>
  <div>
    <nav class="breadcrumb">
      <NuxtLink to="/blog">← Blog</NuxtLink>
    </nav>

    <h2 class="page-title"><span class="tag-prefix">#</span>{{ tag }}</h2>

    <ul class="post-list">
      <li v-for="post in posts" :key="post.path" class="post-list__item">
        <NuxtLink :to="`/blog${post.path.replace('/post', '')}`" class="post-list__link">
          <time :datetime="String(post.date)" class="post-list__date">{{
            formatDate(post.date)
          }}</time>
          <span class="post-list__title">{{ post.title }}</span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const config = useAppConfig()
const route = useRoute()
const tag = route.params.tag as string

const { data: posts } = await useAsyncData(`tag-${tag}`, async () => {
  const all = await queryCollection('post').where('draft', '=', false).order('date', 'DESC').all()
  return all.filter((p) => p.tags?.includes(tag))
})

const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString(config.site.language, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

useSeoMeta({ title: `#${tag} — ${config.site.name}` })
</script>

<style scoped>
.breadcrumb {
  margin-bottom: 1.5rem;
  font-size: 0.85rem;
}

.breadcrumb a {
  color: var(--comment);
}

.page-title {
  color: var(--fg);
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
}

.tag-prefix {
  color: var(--purple);
}

.post-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.post-list__link {
  display: flex;
  gap: 1.5rem;
  color: var(--fg);
  text-decoration: none;
}

.post-list__link:hover .post-list__title {
  color: var(--blue);
}

.post-list__date {
  color: var(--comment);
  font-size: 0.85rem;
  white-space: nowrap;
}
</style>
