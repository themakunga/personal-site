<template>
  <article v-if="page" class="prose">
    <nav>
      <NuxtLink :to="`/portfolio/${route.params.slug}`">← {{ route.params.slug }}</NuxtLink>
    </nav>
    <h2>{{ page.title }}</h2>
    <ContentRenderer :value="page" />
  </article>
</template>

<script setup lang="ts">
const route = useRoute()
const config = useAppConfig()
const { data: page } = await useAsyncData(
  `portfolio-${route.params.slug}-${route.params.page}`,
  () =>
    queryCollection('portfolio')
      .path(`/portfolio/${route.params.slug}/${route.params.page}`)
      .first(),
)

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Project page not found' })
}

useSeoMeta({ title: `${page.value.title} — Portfolio — ${config.site.name}` })
</script>
