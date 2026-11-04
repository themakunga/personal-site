<template>
  <div class="ascii-header">
    <!-- aria-hidden: screen readers use the h1 below instead -->
    <pre aria-hidden="true" class="ascii-header__art">{{ art }}</pre>
    <h1 class="ascii-header__name sr-only">{{ config.profile.displayName }}</h1>
  </div>
</template>

<script setup lang="ts">
import art from '~/assets/ascii.txt?raw'

const config = useAppConfig()
</script>

<style scoped>
.ascii-header {
  padding: 1.5rem 0 0.5rem;
}

.ascii-header__art {
  color: var(--blue);
  font-size: clamp(0.35rem, 1.2vw, 0.75rem);
  line-height: 1.3;
  overflow-x: auto;
  white-space: pre;
  margin: 0;
}

/* sr-only pattern */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
