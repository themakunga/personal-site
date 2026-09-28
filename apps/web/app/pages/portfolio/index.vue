<template>
  <div>
    <h2 class="page-title">{{ config.portfolio.title }}</h2>

    <ul class="project-list">
      <li v-for="project in projects" :key="project.path" class="project-list__item">
        <NuxtLink :to="`/portfolio/${projectSlug(project.path)}`" class="project-list__link">
          <span class="project-list__title">{{ project.title }}</span>
          <p v-if="project.description" class="project-list__desc">{{ project.description }}</p>
          <div
            v-if="config.portfolio.showTechnologies && project.stack?.length"
            class="project-list__stack"
          >
            <span v-for="tech in project.stack" :key="tech" class="stack-item">{{ tech }}</span>
          </div>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
const config = useAppConfig()

// Only index files (README → index) are the project roots
const { data: projects } = await useAsyncData('portfolio', () =>
  queryCollection('portfolio').where('path', 'LIKE', '%/index').order('order', 'ASC').all(),
)

// /portfolio/project-name/index → project-name
const projectSlug = (path: string) => path.split('/').at(-2) ?? ''

useSeoMeta({ title: `Portfolio — ${config.site.name}` })
</script>

<style scoped>
.page-title {
  color: var(--yellow);
  font-size: 1rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin-bottom: 1.5rem;
}

.project-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.project-list__link {
  display: block;
  color: var(--fg);
  text-decoration: none;
  padding: 1rem;
  border: 1px solid var(--bg-highlight);
  border-radius: 4px;
  transition: border-color 0.15s;
}

.project-list__link:hover {
  border-color: var(--blue);
}

.project-list__title {
  display: block;
  font-size: 1.1rem;
  color: var(--blue);
}

.project-list__desc {
  color: var(--fg-muted);
  font-size: 0.85rem;
  margin: 0.25rem 0 0.75rem;
}

.project-list__stack {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.stack-item {
  color: var(--green);
  font-size: 0.75rem;
  border: 1px solid var(--green);
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
}
</style>
