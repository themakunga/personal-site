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
          defer: true,
          src: 'http://motherbase.local:8989/script.js',
          'data-website-id': '28c91ed6-572c-4cd6-bd9e-0461ee902a35',
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
