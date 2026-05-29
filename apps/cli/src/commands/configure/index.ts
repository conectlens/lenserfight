import { defineCommand } from 'citty'

/**
 * Developer configuration hub: local BYOK files, cloud BYOK vault, Ollama, providers.
 */
export default defineCommand({
  meta: {
    name: 'configure',
    description:
      'Configure credentials and runtimes: local keys file, cloud BYOK, Ollama, providers.',
  },
  subCommands: {
    keys: () => import('../keys').then((m) => m.default),
    byok: () => import('../byok').then((m) => m.default),
    providers: () => import('../providers').then((m) => m.default),
    ollama: () => import('./ollama').then((m) => m.default),
    env: () => import('../env').then((m) => m.default),
    'local-battle-key': () => import('../config-local-battle-key').then((m) => m.default),
  },
})
