<script setup lang="ts">
import { ref } from 'vue'
import { useData } from 'vitepress'

const { page } = useData()
const copied = ref(false)
const copyFailed = ref(false)

async function readRawMarkdown(): Promise<string | null> {
  const base = import.meta.env.BASE_URL ?? '/'
  const basePath = base.endsWith('/') ? base : `${base}/`
  const mdPath = `${basePath}${page.value.relativePath}`
  const res = await fetch(mdPath, { cache: 'no-cache' })

  if (!res.ok) return null

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('text/html')) return null

  return res.text()
}

async function writeTextToClipboard(text: string): Promise<boolean> {
  if (!text.trim()) return false

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to the textarea fallback for browsers that reject Clipboard API writes.
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.inset = '0 auto auto 0'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  try {
    return document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
  }
}

async function copyPageContent() {
  const docEl = document.querySelector('.vp-doc') as HTMLElement | null
  const renderedText = docEl?.innerText ?? document.body.innerText

  let text = renderedText
  try {
    text = (await readRawMarkdown()) ?? renderedText
  } catch {
    text = renderedText
  }

  copyFailed.value = false
  const didCopy = await writeTextToClipboard(text)
  if (!didCopy) {
    copyFailed.value = true
    setTimeout(() => {
      copyFailed.value = false
    }, 2000)
    return
  }

  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <button
    type="button"
    class="lf-copy-btn"
    :class="{ copied, failed: copyFailed }"
    :aria-label="copied ? 'Copied!' : copyFailed ? 'Copy failed' : 'Copy page content'"
    @click="copyPageContent"
  >
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path v-if="copied" d="M3 8l4 4 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <template v-else>
        <rect x="5" y="2" width="8" height="11" rx="1.5" stroke="currentColor" stroke-width="1.4"/>
        <path d="M5 4H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </template>
    </svg>
    {{ copied ? 'Copied!' : copyFailed ? 'Failed' : 'Copy' }}
  </button>
</template>
