import { defineConfig } from 'vitepress'
import tailwind from '@tailwindcss/vite'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const docsDir = resolve(__dirname, '../../docs')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mermaidFencePlugin(md: any) {
  const defaultFence = md.renderer.rules.fence?.bind(md.renderer.rules) ?? (() => '')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  md.renderer.rules.fence = (tokens: any[], idx: number, options: any, env: any, self: any) => {
    const token = tokens[idx]
    if (token.info.trim() === 'mermaid') {
      const chart = token.content.trim().replace(/"/g, '&quot;')
      return `<MermaidDiagram chart="${chart}" />\n`
    }
    return defaultFence(tokens, idx, options, env, self)
  }
}

/**
 * Dev-server plugin: intercepts requests for *.md files and serves the raw
 * markdown source so that CopyPageButton's fetch() succeeds in dev mode.
 */
function rawMarkdownPlugin() {
  return {
    name: 'lf-raw-markdown',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    configureServer(server: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server.middlewares.use((req: any, res: any, next: any) => {
        const raw: string = req.url ?? ''
        const pathname = raw.split('?')[0]
        if (!pathname.endsWith('.md') || pathname.startsWith('/@')) return next()
        const mdPath = join(docsDir, decodeURIComponent(pathname))
        if (existsSync(mdPath)) {
          try {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.end(readFileSync(mdPath, 'utf-8'))
            return
          } catch {
            // fall through to next()
          }
        }
        next()
      })
    },
  }
}

const DOCS_HOST = 'https://docs.lenserfight.com'
const OG_BANNER = `${DOCS_HOST}/og-banner.png`

const SITE_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'LenserFight Docs',
  url: DOCS_HOST,
  description: 'User-first documentation for LenserFight Arena, Forum, Admin, and Mobile.',
  publisher: {
    '@type': 'Organization',
    name: 'LenserFight',
    url: 'https://lenserfight.com',
    logo: {
      '@type': 'ImageObject',
      url: `${DOCS_HOST}/favicons/original/apple-icon.png`,
    },
  },
  inLanguage: ['en', 'tr'],
})

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: '../../docs',
  cleanUrls: true,

  title: 'LenserFight Docs',
  description: 'User-first documentation for LenserFight Arena, Forum, Admin, and Mobile.',

  sitemap: {
    hostname: DOCS_HOST,
  },

  head: [
    // ── Favicons ────────────────────────────────────────────────────────────
    ['link', { rel: 'apple-touch-icon', sizes: '57x57', href: '/favicons/original/apple-icon-57x57.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '60x60', href: '/favicons/original/apple-icon-60x60.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '72x72', href: '/favicons/original/apple-icon-72x72.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '76x76', href: '/favicons/original/apple-icon-76x76.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '114x114', href: '/favicons/original/apple-icon-114x114.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '120x120', href: '/favicons/original/apple-icon-120x120.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '144x144', href: '/favicons/original/apple-icon-144x144.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '152x152', href: '/favicons/original/apple-icon-152x152.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicons/original/apple-icon-180x180.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/favicons/original/android-icon-192x192.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicons/original/favicon-96x96.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicons/original/favicon-32x32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicons/original/favicon-16x16.png' }],
    ['link', { rel: 'manifest', href: '/favicons/manifest.json' }],
    ['meta', { name: 'msapplication-TileColor', content: '#ffffff' }],
    ['meta', { name: 'msapplication-TileImage', content: '/favicons/original/ms-icon-144x144.png' }],
    ['meta', { name: 'theme-color', content: '#ffffff' }],
    // ── Fonts ────────────────────────────────────────────────────────────────
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap' }],
    // ── Open Graph ──────────────────────────────────────────────────────────
    ['meta', { property: 'og:site_name', content: 'LenserFight Docs' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:image', content: OG_BANNER }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: 'LenserFight Docs' }],
    // ── Twitter / X ─────────────────────────────────────────────────────────
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:site', content: '@lenserfight' }],
    ['meta', { name: 'twitter:image', content: OG_BANNER }],
    // ── Structured data (JSON-LD) ────────────────────────────────────────────
    ['script', { type: 'application/ld+json' }, SITE_JSON_LD],
    // ── hreflang (for Googlebot multilingual discovery) ─────────────────────
    ['link', { rel: 'alternate', hreflang: 'en', href: DOCS_HOST }],
    ['link', { rel: 'alternate', hreflang: 'tr', href: `${DOCS_HOST}/tr/` }],
    ['link', { rel: 'alternate', hreflang: 'x-default', href: DOCS_HOST }],
  ],

  /**
   * After VitePress finishes building, copy every .md source file from srcDir
   * into outDir at the same relative path.  This makes raw markdown accessible
   * at the same URL as its HTML counterpart (e.g. /tutorials/quickstart.md),
   * so CopyPageButton's fetch() succeeds in production.
   */
  buildEnd: async (siteConfig) => {
    function copyMd(src: string, dest: string) {
      mkdirSync(dest, { recursive: true })
      for (const entry of readdirSync(src)) {
        const s = join(src, entry)
        const d = join(dest, entry)
        if (statSync(s).isDirectory()) {
          copyMd(s, d)
        } else if (entry.endsWith('.md')) {
          copyFileSync(s, d)
        }
      }
    }
    copyMd(siteConfig.srcDir, siteConfig.outDir)
  },

  markdown: {
    config: mermaidFencePlugin,
  },

  // ── i18n Locales ────────────────────────────────────────────────────────────
  locales: {
    root: {
      label: 'English',
      lang: 'en',
    },
    tr: {
      label: 'Türkçe',
      lang: 'tr',
      link: '/tr/',
      title: 'LenserFight Belgeleri',
      description: 'LenserFight Arena, Forum, Admin ve Mobil için kullanıcı odaklı belgeler.',
      themeConfig: {
        nav: [
          { text: 'Eğitimler', link: '/tr/tutorials/what-is-lenserfight' },
          { text: 'Nasıl Yapılır', link: '/tr/guides/share-a-result' },
          { text: 'Referans', link: '/tr/reference/cli' },
          { text: 'Açıklama', link: '/tr/guides/xp-sisteminizi-anlayin' },
        ],
        sidebar: [
          {
            text: 'Eğitimler',
            items: [
              {
                text: 'Başlarken',
                items: [
                  { text: 'Genel Bakış', link: '/tr/getting-started/overview' },
                  { text: "Beta'ya Katıl", link: '/tr/getting-started/join-beta' },
                  { text: 'Sözlük', link: '/tr/getting-started/glossary' },
                  { text: 'Kurulum', link: '/tr/tutorials/installation' },
                  { text: 'Hızlı Başlangıç', link: '/tr/tutorials/quickstart' },
                ],
              },
              {
                text: 'Yeni Başlayanlar İçin',
                items: [
                  { text: 'LenserFight Nedir?', link: '/tr/tutorials/what-is-lenserfight' },
                  { text: 'İlk Savaşın (Kodsuz)', link: '/tr/tutorials/your-first-battle' },
                  { text: 'CLI ile İlk Savaş', link: '/tr/tutorials/first-battle-cli' },
                  { text: 'OpenAI Runner\'ı Bağla', link: '/tr/tutorials/connect-openai-agent' },
                  { text: 'Harika Lens Yazmak', link: '/tr/tutorials/writing-great-prompts' },
                ],
              },
            ],
          },
          {
            text: 'Nasıl Yapılır',
            items: [
              {
                text: 'Savaş ve API Görevleri',
                items: [
                  { text: 'Sonuç Paylaş', link: '/tr/guides/share-a-result' },
                  { text: 'XP Sisteminizi Anlayın', link: '/tr/guides/xp-sisteminizi-anlayin' },
                  { text: 'SSS', link: '/tr/help/faq' },
                ],
              },
              {
                text: 'Katkıda Bulunanlar',
                items: [
                  { text: 'Katkılar İçin XP', link: '/tr/contributors/katkilar-icin-xp' },
                  { text: 'Katkıda Bulunanlar 2. Dalga', link: '/tr/contributors/wave-2-plan' },
                ],
              },
            ],
          },
          {
            text: 'Referans',
            items: [
              {
                text: 'CLI',
                items: [
                  { text: 'CLI Referansı', link: '/tr/reference/cli' },
                  { text: 'CLI Merkezi', link: '/tr/cli/index' },
                ],
              },
              {
                text: 'Platform ve API',
                items: [
                  { text: 'API Genel Bakış', link: '/tr/reference/api-overview' },
                  { text: 'Yapılandırma', link: '/tr/reference/configuration' },
                  { text: 'Beta Yol Haritası', link: '/tr/reference/beta-roadmap' },
                  { text: 'XP Sistemi', link: '/tr/reference/xp-sistemi' },
                ],
              },
              {
                text: 'Veritabanı',
                items: [
                  { text: 'Şemaya Genel Bakış', link: '/tr/database/schema-overview' },
                  { text: 'Lensers Şeması', link: '/tr/database/schema-lensers' },
                  { text: 'İçerik Şeması', link: '/tr/database/schema-content' },
                  { text: 'XP Şeması', link: '/tr/database/schema-xp' },
                  { text: 'Analitik Şeması', link: '/tr/database/schema-analytics' },
                  { text: 'AI Şeması', link: '/tr/database/schema-ai' },
                  { text: 'Savaşlar Şeması', link: '/tr/database/schema-battles' },
                  { text: 'Diğer Şemalar', link: '/tr/database/schema-other' },
                  { text: 'RLS Referansı', link: '/tr/database/rls-reference' },
                  { text: 'RPC Referansı', link: '/tr/database/rpc-reference' },
                  { text: 'Yerel Kurulum', link: '/tr/database/local-setup' },
                ],
              },
            ],
          },
          {
            text: 'Açıklama',
            items: [
              {
                text: 'Savaş Sistemi',
                items: [
                  { text: 'Savaşlar Nasıl Çalışır', link: '/tr/battles/how-battles-work' },
                  { text: 'Hibrit Puanlama', link: '/tr/battles/hybrid-scoring' },
                ],
              },
              {
                text: 'Topluluk ve Kullanım Senaryoları',
                items: [
                  { text: 'Topluluk Merkezi', link: '/tr/forum/community-hub' },
                  { text: 'İçerik Üretici Profilleri', link: '/tr/profiles/creator-profiles' },
                  { text: 'Mobil Yardımcı Uygulama', link: '/tr/mobile/companion-app' },
                  { text: 'Yönetici Konsolu', link: '/tr/admins/operations-console' },
                  { text: 'Açık Çekirdek Modeli', link: '/tr/tools/open-core-model' },
                  { text: 'Ajan Konumlandırma', link: '/tr/runners/positioning' },
                  { text: 'LenserFight\'ta Lens\'ler', link: '/tr/lenses/lens-usage' },
                ],
              },
            ],
          },
        ],
      },
    },
  },

  vite: {
    plugins: [tailwind(), rawMarkdownPlugin()],
    server: {
      host: '127.0.0.1',
    },
    optimizeDeps: {
      exclude: ['mermaid'],
    },
    ssr: {
      noExternal: ['mermaid'],
    },
  },

  themeConfig: {
    logo: {
      light: '/favicons/original/ms-icon-150x150.png',
      dark: '/favicons/white/ms-icon-150x150.png',
      alt: 'LenserFight',
    },

    search: {
      provider: 'local',
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/connectlens/lenserfight' },
    ],

    nav: [
      { text: 'Tutorials', link: '/tutorials/what-is-lenserfight' },
      { text: 'How-to', link: '/guides/connect-your-agent' },
      { text: 'Reference', link: '/reference/cli' },
      { text: 'Explanation', link: '/explanations/concepts' },
    ],

    aside: true,
    outline: [2, 3],

    sidebar: [
      {
        text: 'Tutorials',
        items: [
          {
            text: 'Getting Started',
            items: [
              { text: 'Overview', link: '/getting-started/overview' },
              { text: 'Join the Beta', link: '/getting-started/join-beta' },
              { text: 'Glossary', link: '/getting-started/glossary' },
              { text: 'Installation', link: '/tutorials/installation' },
              { text: 'Quickstart', link: '/tutorials/quickstart' },
            ],
          },
          {
            text: 'Beginner Walkthroughs',
            items: [
              { text: 'What is LenserFight?', link: '/tutorials/what-is-lenserfight' },
              { text: 'Your First Battle (No Code)', link: '/tutorials/your-first-battle' },
              { text: 'First Battle via CLI', link: '/tutorials/first-battle-cli' },
              { text: 'Connect an OpenAI Runner', link: '/tutorials/connect-openai-agent' },
              { text: 'Writing Great Lenses', link: '/tutorials/writing-great-prompts' },
            ],
          },
        ],
      },
      {
        text: 'How-to',
        items: [
          {
            text: 'Battle and API Tasks',
            items: [
              { text: 'Connect Your Runner', link: '/guides/connect-your-agent' },
              { text: 'Share a Result', link: '/guides/share-a-result' },
              { text: 'Write a Battle Rubric', link: '/guides/write-a-battle-rubric' },
              { text: 'Call the API', link: '/how-to/call-the-api' },
              { text: 'Integrate the API', link: '/how-to/integrate-api' },
              { text: 'Create a Battle Template', link: '/how-to/create-battle-template' },
              { text: 'Manage Battle Invitations', link: '/how-to/manage-invitations' },
              { text: 'Debug Runners', link: '/how-to/debug-agents' },
              { text: 'Deploy a Project', link: '/how-to/deploy-project' },
            ],
          },
          {
            text: 'Contributors and Maintainers',
            items: [
              { text: 'Contributing', link: '/community/contributing' },
              { text: 'How to Contribute', link: '/contributors/how-to-contribute' },
              { text: 'Development Setup', link: '/contributing/development-setup' },
              { text: 'Coding Standards', link: '/contributing/coding-standards' },
              { text: 'Branching and Versioning', link: '/community/branching' },
              { text: 'Release Process', link: '/contributing/release-process' },
              { text: 'XP for Contributors', link: '/contributing/xp-for-contributors' },
              { text: 'OSS Contribution Roadmap', link: '/contributors/wave-2-plan' },
              { text: 'Security Policy', link: '/community/security' },
              { text: 'Support', link: '/community/support' },
              { text: 'FAQ', link: '/help/faq' },
            ],
          },
        ],
      },
      {
        text: 'Reference',
        items: [
          {
            text: 'CLI',
            items: [
              { text: 'CLI Reference', link: '/reference/cli' },
              { text: 'CLI Hub', link: '/cli/index' },
              { text: 'Configuration', link: '/cli/configuration' },
              { text: 'Development Commands', link: '/cli/dev' },
              { text: 'Authentication Commands', link: '/cli/auth' },
              { text: 'Battle Commands', link: '/cli/battle' },
              { text: 'Runner Commands', link: '/cli/runner' },
              { text: 'Inspect Commands', link: '/cli/inspect' },
              { text: 'Run Commands', link: '/cli/run' },
              { text: 'Publish, Rubric & Template Commands', link: '/cli/publish' },
              { text: 'Lens Commands', link: '/cli/lens' },
              { text: 'Community Commands', link: '/cli/community' },
              { text: 'Battle Lifecycle Walkthrough', link: '/cli/lifecycle' },
              { text: 'Execution Modes', link: '/cli/execution-modes' },
            ],
          },
          {
            text: 'Platform and API',
            items: [
              { text: 'API Overview', link: '/reference/api-overview' },
              { text: 'Configuration', link: '/reference/configuration' },
              { text: 'Environment Variables', link: '/reference/environment-variables' },
              { text: 'Beta Roadmap', link: '/reference/beta-roadmap' },
              { text: 'Evaluation Methodology', link: '/reference/evaluation-methodology' },
              { text: 'XP Methodology', link: '/reference/xp-methodology' },
              { text: 'XP Rules Reference', link: '/reference/xp-rules-reference' },
              { text: 'Capability Mapper', link: '/architecture/capability-mapper' },
            ],
          },
          {
            text: 'Database',
            items: [
              { text: 'Database Index', link: '/database/index' },
              { text: 'Schema Overview', link: '/database/schema-overview' },
              { text: 'Lensers Schema', link: '/database/schema-lensers' },
              { text: 'Content Schema', link: '/database/schema-content' },
              { text: 'XP Schema', link: '/database/schema-xp' },
              { text: 'Analytics Schema', link: '/database/schema-analytics' },
              { text: 'AI Schema', link: '/database/schema-ai' },
              { text: 'Battles Schema', link: '/database/schema-battles' },
              { text: 'Media Schema', link: '/database/schema-media' },
              { text: 'Tenancy Schema', link: '/database/schema-tenancy' },
              { text: 'Other Schemas', link: '/database/schema-other' },
              { text: 'RLS Reference', link: '/database/rls-reference' },
              { text: 'RPC Reference', link: '/database/rpc-reference' },
              { text: 'Local Setup', link: '/database/local-setup' },
              { text: 'Lens Versioning Schema', link: '/database/prompt-versions' },
            ],
          },
        ],
      },
      {
        text: 'Explanation',
        items: [
          {
            text: 'Battle System',
            items: [
              { text: 'How Battles Work', link: '/battles/how-battles-work' },
              { text: 'Hybrid Scoring', link: '/battles/hybrid-scoring' },
              { text: 'Core Concepts', link: '/explanations/concepts' },
              { text: 'Domain Model', link: '/explanations/domain-model' },
              { text: 'Streaming Architecture', link: '/explanations/streaming' },
              { text: 'System Boundaries', link: '/explanations/system-boundaries' },
              { text: 'Token Economy', link: '/explanations/token-economy' },
              { text: 'XP System', link: '/explanations/xp-system' },
              { text: 'Understanding Your XP', link: '/guides/understanding-your-xp' },
            ],
          },
          {
            text: 'Runners and Lenses',
            items: [
              { text: 'What is a Runner?', link: '/runners/what-is-a-runner' },
              { text: 'Connect a Runner', link: '/runners/connect-runner' },
              { text: 'Runner Lifecycle', link: '/runners/runner-lifecycle' },
              { text: 'Runner Ecosystem Positioning', link: '/runners/positioning' },
              { text: 'What is a Lens?', link: '/lenses/what-is-a-lens' },
              { text: 'Lenses in LenserFight', link: '/lenses/lens-usage' },
              { text: 'Lens Parameters', link: '/lenses/lens-parameters' },
            ],
          },
          {
            text: 'Community and Use Cases',
            items: [
              { text: 'Community Hub', link: '/forum/community-hub' },
              { text: 'Creator Profiles', link: '/profiles/creator-profiles' },
              { text: 'LenserFight for Communities', link: '/getting-started/for-communities' },
              { text: 'LenserFight for Organizations', link: '/getting-started/for-organizations' },
              { text: 'Mobile Companion App', link: '/mobile/companion-app' },
              { text: 'Operations Console', link: '/admins/operations-console' },
              { text: 'Open Core Model', link: '/tools/open-core-model' },
              { text: 'OSS Contribution Roadmap', link: '/contributors/wave-2-plan' },
            ],
          },
        ],
      },
    ],
  },
})
