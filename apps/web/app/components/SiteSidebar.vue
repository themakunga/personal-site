<template>
  <aside class="sidebar" aria-label="Perfil y filtros del blog">
    <section class="sidebar__profile">
      <img
        v-if="config.profile.avatar"
        class="sidebar__avatar"
        :src="config.profile.avatar.url"
        :alt="`Foto de ${config.profile.displayName}`"
        width="112"
        height="112"
      />
      <h2 class="sidebar__name">{{ config.profile.displayName }}</h2>
      <p class="sidebar__description">{{ config.profile.description }}</p>
      <a class="sidebar__link" :href="`mailto:${config.profile.email}`">{{
        config.profile.email
      }}</a>
      <SocialLinks v-if="config.social.length" />
    </section>

    <nav v-if="config.blog.showCategories && categories.length" aria-label="Categorías">
      <h2 class="sidebar__heading">Categorías</h2>
      <ul class="sidebar__filters">
        <li v-for="category in categories" :key="category">
          <NuxtLink :to="`/categories/${encodeURIComponent(category)}`">{{ category }}</NuxtLink>
        </li>
      </ul>
    </nav>

    <nav v-if="config.blog.showTags && tags.length" aria-label="Tags">
      <h2 class="sidebar__heading">Tags</h2>
      <ul class="sidebar__filters sidebar__filters--tags">
        <li v-for="tag in tags" :key="tag">
          <NuxtLink :to="`/tags/${encodeURIComponent(tag)}`">#{{ tag }}</NuxtLink>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<script setup lang="ts">
const config = useAppConfig()

const { data: posts } = await useAsyncData('sidebar-posts', () =>
  queryCollection('post').where('draft', '=', false).all(),
)

const categories = computed(() =>
  [
    ...new Set((posts.value ?? []).flatMap((post) => (post.category ? [post.category] : []))),
  ].sort(),
)
const tags = computed(() =>
  [...new Set((posts.value ?? []).flatMap((post) => post.tags ?? []))].sort(),
)
</script>

<style scoped>
.sidebar {
  align-self: start;
  display: grid;
  gap: 2rem;
  color: var(--fg-muted);
  font-size: 0.85rem;
}

.sidebar__avatar {
  width: 112px;
  height: 112px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 1rem;
}

.sidebar__name {
  color: var(--fg);
  font-size: 1rem;
  margin: 0;
}

.sidebar__description {
  white-space: pre-line;
  margin: 0.5rem 0 1rem;
}

.sidebar__link,
.sidebar a {
  color: var(--blue);
  overflow-wrap: anywhere;
}

.sidebar a:hover,
.sidebar a.router-link-active {
  color: var(--cyan);
}

.sidebar__filters {
  list-style: none;
  padding: 0;
  margin: 0.75rem 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.75rem;
}

.sidebar__filters a {
  text-decoration: none;
}

.sidebar__heading {
  color: var(--yellow);
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0;
}

.sidebar__filters {
  flex-direction: column;
}

.sidebar__filters--tags {
  flex-direction: row;
}

@media (max-width: 720px) {
  .sidebar :deep(.social-links) {
    display: none;
  }
}
</style>
