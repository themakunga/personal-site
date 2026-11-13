<template>
  <MermaidDiagram v-if="language === 'mermaid'" :code="code" />
  <pre v-else :class="$props.class"><slot /></pre>
</template>

<script setup lang="ts">
defineProps<{
  code?: string
  language?: string
  filename?: string
  highlights?: number[]
  meta?: string
  class?: string
}>()
</script>

<style>
pre code .line {
  display: block;
}
</style>
