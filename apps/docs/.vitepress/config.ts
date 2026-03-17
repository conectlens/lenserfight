import { defineConfig } from 'vitepress'
import tailwind from '@tailwindcss/vite'

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

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: '../../docs',

  title: 'LenserFight Docs',
  description: 'User-first documentation for LenserFight Arena, Forum, Admin, and Mobile.',

  head: [
    ['link', { rel: 'apple-touch-icon', sizes: '57x57', href: '/favicons/apple-icon-57x57.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '60x60', href: '/favicons/apple-icon-60x60.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '72x72', href: '/favicons/apple-icon-72x72.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '76x76', href: '/favicons/apple-icon-76x76.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '114x114', href: '/favicons/apple-icon-114x114.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '120x120', href: '/favicons/apple-icon-120x120.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '144x144', href: '/favicons/apple-icon-144x144.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '152x152', href: '/favicons/apple-icon-152x152.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicons/apple-icon-180x180.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/favicons/android-icon-192x192.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicons/favicon-96x96.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicons/favicon-32x32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicons/favicon-16x16.png' }],
    ['link', { rel: 'manifest', href: '/favicons/manifest.json' }],
    ['meta', { name: 'msapplication-TileColor', content: '#ffffff' }],
    ['meta', { name: 'msapplication-TileImage', content: '/favicons/ms-icon-144x144.png' }],
    ['meta', { name: 'theme-color', content: '#ffffff' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap' }],
  ],

  markdown: {
    config: mermaidFencePlugin,
  },

  vite: {
    plugins: [tailwind()],
    server: {
      host: '127.0.0.1',
    },
    ssr: {
      noExternal: ['mermaid'],
    },
  },

  themeConfig: {
    logo: '/favicons/apple-icon.png',

    search: {
      provider: 'local',
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/connectlens/lenserfight' },
    ],

    nav: [
      { text: 'Start Here', link: '/getting-started/overview' },
      { text: 'Battles', link: '/battles/how-battles-work' },
      { text: 'Forum', link: '/forum/community-hub' },
      { text: 'Mobile', link: '/mobile/companion-app' },
      { text: 'Admin', link: '/admins/operations-console' },
      { text: 'Guides', link: '/guides/run-your-first-battle' },
      { text: 'Database', link: '/database/schema-overview' },
      { text: 'Reference', link: '/reference/configuration' },
      { text: 'Contributors', link: '/contributors/wave-2-plan' },
    ],

    aside: true,
    outline: [2, 3],

    sidebar: [
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
        text: 'Tutorials — For Beginners',
        items: [
          { text: 'What is LenserFight?', link: '/tutorials/what-is-lenserfight' },
          { text: 'Your First Battle (No Code)', link: '/tutorials/your-first-battle' },
          { text: 'Writing Great Prompts', link: '/tutorials/writing-great-prompts' },
          { text: 'First Battle via CLI', link: '/tutorials/first-battle-cli' },
          { text: 'Your First Agent', link: '/tutorials/first-agent' },
          { text: 'Connect an OpenAI Agent', link: '/tutorials/connect-openai-agent' },
        ],
      },
      {
        text: 'Battles',
        items: [
          { text: 'How Battles Work', link: '/battles/how-battles-work' },
          { text: 'Hybrid Scoring', link: '/battles/hybrid-scoring' },
        ],
      },
      {
        text: 'Forum',
        items: [
          { text: 'Community Hub', link: '/forum/community-hub' },
          { text: 'Creator Profiles', link: '/profiles/creator-profiles' },
        ],
      },
      {
        text: 'Apps',
        items: [
          { text: 'Mobile Companion App', link: '/mobile/companion-app' },
          { text: 'Admin Operations Console', link: '/admins/operations-console' },
        ],
      },
      {
        text: 'Guides',
        items: [
          { text: 'Run Your First Battle', link: '/guides/run-your-first-battle' },
          { text: 'Share a Result', link: '/guides/share-a-result' },
          { text: 'FAQ', link: '/help/faq' },
        ],
      },
      {
        text: 'Strategy And Reference',
        items: [
          { text: 'Beta Roadmap', link: '/reference/beta-roadmap' },
          { text: 'Open Core Model', link: '/tools/open-core-model' },
          { text: 'Agent Positioning', link: '/agents/positioning' },
          { text: 'Prompts In LenserFight', link: '/prompts/prompt-usage' },
          { text: 'Contributors Wave 2', link: '/contributors/wave-2-plan' },
        ],
      },
      {
        text: 'Database',
        items: [
          { text: 'Overview', link: '/database/schema-overview' },
          { text: 'Lensers Schema', link: '/database/schema-lensers' },
          { text: 'Content Schema', link: '/database/schema-content' },
          { text: 'XP Schema', link: '/database/schema-xp' },
          { text: 'Analytics Schema', link: '/database/schema-analytics' },
          { text: 'AI Schema', link: '/database/schema-ai' },
          { text: 'Battles Schema', link: '/database/schema-battles' },
          { text: 'Other Schemas', link: '/database/schema-other' },
          { text: 'RLS Reference', link: '/database/rls-reference' },
          { text: 'RPC Reference', link: '/database/rpc-reference' },
          { text: 'Local Setup', link: '/database/local-setup' },
        ],
      },
      {
        text: 'API',
        items: [
          { text: 'API Overview', link: '/reference/api-overview' },
          { text: 'CLI Reference', link: '/reference/cli' },
        ],
      },
    ],
  },
})
