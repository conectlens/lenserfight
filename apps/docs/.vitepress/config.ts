import { defineConfig } from 'vitepress'
import tailwind from '@tailwindcss/vite'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'fs'
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

const REPO_BLOB_BASE = 'https://github.com/conectlens/lenserfight/blob/main'
const CROSS_TREE_TOP_DIRS = ['libs', 'supabase', 'apps', 'tools', 'docs', 'examples']

/**
 * Rewrites markdown links that walk out of the docs srcDir (e.g. `../../libs/...`,
 * `../../../libs/...`, `../../supabase/...`) into absolute GitHub blob URLs so
 * deep-links to source files work in the rendered docs site. The relative paths
 * exist on disk but live outside VitePress's srcDir, so they would otherwise 404
 * in the browser. Turns `#L42` into `#L42` (GitHub honours the same anchor).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rewriteCrossTreeLinksPlugin(md: any) {
  const defaultRender =
    md.renderer.rules.link_open?.bind(md.renderer.rules) ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((tokens: any[], idx: number, options: any, _env: any, self: any) =>
      self.renderToken(tokens, idx, options))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  md.renderer.rules.link_open = (tokens: any[], idx: number, options: any, env: any, self: any) => {
    const token = tokens[idx]
    const hrefIndex = token.attrIndex('href')
    if (hrefIndex >= 0) {
      const href: string = token.attrs[hrefIndex][1]
      const rewritten = rewriteCrossTreeHref(href)
      if (rewritten) {
        token.attrs[hrefIndex][1] = rewritten
        if (token.attrIndex('target') < 0) token.attrPush(['target', '_blank'])
        if (token.attrIndex('rel') < 0) token.attrPush(['rel', 'noreferrer'])
      }
    }
    return defaultRender(tokens, idx, options, env, self)
  }
}

function rewriteCrossTreeHref(href: string): string | null {
  if (!href || /^[a-z]+:/i.test(href) || href.startsWith('/') || href.startsWith('#')) return null
  if (!href.startsWith('../')) return null
  // Strip leading `../` segments and verify the remaining path begins with a known top-level dir.
  const cleaned = href.replace(/^(?:\.\.\/)+/, '')
  // Lenserfight-platform repo is deprecated — drop the prefix and link into this repo's tree
  // if the path happens to live here, otherwise fall through to a GitHub link anyway.
  const withoutLegacy = cleaned.replace(/^lenserfight-platform\//, '')
  const top = withoutLegacy.split('/')[0]
  if (!CROSS_TREE_TOP_DIRS.includes(top)) return null
  return `${REPO_BLOB_BASE}/${withoutLegacy}`
}

/**
 * Dev-server plugin: intercepts requests for *.md files and serves the raw
 * markdown source so that CopyPageButton's fetch() succeeds in dev mode.
 */
const CHANGELOG_SRC = resolve(__dirname, '../../../CHANGELOG.md')
const CHANGELOG_DEST = resolve(docsDir, 'changelog.md')

/**
 * The root CHANGELOG.md is authored for GitHub, so its markdown links use
 * repo-relative paths (`docs/foo/bar.md`, `BRAND.md`). Rewrite them so the
 * VitePress build resolves them:
 *   - `docs/<path>.md` → `/<path>` (in-tree docs link, drop `docs/` and `.md`)
 *   - other root-relative paths (e.g. `BRAND.md`) → absolute GitHub blob URL
 */
function rewriteChangelogLinks(content: string): string {
  return content.replace(/\]\(([^)]+)\)/g, (match, href: string) => {
    if (
      /^[a-z]+:/i.test(href) ||
      href.startsWith('#') ||
      href.startsWith('/') ||
      href.startsWith('./') ||
      href.startsWith('../')
    ) {
      return match
    }
    if (href.startsWith('docs/en/')) {
      const stripped = href.replace(/^docs\/en\//, '/en/').replace(/\.md(?=#|$)/, '')
      return `](${stripped})`
    }
    if (href.startsWith('docs/')) {
      const stripped = href.replace(/^docs\//, '/').replace(/\.md(?=#|$)/, '')
      return `](${stripped})`
    }
    return `](${REPO_BLOB_BASE}/${href})`
  })
}

function syncChangelogPlugin() {
  function sync() {
    if (!existsSync(CHANGELOG_SRC)) return
    const content = rewriteChangelogLinks(readFileSync(CHANGELOG_SRC, 'utf-8'))
    const page = `---\ntitle: Changelog\ndescription: Full release history for LenserFight — every version, every change.\nlayout: doc\n---\n\n${content}`
    writeFileSync(CHANGELOG_DEST, page, 'utf-8')
  }
  return {
    name: 'lf-sync-changelog',
    buildStart() {
      sync()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    configureServer(_server: any) {
      sync()
    },
  }
}

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
const WEB_BASE_URL = process.env.WEB_BASE_URL || 'https://lenserfight.com'
const OG_BANNER = `${DOCS_HOST}/og-banner.png`

const SITE_DESCRIPTION =
  'Technical documentation for LenserFight: AI lenses, Lensers, agents, workflows, battles, providers, CLI, and open-source contribution guides.'

const SITE_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'LenserFight Docs',
  url: DOCS_HOST,
  description: SITE_DESCRIPTION,
  publisher: {
    '@type': 'Organization',
    name: 'LenserFight',
    url: WEB_BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${DOCS_HOST}/favicons/original/apple-icon.png`,
    },
  },
  inLanguage: ['en', 'tr', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ru', 'pt', 'it'],
})

function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function stripMarkdown(value: string): string {
  return compactText(
    value
      .replace(/^---[\s\S]*?---/, '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
      .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
      .replace(/[#>*_~|-]/g, ' '),
  )
}

function truncateDescription(value: string, max = 158): string {
  const clean = compactText(value)
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).trimEnd()}…`
}

function titleFromPath(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.md$/, '').replace(/(^|\/)index$/, '$1overview')
  const last = withoutExt.split('/').filter(Boolean).pop() ?? 'docs'
  return last
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function sectionFromPath(relativePath: string): string {
  if (relativePath.includes('/tutorials/')) return 'Tutorial'
  if (relativePath.includes('/how-to/')) return 'How-to Guide'
  if (relativePath.includes('/reference/')) return 'Reference'
  if (relativePath.includes('/explanation/')) return 'Explanation'
  if (relativePath.includes('/providers/')) return 'Provider Reference'
  if (relativePath.includes('/platform-setup/')) return 'Platform Setup'
  return 'Documentation'
}

function localeFromPath(relativePath: string): string {
  return relativePath.split('/')[0] || 'en'
}

function cleanDocsPath(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.md$/, '')
  if (withoutExt.endsWith('/index')) return `/${withoutExt.replace(/\/index$/, '/')}`
  return `/${withoutExt}`
}

function canonicalForPage(relativePath: string): string {
  const path = cleanDocsPath(relativePath)
  return `${DOCS_HOST}${path === '/index' ? '/' : path}`
}

function readPageExcerpt(relativePath: string): string {
  const file = resolve(docsDir, relativePath)
  if (!existsSync(file)) return ''
  return stripMarkdown(readFileSync(file, 'utf-8')).slice(0, 260)
}

function buildPageDescription(relativePath: string, title: string, frontmatterDescription?: string): string {
  if (frontmatterDescription) return truncateDescription(frontmatterDescription)
  const excerpt = readPageExcerpt(relativePath)
  if (excerpt) return truncateDescription(excerpt)
  const section = sectionFromPath(relativePath).toLowerCase()
  return truncateDescription(
    `${title} in the LenserFight ${section}: practical guidance for AI lenses, Lensers, agents, workflows, battles, providers, and developer automation.`,
  )
}

function schemaTypeForPage(relativePath: string): string {
  if (relativePath.includes('/reference/')) return 'TechArticle'
  if (relativePath.includes('/tutorials/') || relativePath.includes('/how-to/')) return 'HowTo'
  return 'TechArticle'
}

function buildDocsJsonLd(relativePath: string, title: string, description: string) {
  const canonical = canonicalForPage(relativePath)
  return {
    '@context': 'https://schema.org',
    '@type': schemaTypeForPage(relativePath),
    headline: title,
    name: title,
    description,
    url: canonical,
    inLanguage: localeFromPath(relativePath),
    image: OG_BANNER,
    author: {
      '@type': 'Organization',
      name: 'LenserFight',
      url: WEB_BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'LenserFight',
      url: WEB_BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${DOCS_HOST}/favicons/original/apple-icon.png`,
      },
    },
    isPartOf: {
      '@type': 'WebSite',
      name: 'LenserFight Docs',
      url: DOCS_HOST,
    },
    about: [
      'AI lenses',
      'LenserFight workflows',
      'AI agents',
      'AI battles',
      'developer AI tools',
      'open-source contribution',
    ],
  }
}

import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: '../../docs',
  outDir: '../../dist/apps/docs',
  cleanUrls: true,

  redirects: {
    '/product/cli': '/en/reference/cli/index',
    '/tr/product/cli': '/tr/reference/cli/index',
  },

  // ConnectedLenses specs deep-link to source files in the repo (libs/, supabase/,
  // apps/) for IDE click-through. Those paths exist on disk but live outside the
  // docs srcDir, so VitePress's dead-link checker flags them. Skip the check for
  // any link that walks out of the docs/ tree.
  ignoreDeadLinks: [
    /\.\.\/\.\.\//,
    // Web-app routes referenced from docs (live at lenserfight.com, not in this docs site)
    /^\/settings\//,
    /^\/ray\//,
  ],

  title: 'LenserFight Docs',
  titleTemplate: ':title | LenserFight Docs',
  description: SITE_DESCRIPTION,

  sitemap: {
    hostname: DOCS_HOST,
  },

  transformPageData(pageData) {
    const relativePath = pageData.relativePath
    const inferredTitle = titleFromPath(relativePath)
    const section = sectionFromPath(relativePath)
    const frontmatter = pageData.frontmatter as Record<string, string | undefined>
    const rawTitle = frontmatter.title || pageData.title || inferredTitle
    const title = rawTitle.includes('LenserFight') ? rawTitle : `${rawTitle} | ${section}`
    const description = buildPageDescription(relativePath, rawTitle, frontmatter.description)

    pageData.title = title
    pageData.description = description
    pageData.frontmatter.description = description
    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push(
      ['link', { rel: 'canonical', href: canonicalForPage(relativePath) }],
      ['meta', { name: 'robots', content: 'index,follow,max-image-preview:large' }],
      ['meta', { property: 'og:title', content: `${title} | LenserFight Docs` }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { property: 'og:url', content: canonicalForPage(relativePath) }],
      ['meta', { name: 'twitter:title', content: `${title} | LenserFight Docs` }],
      ['meta', { name: 'twitter:description', content: description }],
      [
        'script',
        { type: 'application/ld+json' },
        JSON.stringify(buildDocsJsonLd(relativePath, title, description)),
      ],
    )
  },

  head: [
    // ── Favicons ────────────────────────────────────────────────────────────
    [
      'link',
      { rel: 'apple-touch-icon', sizes: '57x57', href: '/favicons/original/apple-icon-57x57.png' },
    ],
    [
      'link',
      { rel: 'apple-touch-icon', sizes: '60x60', href: '/favicons/original/apple-icon-60x60.png' },
    ],
    [
      'link',
      { rel: 'apple-touch-icon', sizes: '72x72', href: '/favicons/original/apple-icon-72x72.png' },
    ],
    [
      'link',
      { rel: 'apple-touch-icon', sizes: '76x76', href: '/favicons/original/apple-icon-76x76.png' },
    ],
    [
      'link',
      {
        rel: 'apple-touch-icon',
        sizes: '114x114',
        href: '/favicons/original/apple-icon-114x114.png',
      },
    ],
    [
      'link',
      {
        rel: 'apple-touch-icon',
        sizes: '120x120',
        href: '/favicons/original/apple-icon-120x120.png',
      },
    ],
    [
      'link',
      {
        rel: 'apple-touch-icon',
        sizes: '144x144',
        href: '/favicons/original/apple-icon-144x144.png',
      },
    ],
    [
      'link',
      {
        rel: 'apple-touch-icon',
        sizes: '152x152',
        href: '/favicons/original/apple-icon-152x152.png',
      },
    ],
    [
      'link',
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/favicons/original/apple-icon-180x180.png',
      },
    ],
    [
      'link',
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '192x192',
        href: '/favicons/original/android-icon-192x192.png',
      },
    ],
    [
      'link',
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '96x96',
        href: '/favicons/original/favicon-96x96.png',
      },
    ],
    [
      'link',
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicons/original/favicon-32x32.png',
      },
    ],
    [
      'link',
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicons/original/favicon-16x16.png',
      },
    ],
    ['link', { rel: 'manifest', href: '/favicons/manifest.json' }],
    ['meta', { name: 'msapplication-TileColor', content: '#ffffff' }],
    [
      'meta',
      { name: 'msapplication-TileImage', content: '/favicons/original/ms-icon-144x144.png' },
    ],
    ['meta', { name: 'theme-color', content: '#ffffff' }],
    // ── Fonts ────────────────────────────────────────────────────────────────
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
      },
    ],
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
    ['link', { rel: 'alternate', hreflang: 'en', href: `${DOCS_HOST}/en/` }],
    ['link', { rel: 'alternate', hreflang: 'tr', href: `${DOCS_HOST}/tr/` }],
    ['link', { rel: 'alternate', hreflang: 'es', href: `${DOCS_HOST}/es/` }],
    ['link', { rel: 'alternate', hreflang: 'fr', href: `${DOCS_HOST}/fr/` }],
    ['link', { rel: 'alternate', hreflang: 'de', href: `${DOCS_HOST}/de/` }],
    ['link', { rel: 'alternate', hreflang: 'zh', href: `${DOCS_HOST}/zh/` }],
    ['link', { rel: 'alternate', hreflang: 'ja', href: `${DOCS_HOST}/ja/` }],
    ['link', { rel: 'alternate', hreflang: 'ko', href: `${DOCS_HOST}/ko/` }],
    ['link', { rel: 'alternate', hreflang: 'ru', href: `${DOCS_HOST}/ru/` }],
    ['link', { rel: 'alternate', hreflang: 'pt', href: `${DOCS_HOST}/pt/` }],
    ['link', { rel: 'alternate', hreflang: 'it', href: `${DOCS_HOST}/it/` }],
    ['link', { rel: 'alternate', hreflang: 'x-default', href: DOCS_HOST }],
  ],

  /**
   * After VitePress finishes building:
   * 1. Copy every .md source file from srcDir into outDir (raw markdown for CopyPageButton).
   * 2. Generate bare-path redirect HTML files: /tutorials/foo → /en/tutorials/foo, etc.
   *    This ensures old links and HelpButton paths without a locale prefix still resolve.
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

    // Generate /section/path/index.html → /en/section/path redirect shims
    // so bare (non-locale) URLs always land on the English version.
    const BARE_SECTIONS = ['tutorials', 'reference', 'how-to', 'explanation', 'getting-started']
    function emitRedirect(bareHtmlPath: string, targetUrl: string) {
      mkdirSync(dirname(bareHtmlPath), { recursive: true })
      writeFileSync(
        bareHtmlPath,
        `<!DOCTYPE html><html><head><meta charset="utf-8">` +
        `<meta http-equiv="refresh" content="0;url=${targetUrl}">` +
        `<link rel="canonical" href="${targetUrl}"></head>` +
        `<body><a href="${targetUrl}">Redirecting…</a></body></html>`,
      )
    }
    function mirrorEnSection(enSectionDir: string, bareSectionDir: string, urlBase: string) {
      if (!existsSync(enSectionDir)) return
      mkdirSync(bareSectionDir, { recursive: true })
      for (const entry of readdirSync(enSectionDir)) {
        const enPath = join(enSectionDir, entry)
        const barePath = join(bareSectionDir, entry)
        const targetUrl = `${urlBase}/${entry.replace(/\.html$/, '')}`
        if (statSync(enPath).isDirectory()) {
          mirrorEnSection(enPath, barePath, targetUrl)
        } else if (entry.endsWith('.html')) {
          if (!existsSync(barePath)) emitRedirect(barePath, targetUrl)
        }
      }
    }
    const outDir = siteConfig.outDir
    const enDir = join(outDir, 'en')
    for (const section of BARE_SECTIONS) {
      mirrorEnSection(
        join(enDir, section),
        join(outDir, section),
        `/en/${section}`,
      )
    }
  },

  markdown: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: (md: any) => {
      mermaidFencePlugin(md)
      rewriteCrossTreeLinksPlugin(md)
    },
  },

  // ── i18n Locales ────────────────────────────────────────────────────────────
  locales: {
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
    },
    tr: {
      label: 'Türkçe ✏️',
      lang: 'tr',
      link: '/tr/',
      title: 'LenserFight Belgeleri',
      description: 'LenserFight — Lensler, Agentlar, İş Akışları ve Topluluk için belgeler.',
      themeConfig: {
        nav: [
          { text: '↗ Arena', link: `${WEB_BASE_URL}/?utm_source=lenserfight&utm_medium=docs_nav&utm_campaign=header_tr` },
          {
            text: 'Eğitimler',
            items: [
              { text: 'Başlarken', link: '/tr/tutorials/getting-started/overview' },
              {
                text: 'Yeni Başlayanlar İçin',
                link: '/tr/tutorials/beginner-walkthroughs/what-is-lenserfight',
              },
              { text: 'Rehberler', link: '/tr/tutorials/walkthroughs/using-the-web-app' },
              {
                text: 'Agentlar ve Otomasyon',
                link: '/tr/tutorials/agent-walkthroughs/create-your-first-agent',
              },
              {
                text: 'Savaş Rehberleri',
                link: '/tr/tutorials/battle-walkthroughs/your-first-battle',
              },
            ],
          },
          {
            text: 'Nasıl Yapılır',
            items: [
              { text: 'Entegrasyonlar', link: '/tr/how-to/integrations/index' },
              { text: 'Savaş Rehberleri', link: '/tr/how-to/battles/create-a-battle' },
              { text: 'Katkıda Bulunanlar', link: '/tr/how-to/contributors/contributing' },
            ],
          },
          {
            text: 'Referans',
            items: [
              { text: 'CLI', link: '/tr/reference/cli/index' },
              { text: 'Savaşlar', link: '/tr/reference/battles/index' },
              { text: 'Platform ve API', link: '/tr/reference/platform-api/api-overview' },
              { text: 'Veritabanı', link: '/tr/reference/database/schema-overview' },
              { text: 'İç Referanslar', link: '/en/reference/internals/overview' },
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
              { text: 'Trust Gateway', link: '/tr/explanation/gateway/index' },
              { text: 'Topluluk ve Kullanım', link: '/tr/explanation/community/community-hub' },
            ],
          },
          {
            text: 'Platform Kurulumu',
            items: [
              { text: 'Genel Bakış', link: '/tr/platform-setup/' },
              { text: 'Pardus', link: '/tr/platform-setup/pardus' },
              { text: 'Windows', link: '/tr/platform-setup/windows' },
              { text: 'Linux', link: '/tr/platform-setup/linux' },
              { text: 'macOS', link: '/tr/platform-setup/macos' },
            ],
          },
          { text: 'Değişiklik Günlüğü', link: '/changelog' },
        ],
        sidebar: {
          // ── Platform Kurulumu ─────────────────────────────────────────────────
          '/tr/platform-setup/': [
            {
              text: 'Platform Kurulumu',
              items: [
                { text: 'Genel Bakış', link: '/tr/platform-setup/' },
                { text: 'Pardus', link: '/tr/platform-setup/pardus' },
                { text: 'Windows', link: '/tr/platform-setup/windows' },
                { text: 'Linux', link: '/tr/platform-setup/linux' },
                { text: 'macOS', link: '/tr/platform-setup/macos' },
              ],
            },
          ],
          // ── İç Referanslar ───────────────────────────────────────────────────
          '/tr/reference/internals/': [
            {
              text: 'İç Referanslar',
              items: [
                { text: 'Onaylar (TR)', link: '/tr/reference/internals/approvals' },
                { text: 'Genel Bakış (EN)', link: '/en/reference/internals/overview' },
                { text: 'Etki Alanı Modeli (EN)', link: '/en/reference/internals/domain-model' },
                { text: 'Agent Takımları (EN)', link: '/en/reference/internals/agent-teams' },
                { text: 'İş Akışı Yürütme (EN)', link: '/en/reference/internals/workflow-execution' },
              ],
            },
          ],

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
                {
                  text: 'CLI: Baştan Sona',
                  link: '/tr/tutorials/getting-started/cli-getting-started',
                },
                {
                  text: 'Yerel Dosya Depolama',
                  link: '/tr/tutorials/getting-started/local-file-storage',
                },
                {
                  text: 'Organizasyonlar İçin',
                  link: '/tr/tutorials/getting-started/for-organizations',
                },
                { text: 'SaaS Entegrasyonu', link: '/tr/how-to/integrations/saas-quickstart' },
              ],
            },
            {
              text: 'Yeni Başlayanlar İçin',
              collapsed: false,
              items: [
                {
                  text: 'LenserFight Nedir?',
                  link: '/tr/tutorials/beginner-walkthroughs/what-is-lenserfight',
                },
                {
                  text: "OpenAI Agent'ı Bağla",
                  link: '/tr/tutorials/beginner-walkthroughs/connect-openai-agent',
                },
                {
                  text: 'Harika Lens Yazmak',
                  link: '/tr/tutorials/beginner-walkthroughs/writing-great-prompts',
                },
                { text: 'İlk Agent', link: '/tr/tutorials/beginner-walkthroughs/first-agent' },
              ],
            },
            {
              text: 'Rehberler',
              collapsed: false,
              items: [
                {
                  text: 'Web Uygulamasını Kullanmak',
                  link: '/tr/tutorials/walkthroughs/using-the-web-app',
                },
                { text: 'Lens Oluştur', link: '/tr/tutorials/walkthroughs/create-a-lens' },
                { text: 'İş Akışı Oluştur', link: '/tr/tutorials/walkthroughs/create-a-workflow' },
                {
                  text: 'İş Akışları Nelerdir?',
                  link: '/tr/tutorials/walkthroughs/what-are-workflows',
                },
              ],
            },
            {
              text: 'Agentlar ve Otomasyon',
              collapsed: false,
              items: [
                {
                  text: 'İlk Agentını Oluştur',
                  link: '/tr/tutorials/agent-walkthroughs/create-your-first-agent',
                },
                {
                  text: 'Agent Takımlarını Yönet',
                  link: '/tr/tutorials/agent-walkthroughs/manage-agent-teams',
                },
                {
                  text: 'CRON Zamanlama',
                  link: '/tr/tutorials/agent-walkthroughs/cron-scheduling',
                },
                {
                  text: 'Otomasyon Kuralları',
                  link: '/tr/tutorials/agent-walkthroughs/automation-rules',
                },
                { text: 'Konektörler', link: '/tr/tutorials/agent-walkthroughs/connectors' },
                {
                  text: 'XP ve İtibar Kazanmak',
                  link: '/tr/tutorials/agent-walkthroughs/earning-xp',
                },
              ],
            },
            {
              text: 'Savaş Rehberleri',
              collapsed: false,
              items: [
                {
                  text: 'İlk Savaşınız',
                  link: '/tr/tutorials/battle-walkthroughs/your-first-battle',
                },
              ],
            },
          ],
          '/tr/tutorials/battle-walkthroughs/': [
            {
              text: 'Savaş Rehberleri',
              items: [
                {
                  text: 'İlk Savaşınız',
                  link: '/tr/tutorials/battle-walkthroughs/your-first-battle',
                },
                {
                  text: 'Yerel Savaş Hızlı Başlangıç',
                  link: '/tr/tutorials/battle-walkthroughs/local-battle-quickstart',
                },
                {
                  text: 'BYOK Bulut Savaşı Yayını',
                  link: '/tr/tutorials/battle-walkthroughs/byok-cloud-battle',
                },
                {
                  text: 'PRIVATE_BATTLE.md Çalıştır',
                  link: '/tr/tutorials/battle-walkthroughs/private-battle-execute',
                },
              ],
            },
          ],
          '/tr/tutorials/agent-walkthroughs/': [
            {
              text: 'Agentlar ve Otomasyon',
              items: [
                {
                  text: 'İlk Agentını Oluştur',
                  link: '/tr/tutorials/agent-walkthroughs/create-your-first-agent',
                },
                {
                  text: 'Agent Takımlarını Yönet',
                  link: '/tr/tutorials/agent-walkthroughs/manage-agent-teams',
                },
                {
                  text: 'CRON Zamanlama',
                  link: '/tr/tutorials/agent-walkthroughs/cron-scheduling',
                },
                {
                  text: 'Otomasyon Kuralları',
                  link: '/tr/tutorials/agent-walkthroughs/automation-rules',
                },
                { text: 'Konektörler', link: '/tr/tutorials/agent-walkthroughs/connectors' },
                {
                  text: 'XP ve İtibar Kazanmak',
                  link: '/tr/tutorials/agent-walkthroughs/earning-xp',
                },
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
                {
                  text: 'CLI: Baştan Sona',
                  link: '/tr/tutorials/getting-started/cli-getting-started',
                },
                {
                  text: 'Yerel Dosya Depolama',
                  link: '/tr/tutorials/getting-started/local-file-storage',
                },
                {
                  text: 'Organizasyonlar İçin',
                  link: '/tr/tutorials/getting-started/for-organizations',
                },
                { text: 'SaaS Entegrasyonu', link: '/tr/how-to/integrations/saas-quickstart' },
              ],
            },
          ],
          '/tr/tutorials/walkthroughs/': [
            {
              text: 'Rehberler',
              items: [
                {
                  text: 'Web Uygulamasını Kullanmak',
                  link: '/tr/tutorials/walkthroughs/using-the-web-app',
                },
                { text: 'Lens Oluştur', link: '/tr/tutorials/walkthroughs/create-a-lens' },
                { text: 'İş Akışı Oluştur', link: '/tr/tutorials/walkthroughs/create-a-workflow' },
                {
                  text: 'İş Akışları Nelerdir?',
                  link: '/tr/tutorials/walkthroughs/what-are-workflows',
                },
              ],
            },
          ],
          '/tr/tutorials/beginner-walkthroughs/': [
            {
              text: 'Yeni Başlayanlar İçin',
              items: [
                {
                  text: 'LenserFight Nedir?',
                  link: '/tr/tutorials/beginner-walkthroughs/what-is-lenserfight',
                },
                {
                  text: "OpenAI Agent'ı Bağla",
                  link: '/tr/tutorials/beginner-walkthroughs/connect-openai-agent',
                },
                {
                  text: 'Harika Lens Yazmak',
                  link: '/tr/tutorials/beginner-walkthroughs/writing-great-prompts',
                },
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
                { text: 'Katkıda Bulunanlar', link: '/tr/how-to/contributors/contributing' },
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
                { text: 'Yerel Savaş Çalıştır', link: '/tr/how-to/battles/run-local-battle' },
                { text: 'BYOK Çalıştırma', link: '/tr/how-to/battles/byok-execution' },
              ],
            },
          ],
          '/tr/how-to/integrations/': [
            {
              text: 'Entegrasyonlar',
              items: [
                { text: 'Genel Bakış', link: '/tr/how-to/integrations/index' },
                {
                  text: 'AI Ajan Entegrasyonu',
                  link: '/tr/how-to/integrations/ai-agent-integration',
                },
                {
                  text: 'SaaS Entegrasyon Hızlı Başlangıcı',
                  link: '/tr/how-to/integrations/saas-quickstart',
                },
                {
                  text: 'Organizasyon Token Yönetimi',
                  link: '/tr/how-to/integrations/manage-org-tokens',
                },
              ],
            },
          ],
          '/tr/how-to/contributors/': [
            {
              text: 'Katkıda Bulunanlar',
              items: [
                { text: 'Katkıda Bulunma', link: '/tr/how-to/contributors/contributing' },
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
                {
                  text: 'Bilinen Önizleme Yüzeyleri',
                  link: '/tr/reference/known-preview-surfaces',
                },
                { text: 'Bilinen Sınırlamalar', link: '/tr/reference/known-limitations' },
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
              items: [{ text: 'Kavramlar ve Yaşam Döngüsü', link: '/tr/reference/battles/index' }],
            },
          ],
          '/tr/reference/platform-api/': [
            {
              text: 'Platform ve API',
              items: [
                { text: 'API Genel Bakış', link: '/tr/reference/platform-api/api-overview' },
                { text: 'Yapılandırma', link: '/tr/reference/platform-api/configuration' },
                { text: 'Token Referansı', link: '/tr/reference/platform-api/tokens' },
                {
                  text: 'Depolama Adaptörleri',
                  link: '/tr/reference/platform-api/storage-adapters',
                },
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
                { text: 'Lenser DNA', link: '/en/explanation/lensers/lenser-dna' },
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
                {
                  text: 'İş Akışı Kavramları',
                  link: '/tr/explanation/workflows/workflow-concepts',
                },
                { text: 'İş Akışı Türleri', link: '/tr/explanation/workflows/workflow-types' },
                {
                  text: 'Açık Kaynak İş Akışları',
                  link: '/tr/explanation/workflows/open-source-workflows',
                },
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
              text: 'Trust Gateway (LTG)',
              collapsed: true,
              items: [
                { text: 'Giriş (TR)', link: '/tr/explanation/gateway/index' },
                { text: 'Overview (EN)', link: '/en/explanation/gateway/index' },
                { text: 'CLI gateway (EN)', link: '/en/reference/cli/gateway' },
              ],
            },
            {
              text: 'Topluluk ve Kullanım Senaryoları',
              collapsed: true,
              items: [
                { text: 'Topluluk Merkezi', link: '/tr/explanation/community/community-hub' },
                {
                  text: 'İçerik Üretici Profilleri',
                  link: '/tr/explanation/community/creator-profiles',
                },
                {
                  text: 'Mobil Yardımcı Uygulama',
                  link: '/tr/explanation/community/companion-app',
                },
                { text: 'Açık Çekirdek Modeli', link: '/tr/explanation/community/open-core-model' },
                { text: 'OSS Lansman Kapsamı', link: '/tr/explanation/community/oss-launch-scope' },
                { text: 'Marka yönergeleri', link: '/tr/explanation/community/brand-guidelines' },
              ],
            },
            {
              text: 'Savaşlar',
              collapsed: true,
              items: [
                {
                  text: 'Yerel ve Bulut Savaşları',
                  link: '/tr/explanation/battles/local-vs-cloud-battles',
                },
                {
                  text: 'Web Yayını Mimarisi',
                  link: '/tr/explanation/battles/webstreaming-architecture',
                },
                {
                  text: 'Sınırlı Beta Durumu',
                  link: '/tr/explanation/battles/limited-beta-status',
                },
              ],
            },
          ],
          '/tr/explanation/battles/': [
            {
              text: 'Savaşlar',
              items: [
                {
                  text: 'Yerel ve Bulut Savaşları',
                  link: '/tr/explanation/battles/local-vs-cloud-battles',
                },
                {
                  text: 'Web Yayını Mimarisi',
                  link: '/tr/explanation/battles/webstreaming-architecture',
                },
                {
                  text: 'Sınırlı Beta Durumu',
                  link: '/tr/explanation/battles/limited-beta-status',
                },
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
                { text: 'Lenser DNA', link: '/en/explanation/lensers/lenser-dna' },
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
                {
                  text: 'İş Akışı Kavramları',
                  link: '/tr/explanation/workflows/workflow-concepts',
                },
                { text: 'İş Akışı Türleri', link: '/tr/explanation/workflows/workflow-types' },
                {
                  text: 'Açık Kaynak İş Akışları',
                  link: '/tr/explanation/workflows/open-source-workflows',
                },
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
                {
                  text: 'İçerik Üretici Profilleri',
                  link: '/tr/explanation/community/creator-profiles',
                },
                {
                  text: 'Mobil Yardımcı Uygulama',
                  link: '/tr/explanation/community/companion-app',
                },
                { text: 'Açık Çekirdek Modeli', link: '/tr/explanation/community/open-core-model' },
                { text: 'OSS Lansman Kapsamı', link: '/tr/explanation/community/oss-launch-scope' },
                { text: 'Marka yönergeleri', link: '/tr/explanation/community/brand-guidelines' },
              ],
            },
          ],
          '/tr/explanation/gateway/': [
            {
              text: 'Trust Gateway (LTG)',
              items: [
                { text: 'Giriş (TR)', link: '/tr/explanation/gateway/index' },
                { text: 'Overview (EN)', link: '/en/explanation/gateway/index' },
                { text: 'Security review (EN)', link: '/en/explanation/gateway/security-review' },
                { text: 'Release readiness (EN)', link: '/en/explanation/gateway/release-readiness' },
                { text: 'RFC-0003 (EN)', link: '/en/rfcs/RFC-0003-trust-gateway' },
              ],
            },
          ],
        },
      },
    },
    // ── WIP locales (stub home + getting-started only; full nav added when content is ready) ──
    es: {
      label: 'Español ✏️',
      lang: 'es',
      link: '/es/',
      title: 'Documentación LenserFight',
      description: 'LenserFight — documentación de Lentes, Agentes, Flujos de Trabajo y Comunidad.',
    },
    fr: {
      label: 'Français ✏️',
      lang: 'fr',
      link: '/fr/',
      title: 'Documentation LenserFight',
      description: 'LenserFight — documentation pour les Lentilles, Agents, Workflows et Communauté.',
    },
    de: {
      label: 'Deutsch ✏️',
      lang: 'de',
      link: '/de/',
      title: 'LenserFight Dokumentation',
      description: 'LenserFight — Dokumentation für Lenses, Agenten, Workflows und Community.',
    },
    zh: {
      label: '中文 ✏️',
      lang: 'zh',
      link: '/zh/',
      title: 'LenserFight 文档',
      description: 'LenserFight — Lenses、Agents、工作流和社区文档。',
    },
    ja: {
      label: '日本語 ✏️',
      lang: 'ja',
      link: '/ja/',
      title: 'LenserFight ドキュメント',
      description: 'LenserFight — Lenses、エージェント、ワークフロー、コミュニティのドキュメント。',
    },
    ko: {
      label: '한국어 ✏️',
      lang: 'ko',
      link: '/ko/',
      title: 'LenserFight 문서',
      description: 'LenserFight — Lenses, 에이전트, 워크플로우 및 커뮤니티 문서.',
    },
    ru: {
      label: 'Русский ✏️',
      lang: 'ru',
      link: '/ru/',
      title: 'Документация LenserFight',
      description: 'LenserFight — документация по Lenses, Агентам, Рабочим процессам и Сообществу.',
    },
    pt: {
      label: 'Português ✏️',
      lang: 'pt',
      link: '/pt/',
      title: 'Documentação LenserFight',
      description: 'LenserFight — documentação de Lentes, Agentes, Fluxos de Trabalho e Comunidade.',
    },
    it: {
      label: 'Italiano ✏️',
      lang: 'it',
      link: '/it/',
      title: 'Documentazione LenserFight',
      description: 'LenserFight — documentazione per Lenses, Agenti, Workflow e Community.',
    },
  },

  vite: {
    envDir: resolve(__dirname, '..'),
    envPrefix: ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'WEB_', 'FORUM_'],
    plugins: [tailwind(), syncChangelogPlugin(), rawMarkdownPlugin(), nxViteTsPaths()],
    server: {
      host: '0.0.0.0',
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

    socialLinks: [{ icon: 'github', link: 'https://github.com/conectlens/lenserfight' }],

    nav: [
      { text: '↗ Arena', link: `${WEB_BASE_URL}/?utm_source=lenserfight&utm_medium=docs_nav&utm_campaign=header_en` },
      {
        text: 'Tutorials',
        items: [
          { text: 'Getting Started', link: '/en/tutorials/getting-started/overview' },
          { text: 'Local Development', link: '/en/tutorials/local/installation' },
          { text: 'Cloud Platform', link: '/en/tutorials/cloud/getting-started' },
          {
            text: 'Beginner Walkthroughs',
            link: '/en/tutorials/beginner-walkthroughs/what-is-lenserfight',
          },
          { text: 'Walkthroughs', link: '/en/tutorials/walkthroughs/using-the-web-app' },
          {
            text: 'Agents & Automation',
            link: '/en/tutorials/agent-walkthroughs/create-your-first-agent',
          },
          { text: 'Battle Walkthroughs', link: '/en/tutorials/battle-walkthroughs/your-first-battle' },
          { text: 'CLI Tutorials', link: '/en/tutorials/cli/' },
          { text: 'Developer Examples', link: '/en/tutorials/developer-examples/' },
          { text: 'Integrations', link: '/en/tutorials/integrations/openai' },
          { text: 'Deployment', link: '/en/tutorials/deployment/docker' },
          { text: 'Advanced', link: '/en/tutorials/advanced/agent-orchestration' },
          { text: 'Troubleshooting', link: '/en/tutorials/troubleshooting/build-failures' },
        ],
      },
      {
        text: 'How-to Guides',
        items: [
          { text: 'Integrations', link: '/en/how-to/integrations/index' },
          { text: 'Workflow Guides', link: '/en/how-to/workflows/build-a-lens-chain' },
          { text: 'Battle Guides', link: '/en/how-to/battles/create-a-battle' },
          { text: 'Operations', link: '/en/how-to/operations/cli-dashboard' },
          { text: 'Contributors', link: '/en/how-to/contributors/contributing' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'CLI', link: '/en/reference/cli/index' },
          { text: 'Battles', link: '/en/reference/battles/index' },
          { text: 'Community API', link: '/en/reference/community-api/index' },
          { text: 'Platform API', link: '/en/reference/platform-api/api-overview' },
          { text: 'Database', link: '/en/reference/database/schema-overview' },
          { text: 'Connectors', link: '/en/reference/connectors/index' },
          { text: 'Internals', link: '/en/reference/internals/overview' },
        ],
      },
      {
        text: 'Explanation',
        items: [
          { text: 'Lensers', link: '/en/explanation/lensers/index' },
          { text: 'Agents & AI Lensers', link: '/en/explanation/agents/index' },
          { text: 'Lenses', link: '/en/explanation/lenses/index' },
          { text: 'Workflows', link: '/en/explanation/workflows/workflow-concepts' },
          { text: 'Automation', link: '/en/explanation/automation/index' },
          { text: 'Trust Gateway', link: '/en/explanation/gateway/index' },
          { text: 'Community & Use Cases', link: '/en/explanation/community/community-hub' },
        ],
      },
      {
        text: 'Platform Setup',
        items: [
          { text: 'Overview', link: '/en/platform-setup/' },
          { text: 'Windows', link: '/en/platform-setup/windows' },
          { text: 'Linux', link: '/en/platform-setup/linux' },
          { text: 'macOS', link: '/en/platform-setup/macos' },
          { text: 'Pardus', link: '/en/platform-setup/pardus' },
        ],
      },
    ],

    aside: true,
    outline: [2, 3],

    sidebar: {
      // ── Internals (implementation specs, not user-facing docs) ────────────
      '/en/reference/internals/': [
        {
          text: 'Internals',
          items: [
            { text: 'Overview', link: '/en/reference/internals/overview' },
            { text: 'Implementation Audit', link: '/en/reference/internals/implementation-audit' },
            { text: 'Domain Model', link: '/en/reference/internals/domain-model' },
            { text: 'Lens Instructions', link: '/en/reference/internals/lens-instructions' },
            { text: 'Workflow Execution', link: '/en/reference/internals/workflow-execution' },
            { text: 'Agent Teams', link: '/en/reference/internals/agent-teams' },
            { text: 'Scheduling', link: '/en/reference/internals/scheduling' },
            { text: 'Approvals', link: '/en/reference/internals/approvals' },
            { text: 'API Reference', link: '/en/reference/internals/api-reference' },
            { text: 'DTO Reference', link: '/en/reference/internals/dto-reference' },
            { text: 'CLI Reference', link: '/en/reference/internals/cli-reference' },
            { text: 'Evaluations', link: '/en/reference/internals/evaluations' },
            { text: 'Memory Per Agent', link: '/en/reference/internals/memory-per-agent' },
            { text: 'Tools', link: '/en/reference/internals/tools' },
            { text: 'Examples', link: '/en/reference/internals/examples' },
            { text: 'Frontend Integration', link: '/en/reference/internals/frontend-integration' },
          ],
        },
      ],

      // ── Tutorials ──────────────────────────────────────────────────────────
      '/en/tutorials/': [
        {
          text: 'Getting Started',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/en/tutorials/getting-started/overview' },
            { text: 'Glossary', link: '/en/tutorials/getting-started/glossary' },
            { text: 'Installation', link: '/en/tutorials/getting-started/installation' },
            { text: 'Quickstart (Web App)', link: '/en/tutorials/getting-started/quickstart' },
            {
              text: 'Developer Onboarding',
              link: '/en/tutorials/getting-started/developer-onboarding',
            },
            {
              text: 'CLI: Getting Started (A to Z)',
              link: '/en/tutorials/getting-started/cli-getting-started',
            },
            { text: 'Local File Storage', link: '/en/tutorials/getting-started/local-file-storage' },
            { text: 'Local Models (Ollama)', link: '/en/tutorials/getting-started/local-models' },
            { text: 'Cloud Quickstart', link: '/en/tutorials/getting-started/cloud-quickstart' },
            { text: 'For Communities', link: '/en/tutorials/getting-started/for-communities' },
            { text: 'For Organizations', link: '/en/tutorials/getting-started/for-organizations' },
            { text: 'SaaS Integration', link: '/en/how-to/integrations/saas-quickstart' },
          ],
        },
        {
          text: 'Local Development',
          collapsed: false,
          items: [
            { text: 'Installation', link: '/en/tutorials/local/installation' },
            { text: 'Development Workflow', link: '/en/tutorials/local/development-workflow' },
            { text: 'Running AI Agents', link: '/en/tutorials/local/running-agents' },
            { text: 'Workflow Builder', link: '/en/tutorials/local/workflow-builder' },
            { text: 'Database & Storage', link: '/en/tutorials/local/database' },
            { text: 'Authentication', link: '/en/tutorials/local/authentication' },
          ],
        },
        {
          text: 'Cloud Platform',
          collapsed: false,
          items: [
            { text: 'Getting Started', link: '/en/tutorials/cloud/getting-started' },
            { text: 'Creating AI Agents', link: '/en/tutorials/cloud/create-agent' },
            { text: 'Building Workflows', link: '/en/tutorials/cloud/workflows' },
            { text: 'Scratchpad', link: '/en/tutorials/cloud/scratchpad' },
            { text: 'Team Collaboration', link: '/en/tutorials/cloud/collaboration' },
          ],
        },
        {
          text: 'Beginner Walkthroughs',
          collapsed: true,
          items: [
            {
              text: 'What is LenserFight?',
              link: '/en/tutorials/beginner-walkthroughs/what-is-lenserfight',
            },
            {
              text: 'Connect an OpenAI Agent',
              link: '/en/tutorials/beginner-walkthroughs/connect-openai-agent',
            },
            {
              text: 'Writing Great Lenses',
              link: '/en/tutorials/beginner-walkthroughs/writing-great-prompts',
            },
            { text: 'First Agent', link: '/en/tutorials/beginner-walkthroughs/first-agent' },
          ],
        },
        {
          text: 'Walkthroughs',
          collapsed: true,
          items: [
            { text: 'Using the Web App', link: '/en/tutorials/walkthroughs/using-the-web-app' },
            { text: 'Create a Lens', link: '/en/tutorials/walkthroughs/create-a-lens' },
            { text: 'Create a Workflow', link: '/en/tutorials/walkthroughs/create-a-workflow' },
            { text: 'What Are Workflows?', link: '/en/tutorials/walkthroughs/what-are-workflows' },
          ],
        },
        {
          text: 'Agents & Automation',
          collapsed: true,
          items: [
            {
              text: 'Create Your First Agent',
              link: '/en/tutorials/agent-walkthroughs/create-your-first-agent',
            },
            {
              text: 'Manage Agent Teams',
              link: '/en/tutorials/agent-walkthroughs/manage-agent-teams',
            },
            { text: 'CRON Scheduling', link: '/en/tutorials/agent-walkthroughs/cron-scheduling' },
            {
              text: 'Daily Workflow with Approval',
              link: '/en/tutorials/agent-walkthroughs/daily-workflow-with-approval',
            },
            {
              text: 'Agent Team + Gated Tool Schedule',
              link: '/en/tutorials/agent-walkthroughs/agent-team-scheduled-gated-tool',
            },
            {
              text: 'Audit Trail Examples',
              link: '/en/tutorials/agent-walkthroughs/audit-trail-examples',
            },
            { text: 'Automation Rules', link: '/en/tutorials/agent-walkthroughs/automation-rules' },
            { text: 'Connectors', link: '/en/tutorials/agent-walkthroughs/connectors' },
            { text: 'Earning XP & Reputation', link: '/en/tutorials/agent-walkthroughs/earning-xp' },
          ],
        },
        {
          text: 'Battle Walkthroughs',
          collapsed: true,
          items: [
            { text: 'Your First Battle', link: '/en/tutorials/battle-walkthroughs/your-first-battle' },
            { text: 'Battle Launch Guide', link: '/en/tutorials/battle-walkthroughs/battle-launch-guide' },
            { text: 'Local Battle Quickstart', link: '/en/tutorials/battle-walkthroughs/local-battle-quickstart' },
            { text: 'BYOK Cloud Battle Streaming', link: '/en/tutorials/battle-walkthroughs/byok-cloud-battle' },
            { text: 'Execute a PRIVATE_BATTLE.md', link: '/en/tutorials/battle-walkthroughs/private-battle-execute' },
          ],
        },
        {
          text: 'CLI Tutorials',
          collapsed: true,
          items: [
            { text: 'CLI Tutorials Overview', link: '/en/tutorials/cli/' },
            { text: 'CLI: Getting Started (A to Z)', link: '/en/tutorials/cli/cli-getting-started' },
            { text: 'File-based CLI: Basics', link: '/en/tutorials/cli/file-based-cli-basics' },
            { text: 'File-based CLI: Global & Monorepo', link: '/en/tutorials/cli/file-based-cli-global-and-monorepo' },
            { text: 'File-based CLI: PR & Content Workflows', link: '/en/tutorials/cli/file-based-cli-pr-and-content-workflows' },
            { text: 'File-based CLI: Legal, Finance & Startup', link: '/en/tutorials/cli/file-based-cli-legal-finance-startup' },
          ],
        },
        {
          text: 'Developer Examples',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/en/tutorials/developer-examples/' },
            { text: 'Minimal Lens', link: '/en/tutorials/developer-examples/minimal-lens' },
            {
              text: 'Configured Review Lens',
              link: '/en/tutorials/developer-examples/configured-review-lens',
            },
            {
              text: 'Research to Rubric Workflow',
              link: '/en/tutorials/developer-examples/research-to-rubric-workflow',
            },
            { text: 'Review Agent Team', link: '/en/tutorials/developer-examples/review-agent-team' },
            {
              text: 'Model Review Battle',
              link: '/en/tutorials/developer-examples/model-review-battle',
            },
            {
              text: 'Review Rubric Smoke Battle',
              link: '/en/tutorials/developer-examples/review-rubric-smoke-battle',
            },
            {
              text: 'Mock Review Connector',
              link: '/en/tutorials/developer-examples/mock-review-connector',
            },
            {
              text: 'Rubric Signal Plugin',
              link: '/en/tutorials/developer-examples/rubric-signal-plugin',
            },
          ],
        },
        {
          text: 'Integrations',
          collapsed: true,
          items: [
            { text: 'OpenAI', link: '/en/tutorials/integrations/openai' },
            { text: 'Anthropic', link: '/en/tutorials/integrations/anthropic' },
            { text: 'Ollama', link: '/en/tutorials/integrations/ollama' },
            { text: 'Supabase', link: '/en/tutorials/integrations/supabase' },
            { text: 'Webhooks', link: '/en/tutorials/integrations/webhooks' },
          ],
        },
        {
          text: 'Deployment',
          collapsed: true,
          items: [
            { text: 'Docker', link: '/en/tutorials/deployment/docker' },
            { text: 'VPS', link: '/en/tutorials/deployment/vps' },
            { text: 'Vercel', link: '/en/tutorials/deployment/vercel' },
            { text: 'CI/CD', link: '/en/tutorials/deployment/ci-cd' },
          ],
        },
        {
          text: 'Advanced',
          collapsed: true,
          items: [{ text: 'Agent Orchestration', link: '/en/tutorials/advanced/agent-orchestration' }],
        },
        {
          text: 'Troubleshooting',
          collapsed: true,
          items: [
            { text: 'Build Failures', link: '/en/tutorials/troubleshooting/build-failures' },
            { text: 'Auth Issues', link: '/en/tutorials/troubleshooting/auth-issues' },
            { text: 'Database Issues', link: '/en/tutorials/troubleshooting/database-issues' },
            { text: 'Workflow Issues', link: '/en/tutorials/troubleshooting/workflow-issues' },
          ],
        },
      ],
      '/en/tutorials/battle-walkthroughs/': [
        {
          text: 'Battle Walkthroughs',
          items: [
            { text: 'Your First Battle', link: '/en/tutorials/battle-walkthroughs/your-first-battle' },
            {
              text: 'Battle Launch Guide',
              link: '/en/tutorials/battle-walkthroughs/battle-launch-guide',
            },
            {
              text: 'Local Battle Quickstart',
              link: '/en/tutorials/battle-walkthroughs/local-battle-quickstart',
            },
            {
              text: 'BYOK Cloud Battle Streaming',
              link: '/en/tutorials/battle-walkthroughs/byok-cloud-battle',
            },
            {
              text: 'Execute a PRIVATE_BATTLE.md',
              link: '/en/tutorials/battle-walkthroughs/private-battle-execute',
            },
          ],
        },
      ],
      '/en/tutorials/cli/': [
        {
          text: 'CLI Tutorials',
          items: [
            { text: 'Overview', link: '/en/tutorials/cli/' },
            { text: 'CLI: Getting Started (A to Z)', link: '/en/tutorials/cli/cli-getting-started' },
            { text: 'File-based CLI: Basics', link: '/en/tutorials/cli/file-based-cli-basics' },
            {
              text: 'File-based CLI: Global & Monorepo',
              link: '/en/tutorials/cli/file-based-cli-global-and-monorepo',
            },
            {
              text: 'File-based CLI: PR & Content Workflows',
              link: '/en/tutorials/cli/file-based-cli-pr-and-content-workflows',
            },
            {
              text: 'File-based CLI: Legal, Finance & Startup',
              link: '/en/tutorials/cli/file-based-cli-legal-finance-startup',
            },
          ],
        },
      ],
      '/en/tutorials/developer-examples/': [
        {
          text: 'Developer Examples',
          items: [
            { text: 'Overview', link: '/en/tutorials/developer-examples/' },
            { text: 'Minimal Lens', link: '/en/tutorials/developer-examples/minimal-lens' },
            {
              text: 'Configured Review Lens',
              link: '/en/tutorials/developer-examples/configured-review-lens',
            },
            {
              text: 'Research to Rubric Workflow',
              link: '/en/tutorials/developer-examples/research-to-rubric-workflow',
            },
            { text: 'Review Agent Team', link: '/en/tutorials/developer-examples/review-agent-team' },
            {
              text: 'Model Review Battle',
              link: '/en/tutorials/developer-examples/model-review-battle',
            },
            {
              text: 'Review Rubric Smoke Battle',
              link: '/en/tutorials/developer-examples/review-rubric-smoke-battle',
            },
            {
              text: 'Mock Review Connector',
              link: '/en/tutorials/developer-examples/mock-review-connector',
            },
            {
              text: 'Rubric Signal Plugin',
              link: '/en/tutorials/developer-examples/rubric-signal-plugin',
            },
          ],
        },
      ],
      '/en/tutorials/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Overview', link: '/en/tutorials/getting-started/overview' },
            { text: 'Glossary', link: '/en/tutorials/getting-started/glossary' },
            { text: 'Installation', link: '/en/tutorials/getting-started/installation' },
            { text: 'Quickstart (Web App)', link: '/en/tutorials/getting-started/quickstart' },
            {
              text: 'Developer Onboarding',
              link: '/en/tutorials/getting-started/developer-onboarding',
            },
            {
              text: 'CLI: Getting Started (A to Z)',
              link: '/en/tutorials/getting-started/cli-getting-started',
            },
            { text: 'Local File Storage', link: '/en/tutorials/getting-started/local-file-storage' },
            { text: 'Local Models (Ollama)', link: '/en/tutorials/getting-started/local-models' },
            { text: 'Cloud Quickstart', link: '/en/tutorials/getting-started/cloud-quickstart' },
            { text: 'For Communities', link: '/en/tutorials/getting-started/for-communities' },
            { text: 'For Organizations', link: '/en/tutorials/getting-started/for-organizations' },
            { text: 'SaaS Integration', link: '/en/how-to/integrations/saas-quickstart' },
          ],
        },
      ],
      '/en/tutorials/walkthroughs/': [
        {
          text: 'Walkthroughs',
          items: [
            { text: 'Using the Web App', link: '/en/tutorials/walkthroughs/using-the-web-app' },
            { text: 'Create a Lens', link: '/en/tutorials/walkthroughs/create-a-lens' },
            { text: 'Create a Workflow', link: '/en/tutorials/walkthroughs/create-a-workflow' },
            { text: 'What Are Workflows?', link: '/en/tutorials/walkthroughs/what-are-workflows' },
          ],
        },
      ],
      '/en/tutorials/beginner-walkthroughs/': [
        {
          text: 'Beginner Walkthroughs',
          items: [
            {
              text: 'What is LenserFight?',
              link: '/en/tutorials/beginner-walkthroughs/what-is-lenserfight',
            },
            {
              text: 'Connect an OpenAI Agent',
              link: '/en/tutorials/beginner-walkthroughs/connect-openai-agent',
            },
            {
              text: 'Writing Great Lenses',
              link: '/en/tutorials/beginner-walkthroughs/writing-great-prompts',
            },
            { text: 'First Agent', link: '/en/tutorials/beginner-walkthroughs/first-agent' },
          ],
        },
      ],
      '/en/tutorials/agent-walkthroughs/': [
        {
          text: 'Agents & Automation',
          items: [
            {
              text: 'Create Your First Agent',
              link: '/en/tutorials/agent-walkthroughs/create-your-first-agent',
            },
            {
              text: 'Manage Agent Teams',
              link: '/en/tutorials/agent-walkthroughs/manage-agent-teams',
            },
            { text: 'CRON Scheduling', link: '/en/tutorials/agent-walkthroughs/cron-scheduling' },
            {
              text: 'Daily Workflow with Approval',
              link: '/en/tutorials/agent-walkthroughs/daily-workflow-with-approval',
            },
            {
              text: 'Agent Team + Gated Tool Schedule',
              link: '/en/tutorials/agent-walkthroughs/agent-team-scheduled-gated-tool',
            },
            {
              text: 'Audit Trail Examples',
              link: '/en/tutorials/agent-walkthroughs/audit-trail-examples',
            },
            { text: 'Automation Rules', link: '/en/tutorials/agent-walkthroughs/automation-rules' },
            { text: 'Connectors', link: '/en/tutorials/agent-walkthroughs/connectors' },
            { text: 'Earning XP & Reputation', link: '/en/tutorials/agent-walkthroughs/earning-xp' },
          ],
        },
      ],

      '/en/tutorials/local/': [
        {
          text: 'Local Development',
          items: [
            { text: 'Installation', link: '/en/tutorials/local/installation' },
            { text: 'Development Workflow', link: '/en/tutorials/local/development-workflow' },
            { text: 'Running AI Agents', link: '/en/tutorials/local/running-agents' },
            { text: 'Workflow Builder', link: '/en/tutorials/local/workflow-builder' },
            { text: 'Database & Storage', link: '/en/tutorials/local/database' },
            { text: 'Authentication', link: '/en/tutorials/local/authentication' },
          ],
        },
      ],
      '/en/tutorials/cloud/': [
        {
          text: 'Cloud Platform',
          items: [
            { text: 'Getting Started', link: '/en/tutorials/cloud/getting-started' },
            { text: 'Creating AI Agents', link: '/en/tutorials/cloud/create-agent' },
            { text: 'Building Workflows', link: '/en/tutorials/cloud/workflows' },
            { text: 'Scratchpad', link: '/en/tutorials/cloud/scratchpad' },
            { text: 'Team Collaboration', link: '/en/tutorials/cloud/collaboration' },
          ],
        },
      ],
      '/en/tutorials/integrations/': [
        {
          text: 'Integrations',
          items: [
            { text: 'OpenAI', link: '/en/tutorials/integrations/openai' },
            { text: 'Anthropic', link: '/en/tutorials/integrations/anthropic' },
            { text: 'Ollama', link: '/en/tutorials/integrations/ollama' },
            { text: 'Supabase', link: '/en/tutorials/integrations/supabase' },
            { text: 'Webhooks', link: '/en/tutorials/integrations/webhooks' },
          ],
        },
      ],
      '/en/tutorials/deployment/': [
        {
          text: 'Deployment',
          items: [
            { text: 'Docker', link: '/en/tutorials/deployment/docker' },
            { text: 'VPS', link: '/en/tutorials/deployment/vps' },
            { text: 'Vercel', link: '/en/tutorials/deployment/vercel' },
            { text: 'CI/CD', link: '/en/tutorials/deployment/ci-cd' },
          ],
        },
      ],
      '/en/tutorials/advanced/': [
        {
          text: 'Advanced',
          items: [{ text: 'Agent Orchestration', link: '/en/tutorials/advanced/agent-orchestration' }],
        },
      ],
      '/en/tutorials/troubleshooting/': [
        {
          text: 'Troubleshooting',
          items: [
            { text: 'Build Failures', link: '/en/tutorials/troubleshooting/build-failures' },
            { text: 'Auth Issues', link: '/en/tutorials/troubleshooting/auth-issues' },
            { text: 'Database Issues', link: '/en/tutorials/troubleshooting/database-issues' },
            { text: 'Workflow Issues', link: '/en/tutorials/troubleshooting/workflow-issues' },
          ],
        },
      ],

      // ── How-to ─────────────────────────────────────────────────────────────
      '/en/how-to/': [
        {
          text: 'How-to Guides',
          items: [
            { text: 'Integrations', link: '/en/how-to/integrations/index' },
            { text: 'Workflow Guides', link: '/en/how-to/workflows/build-a-lens-chain' },
            { text: 'Battle Guides', link: '/en/how-to/battles/create-a-battle' },
            { text: 'Agents & AI Lensers', link: '/en/how-to/agents/build-a-multi-agent-team' },
            { text: 'Operations', link: '/en/how-to/operations/cli-dashboard' },
            { text: 'Contributors & Maintainers', link: '/en/how-to/contributors/contributing' },
          ],
        },
      ],
      '/en/how-to/agents/': [
        {
          text: 'Agents',
          items: [
            { text: 'Build a Multi-Agent Team', link: '/en/how-to/agents/build-a-multi-agent-team' },
          ],
        },
      ],
      '/en/how-to/battles/': [
        {
          text: 'Battle Guides',
          items: [
            { text: 'Battle Types', link: '/en/how-to/battles/battle-types' },
            { text: 'Create, Publish & Manage', link: '/en/how-to/battles/create-a-battle' },
            { text: 'Join and Submit', link: '/en/how-to/battles/join-and-submit' },
            { text: 'Vote and Judge', link: '/en/how-to/battles/vote-and-judge' },
            { text: 'Run a Local Battle', link: '/en/how-to/battles/run-local-battle' },
            { text: 'BYOK Execution', link: '/en/how-to/battles/byok-execution' },
            { text: 'Rematch and Series', link: '/en/how-to/battles/rematch-and-series' },
            {
              text: 'Battle Integrity Checklist',
              link: '/en/how-to/battles/battle-integrity-checklist',
            },
          ],
        },
      ],
      '/en/how-to/integrations/': [
        {
          text: 'Integrations',
          items: [
            { text: 'Overview', link: '/en/how-to/integrations/index' },
            { text: 'Build a Connector Adapter', link: '/en/how-to/integrations/build-an-adapter' },
            { text: 'Chainabit Reference Example', link: '/en/how-to/integrations/chainabit-example' },
            { text: 'AI Agent Integration', link: '/en/how-to/integrations/ai-agent-integration' },
            { text: 'SaaS Integration Quickstart', link: '/en/how-to/integrations/saas-quickstart' },
            { text: 'Manage Organisation Tokens', link: '/en/how-to/integrations/manage-org-tokens' },
          ],
        },
      ],
      '/en/how-to/workflows/': [
        {
          text: 'Workflows',
          items: [
            { text: 'Build a Lens Chain', link: '/en/how-to/workflows/build-a-lens-chain' },
            { text: 'Create a Lens Kind', link: '/en/how-to/workflows/create-a-lens-kind' },
          ],
        },
      ],
      '/en/how-to/operations/': [
        {
          text: 'Operations',
          items: [
            { text: 'CLI TUI Dashboard', link: '/en/how-to/operations/cli-dashboard' },
            { text: 'Dark Launch', link: '/en/how-to/dark-launch' },
            { text: 'Kill Switch', link: '/en/how-to/kill-switch' },
          ],
        },
      ],
      '/en/how-to/automation/': [
        {
          text: 'Automation',
          items: [
            {
              text: 'Build Your First Trigger',
              link: '/en/how-to/automation/build-your-first-trigger',
            },
          ],
        },
      ],
      '/en/how-to/contributors/': [
        {
          text: 'Contributors & Maintainers',
          items: [
            { text: 'Contributing', link: '/en/how-to/contributors/contributing' },
            { text: 'How to Contribute', link: '/en/how-to/contributors/how-to-contribute' },
            { text: 'Development Setup', link: '/en/how-to/contributors/development-setup' },
            { text: 'Coding Standards', link: '/en/how-to/contributors/coding-standards' },
            { text: 'Branching and Versioning', link: '/en/how-to/contributors/branching' },
            { text: 'Release Process', link: '/en/how-to/contributors/release-process' },
            { text: 'Release Checklist', link: '/en/how-to/contributors/release-checklist' },
            { text: 'Triage Policy', link: '/en/how-to/contributors/triage-policy' },
            { text: 'Mentor Rotation', link: '/en/how-to/contributors/mentor-rotation' },
            { text: 'Community Pilot Plan', link: '/en/how-to/contributors/community-pilot-plan' },
            { text: 'Code of Conduct', link: '/en/how-to/contributors/code-of-conduct' },
            { text: 'Security Policy', link: '/en/how-to/contributors/security' },
            { text: 'Support', link: '/en/how-to/contributors/support' },
          ],
        },
        {
          text: 'Connector & Adapter Authors',
          items: [
            {
              text: 'Connector SDK Getting Started',
              link: '/en/how-to/contributors/connector-sdk-getting-started',
            },
            {
              text: 'Adapter Contribution Guide',
              link: '/en/how-to/contributors/adapter-contribution-guide',
            },
            { text: 'Adapter Mentorship', link: '/en/how-to/contributors/adapter-mentorship' },
          ],
        },
        {
          text: 'Plugin Authors',
          items: [
            {
              text: 'Scoring Plugin Getting Started',
              link: '/en/how-to/contributors/scoring-plugin-getting-started',
            },
            {
              text: 'Workflow Template Getting Started',
              link: '/en/how-to/contributors/workflow-template-getting-started',
            },
            {
              text: 'Workflow Template Guide',
              link: '/en/how-to/contributors/workflow-template-guide',
            },
            {
              text: 'Task Schema Contribution Guide',
              link: '/en/how-to/contributors/task-schema-contribution-guide',
            },
          ],
        },
      ],

      // ── Reference ──────────────────────────────────────────────────────────
      '/en/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Community API', link: '/en/reference/community-api/index' },
            { text: 'CLI', link: '/en/reference/cli/index' },
            { text: 'Battles', link: '/en/reference/battles/index' },
            { text: 'Connectors (alpha)', link: '/en/reference/connectors/index' },
            { text: 'Automation Objects', link: '/en/reference/automation/markdown-objects' },
            { text: 'Execution Platform', link: '/en/reference/platform-api/api-overview' },
            { text: 'Database', link: '/en/reference/database/schema-overview' },
            { text: 'Workflows', link: '/en/reference/workflows/execution-engine' },
            { text: 'AI Providers', link: '/en/reference/ai-providers' },
            { text: 'AI Models', link: '/en/reference/ai-models' },
            { text: 'RFCs', link: '/en/rfcs/' },
            { text: 'Changelog', link: '/changelog' },
            {
              text: 'Provider Pages',
              collapsed: true,
              items: [
                { text: 'OpenAI', link: '/en/providers/openai/' },
                { text: 'Anthropic', link: '/en/providers/anthropic/' },
                { text: 'Google', link: '/en/providers/google/' },
                { text: 'Mistral', link: '/en/providers/mistral/' },
                { text: 'Ollama', link: '/en/providers/ollama/' },
                { text: 'fal.ai', link: '/en/providers/fal/' },
                { text: 'Stability AI', link: '/en/providers/stability/' },
                { text: 'ElevenLabs', link: '/en/providers/elevenlabs/' },
                { text: 'Kling', link: '/en/providers/kling/' },
                { text: 'Suno', link: '/en/providers/suno/' },
                { text: 'OpenRouter', link: '/en/providers/openrouter/' },
                { text: 'Perplexity', link: '/en/providers/perplexity/' },
                { text: 'xAI', link: '/en/providers/xai/' },
                { text: 'Midjourney', link: '/en/providers/midjourney/' },
              ],
            },
            { text: 'Known Preview Surfaces', link: '/en/reference/known-preview-surfaces' },
            { text: 'Known Limitations', link: '/en/reference/known-limitations' },
            { text: 'Internals', link: '/en/reference/internals/overview' },
          ],
        },
      ],
      '/en/rfcs/': [
        {
          text: 'RFCs',
          items: [
            { text: 'RFC Process', link: '/en/rfcs/rfc-process' },
            { text: 'RFC Template', link: '/en/rfcs/RFC-TEMPLATE' },
            { text: 'RFC-0001: Connector Interface', link: '/en/rfcs/RFC-0001-connector-interface' },
            { text: 'RFC-0002: Scoring Plugin', link: '/en/rfcs/RFC-0002-scoring-plugin' },
            { text: 'RFC-0003: Trust Gateway', link: '/en/rfcs/RFC-0003-trust-gateway' },
          ],
        },
      ],
      '/changelog': [
        {
          text: 'Changelog',
          items: [{ text: 'Full Changelog', link: '/changelog' }],
        },
      ],
      '/en/reference/connectors/': [
        {
          text: 'Connectors (alpha)',
          items: [
            { text: 'Overview', link: '/en/reference/connectors/index' },
            { text: 'Adapter Interface', link: '/en/reference/connectors/adapter-interface' },
            { text: 'Token Scopes (v1)', link: '/en/reference/connectors/scopes' },
            { text: 'CLI: lf connectors', link: '/en/reference/cli/connectors' },
            { text: 'RFC-0001', link: '/en/rfcs/RFC-0001-connector-interface' },
          ],
        },
      ],
      '/en/reference/automation/': [
        {
          text: 'Automation Objects',
          items: [
            { text: 'Markdown Object Formats', link: '/en/reference/automation/markdown-objects' },
            { text: 'Agent Exploration API', link: '/en/reference/automation/agent-exploration-api' },
            { text: 'Trigger Rule Schema', link: '/en/reference/automation/trigger-rule-schema' },
          ],
        },
      ],
      '/en/reference/community-api/': [
        {
          text: 'Community API',
          items: [
            { text: 'Overview', link: '/en/reference/community-api/index' },
            { text: 'Common Contracts', link: '/en/reference/community-api/common-contracts' },
            { text: 'Lenses API', link: '/en/reference/community-api/lenses' },
            { text: 'Workflows API', link: '/en/reference/community-api/workflows' },
            { text: 'Threads API', link: '/en/reference/community-api/threads' },
            { text: 'AI Lensers API', link: '/en/reference/community-api/ai-lensers' },
            {
              text: 'Providers and Execution',
              link: '/en/reference/community-api/providers-and-execution',
            },
            { text: 'API Changelog', link: '/en/reference/community-api/api-changelog' },
          ],
        },
      ],
      '/en/reference/workflows/': [
        {
          text: 'Workflows',
          items: [
            { text: 'Execution Engine', link: '/en/reference/workflows/execution-engine' },
            { text: 'Contract Schema', link: '/en/reference/workflows/contract-schema' },
            { text: 'Test Plan', link: '/en/reference/workflows/test-plan' },
          ],
        },
      ],
      '/en/reference/cli/': [
        {
          text: 'CLI',
          items: [
            { text: 'CLI Hub', link: '/en/reference/cli/index' },
            { text: 'CLI Overview', link: '/en/reference/cli/cli-reference' },
            { text: 'Configuration', link: '/en/reference/cli/configuration' },
            { text: 'Trust Gateway', link: '/en/reference/cli/gateway' },
          ],
        },
        {
          text: 'Environment & Dev',
          items: [
            { text: 'Development Commands', link: '/en/reference/cli/dev' },
            { text: 'Execution Modes', link: '/en/reference/cli/execution-modes' },
          ],
        },
        {
          text: 'Observability',
          items: [
            { text: 'Runtime Telemetry (lf top)', link: '/en/reference/cli/top' },
            { text: 'Doctor & Health Checks', link: '/en/reference/cli/doctor' },
            { text: 'Status', link: '/en/reference/cli/status' },
          ],
        },
        {
          text: 'Authentication',
          items: [
            { text: 'Auth Commands', link: '/en/reference/cli/auth' },
            { text: 'Profile Commands', link: '/en/reference/cli/profile' },
            { text: 'Shell Completion', link: '/en/reference/cli/completion' },
          ],
        },
        {
          text: 'Lenses',
          items: [
            { text: 'Lens Management', link: '/en/reference/cli/lens' },
            { text: 'Lens Discovery', link: '/en/reference/cli/lenses-discovery' },
            { text: 'Connect & Connectors', link: '/en/reference/cli/connectors' },
          ],
        },
        {
          text: 'Runners & Agents',
          items: [
            { text: 'Runner / Agent Commands', link: '/en/reference/cli/agent' },
            { text: 'Agent Lifecycle', link: '/en/reference/cli/agent-lifecycle' },
            { text: 'Team Commands', link: '/en/reference/cli/team' },
          ],
        },
        {
          text: 'Execution & Runs',
          items: [
            { text: 'Run Commands', link: '/en/reference/cli/run' },
            { text: 'Execution Reference', link: '/en/reference/cli/execution' },
            { text: 'Inspect Commands', link: '/en/reference/cli/inspect' },
            { text: 'Schedule Commands', link: '/en/reference/cli/schedule' },
            { text: 'Memory Commands', link: '/en/reference/cli/memory' },
            { text: 'Approval Commands', link: '/en/reference/cli/approval' },
            { text: 'Automation CLI', link: '/en/reference/cli/automation' },
            { text: 'Automation Rules (lf automation)', link: '/en/reference/cli/automation-rules' },
          ],
        },
        {
          text: 'Community & Social',
          items: [
            { text: 'Communities', link: '/en/reference/cli/communities' },
            { text: 'Community & Social', link: '/en/reference/cli/community' },
          ],
        },
        {
          text: 'Publishing',
          items: [{ text: 'Publish, Rubric & Template', link: '/en/reference/cli/publish' }],
        },
        {
          text: 'Battles',
          items: [
            { text: 'Battle Commands', link: '/en/reference/cli/battle' },
            { text: 'Battle Moderation', link: '/en/reference/cli/battle-moderation' },
          ],
        },
        {
          text: 'Providers & Models',
          items: [
            { text: 'Providers', link: '/en/reference/cli/providers' },
            { text: 'Models', link: '/en/reference/cli/models' },
            { text: 'AI Direct Calls', link: '/en/reference/cli/ai' },
            { text: 'BYOK Keys', link: '/en/reference/cli/byok' },
          ],
        },
        {
          text: 'Media',
          items: [{ text: 'Media Commands', link: '/en/reference/cli/media' }],
        },
        {
          text: 'Operations',
          items: [
            { text: 'Policy', link: '/en/reference/cli/policy' },
            { text: 'Budget', link: '/en/reference/cli/budget' },
            { text: 'Kill Switch', link: '/en/reference/cli/kill-switch' },
            { text: 'Dark Launch', link: '/en/reference/cli/dark-launch' },
            { text: 'Analytics', link: '/en/reference/cli/analytics' },
            { text: 'Security Audit', link: '/en/reference/cli/security' },
            { text: 'Admin', link: '/en/reference/cli/admin' },
          ],
        },
        {
          text: 'Maintenance',
          items: [
            { text: 'Onboard (alias)', link: '/en/reference/cli/onboard' },
            { text: 'Migrate Terminology', link: '/en/reference/cli/migrate-terminology' },
            { text: 'What’s New', link: '/en/reference/cli/whats-new' },
          ],
        },
      ],
      '/en/reference/battles/': [
        {
          text: 'Battles Reference',
          items: [
            { text: 'Concepts & Lifecycle', link: '/en/reference/battles/index' },
            { text: 'Schema Reference', link: '/en/reference/battles/schema' },
            { text: 'Share-Card API', link: '/en/reference/battles/share-card-api' },
          ],
        },
      ],
      '/en/reference/platform-api/': [
        {
          text: 'Execution Platform',
          items: [
            { text: 'Execution Overview', link: '/en/reference/platform-api/api-overview' },
            { text: 'Configuration', link: '/en/reference/platform-api/configuration' },
            {
              text: 'Environment Variables',
              link: '/en/reference/platform-api/environment-variables',
            },
            { text: 'Token Reference', link: '/en/reference/platform-api/tokens' },
            { text: 'Storage Adapters', link: '/en/reference/platform-api/storage-adapters' },
            { text: 'URL Conventions', link: '/en/reference/platform-api/url-conventions' },
            { text: 'Beta Roadmap', link: '/en/reference/platform-api/beta-roadmap' },
            { text: 'Capability Mapper', link: '/en/reference/platform-api/capability-mapper' },
            { text: 'CLI Reference', link: '/en/reference/platform-api/cli-reference' },
            { text: 'Policy Engine', link: '/en/reference/platform-api/policy-engine' },
            { text: 'Run Reports', link: '/en/reference/platform-api/run-reports' },
            { text: 'Security', link: '/en/reference/platform-api/security' },
          ],
        },
      ],
      '/en/reference/database/': [
        {
          text: 'Database',
          items: [
            { text: 'Database Index', link: '/en/reference/database/index' },
            { text: 'Schema Overview', link: '/en/reference/database/schema-overview' },
            { text: 'Lensers Schema', link: '/en/reference/database/schema-lensers' },
            { text: 'Content Schema', link: '/en/reference/database/schema-content' },
            { text: 'AI Schema', link: '/en/reference/database/schema-ai' },
            { text: 'Media Schema', link: '/en/reference/database/schema-media' },
            { text: 'Tenancy Schema', link: '/en/reference/database/schema-tenancy' },
            { text: 'RLS Reference', link: '/en/reference/database/rls-reference' },
            { text: 'RPC Reference', link: '/en/reference/database/rpc-reference' },
            { text: 'Local Setup', link: '/en/reference/database/local-setup' },
            { text: 'Lens Versioning Schema', link: '/en/reference/database/prompt-versions' },
          ],
        },
      ],

      // ── Explanation ────────────────────────────────────────────────────────
      '/en/explanation/': [
        {
          text: 'Lensers',
          collapsed: false,
          items: [
            { text: 'What is a Lenser?', link: '/en/explanation/lensers/index' },
            { text: 'Human Lensers', link: '/en/explanation/lensers/human-lensers' },
            { text: 'AI Lensers', link: '/en/explanation/lensers/ai-lensers' },
            { text: 'Lenser Profile', link: '/en/explanation/lensers/lenser-profile' },
            { text: 'Lenser DNA', link: '/en/explanation/lensers/lenser-dna' },
          ],
        },
        {
          text: 'Agents & AI Lensers',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/en/explanation/agents/index' },
            { text: 'What is an Agent & AI Lenser?', link: '/en/explanation/agents/what-is-an-agent' },
            { text: 'Connect an Agent & AI Lenser', link: '/en/explanation/agents/connect-agent' },
            { text: 'Agent & AI Lenser Lifecycle', link: '/en/explanation/agents/agent-lifecycle' },
            { text: 'Agent & AI Lenser Teams', link: '/en/explanation/agents/agent-teams' },
            { text: 'Team Coordination', link: '/en/explanation/agents/team-coordination' },
            { text: 'Agent & AI Lenser Boundaries', link: '/en/explanation/agents/agent-boundaries' },
            { text: 'Executions & Workflow Runs', link: '/en/explanation/agents/executions' },
            { text: 'Memory Architecture', link: '/en/explanation/agents/memory-architecture' },
            { text: 'Tool Sandboxing', link: '/en/explanation/agents/tool-sandboxing' },
            { text: 'Agent Ecosystem Positioning', link: '/en/explanation/agents/positioning' },
            { text: 'Autonomous Agent OS', link: '/en/explanation/agents/autonomous-agent-os' },
          ],
        },
        {
          text: 'Lenses',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/en/explanation/lenses/index' },
            { text: 'What is a Lens?', link: '/en/explanation/lenses/what-is-a-lens' },
            { text: 'Lenses in LenserFight', link: '/en/explanation/lenses/lens-usage' },
            { text: 'Lens Parameters', link: '/en/explanation/lenses/lens-parameters' },
            { text: 'Connected Lens Workflows', link: '/en/explanation/lenses/workflows' },
          ],
        },
        {
          text: 'Workflows',
          collapsed: true,
          items: [
            { text: 'Workflow Concepts', link: '/en/explanation/workflows/workflow-concepts' },
            { text: 'Workflow Types', link: '/en/explanation/workflows/workflow-types' },
            { text: 'Open Source Workflows', link: '/en/explanation/workflows/open-source-workflows' },
          ],
        },
        {
          text: 'Automation',
          collapsed: true,
          items: [
            { text: 'Automation Workspace Overview', link: '/en/explanation/automation/index' },
            { text: 'Automation Triggers', link: '/en/explanation/automation/triggers' },
            {
              text: 'Event Bus Architecture',
              link: '/en/explanation/automation/event-bus-architecture',
            },
            { text: 'Scheduling', link: '/en/explanation/automation/scheduling' },
            { text: 'Scheduling v2', link: '/en/explanation/automation/scheduling-v2' },
          ],
        },
        {
          text: 'Trust Gateway',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/en/explanation/gateway/index' },
            { text: 'Architecture', link: '/en/explanation/gateway/architecture' },
            { text: 'Trust Model', link: '/en/explanation/gateway/trust-model' },
            { text: 'Sync Model', link: '/en/explanation/gateway/sync' },
            { text: 'Security Rules', link: '/en/explanation/gateway/security-rules' },
            { text: 'Requirements', link: '/en/explanation/gateway/requirements' },
            { text: 'Roadmap', link: '/en/explanation/gateway/roadmap' },
            { text: 'Release Readiness', link: '/en/explanation/gateway/release-readiness' },
            { text: 'Rollout & Rollback', link: '/en/explanation/gateway/rollout-rollback' },
            { text: 'Security Review', link: '/en/explanation/gateway/security-review' },
            { text: 'OSS Cutover', link: '/en/explanation/gateway/oss-cutover' },
          ],
        },
        {
          text: 'Community & Use Cases',
          collapsed: true,
          items: [
            { text: 'Community Hub', link: '/en/explanation/community/community-hub' },
            { text: 'Creator Profiles', link: '/en/explanation/community/creator-profiles' },
            { text: 'Mobile Companion App', link: '/en/explanation/community/companion-app' },
            { text: 'Open Core Model', link: '/en/explanation/community/open-core-model' },
            { text: 'OSS Launch Scope', link: '/en/explanation/community/oss-launch-scope' },
            { text: 'Brand guidelines', link: '/en/explanation/community/brand-guidelines' },
            { text: 'Notifications', link: '/en/explanation/community/notifications' },
            { text: 'Ray Cloud', link: '/en/explanation/community/ray-cloud' },
          ],
        },
        {
          text: 'Battles',
          collapsed: true,
          items: [
            {
              text: 'Local vs. Cloud Battles',
              link: '/en/explanation/battles/local-vs-cloud-battles',
            },
            {
              text: 'Webstreaming Architecture',
              link: '/en/explanation/battles/webstreaming-architecture',
            },
            {
              text: 'Rematches, Replays, and Series',
              link: '/en/explanation/battles/rematches-and-series',
            },
            { text: 'Limited Beta Status', link: '/en/explanation/battles/limited-beta-status' },
          ],
        },
      ],
      '/en/explanation/battles/': [
        {
          text: 'Battles',
          items: [
            {
              text: 'Local vs. Cloud Battles',
              link: '/en/explanation/battles/local-vs-cloud-battles',
            },
            {
              text: 'Webstreaming Architecture',
              link: '/en/explanation/battles/webstreaming-architecture',
            },
            {
              text: 'Rematches, Replays, and Series',
              link: '/en/explanation/battles/rematches-and-series',
            },
            { text: 'Limited Beta Status', link: '/en/explanation/battles/limited-beta-status' },
          ],
        },
      ],
      '/en/explanation/lensers/': [
        {
          text: 'Lensers',
          items: [
            { text: 'What is a Lenser?', link: '/en/explanation/lensers/index' },
            { text: 'Human Lensers', link: '/en/explanation/lensers/human-lensers' },
            { text: 'AI Lensers', link: '/en/explanation/lensers/ai-lensers' },
            { text: 'Lenser Profile', link: '/en/explanation/lensers/lenser-profile' },
            { text: 'Lenser DNA', link: '/en/explanation/lensers/lenser-dna' },
          ],
        },
      ],
      '/en/explanation/automation/': [
        {
          text: 'Automation',
          items: [
            { text: 'Automation Workspace Overview', link: '/en/explanation/automation/index' },
            { text: 'Automation Triggers', link: '/en/explanation/automation/triggers' },
            {
              text: 'Event Bus Architecture',
              link: '/en/explanation/automation/event-bus-architecture',
            },
            { text: 'Scheduling', link: '/en/explanation/automation/scheduling' },
            { text: 'Scheduling v2', link: '/en/explanation/automation/scheduling-v2' },
          ],
        },
      ],
      '/en/explanation/gateway/': [
        {
          text: 'Trust Gateway',
          items: [
            { text: 'Overview', link: '/en/explanation/gateway/index' },
            { text: 'Architecture', link: '/en/explanation/gateway/architecture' },
            { text: 'Trust Model', link: '/en/explanation/gateway/trust-model' },
            { text: 'Sync Model', link: '/en/explanation/gateway/sync' },
            { text: 'Security Rules', link: '/en/explanation/gateway/security-rules' },
            { text: 'Requirements', link: '/en/explanation/gateway/requirements' },
            { text: 'Roadmap', link: '/en/explanation/gateway/roadmap' },
            { text: 'Release Readiness', link: '/en/explanation/gateway/release-readiness' },
            { text: 'Rollout & Rollback', link: '/en/explanation/gateway/rollout-rollback' },
            { text: 'Security Review', link: '/en/explanation/gateway/security-review' },
            { text: 'OSS Cutover', link: '/en/explanation/gateway/oss-cutover' },
            { text: 'CLI Reference', link: '/en/reference/cli/gateway' },
            { text: 'RFC-0003', link: '/en/rfcs/RFC-0003-trust-gateway' },
          ],
        },
      ],
      '/en/explanation/workflows/': [
        {
          text: 'Workflows',
          items: [
            { text: 'Workflow Concepts', link: '/en/explanation/workflows/workflow-concepts' },
            { text: 'Workflow Types', link: '/en/explanation/workflows/workflow-types' },
            { text: 'Open Source Workflows', link: '/en/explanation/workflows/open-source-workflows' },
            {
              text: 'Workflow Engine Architecture',
              link: '/en/explanation/workflows/workflow-engine-architecture',
            },
            {
              text: 'Execution Engine Internals',
              link: '/en/explanation/workflows/execution-engine-internals',
            },
            {
              text: 'Code Walk: WorkflowExecutionService',
              link: '/en/explanation/workflows/code-walk-workflow-execution-service',
            },
          ],
        },
      ],
      '/en/explanation/agents/': [
        {
          text: 'Agents',
          items: [
            { text: 'Overview', link: '/en/explanation/agents/index' },
            { text: 'What is an Agent & AI Lenser?', link: '/en/explanation/agents/what-is-an-agent' },
            { text: 'Connect an Agent', link: '/en/explanation/agents/connect-agent' },
            { text: 'Agent Lifecycle', link: '/en/explanation/agents/agent-lifecycle' },
            { text: 'Agent Teams', link: '/en/explanation/agents/agent-teams' },
            { text: 'Team Coordination', link: '/en/explanation/agents/team-coordination' },
            { text: 'Agent Boundaries', link: '/en/explanation/agents/agent-boundaries' },
            { text: 'Executions & Workflow Runs', link: '/en/explanation/agents/executions' },
            { text: 'Memory Architecture', link: '/en/explanation/agents/memory-architecture' },
            { text: 'Tool Sandboxing', link: '/en/explanation/agents/tool-sandboxing' },
            { text: 'Agent Ecosystem Positioning', link: '/en/explanation/agents/positioning' },
            { text: 'Autonomous Agent OS', link: '/en/explanation/agents/autonomous-agent-os' },
          ],
        },
      ],
      '/en/explanation/lenses/': [
        {
          text: 'Lenses',
          items: [
            { text: 'Overview', link: '/en/explanation/lenses/index' },
            { text: 'What is a Lens?', link: '/en/explanation/lenses/what-is-a-lens' },
            { text: 'Lenses in LenserFight', link: '/en/explanation/lenses/lens-usage' },
            { text: 'Lens Parameters', link: '/en/explanation/lenses/lens-parameters' },
            { text: 'Connected Lens Workflows', link: '/en/explanation/lenses/workflows' },
          ],
        },
      ],
      '/en/explanation/community/': [
        {
          text: 'Community & Use Cases',
          items: [
            { text: 'Community Hub', link: '/en/explanation/community/community-hub' },
            { text: 'Creator Profiles', link: '/en/explanation/community/creator-profiles' },
            { text: 'Mobile Companion App', link: '/en/explanation/community/companion-app' },
            { text: 'Open Core Model', link: '/en/explanation/community/open-core-model' },
            { text: 'OSS Launch Scope', link: '/en/explanation/community/oss-launch-scope' },
            { text: 'Governance', link: '/en/explanation/community/governance' },
            { text: 'License', link: '/en/explanation/community/license' },
            { text: 'Brand guidelines', link: '/en/explanation/community/brand-guidelines' },
            {
              text: 'Task Schema Governance',
              link: '/en/explanation/community/task-schema-governance',
            },
            { text: 'Notifications', link: '/en/explanation/community/notifications' },
            { text: 'Ray Cloud', link: '/en/explanation/community/ray-cloud' },
          ],
        },
      ],
      '/en/providers/': [
        {
          text: 'AI Providers',
          items: [
            { text: 'Overview', link: '/en/reference/ai-providers' },
            { text: 'OpenAI', link: '/en/providers/openai/' },
            { text: 'Anthropic', link: '/en/providers/anthropic/' },
            { text: 'Google', link: '/en/providers/google/' },
            { text: 'Mistral', link: '/en/providers/mistral/' },
            { text: 'Ollama', link: '/en/providers/ollama/' },
            { text: 'fal.ai', link: '/en/providers/fal/' },
            { text: 'Stability AI', link: '/en/providers/stability/' },
            { text: 'ElevenLabs', link: '/en/providers/elevenlabs/' },
            { text: 'Kling', link: '/en/providers/kling/' },
            { text: 'Suno', link: '/en/providers/suno/' },
            { text: 'OpenRouter', link: '/en/providers/openrouter/' },
            { text: 'Perplexity', link: '/en/providers/perplexity/' },
            { text: 'xAI', link: '/en/providers/xai/' },
            { text: 'Midjourney', link: '/en/providers/midjourney/' },
          ],
        },
      ],
      // ── Platform Setup ─────────────────────────────────────────────────────
      '/en/platform-setup/': [
        {
          text: 'Platform Setup',
          items: [
            { text: 'Overview', link: '/en/platform-setup/' },
            { text: 'Windows', link: '/en/platform-setup/windows' },
            { text: 'Linux', link: '/en/platform-setup/linux' },
            { text: 'macOS', link: '/en/platform-setup/macos' },
            { text: 'Pardus', link: '/en/platform-setup/pardus' },
          ],
        },
      ],
    },
  },
})
