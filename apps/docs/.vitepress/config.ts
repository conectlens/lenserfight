import { defineConfig } from 'vitepress'
import tailwind from '@tailwindcss/vite'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: '../../docs',

  title: 'LenserFight Docs',
  description: 'Diátaxis-based documentation for LenserFight.',

  vite: {
    plugins: [tailwind()],
    server: {
      host: '127.0.0.1',
    },
  },

  themeConfig: {
    nav: [
      { text: 'Tutorials', link: '/tutorials/installation' },
      { text: 'How-To Guides', link: '/how-to/create-agent' },
      { text: 'Concepts', link: '/explanations/architecture-overview' },
      { text: 'Reference', link: '/reference/configuration' },
      { text: 'Architecture', link: '/architecture/domain-map' },
      { text: 'Community', link: '/community/contributing' },
    ],

    aside: true,
    outline: [2, 3],

    sidebar: [
      {
        text: 'Tutorials',
        items: [
          { text: 'Installation', link: '/tutorials/installation' },
          { text: 'Quickstart', link: '/tutorials/quickstart' },
          { text: 'First Agent', link: '/tutorials/first-agent' },
        ],
      },
      {
        text: 'How-To Guides',
        items: [
          { text: 'Create an Agent', link: '/how-to/create-agent' },
          { text: 'Integrate an API', link: '/how-to/integrate-api' },
          { text: 'Deploy a Project', link: '/how-to/deploy-project' },
          { text: 'Debug Agents', link: '/how-to/debug-agents' },
        ],
      },
      {
        text: 'Concepts / Explanations',
        items: [
          { text: 'Architecture Overview', link: '/explanations/architecture-overview' },
          { text: 'Agent Lifecycle', link: '/explanations/agent-lifecycle' },
          { text: 'Domain Model', link: '/explanations/domain-model' },
          { text: 'Token Economy', link: '/explanations/token-economy' },
          { text: 'System Boundaries', link: '/explanations/system-boundaries' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Configuration', link: '/reference/configuration' },
          { text: 'Environment Variables', link: '/reference/environment-variables' },
          { text: 'CLI', link: '/reference/cli' },
          { text: 'API Overview', link: '/reference/api-overview' },
          { text: 'Events', link: '/reference/events' },
        ],
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Domain Map', link: '/architecture/domain-map' },
          { text: 'Module Boundaries', link: '/architecture/module-boundaries' },
          { text: 'Runtime Flows', link: '/architecture/runtime-flows' },
          { text: 'Event-Driven Architecture', link: '/architecture/event-driven-architecture' },
        ],
      },
      {
        text: 'Community',
        items: [
          { text: 'Contributing', link: '/community/contributing' },
          { text: 'Branching', link: '/community/branching' },
          { text: 'Code of Conduct', link: '/community/code-of-conduct' },
          { text: 'Security', link: '/community/security' },
          { text: 'Support', link: '/community/support' },
          { text: 'Contributors', link: '/community/contributors' },
        ],
      },
    ],
  },
})
