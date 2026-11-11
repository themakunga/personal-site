<template>
  <div class="home">
    <section v-if="featuredPost" id="featured-post" aria-labelledby="featured-heading">
      <h2 id="featured-heading">Destacado</h2>
      <article class="home__hero">
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
            <h3 class="home__hero-title">{{ featuredPost.title }}</h3>
          </div>
        </NuxtLink>
      </article>
    </section>
    <section v-if="imagePosts.length" id="hero-tiles" aria-labelledby="tiles-heading">
      <h2 id="tiles-heading">En imágenes</h2>
      <ul class="home__tiles">
        <li v-for="post in imagePosts" :key="post.path" class="home__tile">
          <NuxtLink :to="`/blog${post.path.replace('/post', '')}`" class="home__hero-link">
            <img :src="post.image" alt="" class="home__hero-image" loading="lazy" />
            <div class="home__tile-content">
              <time :datetime="String(post.date)" class="post-list__date">{{
                formatDate(post.date)
              }}</time>
              <h3>{{ post.title }}</h3>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </section>
    <section id="latest-posts" class="home__posts" aria-labelledby="latest-heading">
      <h2 id="latest-heading">Últimas entradas</h2>
      <ul class="post-list">
        <li v-for="post in pagePosts" :key="post.path" class="post-list__item">
          <NuxtLink :to="`/blog${post.path.replace('/post', '')}`" class="post-list__link">
            <span class="post-list__date">{{ formatDate(post.date) }}</span>
            <span class="post-list__title">{{ post.title }}</span>
          </NuxtLink>
        </li>
      </ul>
      <p v-if="!pagePosts.length">Aún no hay entradas publicadas.</p>
      <nav v-if="totalPages > 1" class="home__pagination" aria-label="Paginación de entradas">
        <NuxtLink v-if="page > 1" :to="pageUrl(page - 1)" rel="prev">← Anterior</NuxtLink>
        <NuxtLink
          v-for="number in totalPages"
          :key="number"
          :to="pageUrl(number)"
          :aria-current="number === page ? 'page' : undefined"
          :aria-label="`Página ${number}`"
          >{{ number }}</NuxtLink
        >
        <NuxtLink v-if="page < totalPages" :to="pageUrl(page + 1)" rel="next">Siguiente →</NuxtLink>
      </nav>
    </section>
  </div>
</template>

<script setup lang="ts">
const { page = 1 } = defineProps<{ page?: number }>()
const config = useAppConfig()
const pageSize = config.blog.postPerPage

const { data: posts, error } = await useAsyncData('home-posts', () =>
  queryCollection('post')
    .where('draft', '=', false)
    .order('updated_at', 'DESC')
    .order('path', 'DESC')
    .select('path', 'title', 'image', 'date', 'updated_at', 'featured')
    .all(),
)
if (error.value) throw createError(error.value)

const featuredPost = computed(() => posts.value?.find((post) => post.featured))
const imagePosts = computed(
  () => posts.value?.filter((post) => post.image?.trim()).slice(0, 6) ?? [],
)
const totalPages = computed(() => Math.max(1, Math.ceil((posts.value?.length ?? 0) / pageSize)))
const pagePosts = computed(() => posts.value?.slice((page - 1) * pageSize, page * pageSize) ?? [])
if (page > totalPages.value) throw createError({ statusCode: 404, statusMessage: 'Page not found' })

const pageUrl = (number: number) => `${number === 1 ? '/' : `/page/${number}`}#latest-posts`

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

.home__tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  list-style: none;
  padding: 0;
}

.home__tile {
  overflow: hidden;
  background: var(--bg-dark);
  border: 1px solid var(--bg-highlight);
  border-radius: 6px;
}

.home__tile-content {
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
}

.home__tile h3 {
  margin: 0;
  color: var(--fg);
  font-size: 1rem;
  overflow-wrap: anywhere;
}

.home__hero-link:hover h3 {
  color: var(--blue);
}

.home__pagination {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.home__pagination a {
  padding: 0.25rem 0.5rem;
  color: var(--blue);
}

.home__pagination [aria-current='page'] {
  color: var(--fg);
  border-bottom: 2px solid var(--blue);
}

@media (max-width: 768px) {
  .home__tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .home__tiles {
    grid-template-columns: 1fr;
  }
}
</style>
