<template>
  <HomePage :page="Number(route.params.page)" />
</template>

<script setup lang="ts">
const route = useRoute()
definePageMeta({
  validate: (route) =>
    /^[1-9]\d*$/.test(String(route.params.page)) && Number.isSafeInteger(Number(route.params.page)),
})
</script>
