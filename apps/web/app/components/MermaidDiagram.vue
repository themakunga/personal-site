<template>
  <figure class="mermaid-diagram" aria-label="Mermaid diagram">
    <!-- eslint-disable-next-line vue/no-v-html -- Mermaid strict mode sanitizes the SVG. -->
    <div v-if="svg" v-html="svg" />
    <template v-else>
      <pre><code>{{ code }}</code></pre>
      <figcaption v-if="failed">
        The diagram could not be rendered. Its source is shown above.
      </figcaption>
    </template>
  </figure>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ code?: string }>(), { code: '' })
const svg = ref('')
const failed = ref(false)
const id = `mermaid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

onMounted(() => {
  watch(
    () => props.code,
    async (code, _previous, onCleanup) => {
      let cancelled = false
      onCleanup(() => {
        cancelled = true
      })
      svg.value = ''
      failed.value = false
      try {
        const { default: mermaid } = await import('mermaid')
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'dark',
          suppressErrorRendering: true,
        })
        const result = await mermaid.render(id, code)
        if (!cancelled) svg.value = result.svg
      } catch {
        if (!cancelled) failed.value = true
      }
    },
    { immediate: true },
  )
})
</script>

<style scoped>
.mermaid-diagram {
  margin: 1.5rem 0;
  overflow-x: auto;
}
.mermaid-diagram :deep(svg) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: auto;
}
</style>
