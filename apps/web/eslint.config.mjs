// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  // Single-word filenames are conventional in Nuxt pages and layouts
  rules: {
    'vue/multi-word-component-names': 'off',
  },
})
