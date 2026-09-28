<template>
  <div>
    <h2 class="page-title">Blog</h2>

    <div v-if="config.blog.showTags && allTags.length" class="tag-cloud">
      <NuxtLink v-for="tag in allTags" :key="tag" :to="`/tags/${tag}`" class="tag">
        #{{ tag }}
      </NuxtLink>
    </div>

    <ul class="post-list">
      <li v-for="post in posts" :key="post.path" class="post-list__item">
        <NuxtLink :to="`/blog${post.path.replace('/post', '')}`" class="post-list__link">
          <time class="post-list__date" :datetime="String(post.date)">{{
            formatDate(post.date)
          }}</time>
          <div>
            <span class="post-list__title">{{ post.title }}</span>
            <p v-if="post.description" class="post-list__desc">{{ post.description }}</p>
          </div>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const config = useAppConfig()

const { data: posts } = await useAsyncData('blog-posts', () =>
  queryCollection('post').where('draft', '=', false).order('date', 'DESC').all(),
)

const allTags = computed(() =>
  [...new Set((posts.value ?? []).flatMap((p) => p.tags ?? []))].sort(),
)

const formatDate = (d: Date | string) =>
  new Date(d).toLocaleDateString(config.site.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

useSeoMeta({ title: `Blog — ${config.site.name}` })
</script>

<style scoped>
.page-title {
  color: var(--yellow);
  font-size: 1rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 1.5rem;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.tag {
  color: var(--purple);
  font-size: 0.8rem;
  text-decoration: none;
}

.tag:hover {
  color: var(--cyan);
}

.post-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.post-list__link {
  display: grid;
  grid-template-columns: 7rem 1fr;
  gap: 1rem;
  color: var(--fg);
  text-decoration: none;
}

.post-list__link:hover .post-list__title {
  color: var(--blue);
}

.post-list__date {
  color: var(--comment);
  font-size: 0.8rem;
  padding-top: 0.2rem;
}

.post-list__title {
  display: block;
}

.post-list__desc {
  color: var(--fg-muted);
  font-size: 0.85rem;
  margin: 0.25rem 0 0;
}
</style>
