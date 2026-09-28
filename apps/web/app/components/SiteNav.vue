<template>
  <nav class="site-nav" aria-label="Main navigation">
    <NuxtLink
      v-for="item in config.navigation"
      :key="item.path"
      :to="item.path"
      class="site-nav__link"
      active-class="site-nav__link--active"
    >
      {{ item.label }}
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const config = useAppConfig()
</script>

<style scoped>
.site-nav {
  display: flex;
  gap: 1.5rem;
  padding: 0.75rem 0;
  border-top: 1px solid var(--bg-highlight);
  border-bottom: 1px solid var(--bg-highlight);
}

.site-nav__link {
  color: var(--fg-muted);
  text-decoration: none;
  font-size: 0.9rem;
  letter-spacing: 0.05em;
}

.site-nav__link:hover,
.site-nav__link--active {
  color: var(--cyan);
}
</style>
