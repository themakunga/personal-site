<template>
  <div class="site-wrapper">
    <header class="site-header container">
      <AsciiHeader />
      <SiteNav />
    </header>

    <main class="site-main container" :class="{ 'site-main--with-sidebar': showSidebar }">
      <SiteSidebar v-if="showSidebar" />
      <div class="site-content"><slot /></div>
    </main>

    <footer class="site-footer container">
      <p class="site-footer__text">{{ config.footer?.text }}</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
const config = useAppConfig()
const route = useRoute()
const showSidebar = computed(
  () =>
    ['/', '/blog', '/portfolio'].includes(route.path) ||
    route.path.startsWith('/categories/') ||
    route.path.startsWith('/tags/'),
)
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.site-main {
  padding-top: 2rem;
  padding-bottom: 4rem;
  min-height: 60vh;
}

.site-main:not(.site-main--with-sidebar) {
  max-width: 900px;
}

.site-main--with-sidebar {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 3rem;
}

.site-content {
  min-width: 0;
}

@media (max-width: 720px) {
  .site-main--with-sidebar {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1600px) {
  .container {
    width: 75%;
    max-width: none;
  }

  .site-main:not(.site-main--with-sidebar) {
    max-width: none;
  }
}

.site-footer {
  border-top: 1px solid var(--bg-highlight);
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
}

.site-footer__text {
  color: var(--comment);
  font-size: 0.8rem;
  margin: 0;
}
</style>
