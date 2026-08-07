<!--
  MainBranchActivity — renders the generated Main Branch Activity ledger.

  Data comes from docs/public/changelog-data/main-activity*.json, written at
  build time by tools/changelog/cli.mjs (never hand-edited, never committed).
  Formatting goes through the same render-labels.mjs / localize.mjs helpers
  the generator itself is tested against, so every string on this page is
  either real evidence or an explicit "Not declared" / "Verification
  unavailable" — never inferred from a commit message.

  Usage in markdown:  <MainBranchActivity locale="en" />
-->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  formatCategory,
  formatVerification,
  formatUserImpact,
  formatPrTitle,
} from '../../../../tools/changelog/src/render-labels.mjs'

interface Props {
  locale?: 'en' | 'tr'
}
const props = withDefaults(defineProps<Props>(), { locale: 'en' })

interface Entry {
  sha: string
  shortSha: string
  date: string
  author: string
  subject: string
  prNumber: number | null
  components: string[]
  fragment: Record<string, unknown> | null
  github: { title?: string; url?: string } | null
  status: 'Unreleased' | 'Released' | 'Internal'
  revertedBy: string | null
}

const COPY = {
  en: {
    banner:
      "Activity on main is not necessarily a published release. Entries here can still change or be reverted before anything ships — see the Product Changelog for what's actually released.",
    legendTitle: 'Status legend',
    unreleased: 'Unreleased — merged to main, not yet in a published release.',
    released: 'Released — reachable from a published release tag.',
    internal: 'Internal — no user-facing effect (labeled changelog:none or category: internal).',
    loading: 'Loading main branch activity…',
    empty: 'No activity recorded for this period.',
    error: 'Could not load main branch activity right now.',
    commit: 'Commit',
    pr: 'PR',
    category: 'Category',
    verification: 'Verification',
    components: 'Components',
    olderMonths: 'Older months',
    loadMonth: 'Load',
    reverted: 'Reverted',
  },
  tr: {
    banner:
      "main dalındaki etkinlik yayınlanmış bir sürüm anlamına gelmez. Buradaki kayıtlar yayınlanmadan önce değişebilir veya geri alınabilir — gerçekten yayınlananlar için Ürün Değişiklik Günlüğü'ne bakın.",
    legendTitle: 'Durum açıklaması',
    unreleased: 'Yayınlanmadı — main dalına birleştirildi, henüz bir sürümde yayınlanmadı.',
    released: 'Yayınlandı — yayınlanmış bir sürüm etiketinden erişilebilir.',
    internal: 'Dahili — kullanıcıya yönelik etkisi yok (changelog:none veya category: internal).',
    loading: 'Ana dal etkinliği yükleniyor…',
    empty: 'Bu dönem için kayıtlı etkinlik yok.',
    error: 'Ana dal etkinliği şu anda yüklenemedi.',
    commit: 'Commit',
    pr: 'PR',
    category: 'Kategori',
    verification: 'Doğrulama',
    components: 'Bileşenler',
    olderMonths: 'Önceki aylar',
    loadMonth: 'Yükle',
    reverted: 'Geri alındı',
  },
} as const

const t = computed(() => COPY[props.locale])

const current = ref<{ yearMonth: string | null; entries: Entry[] }>({ yearMonth: null, entries: [] })
const archiveIndex = ref<Array<{ yearMonth: string; count: number }>>([])
const loadedArchives = ref<Record<string, Entry[]>>({})
const expandedMonths = ref<Set<string>>(new Set())
const loading = ref(true)
const error = ref(false)

onMounted(async () => {
  try {
    const res = await fetch('/changelog-data/main-activity.json')
    if (!res.ok) throw new Error(String(res.status))
    const data = await res.json()
    current.value = data.current
    archiveIndex.value = data.archives
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
})

async function toggleMonth(yearMonth: string) {
  if (expandedMonths.value.has(yearMonth)) {
    expandedMonths.value.delete(yearMonth)
    expandedMonths.value = new Set(expandedMonths.value)
    return
  }
  if (!loadedArchives.value[yearMonth]) {
    try {
      const res = await fetch(`/changelog-data/main-activity-archive-${yearMonth}.json`)
      const data = await res.json()
      loadedArchives.value = { ...loadedArchives.value, [yearMonth]: data.entries }
    } catch {
      loadedArchives.value = { ...loadedArchives.value, [yearMonth]: [] }
    }
  }
  expandedMonths.value = new Set(expandedMonths.value).add(yearMonth)
}

function statusClass(status: Entry['status']) {
  return `lf-mba-badge lf-mba-badge--${status.toLowerCase()}`
}
</script>

<template>
  <div class="lf-mba">
    <div class="lf-mba-banner" role="note">{{ t.banner }}</div>

    <div class="lf-mba-legend">
      <strong>{{ t.legendTitle }}</strong>
      <div class="lf-mba-legend-row"><span class="lf-mba-badge lf-mba-badge--unreleased">Unreleased</span> {{ t.unreleased }}</div>
      <div class="lf-mba-legend-row"><span class="lf-mba-badge lf-mba-badge--released">Released</span> {{ t.released }}</div>
      <div class="lf-mba-legend-row"><span class="lf-mba-badge lf-mba-badge--internal">Internal</span> {{ t.internal }}</div>
    </div>

    <p v-if="loading" class="lf-mba-status">{{ t.loading }}</p>
    <p v-else-if="error" class="lf-mba-status">{{ t.error }}</p>
    <template v-else>
      <h3 v-if="current.yearMonth">{{ current.yearMonth }}</h3>
      <p v-if="current.entries.length === 0" class="lf-mba-status">{{ t.empty }}</p>
      <ul class="lf-mba-list">
        <li v-for="entry in current.entries" :key="entry.sha" class="lf-mba-entry">
          <div class="lf-mba-entry-head">
            <span :class="statusClass(entry.status)">{{ entry.status }}</span>
            <span v-if="entry.revertedBy" class="lf-mba-badge lf-mba-badge--reverted">{{ t.reverted }}</span>
            <time class="lf-mba-date">{{ entry.date.slice(0, 10) }}</time>
          </div>
          <div class="lf-mba-entry-body">
            <a
              :href="`https://github.com/conectlens/lenserfight/commit/${entry.sha}`"
              target="_blank"
              rel="noopener noreferrer"
              class="lf-mba-sha"
              >{{ entry.shortSha }}</a
            >
            <a
              v-if="entry.prNumber"
              :href="`https://github.com/conectlens/lenserfight/pull/${entry.prNumber}`"
              target="_blank"
              rel="noopener noreferrer"
              >#{{ entry.prNumber }} — {{ formatPrTitle(entry) }}</a
            >
            <span v-else>{{ entry.subject }}</span>
          </div>
          <div class="lf-mba-entry-meta">
            <span><strong>{{ t.category }}:</strong> {{ formatCategory(entry) }}</span>
            <span v-if="entry.components.length"
              ><strong>{{ t.components }}:</strong> {{ entry.components.join(', ') }}</span
            >
            <span><strong>{{ t.verification }}:</strong> {{ formatVerification(entry) }}</span>
          </div>
          <p class="lf-mba-impact">{{ formatUserImpact(entry) }}</p>
        </li>
      </ul>

      <div v-if="archiveIndex.length" class="lf-mba-archives">
        <strong>{{ t.olderMonths }}</strong>
        <div v-for="a in archiveIndex" :key="a.yearMonth" class="lf-mba-archive-row">
          <button class="lf-mba-archive-toggle" @click="toggleMonth(a.yearMonth)">
            {{ expandedMonths.has(a.yearMonth) ? '▾' : '▸' }} {{ a.yearMonth }} ({{ a.count }})
          </button>
          <ul v-if="expandedMonths.has(a.yearMonth)" class="lf-mba-list">
            <li v-for="entry in loadedArchives[a.yearMonth]" :key="entry.sha" class="lf-mba-entry">
              <div class="lf-mba-entry-head">
                <span :class="statusClass(entry.status)">{{ entry.status }}</span>
                <time class="lf-mba-date">{{ entry.date.slice(0, 10) }}</time>
              </div>
              <div class="lf-mba-entry-body">
                <a
                  :href="`https://github.com/conectlens/lenserfight/commit/${entry.sha}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="lf-mba-sha"
                  >{{ entry.shortSha }}</a
                >
                <a
                  v-if="entry.prNumber"
                  :href="`https://github.com/conectlens/lenserfight/pull/${entry.prNumber}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  >#{{ entry.prNumber }} — {{ formatPrTitle(entry) }}</a
                >
                <span v-else>{{ entry.subject }}</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.lf-mba-banner {
  padding: 0.85rem 1rem;
  margin: 0 0 1rem;
  border-radius: 10px;
  border: 1px solid var(--vp-c-warning-2, #e0a100);
  background: var(--vp-c-warning-soft, rgba(224, 161, 0, 0.12));
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
  line-height: 1.55;
  font-weight: 600;
}

.lf-mba-legend {
  padding: 0.75rem 1rem;
  margin: 0 0 1.25rem;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  font-size: 0.82rem;
}

.lf-mba-legend-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.4rem;
  color: var(--vp-c-text-2);
}

.lf-mba-status {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}

.lf-mba-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.lf-mba-entry {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  padding: 0.75rem 0.9rem;
  margin-bottom: 0.6rem;
}

.lf-mba-entry-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.lf-mba-date {
  margin-left: auto;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}

.lf-mba-entry-body {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: baseline;
  font-size: 0.9rem;
  margin-bottom: 0.3rem;
}

.lf-mba-sha {
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

.lf-mba-entry-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
  margin-bottom: 0.3rem;
}

.lf-mba-impact {
  font-size: 0.85rem;
  color: var(--vp-c-text-1);
  margin: 0;
}

.lf-mba-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.lf-mba-badge--unreleased { background: rgba(224, 161, 0, 0.18); color: #92660a; }
.lf-mba-badge--released { background: rgba(16, 185, 129, 0.18); color: #067a55; }
.lf-mba-badge--internal { background: rgba(148, 163, 184, 0.22); color: #475569; }
.lf-mba-badge--reverted { background: rgba(239, 68, 68, 0.18); color: #b91c1c; }

html.dark .lf-mba-badge--unreleased { color: #ffde59; }
html.dark .lf-mba-badge--released { color: #34d399; }
html.dark .lf-mba-badge--internal { color: #cbd5e1; }
html.dark .lf-mba-badge--reverted { color: #fca5a5; }

.lf-mba-archives {
  margin-top: 1.5rem;
  font-size: 0.85rem;
}

.lf-mba-archive-row {
  margin-top: 0.5rem;
}

.lf-mba-archive-toggle {
  background: none;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 0.4rem 0.7rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.lf-mba-archive-toggle:hover {
  background: var(--vp-c-bg-soft);
}
</style>
