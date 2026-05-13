<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { site, theme } = useData()
const repoUrl = 'https://github.com/conectlens/lenserfight'
const arenaUrl = 'https://lenserfight.com'

const editUrl = computed(() => {
  if (typeof window === 'undefined') return repoUrl
  
  const path = window.location.pathname
    .replace(/\.html$/, '') 
    .replace(/\/$/, '')     

  const base = site.value.base || '/'
  let relativePath = path.startsWith(base) ? path.slice(base.length) : path
  if (relativePath.startsWith('/')) relativePath = relativePath.slice(1)

  if (!relativePath) return `${repoUrl}/edit/main/docs/en/index.md`
  return `${repoUrl}/edit/main/docs/${relativePath}.md`
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

    <div class="action">
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
        class="link primary"
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
