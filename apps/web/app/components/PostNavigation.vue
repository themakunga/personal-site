<template>
  <nav v-if="previous || next" class="post-navigation" aria-label="Post navigation">
    <NuxtLink
      v-if="previous"
      :to="previous.path.replace(/^\/post/, '/blog')"
      rel="prev"
      class="post-navigation__previous"
    >
      <span>← Previous post</span>
      {{ previous.title }}
    </NuxtLink>
    <NuxtLink
      v-if="next"
      :to="next.path.replace(/^\/post/, '/blog')"
      rel="next"
      class="post-navigation__next"
    >
      <span>Next post →</span>
      {{ next.title }}
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  previous?: { path: string; title: string }
  next?: { path: string; title: string }
}>()
</script>

<style scoped>
.post-navigation {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-block: 2rem;
}

.post-navigation a {
  display: block;
  padding: 1rem;
  border: 1px solid var(--comment);
  border-radius: 0.25rem;
  background: var(--bg-dark);
  color: var(--blue);
  text-decoration: none;
  overflow-wrap: anywhere;
}

.post-navigation a:hover {
  border-color: var(--blue);
  background: var(--bg-highlight);
}

.post-navigation a:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 3px;
}

.post-navigation span {
  display: block;
  color: var(--fg-muted);
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
}

.post-navigation__next {
  grid-column: 2;
  text-align: right;
}

@media (max-width: 600px) {
  .post-navigation {
    grid-template-columns: 1fr;
  }

  .post-navigation__next {
    grid-column: 1;
  }
}
</style>
