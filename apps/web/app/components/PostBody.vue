<template>
  <div class="prose">
    <ContentRenderer :value="value" />
  </div>
</template>

<script setup lang="ts">
import type { PostCollectionItem } from '@nuxt/content'

defineProps<{ value: PostCollectionItem }>()
</script>

<style scoped>
.prose {
  color: var(--fg);
  line-height: 1.8;
}

:deep(h1),
:deep(h2),
:deep(h3) {
  color: var(--yellow);
  margin: 1.5rem 0 0.5rem;
}

:deep(code) {
  background: var(--bg-highlight);
  padding: 0.1em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
}

:deep(pre) {
  background: var(--bg-dark);
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
}

:deep(pre code) {
  background: none;
  padding: 0;
}

:deep(blockquote) {
  border-left: 3px solid var(--blue);
  padding-left: 1rem;
  color: var(--fg-muted);
}
</style>
