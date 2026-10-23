// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  rules: {
    'vue/html-self-closing': 'off',
    // Single-word filenames are conventional in Nuxt pages and layouts
    'vue/multi-word-component-names': 'off',
  },
})
