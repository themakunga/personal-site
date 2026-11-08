<template>
  <div class="home">
    <article v-if="featuredPost" class="home__hero">
      <NuxtLink :to="`/blog${featuredPost.path.replace('/post', '')}`" class="home__hero-link">
        <img
          v-if="featuredPost.image"
          :src="featuredPost.image"
          alt=""
          class="home__hero-image"
          fetchpriority="high"
        />
        <div class="home__hero-content">
          <time :datetime="String(featuredPost.date)" class="post-list__date">
            {{ formatDate(featuredPost.date) }}
          </time>
          <h2 class="home__hero-title">{{ featuredPost.title }}</h2>
        </div>
      </NuxtLink>
    </article>
    <section class="home__posts">
      <h2>Últimas entradas</h2>
      <ul class="post-list">
        <li v-for="post in remainingPosts" :key="post.path" class="post-list__item">
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
  queryCollection('post').where('draft', '=', false).order('updated_at', 'DESC').limit(6).all(),
)

const featuredPost = computed(() => recentPosts.value?.[0])
const remainingPosts = computed(() => recentPosts.value?.slice(1) ?? [])

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

.home__hero {
  overflow: hidden;
  background: var(--bg-dark);
  border: 1px solid var(--bg-highlight);
  border-radius: 6px;
}

.home__hero-link {
  display: block;
  color: var(--fg);
  text-decoration: none;
}

.home__hero-link:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: -2px;
}

.home__hero-image {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.home__hero-content {
  display: grid;
  gap: 0.75rem;
  padding: clamp(1.25rem, 3vw, 2rem);
}

.home__hero-title {
  margin: 0;
  color: var(--fg);
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  line-height: 1.2;
  letter-spacing: normal;
  text-transform: none;
  overflow-wrap: anywhere;
}

.home__hero-link:hover .home__hero-title {
  color: var(--blue);
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
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.5rem 1.5rem;
  color: var(--fg);
  text-decoration: none;
}

.post-list__title {
  overflow-wrap: anywhere;
}

@media (max-width: 480px) {
  .post-list__link {
    grid-template-columns: 1fr;
  }
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
