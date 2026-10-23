<template>
  <div class="site-wrapper">
    <header class="site-header container">
      <AsciiHeader />
      <SiteNav />
    </header>

    <main class="site-main site-main--with-sidebar container">
      <div class="sidebar-desktop">
        <SiteSidebar />
      </div>
      <details class="sidebar-disclosure">
        <summary>Perfil y filtros</summary>
        <div class="sidebar-disclosure__content">
          <SiteSidebar />
        </div>
      </details>
      <div class="site-content"><slot /></div>
    </main>

    <footer class="site-footer container">
      <div v-if="config.social.length" class="footer-social">
        <SocialLinks />
      </div>
      <p class="site-footer__text">{{ config.footer?.text }}</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
const config = useAppConfig()
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

.site-main--with-sidebar {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 3rem;
}

.site-content {
  min-width: 0;
}

.sidebar-disclosure {
  display: none;
}

@media (max-width: 1024px) {
  .site-main--with-sidebar {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .sidebar-desktop {
    display: none;
  }

  .sidebar-disclosure {
    display: block;
  }

  .sidebar-disclosure > summary {
    padding: 0.75rem 1rem;
    border: 1px solid var(--bg-highlight);
    color: var(--yellow);
    cursor: pointer;
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .sidebar-disclosure__content {
    padding: 1.5rem 1rem 0;
  }
}

@media (min-width: 1600px) {
  .container {
    width: 75%;
    max-width: none;
  }
}

.site-footer {
  border-top: 1px solid var(--bg-highlight);
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
  display: grid;
  gap: 1rem;
}

.footer-social {
  display: none;
}

.footer-social :deep(.social-links) {
  margin: 0;
}

@media (max-width: 720px) {
  .footer-social {
    display: block;
  }
}

.site-footer__text {
  color: var(--comment);
  font-size: 0.8rem;
  margin: 0;
}
</style>
