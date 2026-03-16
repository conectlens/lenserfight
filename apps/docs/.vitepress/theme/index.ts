import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './style.css'
import MermaidDiagram from './MermaidDiagram.vue'

export default {
  ...DefaultTheme,
  enhanceApp(ctx) {
    DefaultTheme.enhanceApp?.(ctx)
    ctx.app.component('MermaidDiagram', MermaidDiagram)
  },
} satisfies Theme
