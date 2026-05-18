<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { site, theme } = useData()
const repoUrl = 'https://github.com/conectlens/lenserfight'
const arenaUrl = 'https://lenserfight.com'

// All locales defined in the docs app
const KNOWN_LOCALES = ['en', 'tr', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ru', 'pt', 'it']

function getRelativePath(): string {
  if (typeof window === 'undefined') return ''
  const base = site.value.base || '/'
  const path = window.location.pathname
    .replace(/\.html$/, '')
    .replace(/\/$/, '')
  let rel = path.startsWith(base) ? path.slice(base.length) : path
  if (rel.startsWith('/')) rel = rel.slice(1)
  return rel
}

const editUrl = computed(() => {
  const relativePath = getRelativePath()
  if (!relativePath) return `${repoUrl}/edit/main/docs/en/index.md`
  return `${repoUrl}/edit/main/docs/${relativePath}.md`
})

// If the 404 is on a non-English locale path, compute the English equivalent URL.
const englishFallbackUrl = computed(() => {
  if (typeof window === 'undefined') return null
  const relativePath = getRelativePath()
  if (!relativePath) return null
  const firstSegment = relativePath.split('/')[0]
  if (firstSegment === 'en' || !KNOWN_LOCALES.includes(firstSegment)) return null
  const base = site.value.base || '/'
  const pathWithoutLocale = relativePath.slice(firstSegment.length) // e.g. '/reference/ai-providers/anthropic'
  return `${base}en${pathWithoutLocale}`
})

const homeLink = computed(() => site.value.base || '/')

// Standard VitePress 404 messages
const messages = [
  "There's nothing here.",
  "How did we get here?",
  "That's a four-oh-four.",
  "Looks like we've got some broken links."
]
const message = computed(() => messages[Math.floor(Math.random() * messages.length)])
</script>

<template>
  <div class="NotFound">
    <p class="code">404</p>
    <h1 class="title">PAGE NOT FOUND</h1>
    <div class="divider"></div>
    <p class="quote">{{ message }}</p>

    <div v-if="englishFallbackUrl" class="fallback-notice">
      This page isn't available in the selected language yet.
    </div>

    <div class="action">
      <a
        v-if="englishFallbackUrl"
        class="link primary"
        :href="englishFallbackUrl"
        aria-label="View this page in English"
      >
        View in English
      </a>

      <a class="link" :href="homeLink" aria-label="go to home">
        Take me home
      </a>

      <!-- User requested links -->
      <a class="link alt" :href="homeLink">
        Main Navigation
      </a>

      <a class="link alt" :href="arenaUrl" target="_blank" rel="noopener noreferrer">
        ↗ Arena
      </a>

      <a
        :href="editUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="link alt"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        Edit this page
      </a>
    </div>
  </div>
</template>

<style scoped>
.NotFound {
  padding: 64px 24px 96px;
  text-align: center;
}

@media (min-width: 768px) {
  .NotFound {
    padding: 96px 32px 168px;
  }
}

.code {
  line-height: 64px;
  font-size: 64px;
  font-weight: 600;
}

.title {
  padding-top: 12px;
  letter-spacing: 2px;
  line-height: 20px;
  font-size: 20px;
  font-weight: 700;
}

.divider {
  margin: 24px auto 18px;
  width: 64px;
  height: 1px;
  background-color: var(--vp-c-divider);
}

.quote {
  margin: 0 auto;
  max-width: 256px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.fallback-notice {
  margin: 16px auto 0;
  max-width: 320px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.action {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  padding-top: 36px;
}

.link {
  display: inline-block;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 20px;
  padding: 0 20px;
  line-height: 38px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  transition: border-color 0.25s, color 0.25s;
  text-decoration: none;
}

.link:hover {
  border-color: var(--vp-c-brand-2);
  color: var(--vp-c-brand-2);
}

.link.primary {
  background-color: var(--vp-c-brand-1);
  color: var(--vp-c-bg);
}

.link.primary:hover {
  background-color: var(--vp-c-brand-2);
  color: var(--vp-c-bg);
}

.link.alt {
  border-color: var(--vp-c-default-1);
  color: var(--vp-c-text-1);
}

.link.alt:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
</style>
