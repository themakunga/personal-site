// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/content', '@nuxt/eslint'],
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/blog-icon.ico' }],
    },
  },
  vite: {
    server: {
      watch: { usePolling: process.env.WATCH_POLLING === 'true' },
    },
  },
  css: [
    '~/assets/css/reset.css',
    '~/assets/css/theme.css',
    '~/assets/css/typography.css',
    '~/assets/css/main.css',
  ],
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/rss.xml'],
    },
  },
})
