// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  telemetry: false,
  devtools: { enabled: true },
  modules: ['@nuxt/content', '@nuxt/eslint'],
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/blog-icon.ico' }],
      script: [
        {
          // An unreachable analytics host must not block Nuxt hydration.
          async: true,
          src: 'https://analytics.nicolasvillarroel.cl/script.js',
          'data-website-id': 'b840081c-9895-430a-975c-dc66c069ec20',
        },
      ],
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
      routes: ['/rss', '/rss.xml', '/comment-policy.json'],
    },
  },
})
