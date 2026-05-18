import type { Plugin } from 'vite'
import { buildThemeInitScript } from './themeInitScript'

/**
 * Vite plugin that injects the theme-init IIFE as the very first element
 * inside <head> on every app that registers it.
 *
 * Usage in vite.config.mts:
 *   import { themeInitPlugin } from '../../libs/ui/theme/src/lib/viteThemePlugin'
 *   plugins: [..., themeInitPlugin()]
 */
export function themeInitPlugin(): Plugin {
  const script = buildThemeInitScript()
  return {
    name: 'lf-theme-init',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        return [
          {
            tag: 'script',
            children: script,
            injectTo: 'head-prepend',
          },
        ]
      },
    },
  }
}
