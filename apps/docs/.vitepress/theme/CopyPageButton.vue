<script setup lang="ts">
import { ref } from 'vue'
import { useData } from 'vitepress'

const { page } = useData()
const copied = ref(false)

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
</template>
