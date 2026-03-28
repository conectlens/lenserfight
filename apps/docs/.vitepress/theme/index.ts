import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './style.css'
import MermaidDiagram from './MermaidDiagram.vue'
import CopyPageButton from './CopyPageButton.vue'
import DocsLogo from './DocsLogo.vue'

export default {
  ...DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-before': () => h(CopyPageButton),
    })
  },
  enhanceApp(ctx) {
    DefaultTheme.enhanceApp?.(ctx)
    ctx.app.component('MermaidDiagram', MermaidDiagram)
    ctx.app.component('DocsLogo', DocsLogo)
  },
} satisfies Theme
