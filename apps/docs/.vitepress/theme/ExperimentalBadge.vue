<!--
  ExperimentalBadge

  A reusable callout for docs pages that describe features still under
  active construction. Two display modes:

  - inline  → small pill, drops next to a heading or in tables
  - block   → full callout with title + description (default)

  Usage in markdown:

      <ExperimentalBadge />                                  <!-- block, default copy -->
      <ExperimentalBadge mode="inline" />                    <!-- inline pill          -->
      <ExperimentalBadge title="Battles" description="..." /> <!-- override copy        -->
-->
<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  mode?: 'block' | 'inline'
  title?: string
  description?: string
  /** Optional permalink to a tracking issue / roadmap page */
  trackingUrl?: string
  trackingLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'block',
  title: 'Experimental',
  description:
    'This area is under active construction. Behaviour, APIs and UI may change without notice — try it, but expect rough edges and missing tests.',
  trackingUrl: '',
  trackingLabel: 'Track progress',
})

const isInline = computed(() => props.mode === 'inline')
</script>

<template>
  <span
    v-if="isInline"
    class="lf-exp-pill"
    role="status"
    :title="description"
  >
    <span class="lf-exp-pill__dot" aria-hidden="true" />
    <span class="lf-exp-pill__label">{{ title }}</span>
  </span>

  <aside
    v-else
    class="lf-exp-callout"
    role="note"
    aria-label="Experimental feature"
  >
    <div class="lf-exp-callout__icon" aria-hidden="true">
      <!-- Beaker / lab icon: communicates "we're brewing this" -->
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 3h6" />
        <path d="M10 3v5.5L5.2 17.4A2 2 0 0 0 7 20.5h10a2 2 0 0 0 1.8-3.1L14 8.5V3" />
        <path d="M7.4 14h9.2" />
      </svg>
      <span class="lf-exp-callout__pulse" aria-hidden="true" />
    </div>

    <div class="lf-exp-callout__body">
      <div class="lf-exp-callout__title">
        <span class="lf-exp-callout__label">{{ title }}</span>
        <span class="lf-exp-callout__chip">Under construction</span>
      </div>
      <p class="lf-exp-callout__desc">{{ description }}</p>
      <a
        v-if="trackingUrl"
        :href="trackingUrl"
        class="lf-exp-callout__link"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ trackingLabel }}
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 3h7v7" />
          <path d="M13 3 4 12" />
        </svg>
      </a>
    </div>
  </aside>
</template>

<style scoped>
/* ───────────────── Inline pill ───────────────── */
.lf-exp-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.4;
  color: #92660a;
  background: rgba(255, 222, 89, 0.22);
  border: 1px solid rgba(255, 222, 89, 0.55);
  vertical-align: middle;
  cursor: help;
}

.lf-exp-pill__dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #f59e0b;
  box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5);
  animation: lf-exp-pulse 1.8s ease-in-out infinite;
}

html.dark .lf-exp-pill {
  color: #ffde59;
  background: rgba(255, 222, 89, 0.10);
  border-color: rgba(255, 222, 89, 0.35);
}

/* ───────────────── Block callout ───────────────── */
.lf-exp-callout {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 0.95rem 1.05rem;
  margin: 1.1rem 0 1.4rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 222, 89, 0.55);
  background:
    repeating-linear-gradient(
      135deg,
      rgba(255, 222, 89, 0.06) 0 14px,
      rgba(255, 222, 89, 0.12) 14px 28px
    ),
    rgba(255, 252, 230, 0.65);
  color: var(--vp-c-text-1);
  overflow: hidden;
}

.lf-exp-callout::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: linear-gradient(180deg, #ffde59 0%, #f59e0b 100%);
}

html.dark .lf-exp-callout {
  border-color: rgba(255, 222, 89, 0.30);
  background:
    repeating-linear-gradient(
      135deg,
      rgba(255, 222, 89, 0.04) 0 14px,
      rgba(255, 222, 89, 0.08) 14px 28px
    ),
    rgba(38, 30, 6, 0.45);
}

.lf-exp-callout__icon {
  position: relative;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 222, 89, 0.25);
  color: #92660a;
  margin-top: 1px;
}

html.dark .lf-exp-callout__icon {
  background: rgba(255, 222, 89, 0.15);
  color: #ffde59;
}

.lf-exp-callout__pulse {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #f59e0b;
  box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.6);
  animation: lf-exp-pulse 1.8s ease-in-out infinite;
}

.lf-exp-callout__body { flex: 1 1 auto; min-width: 0; }

.lf-exp-callout__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.lf-exp-callout__label {
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.005em;
  color: var(--vp-c-text-1);
}

.lf-exp-callout__chip {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #92660a;
  background: rgba(255, 222, 89, 0.35);
}

html.dark .lf-exp-callout__chip {
  color: #ffde59;
  background: rgba(255, 222, 89, 0.18);
}

.lf-exp-callout__desc {
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--vp-c-text-2);
  margin: 0;
}

.lf-exp-callout__link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.55rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: #92660a;
  text-decoration: none;
}

html.dark .lf-exp-callout__link { color: #ffde59; }

.lf-exp-callout__link:hover { text-decoration: underline; }

/* ───────────────── Shared pulse ───────────────── */
@keyframes lf-exp-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); }
  50%      { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .lf-exp-pill__dot,
  .lf-exp-callout__pulse { animation: none; }
}
</style>
