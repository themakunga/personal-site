<template>
  <div class="about">
    <h2 class="page-title">About</h2>
    <img
      src="/images/about.jpg"
      alt="Nicolas posing at the Evil Dead exhibit at The Mystic Museum"
      width="886"
      height="886"
      class="about__photo"
    />
    <p class="about__bio">{{ config.site.description }}</p>

    <div class="about__contact">
      <a :href="`mailto:${config.profile.email}`" class="about__email">
        {{ config.profile.email }}
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useAppConfig()

useSeoMeta({
  title: `About — ${config.site.name}`,
  description: config.site.description,
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

.about__photo {
  width: 100%;
  max-width: 28rem;
  height: auto;
  border-radius: 6px;
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
</style>
