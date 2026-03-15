import { defineConfig } from 'vitepress'
import tailwind from '@tailwindcss/vite'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: '../../docs',

  title: 'LenserFight Docs',
  description: 'User-first documentation for LenserFight Arena, Forum, Admin, and Mobile.',

  vite: {
    plugins: [tailwind()],
    server: {
      host: '127.0.0.1',
    },
  },

  themeConfig: {
    nav: [
      { text: 'Start Here', link: '/getting-started/overview' },
      { text: 'Battles', link: '/battles/how-battles-work' },
      { text: 'Forum', link: '/forum/community-hub' },
      { text: 'Mobile', link: '/mobile/companion-app' },
      { text: 'Admin', link: '/admins/operations-console' },
      { text: 'Guides', link: '/guides/run-your-first-battle' },
      { text: 'Reference', link: '/reference/beta-roadmap' },
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
    ],
  },
})
