<template>
  <div v-if="project" class="project">
    <nav class="breadcrumb">
      <NuxtLink to="/portfolio">← Portfolio</NuxtLink>
    </nav>

    <h2 class="project__title">{{ project.title }}</h2>
    <p v-if="project.description" class="project__desc">{{ project.description }}</p>

    <div v-if="config.portfolio.showTechnologies && project.stack?.length" class="project__stack">
      <span v-for="tech in project.stack" :key="tech" class="stack-item">{{ tech }}</span>
    </div>

    <div v-if="subPages.length > 1" class="project__nav">
      <NuxtLink
        v-for="page in subPages"
        :key="page.path"
        :to="`/portfolio/${route.params.slug}/${pageSlug(page.path)}`"
        class="project__nav-link"
      >
        {{ page.title }}
      </NuxtLink>
    </div>

    <div class="project__body prose">
      <ContentRenderer :value="project" />
    </div>
  </div>

  <div v-else class="not-found">
    <p>Proyecto no encontrado.</p>
    <NuxtLink to="/portfolio">← Portfolio</NuxtLink>
  </div>
</template>

<script setup lang="ts">
const config = useAppConfig()
const route = useRoute()
const slug = route.params.slug as string

const { data: project } = await useAsyncData(`portfolio-${slug}`, () =>
  queryCollection('portfolio').path(`/portfolio/${slug}/index`).first(),
)

if (!project.value) {
  throw createError({ statusCode: 404, statusMessage: 'Project not found' })
}

// Sibling pages (architecture, deployment, etc.)
const { data: subPages } = await useAsyncData(`portfolio-${slug}-pages`, () =>
  queryCollection('portfolio').where('path', 'LIKE', `/portfolio/${slug}/%`).all(),
)

const pageSlug = (path: string) => path.split('/').at(-1) ?? ''

useSeoMeta({
  title: `${project.value?.title} — Portfolio — ${config.site.name}`,
  description: project.value?.description,
})
</script>

<style scoped>
.breadcrumb {
  margin-bottom: 1.5rem;
  font-size: 0.85rem;
}

.breadcrumb a {
  color: var(--comment);
}

.project__title {
  color: var(--fg);
  font-size: 1.5rem;
  margin: 0 0 0.5rem;
}

.project__desc {
  color: var(--fg-muted);
  margin-bottom: 1rem;
}

.project__stack {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1.5rem;
}

.stack-item {
  color: var(--green);
  font-size: 0.75rem;
  border: 1px solid var(--green);
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
}

.project__nav {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--bg-highlight);
  padding-bottom: 1rem;
}

.project__nav-link {
  color: var(--blue);
  font-size: 0.85rem;
  text-decoration: none;
}

.not-found {
  color: var(--fg-muted);
}

:deep(.prose h1),
:deep(.prose h2),
:deep(.prose h3) {
  color: var(--yellow);
}

:deep(.prose code) {
  background: var(--bg-highlight);
  padding: 0.1em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
}

:deep(.prose pre) {
  background: var(--bg-dark);
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
}

:deep(.prose pre code) {
  background: none;
  padding: 0;
}
</style>
