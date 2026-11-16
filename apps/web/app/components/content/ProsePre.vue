<template>
  <MermaidDiagram v-if="language === 'mermaid'" :code="code" />
  <div v-else class="code-block">
    <div class="code-block__header">
      <span class="code-block__language">{{ language || 'text' }}</span>
    </div>
    <pre
      v-bind="$attrs"
      class="code-block__pre"
      :class="$props.class"
      :style="{ backgroundColor: 'var(--bg)' }"
    ><slot /></pre>
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

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
.code-block {
  margin: 1.5rem 0;
  border: 1px solid var(--comment);
  border-radius: 6px;
  overflow: hidden;
}

.code-block__header {
  padding: 0.4rem 1rem;
  background: var(--bg-dark);
  border-bottom: 1px solid var(--bg-highlight);
  color: var(--cyan);
  font-size: 0.75rem;
}

.code-block__pre {
  margin: 0;
  overflow-x: auto;
}

pre code .line {
  display: block;
}
</style>
