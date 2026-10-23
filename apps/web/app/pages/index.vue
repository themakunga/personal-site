<template>
  <div class="home">
    <section class="home__posts">
      <h2>Últimas entradas</h2>
      <ul class="post-list">
        <li v-for="post in recentPosts" :key="post.path" class="post-list__item">
          <NuxtLink :to="`/blog${post.path.replace('/post', '')}`" class="post-list__link">
            <span class="post-list__date">{{ formatDate(post.date) }}</span>
            <span class="post-list__title">{{ post.title }}</span>
          </NuxtLink>
        </li>
      </ul>
      <NuxtLink to="/blog" class="home__more">Ver todos →</NuxtLink>
    </section>
  </div>
</template>

<script setup lang="ts">
const config = useAppConfig()

const { data: recentPosts } = await useAsyncData('home-posts', () =>
  queryCollection('post').where('draft', '=', false).order('date', 'DESC').limit(5).all(),
)

const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString(config.site.language, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

useSeoMeta({
  title: config.site.title,
  description: config.site.description,
  ogTitle: config.site.title,
  ogDescription: config.site.description,
})
</script>

<style scoped>
.home {
  display: grid;
  gap: 3rem;
}

h2 {
  color: var(--yellow);
  font-size: 1rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 1rem;
}

.post-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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

.home__more {
  display: inline-block;
  margin-top: 1rem;
  color: var(--blue);
  font-size: 0.85rem;
}
</style>
