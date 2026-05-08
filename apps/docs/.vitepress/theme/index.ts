import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './style.css'
import MermaidDiagram from './MermaidDiagram.vue'
import CopyPageButton from './CopyPageButton.vue'
import DocsLogo from './DocsLogo.vue'
import FeedbackButton from './FeedbackButton.vue'
import WaitingListButton from './WaitingListButton.vue'
import DocsFooter from './DocsFooter.vue'
import HotLenses from './HotLenses.vue'
import AiLenserFamily from './AiLenserFamily.vue'

export default {
  ...DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-before': () => h(CopyPageButton),
      'layout-bottom': () => [
        h(DocsFooter),
        h(FeedbackButton),
        h(WaitingListButton),
      ],
    })
  },
  enhanceApp(ctx) {
    DefaultTheme.enhanceApp?.(ctx)
    ctx.app.component('MermaidDiagram', MermaidDiagram)
    ctx.app.component('DocsLogo', DocsLogo)
    ctx.app.component('HotLenses', HotLenses)
    ctx.app.component('AiLenserFamily', AiLenserFamily)
  },
} satisfies Theme
