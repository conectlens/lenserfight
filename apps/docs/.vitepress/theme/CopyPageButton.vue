<script setup lang="ts">
import { ref, computed } from 'vue'
import { useData } from 'vitepress'

const { page } = useData()
const copied = ref(false)

const editUrl = computed(() => {
  return `https://github.com/conectlens/lenserfight/edit/main/docs/${page.value.relativePath}`
})

async function copyPageContent() {
  // Try to copy rendered text from the doc area first
  const docEl = document.querySelector('.vp-doc') as HTMLElement | null
  if (!docEl) return

  // Prefer fetching the raw markdown; fall back to rendered text
  try {
    const base = import.meta.env.BASE_URL ?? '/'
    const mdPath = `${base}${page.value.relativePath}`
    const res = await fetch(mdPath)
    if (res.ok) {
      const text = await res.text()
      await navigator.clipboard.writeText(text)
    } else {
      throw new Error('fetch failed')
    }
  } catch {
    // Fallback: copy rendered inner text (strips HTML tags)
    await navigator.clipboard.writeText(docEl.innerText)
  }

  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <div class="lf-page-actions">
    <button
      class="lf-copy-btn"
      :class="{ copied }"
      :aria-label="copied ? 'Copied!' : 'Copy page content'"
      @click="copyPageContent"
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path v-if="copied" d="M3 8l4 4 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <template v-else>
          <rect x="5" y="2" width="8" height="11" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
          <path d="M5 4H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </template>
      </svg>
      {{ copied ? 'Copied!' : 'Copy' }}
    </button>

    <a
      :href="editUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="lf-edit-btn"
      aria-label="Edit this page on GitHub"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
      </svg>
      Edit Page
    </a>
  </div>
</template>
