<template>
  <div class="about">
    <h2 class="page-title">About</h2>
    <p class="about__bio">{{ config.profile.description }}</p>

    <div class="about__contact">
      <a :href="`mailto:${config.profile.email}`" class="about__email">
        {{ config.profile.email }}
      </a>
    </div>

    <ul class="about__social">
      <li v-for="link in config.social" :key="link.id">
        <a :href="link.url" target="_blank" rel="noopener noreferrer">
          {{ link.label }}
        </a>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const config = useAppConfig()

useSeoMeta({
  title: `About — ${config.site.name}`,
  description: config.profile.description,
})
</script>

<style scoped>
.page-title {
  color: var(--yellow);
  font-size: 1rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 1.5rem;
}

.about__bio {
  color: var(--fg-muted);
  white-space: pre-line;
  max-width: 60ch;
  margin-bottom: 1.5rem;
}

.about__email {
  color: var(--blue);
  font-size: 0.9rem;
}

.about__social {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1.5rem;
}

.about__social a {
  color: var(--comment);
  font-size: 0.85rem;
  text-decoration: none;
}

.about__social a:hover {
  color: var(--cyan);
}
</style>
