<template>
  <ul class="social-links">
    <li v-for="link in config.social" :key="link.id">
      <a :href="link.url" target="_blank" rel="noopener noreferrer">
        <span
          class="social-links__icon"
          :style="{ '--icon': `url(/icons/mdi/mdi-${icons[link.id] ?? 'link-variant'}.svg)` }"
          aria-hidden="true"
        />
        {{ link.label }}
      </a>
    </li>
  </ul>
</template>

<script setup lang="ts">
const config = useAppConfig()
const icons: Record<string, string> = {
  github: 'github',
  linkedin: 'linkedin',
  threads: 'at',
  twitter: 'twitter',
  bluesky: 'butterfly',
  reddit: 'reddit',
}
</script>

<style scoped>
.social-links {
  list-style: none;
  padding: 0;
  margin: 0.75rem 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.9rem;
}

.social-links a {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
  color: var(--blue);
  font-size: 0.85rem;
  text-decoration: none;
}

.social-links a:hover {
  color: var(--cyan);
}

.social-links__icon {
  display: inline-block;
  width: 1.15em;
  height: 1.15em;
  flex: none;
  background: currentColor;
  -webkit-mask: var(--icon) center / contain no-repeat;
  mask: var(--icon) center / contain no-repeat;
}
</style>
