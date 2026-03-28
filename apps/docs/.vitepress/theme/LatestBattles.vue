<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { supabase } from './supabaseClient'

interface Battle {
  id: string
  slug: string
  title: string
  status: 'voting' | 'open'
  total_vote_count: number
  battle_type: string
  voter_eligibility: string | null
  voting_opens_at: string | null
  voting_closes_at: string | null
}

const forumBaseUrl = import.meta.env.VITE_FORUM_URL ?? 'https://lenserfight.com'

const battles = ref<Battle[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  try {
    const { data, error: fetchError } = await (supabase as any)
      .schema('battles')
      .from('battles')
      .select('id, slug, title, status, total_vote_count, battle_type, voter_eligibility, voting_opens_at, voting_closes_at')
      .in('status', ['voting', 'open'])
      .order('published_at', { ascending: false })
      .limit(4)

    if (fetchError) {
      error.value = fetchError.message
    } else {
      battles.value = data ?? []
    }
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load battles'
  } finally {
    loading.value = false
  }

  ticker = setInterval(() => {
    now.value = Date.now()
  }, 30_000)
})

onUnmounted(() => {
  if (ticker !== null) clearInterval(ticker)
})

const BATTLE_TYPE_LABELS: Record<string, string> = {
  ai_vs_ai: 'AI vs AI',
  human_vs_human_open_votes: 'H vs H · Open',
  human_vs_human_ai_votes: 'H vs H · AI Judge',
  human_vs_ai: 'Human vs AI',
  workflow_battle: 'Workflow',
}

function battleTypeLabel(type: string): string {
  return BATTLE_TYPE_LABELS[type] ?? type
}

function countdown(closesAt: string | null): string | null {
  if (!closesAt) return null
  const diff = new Date(closesAt).getTime() - now.value
  if (diff <= 0) return 'Closed'
  const totalMins = Math.floor(diff / 60_000)
  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  if (hours > 0) return `Closes in ${hours}h ${mins}m`
  return `Closes in ${mins}m`
}
</script>

<template>
  <div class="lb-root">
    <!-- Skeleton loading -->
    <div v-if="loading" class="lb-grid">
      <div v-for="i in 4" :key="i" class="lb-card lb-skeleton-card" aria-hidden="true">
        <div class="lb-skeleton lb-sk-badge" />
        <div class="lb-skeleton lb-sk-title" />
        <div class="lb-skeleton lb-sk-meta" />
      </div>
    </div>

    <!-- Error state -->
    <p v-else-if="error" class="lb-empty">Could not load battles right now.</p>

    <!-- Empty state -->
    <p v-else-if="battles.length === 0" class="lb-empty">No live battles right now.</p>

    <!-- Battle cards -->
    <div v-else class="lb-grid">
      <a
        v-for="battle in battles"
        :key="battle.id"
        :href="`${forumBaseUrl}/battles/${battle.slug}`"
        class="lb-card"
        target="_blank"
        rel="noopener noreferrer"
      >
        <!-- Header row: type label + status badge -->
        <div class="lb-header">
          <span class="lb-type-label">{{ battleTypeLabel(battle.battle_type) }}</span>
          <span
            class="lb-status-badge"
            :class="battle.status === 'voting' ? 'lb-status-voting' : 'lb-status-open'"
          >
            {{ battle.status === 'voting' ? 'Voting Now' : 'Open' }}
          </span>
        </div>

        <!-- Title -->
        <div class="lb-title">{{ battle.title }}</div>

        <!-- Footer row: votes + countdown -->
        <div class="lb-footer">
          <span class="lb-votes">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2l2 4h4l-3.3 2.4 1.3 4L8 10l-3.9 2.4 1.2-4L2 6h4L8 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
            </svg>
            {{ battle.total_vote_count ?? 0 }} votes
          </span>
          <span
            v-if="battle.status === 'voting' && battle.voting_closes_at"
            class="lb-countdown"
          >
            {{ countdown(battle.voting_closes_at) }}
          </span>
        </div>
      </a>
    </div>
  </div>
</template>

<style scoped>
.lb-root {
  margin: 1rem 0;
}

.lb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.875rem;
}

.lb-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 1.1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  text-decoration: none;
  color: var(--vp-c-text-1);
  transition: box-shadow 0.15s, transform 0.15s;
}

.lb-card:hover {
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.lb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.lb-type-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-2);
}

.lb-status-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 99px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.lb-status-voting {
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
}

.lb-status-open {
  background: rgba(202, 138, 4, 0.12);
  color: #ca8a04;
}

.lb-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lb-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 0.25rem;
}

.lb-votes {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
}

.lb-countdown {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--vp-c-brand-1);
}

.lb-empty {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  padding: 1.5rem 0;
}

/* Skeleton */
.lb-skeleton-card {
  cursor: default;
  pointer-events: none;
}

.lb-skeleton {
  background: linear-gradient(
    90deg,
    var(--vp-c-bg-soft) 25%,
    var(--vp-c-bg-elv, #e5e7eb) 50%,
    var(--vp-c-bg-soft) 75%
  );
  background-size: 200% 100%;
  animation: lb-shimmer 1.4s infinite;
  border-radius: 4px;
}

.lb-sk-badge {
  width: 70px;
  height: 16px;
}

.lb-sk-title {
  width: 90%;
  height: 14px;
  border-radius: 4px;
}

.lb-sk-meta {
  width: 45%;
  height: 12px;
  border-radius: 4px;
  margin-top: 0.5rem;
}

@keyframes lb-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
