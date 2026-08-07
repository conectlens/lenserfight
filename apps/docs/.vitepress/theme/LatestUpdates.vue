<!--
  LatestUpdates — homepage widget showing the 3 most recent verified
  user-facing changes, sourced from the same generated changelog-data JSON
  the /changelog and /changelog/main pages read (never hand-copied).

  Usage in markdown:  <LatestUpdates locale="en" />
-->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

interface Props {
  locale?: 'en' | 'tr'
}
const props = withDefaults(defineProps<Props>(), { locale: 'en' })

interface Update {
  prNumber: number
  date: string
  category: string
  summary: string
  userImpact: string
  url: string
}

const COPY = {
  en: { title: 'Latest updates', empty: 'No verified updates yet.', full: 'Full changelog →' },
  tr: { title: 'Son güncellemeler', empty: 'Henüz doğrulanmış güncelleme yok.', full: 'Tüm değişiklik günlüğü →' },
} as const
const t = computed(() => COPY[props.locale])
const changelogHref = computed(() => `/${props.locale}/changelog`)

const updates = ref<Update[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('/changelog-data/latest-updates.json')
    const data = await res.json()
    updates.value = data.latestUpdates ?? []
  } catch {
    updates.value = []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="lf-latest-updates">
    <div class="lf-latest-updates__head">
      <h2>{{ t.title }}</h2>
      <a :href="changelogHref">{{ t.full }}</a>
    </div>
    <ul v-if="!loading && updates.length" class="lf-latest-updates__list">
      <li v-for="u in updates" :key="u.prNumber">
        <a :href="u.url" target="_blank" rel="noopener noreferrer" class="lf-latest-updates__item">
          <span class="lf-latest-updates__cat">{{ u.category }}</span>
          <span class="lf-latest-updates__summary">{{ u.summary }}</span>
          <time class="lf-latest-updates__date">{{ u.date.slice(0, 10) }}</time>
        </a>
      </li>
    </ul>
    <p v-else-if="!loading" class="lf-latest-updates__empty">{{ t.empty }}</p>
  </div>
</template>

<style scoped>
.lf-latest-updates {
  margin: 2rem 0;
  padding: 1rem 1.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
}

.lf-latest-updates__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.lf-latest-updates__head h2 {
  margin: 0;
  font-size: 1.05rem;
  border: none;
  padding: 0;
}

.lf-latest-updates__head a {
  font-size: 0.82rem;
  font-weight: 600;
}

.lf-latest-updates__list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.lf-latest-updates__item {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.4rem 0;
  text-decoration: none;
  border-top: 1px solid var(--vp-c-divider);
}

.lf-latest-updates__item:first-child {
  border-top: none;
}

.lf-latest-updates__cat {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--vp-c-brand-1);
  flex: 0 0 auto;
}

.lf-latest-updates__summary {
  color: var(--vp-c-text-1);
  font-size: 0.88rem;
  flex: 1 1 auto;
}

.lf-latest-updates__date {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  flex: 0 0 auto;
}

.lf-latest-updates__empty {
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  margin: 0;
}
</style>
