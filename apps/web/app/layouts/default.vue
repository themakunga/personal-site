<template>
  <div class="site-wrapper">
    <header class="site-header container">
      <AsciiHeader />
      <SiteNav />
    </header>

    <main class="site-main container">
      <slot />
    </main>

    <footer class="site-footer container">
      <p class="site-footer__text">{{ config.footer?.text }}</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
const config = useAppConfig()
</script>

<style scoped>
.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.site-main {
  padding-top: 2rem;
  padding-bottom: 4rem;
  min-height: 60vh;
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
