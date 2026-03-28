<!-- HotLenses component - fetches from Supabase -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { supabase } from './supabaseClient'

interface Lens {
  id: string
  title: string
  description: string | null
  battle_count: number
  reaction_totals: Record<string, number> | null
  tags: string[] | null
}

const forumBaseUrl = import.meta.env.VITE_FORUM_URL ?? 'https://lenserfight.com'

const lenses = ref<Lens[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    let query = supabase
      .from('lenses')
      .select('id, title, description, battle_count, reaction_totals, tags')
      .eq('visibility', 'public')
      .eq('status', 'published')
      .order('battle_count', { ascending: false })
      .limit(6)

    const { data, error: fetchError } = await query

    if (fetchError) {
      // If not found in public schema, try lenses schema
      const { data: schemaData, error: schemaError } = await (supabase as any)
        .schema('lenses')
        .from('lenses')
        .select('id, title, description, battle_count, reaction_totals, tags')
        .eq('visibility', 'public')
        .eq('status', 'published')
        .order('battle_count', { ascending: false })
        .limit(6)

      if (schemaError) {
        error.value = schemaError.message
      } else {
        lenses.value = schemaData ?? []
      }
    } else {
      lenses.value = data ?? []
    }
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load lenses'
  } finally {
    loading.value = false
  }
})

function getSaveCount(lens: Lens): number {
  return lens.reaction_totals?.saved ?? 0
}

function getTopTags(lens: Lens): string[] {
  return (lens.tags ?? []).slice(0, 2)
}
</script>

<template>
  <div class="lf-hot-lenses">
    <!-- Skeleton loading state -->
    <div v-if="loading" class="lf-prompts-grid">
      <div v-for="i in 6" :key="i" class="lf-prompt-card lf-skeleton-card" aria-hidden="true">
        <div class="lf-skeleton lf-skeleton-tag" />
        <div class="lf-skeleton lf-skeleton-title" />
        <div class="lf-skeleton lf-skeleton-text" />
        <div class="lf-skeleton lf-skeleton-meta" />
      </div>
    </div>

    <!-- Error state -->
    <p v-else-if="error" class="lf-empty-state">
      Could not load lenses right now.
    </p>

    <!-- Empty state -->
    <p v-else-if="lenses.length === 0" class="lf-empty-state">
      No published lenses found.
    </p>

    <!-- Cards grid -->
    <div v-else class="lf-prompts-grid">
      <a
        v-for="lens in lenses"
        :key="lens.id"
        :href="`${forumBaseUrl}/lenses/${lens.id}`"
        class="lf-prompt-card lf-prompt-card--link"
        target="_blank"
        rel="noopener noreferrer"
      >
        <!-- Tags -->
        <div v-if="getTopTags(lens).length" class="lf-prompt-tags">
          <span
            v-for="tag in getTopTags(lens)"
            :key="tag"
            class="lf-prompt-tag"
          >{{ tag }}</span>
        </div>

        <!-- Title -->
        <div class="lf-prompt-title">{{ lens.title }}</div>

        <!-- Description -->
        <div v-if="lens.description" class="lf-prompt-desc">
          {{ lens.description }}
        </div>

        <!-- Stats -->
        <div class="lf-prompt-meta">
          <span class="lf-prompt-stat" title="Battles">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2L10 6H14L11 9L12 13L8 11L4 13L5 9L2 6H6L8 2Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
            </svg>
            {{ lens.battle_count ?? 0 }} battles
          </span>
          <span class="lf-prompt-stat" title="Saves">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 2h10a1 1 0 0 1 1 1v11l-6-3-6 3V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
            </svg>
            {{ getSaveCount(lens) }} saves
          </span>
        </div>
      </a>
    </div>
  </div>
</template>

<style scoped>
.lf-hot-lenses {
  margin: 1rem 0;
}

.lf-prompt-card--link {
  text-decoration: none;
  display: block;
  color: inherit;
}

.lf-prompt-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
}

.lf-prompt-desc {
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  margin-bottom: 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.lf-empty-state {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  padding: 1.5rem 0;
}

/* Skeleton shimmer */
.lf-skeleton-card {
  cursor: default;
}

.lf-skeleton {
  background: linear-gradient(
    90deg,
    var(--vp-c-bg-soft) 25%,
    var(--vp-c-bg-elv, #e5e7eb) 50%,
    var(--vp-c-bg-soft) 75%
  );
  background-size: 200% 100%;
  animation: lf-shimmer 1.4s infinite;
  border-radius: 4px;
}

.lf-skeleton-tag {
  width: 60px;
  height: 18px;
  margin-bottom: 0.6rem;
}

.lf-skeleton-title {
  width: 80%;
  height: 16px;
  margin-bottom: 0.5rem;
  border-radius: 4px;
}

.lf-skeleton-text {
  width: 95%;
  height: 12px;
  margin-bottom: 0.4rem;
  border-radius: 4px;
}

.lf-skeleton-meta {
  width: 50%;
  height: 12px;
  margin-top: 0.75rem;
  border-radius: 4px;
}

@keyframes lf-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
