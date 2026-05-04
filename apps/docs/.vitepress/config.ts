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
  description: 'User-first documentation for LenserFight — Lenses, Agents, Workflows, and Community.',
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

  // ConnectedLenses specs deep-link to source files in the repo (libs/, supabase/,
  // apps/) for IDE click-through. Those paths exist on disk but live outside the
  // docs srcDir, so VitePress's dead-link checker flags them. Skip the check for
  // any link that walks out of the docs/ tree.
  ignoreDeadLinks: [
    /\.\.\/\.\.\//,
  ],

  title: 'LenserFight Docs',
  description: 'Documentation for LenserFight — Lenses, Agents, Workflows, and Community.',

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
      description: 'LenserFight — Lensler, Agentlar, İş Akışları ve Topluluk için belgeler.',
      themeConfig: {
        nav: [
          {
            text: 'Eğitimler',
            items: [
              { text: 'Başlarken', link: '/tr/tutorials/getting-started/overview' },
              { text: 'Yeni Başlayanlar İçin', link: '/tr/tutorials/beginner-walkthroughs/what-is-lenserfight' },
              { text: 'Rehberler', link: '/tr/tutorials/walkthroughs/using-the-web-app' },
              { text: 'Agentlar ve Otomasyon', link: '/tr/tutorials/agent-walkthroughs/create-your-first-agent' },
              { text: 'Savaş Rehberleri', link: '/tr/tutorials/battle-walkthroughs/your-first-battle' },
            ],
          },
          {
            text: 'Agentlar ve İş Akışları',
            items: [
              { text: 'Genel Bakış', link: '/tr/connected-lenses/overview' },
              { text: 'Etki Alanı Modeli', link: '/tr/connected-lenses/domain-model' },
              { text: 'Agent Takımları', link: '/tr/connected-lenses/agent-teams' },
              { text: 'İş Akışı Yürütme', link: '/tr/connected-lenses/workflow-execution' },
            ],
          },
          {
            text: 'Nasıl Yapılır',
            items: [
              { text: 'Entegrasyonlar', link: '/tr/how-to/integrations/index' },
              { text: 'Savaş Rehberleri', link: '/tr/how-to/battles/create-a-battle' },
              { text: 'Katkıda Bulunanlar', link: '/tr/how-to/contributors/faq' },
            ],
          },
          {
            text: 'Referans',
            items: [
              { text: 'CLI', link: '/tr/reference/cli/index' },
              { text: 'Savaşlar', link: '/tr/reference/battles/index' },
              { text: 'Platform ve API', link: '/tr/reference/platform-api/api-overview' },
              { text: 'Veritabanı', link: '/tr/reference/database/schema-overview' },
            ],
          },
          {
            text: 'Açıklama',
            items: [
              { text: 'Lenserlar', link: '/tr/explanation/lensers/index' },
              { text: 'Agentlar', link: '/tr/explanation/agents/index' },
              { text: 'Lensler', link: '/tr/explanation/lenses/index' },
              { text: 'İş Akışları', link: '/tr/explanation/workflows/workflow-concepts' },
              { text: 'Otomasyon', link: '/tr/explanation/automation/index' },
              { text: 'Topluluk ve Kullanım', link: '/tr/explanation/community/community-hub' },
            ],
          },
        ],
        sidebar: {
          // ── Eğitimler ────────────────────────────────────────────────────────
          '/tr/tutorials/': [
            {
              text: 'Başlarken',
              collapsed: false,
              items: [
                { text: 'Genel Bakış', link: '/tr/tutorials/getting-started/overview' },
                { text: 'Sözlük', link: '/tr/tutorials/getting-started/glossary' },
                { text: 'Kurulum', link: '/tr/tutorials/getting-started/installation' },
                { text: 'Hızlı Başlangıç (Web)', link: '/tr/tutorials/getting-started/quickstart' },
                { text: 'CLI: Baştan Sona', link: '/tr/tutorials/getting-started/cli-getting-started' },
                { text: 'Yerel Dosya Depolama', link: '/tr/tutorials/getting-started/local-file-storage' },
                { text: 'Organizasyonlar İçin', link: '/tr/tutorials/getting-started/for-organizations' },
                { text: 'SaaS Entegrasyonu', link: '/tr/how-to/integrations/saas-quickstart' },
              ],
            },
            {
              text: 'Yeni Başlayanlar İçin',
              collapsed: false,
              items: [
                { text: 'LenserFight Nedir?', link: '/tr/tutorials/beginner-walkthroughs/what-is-lenserfight' },
                { text: "OpenAI Agent'ı Bağla", link: '/tr/tutorials/beginner-walkthroughs/connect-openai-agent' },
                { text: 'Harika Lens Yazmak', link: '/tr/tutorials/beginner-walkthroughs/writing-great-prompts' },
                { text: 'İlk Agent', link: '/tr/tutorials/beginner-walkthroughs/first-agent' },
              ],
            },
            {
              text: 'Rehberler',
              collapsed: false,
              items: [
                { text: 'Web Uygulamasını Kullanmak', link: '/tr/tutorials/walkthroughs/using-the-web-app' },
                { text: 'Lens Oluştur', link: '/tr/tutorials/walkthroughs/create-a-lens' },
                { text: 'İş Akışı Oluştur', link: '/tr/tutorials/walkthroughs/create-a-workflow' },
                { text: 'İş Akışları Nelerdir?', link: '/tr/tutorials/walkthroughs/what-are-workflows' },
              ],
            },
            {
              text: 'Agentlar ve Otomasyon',
              collapsed: false,
              items: [
                { text: 'İlk Agentını Oluştur', link: '/tr/tutorials/agent-walkthroughs/create-your-first-agent' },
                { text: 'Agent Takımlarını Yönet', link: '/tr/tutorials/agent-walkthroughs/manage-agent-teams' },
                { text: 'CRON Zamanlama', link: '/tr/tutorials/agent-walkthroughs/cron-scheduling' },
                { text: 'Otomasyon Kuralları', link: '/tr/tutorials/agent-walkthroughs/automation-rules' },
                { text: 'Konektörler', link: '/tr/tutorials/agent-walkthroughs/connectors' },
                { text: 'XP ve İtibar Kazanmak', link: '/tr/tutorials/agent-walkthroughs/earning-xp' },
              ],
            },
            {
              text: 'Savaş Rehberleri',
              collapsed: false,
              items: [
                { text: 'İlk Savaşınız', link: '/tr/tutorials/battle-walkthroughs/your-first-battle' },
              ],
            },
          ],
          '/tr/tutorials/battle-walkthroughs/': [
            {
              text: 'Savaş Rehberleri',
              items: [
                { text: 'İlk Savaşınız', link: '/tr/tutorials/battle-walkthroughs/your-first-battle' },
              ],
            },
          ],
          '/tr/tutorials/agent-walkthroughs/': [
            {
              text: 'Agentlar ve Otomasyon',
              items: [
                { text: 'İlk Agentını Oluştur', link: '/tr/tutorials/agent-walkthroughs/create-your-first-agent' },
                { text: 'Agent Takımlarını Yönet', link: '/tr/tutorials/agent-walkthroughs/manage-agent-teams' },
                { text: 'CRON Zamanlama', link: '/tr/tutorials/agent-walkthroughs/cron-scheduling' },
                { text: 'Otomasyon Kuralları', link: '/tr/tutorials/agent-walkthroughs/automation-rules' },
                { text: 'Konektörler', link: '/tr/tutorials/agent-walkthroughs/connectors' },
                { text: 'XP ve İtibar Kazanmak', link: '/tr/tutorials/agent-walkthroughs/earning-xp' },
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
                { text: 'Hızlı Başlangıç (Web)', link: '/tr/tutorials/getting-started/quickstart' },
                { text: 'CLI: Baştan Sona', link: '/tr/tutorials/getting-started/cli-getting-started' },
                { text: 'Yerel Dosya Depolama', link: '/tr/tutorials/getting-started/local-file-storage' },
                { text: 'Organizasyonlar İçin', link: '/tr/tutorials/getting-started/for-organizations' },
                { text: 'SaaS Entegrasyonu', link: '/tr/how-to/integrations/saas-quickstart' },
              ],
            },
          ],
          '/tr/tutorials/walkthroughs/': [
            {
              text: 'Rehberler',
              items: [
                { text: 'Web Uygulamasını Kullanmak', link: '/tr/tutorials/walkthroughs/using-the-web-app' },
                { text: 'Lens Oluştur', link: '/tr/tutorials/walkthroughs/create-a-lens' },
                { text: 'İş Akışı Oluştur', link: '/tr/tutorials/walkthroughs/create-a-workflow' },
                { text: 'İş Akışları Nelerdir?', link: '/tr/tutorials/walkthroughs/what-are-workflows' },
              ],
            },
          ],
          '/tr/tutorials/beginner-walkthroughs/': [
            {
              text: 'Yeni Başlayanlar İçin',
              items: [
                { text: 'LenserFight Nedir?', link: '/tr/tutorials/beginner-walkthroughs/what-is-lenserfight' },
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
                { text: 'Entegrasyonlar', link: '/tr/how-to/integrations/index' },
                { text: 'Savaş Rehberleri', link: '/tr/how-to/battles/create-a-battle' },
                { text: 'Katkıda Bulunanlar', link: '/tr/how-to/contributors/faq' },
              ],
            },
          ],
          '/tr/how-to/battles/': [
            {
              text: 'Savaş Rehberleri',
              items: [
                { text: 'Savaş Oluşturun', link: '/tr/how-to/battles/create-a-battle' },
                { text: 'Katılın ve Gönderin', link: '/tr/how-to/battles/join-and-submit' },
                { text: 'Oy Verin ve Görün', link: '/tr/how-to/battles/vote-and-judge' },
              ],
            },
          ],
          '/tr/how-to/integrations/': [
            {
              text: 'Entegrasyonlar',
              items: [
                { text: 'Genel Bakış', link: '/tr/how-to/integrations/index' },
                { text: 'AI Ajan Entegrasyonu', link: '/tr/how-to/integrations/ai-agent-integration' },
                { text: 'SaaS Entegrasyon Hızlı Başlangıcı', link: '/tr/how-to/integrations/saas-quickstart' },
                { text: 'Organizasyon Token Yönetimi', link: '/tr/how-to/integrations/manage-org-tokens' },
              ],
            },
          ],
          '/tr/how-to/contributors/': [
            {
              text: 'Katkıda Bulunanlar',
              items: [
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
                { text: 'Savaşlar', link: '/tr/reference/battles/index' },
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
                { text: 'CLI Genel Bakış', link: '/tr/reference/cli/cli-reference' },
                { text: 'Lens Keşfi', link: '/tr/reference/cli/lenses-discovery' },
                { text: 'Bağlantı ve Konnektörler', link: '/tr/reference/cli/connectors' },
                { text: 'Topluluklar', link: '/tr/reference/cli/communities' },
                { text: 'Savaş Komutları', link: '/tr/reference/cli/battle' },
              ],
            },
          ],
          '/tr/reference/battles/': [
            {
              text: 'Savaşlar Referansı',
              items: [
                { text: 'Kavramlar ve Yaşam Döngüsü', link: '/tr/reference/battles/index' },
              ],
            },
          ],
          '/tr/reference/platform-api/': [
            {
              text: 'Platform ve API',
              items: [
                { text: 'API Genel Bakış', link: '/tr/reference/platform-api/api-overview' },
                { text: 'Yapılandırma', link: '/tr/reference/platform-api/configuration' },
                { text: 'Token Referansı', link: '/tr/reference/platform-api/tokens' },
                { text: 'Depolama Adaptörleri', link: '/tr/reference/platform-api/storage-adapters' },
                { text: 'Fiyatlandırma ve Planlar', link: '/tr/reference/platform-api/pricing' },
                { text: 'URL Kuralları', link: '/tr/reference/platform-api/url-conventions' },
                { text: 'Beta Yol Haritası', link: '/tr/reference/platform-api/beta-roadmap' },
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
                { text: 'AI Şeması', link: '/tr/reference/database/schema-ai' },
                { text: 'RLS Referansı', link: '/tr/reference/database/rls-reference' },
                { text: 'RPC Referansı', link: '/tr/reference/database/rpc-reference' },
                { text: 'Yerel Kurulum', link: '/tr/reference/database/local-setup' },
              ],
            },
          ],

          // ── Açıklama ─────────────────────────────────────────────────────────
          '/tr/explanation/': [
            {
              text: 'Lenserlar',
              collapsed: false,
              items: [
                { text: 'Lenser Nedir?', link: '/tr/explanation/lensers/index' },
                { text: 'İnsan Lenserlar', link: '/tr/explanation/lensers/human-lensers' },
                { text: 'AI Lenserlar', link: '/tr/explanation/lensers/ai-lensers' },
                { text: 'Lenser Profili', link: '/tr/explanation/lensers/lenser-profile' },
              ],
            },
            {
              text: 'Agentlar',
              collapsed: true,
              items: [
                { text: 'Genel Bakış', link: '/tr/explanation/agents/index' },
                { text: 'Agent Nedir?', link: '/tr/explanation/agents/what-is-an-agent' },
                { text: 'Agent Bağla', link: '/tr/explanation/agents/connect-agent' },
                { text: 'Agent Yaşam Döngüsü', link: '/tr/explanation/agents/agent-lifecycle' },
                { text: 'Agent Takımları', link: '/tr/explanation/agents/agent-teams' },
                { text: 'Çalıştırmalar', link: '/tr/explanation/agents/executions' },
                { text: 'Agent Ekosistemi', link: '/tr/explanation/agents/positioning' },
              ],
            },
            {
              text: 'Lensler',
              collapsed: true,
              items: [
                { text: 'Genel Bakış', link: '/tr/explanation/lenses/index' },
                { text: 'Lens Nedir?', link: '/tr/explanation/lenses/what-is-a-lens' },
                { text: "LenserFight'ta Lensler", link: '/tr/explanation/lenses/lens-usage' },
                { text: 'Lens Parametreleri', link: '/tr/explanation/lenses/lens-parameters' },
                { text: 'İş Akışları', link: '/tr/explanation/lenses/workflows' },
              ],
            },
            {
              text: 'İş Akışları',
              collapsed: true,
              items: [
                { text: 'İş Akışı Kavramları', link: '/tr/explanation/workflows/workflow-concepts' },
                { text: 'İş Akışı Türleri', link: '/tr/explanation/workflows/workflow-types' },
                { text: 'Açık Kaynak İş Akışları', link: '/tr/explanation/workflows/open-source-workflows' },
              ],
            },
            {
              text: 'Otomasyon',
              collapsed: true,
              items: [
                { text: 'Otomasyon Çalışma Alanı', link: '/tr/explanation/automation/index' },
                { text: 'Otomasyon Tetikleyicileri', link: '/tr/explanation/automation/triggers' },
                { text: 'Zamanlama', link: '/tr/explanation/automation/scheduling' },
              ],
            },
            {
              text: 'Topluluk ve Kullanım Senaryoları',
              collapsed: true,
              items: [
                { text: 'Topluluk Merkezi', link: '/tr/explanation/community/community-hub' },
                { text: 'İçerik Üretici Profilleri', link: '/tr/explanation/community/creator-profiles' },
                { text: 'Mobil Yardımcı Uygulama', link: '/tr/explanation/community/companion-app' },
                { text: 'Açık Çekirdek Modeli', link: '/tr/explanation/community/open-core-model' },
              ],
            },
          ],
          '/tr/explanation/lensers/': [
            {
              text: 'Lenserlar',
              items: [
                { text: 'Lenser Nedir?', link: '/tr/explanation/lensers/index' },
                { text: 'İnsan Lenserlar', link: '/tr/explanation/lensers/human-lensers' },
                { text: 'AI Lenserlar', link: '/tr/explanation/lensers/ai-lensers' },
                { text: 'Lenser Profili', link: '/tr/explanation/lensers/lenser-profile' },
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
                { text: 'Agent Takımları', link: '/tr/explanation/agents/agent-teams' },
                { text: 'Çalıştırmalar', link: '/tr/explanation/agents/executions' },
                { text: 'Agent Ekosistemi', link: '/tr/explanation/agents/positioning' },
              ],
            },
          ],
          '/tr/explanation/workflows/': [
            {
              text: 'İş Akışları',
              items: [
                { text: 'İş Akışı Kavramları', link: '/tr/explanation/workflows/workflow-concepts' },
                { text: 'İş Akışı Türleri', link: '/tr/explanation/workflows/workflow-types' },
                { text: 'Açık Kaynak İş Akışları', link: '/tr/explanation/workflows/open-source-workflows' },
              ],
            },
          ],
          '/tr/explanation/automation/': [
            {
              text: 'Otomasyon',
              items: [
                { text: 'Otomasyon Çalışma Alanı', link: '/tr/explanation/automation/index' },
                { text: 'Otomasyon Tetikleyicileri', link: '/tr/explanation/automation/triggers' },
                { text: 'Zamanlama', link: '/tr/explanation/automation/scheduling' },
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
      {
        text: 'Tutorials',
        items: [
          { text: 'Getting Started', link: '/tutorials/getting-started/overview' },
          { text: 'Beginner Walkthroughs', link: '/tutorials/beginner-walkthroughs/what-is-lenserfight' },
          { text: 'Walkthroughs', link: '/tutorials/walkthroughs/using-the-web-app' },
          { text: 'Agents & Automation', link: '/tutorials/agent-walkthroughs/create-your-first-agent' },
          { text: 'Battle Walkthroughs', link: '/tutorials/battle-walkthroughs/your-first-battle' },
        ],
      },
      {
        text: 'Agents & Workflows',
        items: [
          { text: 'Overview', link: '/connected-lenses/overview' },
          { text: 'Domain Model', link: '/connected-lenses/domain-model' },
          { text: 'Agent Teams', link: '/connected-lenses/agent-teams' },
          { text: 'Workflow Execution', link: '/connected-lenses/workflow-execution' },
          { text: 'Scheduling', link: '/connected-lenses/scheduling' },
        ],
      },
      {
        text: 'How-to Guides',
        items: [
          { text: 'Integrations', link: '/how-to/integrations/index' },
          { text: 'Workflow Guides', link: '/how-to/workflows/build-a-lens-chain' },
          { text: 'Battle Guides', link: '/how-to/battles/create-a-battle' },
          { text: 'Contributors', link: '/how-to/contributors/contributing' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'CLI', link: '/reference/cli/index' },
          { text: 'Battles', link: '/reference/battles/index' },
          { text: 'Community API', link: '/reference/community-api/index' },
          { text: 'Platform API', link: '/reference/platform-api/api-overview' },
          { text: 'Database', link: '/reference/database/schema-overview' },
          { text: 'Connectors', link: '/reference/connectors/index' },
        ],
      },
      {
        text: 'Explanation',
        items: [
          { text: 'Lensers', link: '/explanation/lensers/index' },
          { text: 'Agents', link: '/explanation/agents/index' },
          { text: 'Lenses', link: '/explanation/lenses/index' },
          { text: 'Workflows', link: '/explanation/workflows/workflow-concepts' },
          { text: 'Automation', link: '/explanation/automation/index' },
          { text: 'Community & Use Cases', link: '/explanation/community/community-hub' },
        ],
      },
    ],

    aside: true,
    outline: [2, 3],

    sidebar: {
      // ── ConnectedLenses ────────────────────────────────────────────────────
      '/connected-lenses/': [
        {
          text: 'ConnectedLenses',
          items: [
            { text: 'Overview', link: '/connected-lenses/overview' },
            { text: 'Domain Model', link: '/connected-lenses/domain-model' },
            { text: 'Lens Instructions', link: '/connected-lenses/lens-instructions' },
            { text: 'Workflow Execution', link: '/connected-lenses/workflow-execution' },
            { text: 'Agent Teams', link: '/connected-lenses/agent-teams' },
            { text: 'Scheduling', link: '/connected-lenses/scheduling' },
            { text: 'Approvals', link: '/connected-lenses/approvals' },
            { text: 'API Reference', link: '/connected-lenses/api-reference' },
            { text: 'DTO Reference', link: '/connected-lenses/dto-reference' },
            { text: 'CLI Reference', link: '/connected-lenses/cli-reference' },
            { text: 'Evaluations', link: '/connected-lenses/evaluations' },
            { text: 'Memory Per Agent', link: '/connected-lenses/memory-per-agent' },
            { text: 'Tools', link: '/connected-lenses/tools' },
            { text: 'Examples', link: '/connected-lenses/examples' },
            { text: 'Frontend Integration', link: '/connected-lenses/frontend-integration' },
          ],
        },
      ],

      // ── Tutorials ──────────────────────────────────────────────────────────
      '/tutorials/': [
        {
          text: 'Getting Started',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/tutorials/getting-started/overview' },
            { text: 'Glossary', link: '/tutorials/getting-started/glossary' },
            { text: 'Installation', link: '/tutorials/getting-started/installation' },
            { text: 'Quickstart (Web App)', link: '/tutorials/getting-started/quickstart' },
            { text: 'CLI: Getting Started (A to Z)', link: '/tutorials/getting-started/cli-getting-started' },
            { text: 'Local File Storage', link: '/tutorials/getting-started/local-file-storage' },
            { text: 'Local Models (Ollama)', link: '/tutorials/getting-started/local-models' },
            { text: 'For Communities', link: '/tutorials/getting-started/for-communities' },
            { text: 'For Organizations', link: '/tutorials/getting-started/for-organizations' },
            { text: 'SaaS Integration', link: '/how-to/integrations/saas-quickstart' },
          ],
        },
        {
          text: 'Beginner Walkthroughs',
          collapsed: false,
          items: [
            { text: 'What is LenserFight?', link: '/tutorials/beginner-walkthroughs/what-is-lenserfight' },
            { text: 'Connect an OpenAI Agent', link: '/tutorials/beginner-walkthroughs/connect-openai-agent' },
            { text: 'Writing Great Lenses', link: '/tutorials/beginner-walkthroughs/writing-great-prompts' },
            { text: 'First Agent', link: '/tutorials/beginner-walkthroughs/first-agent' },
          ],
        },
        {
          text: 'Walkthroughs',
          collapsed: false,
          items: [
            { text: 'Using the Web App', link: '/tutorials/walkthroughs/using-the-web-app' },
            { text: 'Create a Lens', link: '/tutorials/walkthroughs/create-a-lens' },
            { text: 'Create a Workflow', link: '/tutorials/walkthroughs/create-a-workflow' },
            { text: 'What Are Workflows?', link: '/tutorials/walkthroughs/what-are-workflows' },
          ],
        },
        {
          text: 'Agents & Automation',
          collapsed: false,
          items: [
            { text: 'Create Your First Agent', link: '/tutorials/agent-walkthroughs/create-your-first-agent' },
            { text: 'Manage Agent Teams', link: '/tutorials/agent-walkthroughs/manage-agent-teams' },
            { text: 'CRON Scheduling', link: '/tutorials/agent-walkthroughs/cron-scheduling' },
            { text: 'Automation Rules', link: '/tutorials/agent-walkthroughs/automation-rules' },
            { text: 'Connectors', link: '/tutorials/agent-walkthroughs/connectors' },
            { text: 'Earning XP & Reputation', link: '/tutorials/agent-walkthroughs/earning-xp' },
          ],
        },
        {
          text: 'Battle Walkthroughs',
          collapsed: false,
          items: [
            { text: 'Your First Battle', link: '/tutorials/battle-walkthroughs/your-first-battle' },
          ],
        },
      ],
      '/tutorials/battle-walkthroughs/': [
        {
          text: 'Battle Walkthroughs',
          items: [
            { text: 'Your First Battle', link: '/tutorials/battle-walkthroughs/your-first-battle' },
          ],
        },
      ],
      '/tutorials/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Overview', link: '/tutorials/getting-started/overview' },
            { text: 'Glossary', link: '/tutorials/getting-started/glossary' },
            { text: 'Installation', link: '/tutorials/getting-started/installation' },
            { text: 'Quickstart (Web App)', link: '/tutorials/getting-started/quickstart' },
            { text: 'CLI: Getting Started (A to Z)', link: '/tutorials/getting-started/cli-getting-started' },
            { text: 'Local File Storage', link: '/tutorials/getting-started/local-file-storage' },
            { text: 'Local Models (Ollama)', link: '/tutorials/getting-started/local-models' },
            { text: 'For Communities', link: '/tutorials/getting-started/for-communities' },
            { text: 'For Organizations', link: '/tutorials/getting-started/for-organizations' },
            { text: 'SaaS Integration', link: '/how-to/integrations/saas-quickstart' },
          ],
        },
      ],
      '/tutorials/walkthroughs/': [
        {
          text: 'Walkthroughs',
          items: [
            { text: 'Using the Web App', link: '/tutorials/walkthroughs/using-the-web-app' },
            { text: 'Create a Lens', link: '/tutorials/walkthroughs/create-a-lens' },
            { text: 'Create a Workflow', link: '/tutorials/walkthroughs/create-a-workflow' },
            { text: 'What Are Workflows?', link: '/tutorials/walkthroughs/what-are-workflows' },
          ],
        },
      ],
      '/tutorials/beginner-walkthroughs/': [
        {
          text: 'Beginner Walkthroughs',
          items: [
            { text: 'What is LenserFight?', link: '/tutorials/beginner-walkthroughs/what-is-lenserfight' },
            { text: 'Connect an OpenAI Agent', link: '/tutorials/beginner-walkthroughs/connect-openai-agent' },
            { text: 'Writing Great Lenses', link: '/tutorials/beginner-walkthroughs/writing-great-prompts' },
            { text: 'First Agent', link: '/tutorials/beginner-walkthroughs/first-agent' },
          ],
        },
      ],
      '/tutorials/agent-walkthroughs/': [
        {
          text: 'Agents & Automation',
          items: [
            { text: 'Create Your First Agent', link: '/tutorials/agent-walkthroughs/create-your-first-agent' },
            { text: 'Manage Agent Teams', link: '/tutorials/agent-walkthroughs/manage-agent-teams' },
            { text: 'CRON Scheduling', link: '/tutorials/agent-walkthroughs/cron-scheduling' },
            { text: 'Automation Rules', link: '/tutorials/agent-walkthroughs/automation-rules' },
            { text: 'Connectors', link: '/tutorials/agent-walkthroughs/connectors' },
            { text: 'Earning XP & Reputation', link: '/tutorials/agent-walkthroughs/earning-xp' },
          ],
        },
      ],

      // ── How-to ─────────────────────────────────────────────────────────────
      '/how-to/': [
        {
          text: 'How-to Guides',
          items: [
            { text: 'Integrations', link: '/how-to/integrations/index' },
            { text: 'Workflow Guides', link: '/how-to/workflows/build-a-lens-chain' },
            { text: 'Battle Guides', link: '/how-to/battles/create-a-battle' },
            { text: 'Contributors & Maintainers', link: '/how-to/contributors/contributing' },
          ],
        },
      ],
      '/how-to/battles/': [
        {
          text: 'Battle Guides',
          items: [
            { text: 'Create, Publish & Manage', link: '/how-to/battles/create-a-battle' },
            { text: 'Join and Submit', link: '/how-to/battles/join-and-submit' },
            { text: 'Vote and Judge', link: '/how-to/battles/vote-and-judge' },
          ],
        },
      ],
      '/how-to/integrations/': [
        {
          text: 'Integrations',
          items: [
            { text: 'Overview', link: '/how-to/integrations/index' },
            { text: 'Build a Connector Adapter', link: '/how-to/integrations/build-an-adapter' },
            { text: 'Chainabit Reference Example', link: '/how-to/integrations/chainabit-example' },
            { text: 'AI Agent Integration', link: '/how-to/integrations/ai-agent-integration' },
            { text: 'SaaS Integration Quickstart', link: '/how-to/integrations/saas-quickstart' },
            { text: 'Manage Organisation Tokens', link: '/how-to/integrations/manage-org-tokens' },
          ],
        },
      ],
      '/how-to/workflows/': [
        {
          text: 'Workflows',
          items: [
            { text: 'Build a Lens Chain', link: '/how-to/workflows/build-a-lens-chain' },
            { text: 'Create a Lens Kind', link: '/how-to/workflows/create-a-lens-kind' },
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
            { text: 'Community API', link: '/reference/community-api/index' },
            { text: 'CLI', link: '/reference/cli/index' },
            { text: 'Battles', link: '/reference/battles/index' },
            { text: 'Connectors (alpha)', link: '/reference/connectors/index' },
            { text: 'Automation Objects', link: '/reference/automation/markdown-objects' },
            { text: 'Execution Platform', link: '/reference/platform-api/api-overview' },
            { text: 'Database', link: '/reference/database/schema-overview' },
            { text: 'Workflows', link: '/reference/workflows/execution-engine' },
          ],
        },
      ],
      '/reference/connectors/': [
        {
          text: 'Connectors (alpha)',
          items: [
            { text: 'Overview', link: '/reference/connectors/index' },
            { text: 'Adapter Interface', link: '/reference/connectors/adapter-interface' },
            { text: 'Token Scopes (v1)', link: '/reference/connectors/scopes' },
            { text: 'CLI: lf connectors', link: '/reference/cli/connectors' },
            { text: 'RFC-0001', link: '/rfcs/RFC-0001-connector-interface' },
          ],
        },
      ],
      '/reference/automation/': [
        {
          text: 'Automation Objects',
          items: [
            { text: 'Markdown Object Formats', link: '/reference/automation/markdown-objects' },
            { text: 'Agent Exploration API', link: '/reference/automation/agent-exploration-api' },
          ],
        },
      ],
      '/reference/community-api/': [
        {
          text: 'Community API',
          items: [
            { text: 'Overview', link: '/reference/community-api/index' },
            { text: 'Common Contracts', link: '/reference/community-api/common-contracts' },
            { text: 'Lenses API', link: '/reference/community-api/lenses' },
            { text: 'Workflows API', link: '/reference/community-api/workflows' },
            { text: 'Threads API', link: '/reference/community-api/threads' },
            { text: 'AI Lensers API', link: '/reference/community-api/ai-lensers' },
            { text: 'Providers and Execution', link: '/reference/community-api/providers-and-execution' },
          ],
        },
      ],
      '/reference/workflows/': [
        {
          text: 'Workflows',
          items: [
            { text: 'Execution Engine', link: '/reference/workflows/execution-engine' },
            { text: 'Contract Schema', link: '/reference/workflows/contract-schema' },
            { text: 'Test Plan', link: '/reference/workflows/test-plan' },
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
          ],
        },
        {
          text: 'Environment & Dev',
          items: [
            { text: 'Development Commands', link: '/reference/cli/dev' },
            { text: 'Execution Modes', link: '/reference/cli/execution-modes' },
          ],
        },
        {
          text: 'Authentication',
          items: [
            { text: 'Auth Commands', link: '/reference/cli/auth' },
          ],
        },
        {
          text: 'Lenses',
          items: [
            { text: 'Lens Management', link: '/reference/cli/lens' },
            { text: 'Lens Discovery', link: '/reference/cli/lenses-discovery' },
            { text: 'Connect & Connectors', link: '/reference/cli/connectors' },
          ],
        },
        {
          text: 'Runners & Agents',
          items: [
            { text: 'Runner / Agent Commands', link: '/reference/cli/agent' },
            { text: 'Agent Lifecycle', link: '/reference/cli/agent-lifecycle' },
          ],
        },
        {
          text: 'Execution & Runs',
          items: [
            { text: 'Run Commands', link: '/reference/cli/run' },
            { text: 'Inspect Commands', link: '/reference/cli/inspect' },
            { text: 'Automation CLI', link: '/reference/cli/automation' },
          ],
        },
        {
          text: 'Community & Social',
          items: [
            { text: 'Communities', link: '/reference/cli/communities' },
            { text: 'Community & Social', link: '/reference/cli/community' },
          ],
        },
        {
          text: 'Publishing',
          items: [
            { text: 'Publish, Rubric & Template', link: '/reference/cli/publish' },
          ],
        },
        {
          text: 'Battles',
          items: [
            { text: 'Battle Commands', link: '/reference/cli/battle' },
          ],
        },
      ],
      '/reference/battles/': [
        {
          text: 'Battles Reference',
          items: [
            { text: 'Concepts & Lifecycle', link: '/reference/battles/index' },
            { text: 'Schema Reference', link: '/reference/battles/schema' },
          ],
        },
      ],
      '/reference/platform-api/': [
        {
          text: 'Execution Platform',
          items: [
            { text: 'Execution Overview', link: '/reference/platform-api/api-overview' },
            { text: 'Configuration', link: '/reference/platform-api/configuration' },
            { text: 'Environment Variables', link: '/reference/platform-api/environment-variables' },
            { text: 'Token Reference', link: '/reference/platform-api/tokens' },
            { text: 'Storage Adapters', link: '/reference/platform-api/storage-adapters' },
            { text: 'Pricing & Plans', link: '/reference/platform-api/pricing' },
            { text: 'URL Conventions', link: '/reference/platform-api/url-conventions' },
            { text: 'Beta Roadmap', link: '/reference/platform-api/beta-roadmap' },
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
            { text: 'AI Schema', link: '/reference/database/schema-ai' },
            { text: 'Media Schema', link: '/reference/database/schema-media' },
            { text: 'Tenancy Schema', link: '/reference/database/schema-tenancy' },
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
          text: 'Lensers',
          collapsed: false,
          items: [
            { text: 'What is a Lenser?', link: '/explanation/lensers/index' },
            { text: 'Human Lensers', link: '/explanation/lensers/human-lensers' },
            { text: 'AI Lensers', link: '/explanation/lensers/ai-lensers' },
            { text: 'Lenser Profile', link: '/explanation/lensers/lenser-profile' },
          ],
        },
        {
          text: 'Agents',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/explanation/agents/index' },
            { text: 'What is an Agent?', link: '/explanation/agents/what-is-an-agent' },
            { text: 'Connect an Agent', link: '/explanation/agents/connect-agent' },
            { text: 'Agent Lifecycle', link: '/explanation/agents/agent-lifecycle' },
            { text: 'Agent Teams', link: '/explanation/agents/agent-teams' },
            { text: 'Executions & Workflow Runs', link: '/explanation/agents/executions' },
            { text: 'Memory Architecture', link: '/explanation/agents/memory-architecture' },
            { text: 'Tool Sandboxing', link: '/explanation/agents/tool-sandboxing' },
            { text: 'Agent Ecosystem Positioning', link: '/explanation/agents/positioning' },
          ],
        },
        {
          text: 'Lenses',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/explanation/lenses/index' },
            { text: 'What is a Lens?', link: '/explanation/lenses/what-is-a-lens' },
            { text: 'Lenses in LenserFight', link: '/explanation/lenses/lens-usage' },
            { text: 'Lens Parameters', link: '/explanation/lenses/lens-parameters' },
            { text: 'Connected Lens Workflows', link: '/explanation/lenses/workflows' },
          ],
        },
        {
          text: 'Workflows',
          collapsed: true,
          items: [
            { text: 'Workflow Concepts', link: '/explanation/workflows/workflow-concepts' },
            { text: 'Workflow Types', link: '/explanation/workflows/workflow-types' },
            { text: 'Open Source Workflows', link: '/explanation/workflows/open-source-workflows' },
          ],
        },
        {
          text: 'Automation',
          collapsed: true,
          items: [
            { text: 'Automation Workspace Overview', link: '/explanation/automation/index' },
            { text: 'Automation Triggers', link: '/explanation/automation/triggers' },
            { text: 'Scheduling', link: '/explanation/automation/scheduling' },
          ],
        },
        {
          text: 'Community & Use Cases',
          collapsed: true,
          items: [
            { text: 'Community Hub', link: '/explanation/community/community-hub' },
            { text: 'Creator Profiles', link: '/explanation/community/creator-profiles' },
            { text: 'Mobile Companion App', link: '/explanation/community/companion-app' },
            { text: 'Open Core Model', link: '/explanation/community/open-core-model' },
          ],
        },
      ],
      '/explanation/lensers/': [
        {
          text: 'Lensers',
          items: [
            { text: 'What is a Lenser?', link: '/explanation/lensers/index' },
            { text: 'Human Lensers', link: '/explanation/lensers/human-lensers' },
            { text: 'AI Lensers', link: '/explanation/lensers/ai-lensers' },
            { text: 'Lenser Profile', link: '/explanation/lensers/lenser-profile' },
          ],
        },
      ],
      '/explanation/automation/': [
        {
          text: 'Automation',
          items: [
            { text: 'Automation Workspace Overview', link: '/explanation/automation/index' },
            { text: 'Automation Triggers', link: '/explanation/automation/triggers' },
            { text: 'Scheduling', link: '/explanation/automation/scheduling' },
          ],
        },
      ],
      '/explanation/workflows/': [
        {
          text: 'Workflows',
          items: [
            { text: 'Workflow Concepts', link: '/explanation/workflows/workflow-concepts' },
            { text: 'Workflow Types', link: '/explanation/workflows/workflow-types' },
            { text: 'Open Source Workflows', link: '/explanation/workflows/open-source-workflows' },
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
            { text: 'Agent Teams', link: '/explanation/agents/agent-teams' },
            { text: 'Executions & Workflow Runs', link: '/explanation/agents/executions' },
            { text: 'Memory Architecture', link: '/explanation/agents/memory-architecture' },
            { text: 'Tool Sandboxing', link: '/explanation/agents/tool-sandboxing' },
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
            { text: 'Connected Lens Workflows', link: '/explanation/lenses/workflows' },
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
            { text: 'Open Core Model', link: '/explanation/community/open-core-model' },
          ],
        },
      ],
    },
  },
})
