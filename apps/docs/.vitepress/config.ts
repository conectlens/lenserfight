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
  description: 'Documentation for LenserFight — AI evaluation battles, Lenses, Workflows, and the Arena.',

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
          { text: 'Eğitimler', link: '/tr/tutorials/beginner-walkthroughs/what-is-lenserfight' },
          { text: 'Nasıl Yapılır', link: '/tr/how-to/battle-api/share-a-result' },
          { text: 'Referans', link: '/tr/reference/cli/index' },
          { text: 'Açıklama', link: '/tr/explanation/battle-system/how-battles-work' },
        ],
        sidebar: {
          // ── Eğitimler ────────────────────────────────────────────────────────
          '/tr/tutorials/': [
            {
              text: 'Eğitimler',
              items: [
                { text: 'Başlarken', link: '/tr/tutorials/getting-started/overview' },
                { text: 'Yeni Başlayanlar İçin', link: '/tr/tutorials/beginner-walkthroughs/what-is-lenserfight' },
                { text: 'Rehberler', link: '/tr/tutorials/walkthroughs/create-a-lens' },
              ],
            },
          ],
          '/tr/tutorials/getting-started/': [
            {
              text: 'Başlarken',
              items: [
                { text: 'Genel Bakış', link: '/tr/tutorials/getting-started/overview' },
                { text: 'Sözlük', link: '/tr/tutorials/getting-started/glossary' },
                { text: 'Kurulum', link: '/tr/tutorials/getting-started/installation' },
                { text: 'Hızlı Başlangıç', link: '/tr/tutorials/getting-started/quickstart' },
              ],
            },
          ],
          '/tr/tutorials/walkthroughs/': [
            {
              text: 'Rehberler',
              items: [
                { text: 'Lens Oluştur', link: '/tr/tutorials/walkthroughs/create-a-lens' },
                { text: 'İş Akışı Oluştur', link: '/tr/tutorials/walkthroughs/create-a-workflow' },
                { text: 'Lenslerle Savaş', link: '/tr/tutorials/walkthroughs/battle-with-lenses' },
                { text: 'İş Akışlarıyla Savaş', link: '/tr/tutorials/walkthroughs/battle-with-workflows' },
                { text: 'Savaş Türleri Nelerdir?', link: '/tr/tutorials/walkthroughs/what-are-battle-types' },
                { text: 'İş Akışları Nelerdir?', link: '/tr/tutorials/walkthroughs/what-are-workflows' },
              ],
            },
          ],
          '/tr/tutorials/beginner-walkthroughs/': [
            {
              text: 'Yeni Başlayanlar İçin',
              items: [
                { text: 'LenserFight Nedir?', link: '/tr/tutorials/beginner-walkthroughs/what-is-lenserfight' },
                { text: 'İlk Savaşın (Kodsuz)', link: '/tr/tutorials/beginner-walkthroughs/your-first-battle' },
                { text: 'CLI ile İlk Savaş', link: '/tr/tutorials/beginner-walkthroughs/first-battle-cli' },
                { text: "OpenAI Agent'ı Bağla", link: '/tr/tutorials/beginner-walkthroughs/connect-openai-agent' },
                { text: 'Harika Lens Yazmak', link: '/tr/tutorials/beginner-walkthroughs/writing-great-prompts' },
                { text: 'İlk Agent', link: '/tr/tutorials/beginner-walkthroughs/first-agent' },
              ],
            },
          ],

          // ── Nasıl Yapılır ────────────────────────────────────────────────────
          '/tr/how-to/': [
            {
              text: 'Nasıl Yapılır',
              items: [
                { text: 'Savaş ve API Görevleri', link: '/tr/how-to/battle-api/connect-your-lens' },
                { text: 'Katkıda Bulunanlar', link: '/tr/how-to/contributors/katkilar-icin-xp' },
              ],
            },
          ],
          '/tr/how-to/battle-api/': [
            {
              text: 'Savaş ve API Görevleri',
              items: [
                { text: "Lens'inizi Bağlayın", link: '/tr/how-to/battle-api/connect-your-lens' },
                { text: 'İlk Savaşı Çalıştır', link: '/tr/how-to/battle-api/run-your-first-battle' },
                { text: 'Sonuç Paylaş', link: '/tr/how-to/battle-api/share-a-result' },
                { text: 'XP Sisteminizi Anlayın', link: '/tr/how-to/battle-api/xp-sisteminizi-anlayin' },
              ],
            },
          ],
          '/tr/how-to/contributors/': [
            {
              text: 'Katkıda Bulunanlar',
              items: [
                { text: 'Katkılar İçin XP', link: '/tr/how-to/contributors/katkilar-icin-xp' },
                { text: 'Katkıda Bulunanlar 2. Dalga', link: '/tr/how-to/contributors/wave-2-plan' },
                { text: 'SSS', link: '/tr/how-to/contributors/faq' },
              ],
            },
          ],

          // ── Referans ─────────────────────────────────────────────────────────
          '/tr/reference/': [
            {
              text: 'Referans',
              items: [
                { text: 'CLI', link: '/tr/reference/cli/index' },
                { text: 'Platform ve API', link: '/tr/reference/platform-api/api-overview' },
                { text: 'Veritabanı', link: '/tr/reference/database/schema-overview' },
              ],
            },
          ],
          '/tr/reference/cli/': [
            {
              text: 'CLI',
              items: [
                { text: 'CLI Merkezi', link: '/tr/reference/cli/index' },
                { text: 'CLI Referansı', link: '/tr/reference/cli/cli-reference' },
              ],
            },
          ],
          '/tr/reference/platform-api/': [
            {
              text: 'Platform ve API',
              items: [
                { text: 'API Genel Bakış', link: '/tr/reference/platform-api/api-overview' },
                { text: 'Yapılandırma', link: '/tr/reference/platform-api/configuration' },
                { text: 'Beta Yol Haritası', link: '/tr/reference/platform-api/beta-roadmap' },
                { text: 'XP Sistemi', link: '/tr/reference/platform-api/xp-sistemi' },
                { text: 'Güvenlik', link: '/tr/reference/platform-api/security' },
              ],
            },
          ],
          '/tr/reference/database/': [
            {
              text: 'Veritabanı',
              items: [
                { text: 'Şemaya Genel Bakış', link: '/tr/reference/database/schema-overview' },
                { text: 'Lensers Şeması', link: '/tr/reference/database/schema-lensers' },
                { text: 'İçerik Şeması', link: '/tr/reference/database/schema-content' },
                { text: 'XP Şeması', link: '/tr/reference/database/schema-xp' },
                { text: 'Analitik Şeması', link: '/tr/reference/database/schema-analytics' },
                { text: 'AI Şeması', link: '/tr/reference/database/schema-ai' },
                { text: 'Savaşlar Şeması', link: '/tr/reference/database/schema-battles' },
                { text: 'Diğer Şemalar', link: '/tr/reference/database/schema-other' },
                { text: 'RLS Referansı', link: '/tr/reference/database/rls-reference' },
                { text: 'RPC Referansı', link: '/tr/reference/database/rpc-reference' },
                { text: 'Yerel Kurulum', link: '/tr/reference/database/local-setup' },
              ],
            },
          ],

          // ── Açıklama ─────────────────────────────────────────────────────────
          '/tr/explanation/': [
            {
              text: 'Açıklama',
              items: [
                { text: 'Savaş Sistemi', link: '/tr/explanation/battle-system/how-battles-work' },
                { text: 'Agentlar', link: '/tr/explanation/agents/index' },
                { text: 'Lensler', link: '/tr/explanation/lenses/index' },
                { text: 'Topluluk ve Kullanım', link: '/tr/explanation/community/community-hub' },
              ],
            },
          ],
          '/tr/explanation/battle-system/': [
            {
              text: 'Savaş Sistemi',
              items: [
                { text: 'Savaşlar Nasıl Çalışır', link: '/tr/explanation/battle-system/how-battles-work' },
                { text: 'Hibrit Puanlama', link: '/tr/explanation/battle-system/hybrid-scoring' },
              ],
            },
          ],
          '/tr/explanation/agents/': [
            {
              text: 'Agentlar',
              items: [
                { text: 'Genel Bakış', link: '/tr/explanation/agents/index' },
                { text: 'Agent Nedir?', link: '/tr/explanation/agents/what-is-an-agent' },
                { text: 'Agent Bağla', link: '/tr/explanation/agents/connect-agent' },
                { text: 'Agent Yaşam Döngüsü', link: '/tr/explanation/agents/agent-lifecycle' },
                { text: 'Agent Ekosistemi', link: '/tr/explanation/agents/positioning' },
              ],
            },
          ],
          '/tr/explanation/lenses/': [
            {
              text: 'Lensler',
              items: [
                { text: 'Genel Bakış', link: '/tr/explanation/lenses/index' },
                { text: 'Lens Nedir?', link: '/tr/explanation/lenses/what-is-a-lens' },
                { text: "LenserFight'ta Lensler", link: '/tr/explanation/lenses/lens-usage' },
                { text: 'Lens Parametreleri', link: '/tr/explanation/lenses/lens-parameters' },
                { text: 'İş Akışları', link: '/tr/explanation/lenses/workflows' },
              ],
            },
          ],
          '/tr/explanation/community/': [
            {
              text: 'Topluluk ve Kullanım Senaryoları',
              items: [
                { text: 'Topluluk Merkezi', link: '/tr/explanation/community/community-hub' },
                { text: 'İçerik Üretici Profilleri', link: '/tr/explanation/community/creator-profiles' },
                { text: 'Mobil Yardımcı Uygulama', link: '/tr/explanation/community/companion-app' },
                { text: 'Yönetici Konsolu', link: '/tr/explanation/community/operations-console' },
                { text: 'Açık Çekirdek Modeli', link: '/tr/explanation/community/open-core-model' },
              ],
            },
          ],
        },
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
      { text: 'Tutorials', link: '/tutorials/beginner-walkthroughs/what-is-lenserfight' },
      { text: 'How-to', link: '/how-to/battle-api/connect-your-lens' },
      { text: 'Reference', link: '/reference/cli/index' },
      { text: 'Explanation', link: '/explanation/battle-system/concepts' },
    ],

    aside: true,
    outline: [2, 3],

    sidebar: {
      // ── Tutorials ──────────────────────────────────────────────────────────
      '/tutorials/': [
        {
          text: 'Tutorials',
          items: [
            { text: 'Getting Started', link: '/tutorials/getting-started/overview' },
            { text: 'Beginner Walkthroughs', link: '/tutorials/beginner-walkthroughs/what-is-lenserfight' },
            { text: 'Walkthroughs', link: '/tutorials/walkthroughs/create-a-lens' },
          ],
        },
      ],
      '/tutorials/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Overview', link: '/tutorials/getting-started/overview' },
            { text: 'Glossary', link: '/tutorials/getting-started/glossary' },
            { text: 'For Communities', link: '/tutorials/getting-started/for-communities' },
            { text: 'For Organizations', link: '/tutorials/getting-started/for-organizations' },
            { text: 'Installation', link: '/tutorials/getting-started/installation' },
            { text: 'Quickstart', link: '/tutorials/getting-started/quickstart' },
          ],
        },
      ],
      '/tutorials/walkthroughs/': [
        {
          text: 'Walkthroughs',
          items: [
            { text: 'Create a Lens', link: '/tutorials/walkthroughs/create-a-lens' },
            { text: 'Create a Workflow', link: '/tutorials/walkthroughs/create-a-workflow' },
            { text: 'Battle with Lenses', link: '/tutorials/walkthroughs/battle-with-lenses' },
            { text: 'Battle with Workflows', link: '/tutorials/walkthroughs/battle-with-workflows' },
            { text: 'What Are Battle Types?', link: '/tutorials/walkthroughs/what-are-battle-types' },
            { text: 'What Are Workflows?', link: '/tutorials/walkthroughs/what-are-workflows' },
          ],
        },
      ],
      '/tutorials/beginner-walkthroughs/': [
        {
          text: 'Beginner Walkthroughs',
          items: [
            { text: 'What is LenserFight?', link: '/tutorials/beginner-walkthroughs/what-is-lenserfight' },
            { text: 'Your First Battle (No Code)', link: '/tutorials/beginner-walkthroughs/your-first-battle' },
            { text: 'First Battle via CLI', link: '/tutorials/beginner-walkthroughs/first-battle-cli' },
            { text: 'Connect an OpenAI Agent', link: '/tutorials/beginner-walkthroughs/connect-openai-agent' },
            { text: 'Writing Great Lenses', link: '/tutorials/beginner-walkthroughs/writing-great-prompts' },
            { text: 'First Agent', link: '/tutorials/beginner-walkthroughs/first-agent' },
          ],
        },
      ],

      // ── How-to ─────────────────────────────────────────────────────────────
      '/how-to/': [
        {
          text: 'How-to',
          items: [
            { text: 'Battle & API Tasks', link: '/how-to/battle-api/connect-your-lens' },
            { text: 'Contributors & Maintainers', link: '/how-to/contributors/contributing' },
          ],
        },
      ],
      '/how-to/battle-api/': [
        {
          text: 'Battle & API Tasks',
          items: [
            { text: 'Connect Your Lens', link: '/how-to/battle-api/connect-your-lens' },
            { text: 'Run Your First Battle', link: '/how-to/battle-api/run-your-first-battle' },
            { text: 'Share a Result', link: '/how-to/battle-api/share-a-result' },
            { text: 'Write a Battle Rubric', link: '/how-to/battle-api/write-a-battle-rubric' },
            { text: 'Understanding Your XP', link: '/how-to/battle-api/understanding-your-xp' },
            { text: 'Call the API', link: '/how-to/battle-api/call-the-api' },
            { text: 'Integrate the API', link: '/how-to/battle-api/integrate-api' },
            { text: 'Create a Battle Template', link: '/how-to/battle-api/create-battle-template' },
            { text: 'Manage Battle Invitations', link: '/how-to/battle-api/manage-invitations' },
            { text: 'Debug Agents', link: '/how-to/battle-api/debug-agents' },
            { text: 'Deploy a Project', link: '/how-to/battle-api/deploy-project' },
          ],
        },
      ],
      '/how-to/contributors/': [
        {
          text: 'Contributors & Maintainers',
          items: [
            { text: 'Contributing', link: '/how-to/contributors/contributing' },
            { text: 'How to Contribute', link: '/how-to/contributors/how-to-contribute' },
            { text: 'Development Setup', link: '/how-to/contributors/development-setup' },
            { text: 'Coding Standards', link: '/how-to/contributors/coding-standards' },
            { text: 'Branching and Versioning', link: '/how-to/contributors/branching' },
            { text: 'Release Process', link: '/how-to/contributors/release-process' },
            { text: 'XP for Contributors', link: '/how-to/contributors/xp-for-contributors' },
            { text: 'OSS Contribution Roadmap', link: '/how-to/contributors/wave-2-plan' },
            { text: 'Code of Conduct', link: '/how-to/contributors/code-of-conduct' },
            { text: 'Security Policy', link: '/how-to/contributors/security' },
            { text: 'Support', link: '/how-to/contributors/support' },
            { text: 'FAQ', link: '/how-to/contributors/faq' },
          ],
        },
      ],

      // ── Reference ──────────────────────────────────────────────────────────
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'CLI', link: '/reference/cli/index' },
            { text: 'Platform & API', link: '/reference/platform-api/api-overview' },
            { text: 'Database', link: '/reference/database/schema-overview' },
          ],
        },
      ],
      '/reference/cli/': [
        {
          text: 'CLI',
          items: [
            { text: 'CLI Hub', link: '/reference/cli/index' },
            { text: 'CLI Overview', link: '/reference/cli/cli-reference' },
            { text: 'Configuration', link: '/reference/cli/configuration' },
            { text: 'Development Commands', link: '/reference/cli/dev' },
            { text: 'Authentication Commands', link: '/reference/cli/auth' },
            { text: 'Battle Commands', link: '/reference/cli/battle' },
            { text: 'Agent Commands', link: '/reference/cli/agent' },
            { text: 'Inspect Commands', link: '/reference/cli/inspect' },
            { text: 'Run Commands', link: '/reference/cli/run' },
            { text: 'Publish, Rubric & Template Commands', link: '/reference/cli/publish' },
            { text: 'Lens Commands', link: '/reference/cli/lens' },
            { text: 'Community Commands', link: '/reference/cli/community' },
            { text: 'Battle Lifecycle Walkthrough', link: '/reference/cli/lifecycle' },
            { text: 'Execution Modes', link: '/reference/cli/execution-modes' },
          ],
        },
      ],
      '/reference/platform-api/': [
        {
          text: 'Platform & API',
          items: [
            { text: 'API Overview', link: '/reference/platform-api/api-overview' },
            { text: 'Configuration', link: '/reference/platform-api/configuration' },
            { text: 'Environment Variables', link: '/reference/platform-api/environment-variables' },
            { text: 'Beta Roadmap', link: '/reference/platform-api/beta-roadmap' },
            { text: 'Evaluation Methodology', link: '/reference/platform-api/evaluation-methodology' },
            { text: 'XP Methodology', link: '/reference/platform-api/xp-methodology' },
            { text: 'XP Rules Reference', link: '/reference/platform-api/xp-rules-reference' },
            { text: 'Capability Mapper', link: '/reference/platform-api/capability-mapper' },
            { text: 'Security', link: '/reference/platform-api/security' },
          ],
        },
      ],
      '/reference/database/': [
        {
          text: 'Database',
          items: [
            { text: 'Database Index', link: '/reference/database/index' },
            { text: 'Schema Overview', link: '/reference/database/schema-overview' },
            { text: 'Lensers Schema', link: '/reference/database/schema-lensers' },
            { text: 'Content Schema', link: '/reference/database/schema-content' },
            { text: 'XP Schema', link: '/reference/database/schema-xp' },
            { text: 'Analytics Schema', link: '/reference/database/schema-analytics' },
            { text: 'AI Schema', link: '/reference/database/schema-ai' },
            { text: 'Battles Schema', link: '/reference/database/schema-battles' },
            { text: 'Media Schema', link: '/reference/database/schema-media' },
            { text: 'Tenancy Schema', link: '/reference/database/schema-tenancy' },
            { text: 'Other Schemas', link: '/reference/database/schema-other' },
            { text: 'RLS Reference', link: '/reference/database/rls-reference' },
            { text: 'RPC Reference', link: '/reference/database/rpc-reference' },
            { text: 'Local Setup', link: '/reference/database/local-setup' },
            { text: 'Lens Versioning Schema', link: '/reference/database/prompt-versions' },
          ],
        },
      ],

      // ── Explanation ────────────────────────────────────────────────────────
      '/explanation/': [
        {
          text: 'Explanation',
          items: [
            { text: 'Battle System', link: '/explanation/battle-system/how-battles-work' },
            { text: 'Agents', link: '/explanation/agents/index' },
            { text: 'Lenses', link: '/explanation/lenses/index' },
            { text: 'Community & Use Cases', link: '/explanation/community/community-hub' },
          ],
        },
      ],
      '/explanation/battle-system/': [
        {
          text: 'Battle System',
          items: [
            { text: 'How Battles Work', link: '/explanation/battle-system/how-battles-work' },
            { text: 'Hybrid Scoring', link: '/explanation/battle-system/hybrid-scoring' },
            { text: 'Core Concepts', link: '/explanation/battle-system/concepts' },
            { text: 'Domain Model', link: '/explanation/battle-system/domain-model' },
            { text: 'Streaming Architecture', link: '/explanation/battle-system/streaming' },
            { text: 'System Boundaries', link: '/explanation/battle-system/system-boundaries' },
            { text: 'Token Economy', link: '/explanation/battle-system/token-economy' },
            { text: 'XP System', link: '/explanation/battle-system/xp-system' },
          ],
        },
      ],
      '/explanation/agents/': [
        {
          text: 'Agents',
          items: [
            { text: 'Overview', link: '/explanation/agents/index' },
            { text: 'What is an Agent?', link: '/explanation/agents/what-is-an-agent' },
            { text: 'Connect an Agent', link: '/explanation/agents/connect-agent' },
            { text: 'Agent Lifecycle', link: '/explanation/agents/agent-lifecycle' },
            { text: 'Agent Ecosystem Positioning', link: '/explanation/agents/positioning' },
          ],
        },
      ],
      '/explanation/lenses/': [
        {
          text: 'Lenses',
          items: [
            { text: 'Overview', link: '/explanation/lenses/index' },
            { text: 'What is a Lens?', link: '/explanation/lenses/what-is-a-lens' },
            { text: 'Lenses in LenserFight', link: '/explanation/lenses/lens-usage' },
            { text: 'Lens Parameters', link: '/explanation/lenses/lens-parameters' },
            { text: 'Workflows', link: '/explanation/lenses/workflows' },
          ],
        },
      ],
      '/explanation/community/': [
        {
          text: 'Community & Use Cases',
          items: [
            { text: 'Community Hub', link: '/explanation/community/community-hub' },
            { text: 'Creator Profiles', link: '/explanation/community/creator-profiles' },
            { text: 'Mobile Companion App', link: '/explanation/community/companion-app' },
            { text: 'Operations Console', link: '/explanation/community/operations-console' },
            { text: 'Open Core Model', link: '/explanation/community/open-core-model' },
          ],
        },
      ],
    },
  },
})
