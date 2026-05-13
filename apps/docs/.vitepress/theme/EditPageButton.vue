<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { page } = useData()
const repoUrl = 'https://github.com/conectlens/lenserfight'
const editUrl = computed(() => {
  return `${repoUrl}/edit/main/docs/${page.value.relativePath}`
})
</script>

<template>
  <a
    :href="editUrl"
    target="_blank"
    rel="noopener noreferrer"
    class="lf-edit-btn"
    aria-label="Edit this page on GitHub"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
    Edit this page
  </a>
</template>
