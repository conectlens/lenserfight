<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'

const webBaseUrl = import.meta.env.WEB_BASE_URL ?? 'https://lenserfight.com'
const arenaBaseUrl = import.meta.env.ARENA_URL ?? 'https://lenserfight.com'

const utmSource = 'lenserfight'
const utmMedium = 'docs_footer'

function appendUtm(url: string, campaign: string) {
  try {
    const u = new URL(url)
    u.searchParams.set('utm_source', utmSource)
    u.searchParams.set('utm_medium', utmMedium)
    u.searchParams.set('utm_campaign', campaign)
    return u.toString()
  } catch {
    return url
  }
}

const currentYear = computed(() => new Date().getFullYear())

// Dark mode toggle: cycle light → dark → system
type ColorScheme = 'light' | 'dark' | 'system'

const colorScheme = ref<ColorScheme>('system')

function detectCurrentScheme(): ColorScheme {
  if (typeof document === 'undefined') return 'system'
  const html = document.documentElement
  if (html.classList.contains('dark')) {
    // Check if a manual preference is stored
    const stored = localStorage.getItem('vitepress-theme-appearance')
    if (stored === 'dark') return 'dark'
    if (stored === 'light') return 'light'
    return 'dark'
  }
  const stored = localStorage.getItem('vitepress-theme-appearance')
  if (stored === 'light') return 'light'
  if (stored === 'dark') return 'dark'
  return 'system'
}

function applyScheme(scheme: ColorScheme) {
  if (typeof document === 'undefined') return
  const html = document.documentElement
  if (scheme === 'dark') {
    html.classList.add('dark')
    localStorage.setItem('vitepress-theme-appearance', 'dark')
  } else if (scheme === 'light') {
    html.classList.remove('dark')
    localStorage.setItem('vitepress-theme-appearance', 'light')
  } else {
    // system
    localStorage.removeItem('vitepress-theme-appearance')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.classList.toggle('dark', prefersDark)
  }
}

function cycleColorScheme() {
  const next: Record<ColorScheme, ColorScheme> = {
    light: 'dark',
    dark: 'system',
    system: 'light',
  }
  colorScheme.value = next[colorScheme.value]
  applyScheme(colorScheme.value)
}

const schemeLabel = computed(() => {
  if (colorScheme.value === 'light') return 'Light'
  if (colorScheme.value === 'dark') return 'Dark'
  return 'System'
})

onMounted(() => {
  colorScheme.value = detectCurrentScheme()
})

const navLinks = [
  { label: 'Arena', href: appendUtm(webBaseUrl, 'footer_arena_link') },
  { label: 'Battles', href: appendUtm(`${webBaseUrl}/battles`, 'footer_battles_link') },
  { label: 'About', href: appendUtm(`${arenaBaseUrl}/about`, 'footer_about_link') },
  { label: 'Product', href: appendUtm(`${arenaBaseUrl}/product`, 'footer_product_link') },
  { label: 'FAQ', href: appendUtm(`${arenaBaseUrl}/faq`, 'footer_faq_link') },
  { label: 'Contact', href: appendUtm('https://chainabit.com/contact', 'lenserfight_contact') },
]

const policyLinks = [
  { label: 'Terms & Policies', href: appendUtm(`${arenaBaseUrl}/policies/terms`, 'footer_policy_terms_link') },
  { label: 'Privacy', href: appendUtm(`${arenaBaseUrl}/policies/privacy`, 'footer_policy_privacy_link') },
  { label: 'Cookies', href: appendUtm(`${arenaBaseUrl}/policies/cookies`, 'footer_policy_cookies_link') },
]

const conectlensUrl = computed(() => appendUtm('https://conectlens.com', 'footer_conectlens_link'))
const chainabitUrl = computed(() => appendUtm('https://chainabit.com', 'footer_chainabit_partner'))
const sponsorUrl = computed(() => appendUtm('https://github.com/sponsors/conectlens', 'footer_sponsor_link'))
const githubUrl = computed(() => appendUtm('https://github.com/conectlens/lenserfight', 'footer_github_link'))
const ofcsknUrl = computed(() => appendUtm('https://ofcskn.com', 'footer_ofcskn_link'))
const communityUrl = computed(() => appendUtm('https://github.com/conectlens/lenserfight', 'footer_community_link'))
const lenserfightUrl = computed(() => appendUtm(webBaseUrl, 'footer_copyright_link'))
</script>

<template>
  <footer class="df-footer">
    <div class="df-inner">
      <!-- Top row: copyright · powered by | nav links | theme toggle -->
      <div class="df-top-row">
        <div class="df-left">
          <a :href="lenserfightUrl" class="df-link df-copy" target="_blank" rel="noopener noreferrer">
            © {{ currentYear }} LenserFight
          </a>
          <span class="df-sep" aria-hidden="true">·</span>
          <a
            :href="sponsorUrl"
            class="df-link df-sponsor"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="df-heart">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            Sponsor us
          </a>
          <span class="df-sep" aria-hidden="true">·</span>
          <a
            :href="chainabitUrl"
            class="df-link df-chainabit"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src="/chainabit/favicon-32x32.png" width="14" height="14" alt="" />
            <span>Chainabit</span>
          </a>
          <span class="df-sep" aria-hidden="true">·</span>
          <a
            :href="conectlensUrl"
            class="df-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>Powered by ConectLens</span>
          </a>
        </div>

        <nav class="df-nav" aria-label="Footer navigation">
          <a
            v-for="link in navLinks"
            :key="link.label"
            :href="link.href"
            class="df-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ link.label }}
          </a>
        </nav>

      </div>

      <!-- Bottom row: policy links (always visible, full width) -->
      <div class="df-bottom-row">
        <div class="df-policies">
          <a
            v-for="link in policyLinks"
            :key="link.label"
            :href="link.href"
            class="df-link df-link-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ link.label }}
          </a>
        </div>

        <!-- GitHub & Dark mode toggle -->
        <div class="df-right">
          <span class="df-built-by">
            built by
            <a :href="ofcsknUrl" target="_blank" rel="noopener noreferrer" class="df-author">@ofcskn</a>
            &
            <a :href="communityUrl" target="_blank" rel="noopener noreferrer" class="df-author">Lenser Community</a>
          </span>

          <a
            :href="githubUrl"
            class="df-link df-github-link"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.28 1.15-.28 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
          </a>

          <button class="df-theme-btn" :aria-label="`Color scheme: ${schemeLabel}`" @click="cycleColorScheme">
            <!-- Light icon -->
            <svg v-if="colorScheme === 'light'" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="3.5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <!-- Dark icon -->
            <svg v-else-if="colorScheme === 'dark'" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M13.5 10.5A6 6 0 0 1 5.5 2.5a6 6 0 1 0 8 8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
            <!-- System icon -->
            <svg v-else width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1" y="2" width="14" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M5 14h6M8 11v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <span class="df-theme-label">{{ schemeLabel }}</span>
          </button>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.df-footer {
  position: relative;
  z-index: 10; 
  background-color: var(--vp-c-bg);
  border-top: 1px solid var(--vp-c-divider);
  padding: 2rem 1.5rem;
  color: var(--vp-c-text-2);
  box-sizing: border-box;
  overflow: hidden;
  transition: all 0.2s ease;
  margin-top: 6rem;
}

@media (min-width: 960px) {
  .df-footer {
    /* Unblock from sidebar and break out to full viewport */
    z-index: 40;
    width: 100vw;
    left: 50%;
    margin-left: -50vw;
    padding-left: var(--vp-sidebar-width, 272px);
  }
}

.df-footer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--vp-c-brand-1), transparent);
  opacity: 0.3;
}

.df-inner {
  max-width: 1152px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Top row: copyright | nav | theme toggle */
.df-top-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem 2rem;
  width: 100%;
}

.df-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.df-sep {
  color: var(--vp-c-text-3);
  opacity: 0.4;
}

.df-copy {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.df-sponsor {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: #db2777 !important;
  font-weight: 500;
}

.df-sponsor:hover {
  color: #be185d !important;
}

.df-heart {
  color: #ec4899;
}

.df-chainabit {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.df-chainabit img {
  border-radius: 4px;
  filter: grayscale(1) opacity(0.7);
  transition: all 0.2s ease;
}

.df-chainabit:hover img {
  filter: grayscale(0) opacity(1);
}


.df-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  flex: 1;
  justify-content: flex-end;
}

.df-right {
  display: flex;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
}

.df-theme-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.df-theme-btn:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-elv);
  transform: translateY(-1px);
}

.df-theme-label {
  line-height: 1;
}

.df-github-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-border);
  background: var(--vp-c-bg-soft);
  margin-right: 0.75rem;
  color: var(--vp-c-text-3);
  transition: all 0.2s ease;
}

.df-github-link:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-elv);
  transform: translateY(-1px);
}

.df-built-by {
  display: none;
}

@media (min-width: 768px) {
  .df-built-by {
    display: inline-block;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--vp-c-text-3);
    margin-right: 1.5rem;
  }

  .df-author {
    font-weight: 700;
    color: var(--vp-c-text-2);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .df-author:hover {
    color: var(--vp-c-text-1);
  }
}

/* Bottom row: policy links always on their own line */
.df-bottom-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  width: 100%;
  padding-top: 1.25rem;
  border-top: 1px solid var(--vp-c-divider);
}

.df-policies {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
}

.df-link {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: color 0.2s ease;
  position: relative;
}

.df-link:hover {
  color: var(--vp-c-brand-1);
}

.df-link-sm {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}

.df-link-sm:hover {
  color: var(--vp-c-text-2);
}

/* Responsive: stack on mobile */
@media (max-width: 768px) {
  .df-footer {
    padding: 2rem 1rem;
  }

  .df-top-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 1.25rem;
  }

  .df-nav {
    justify-content: flex-start;
    order: 3;
    width: 100%;
  }

  .df-left {
    order: 1;
  }

  .df-policies {
    gap: 0.5rem 1rem;
  }

  .df-bottom-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 1.5rem;
  }

  .df-right {
    margin-left: 0;
  }
}
</style>
