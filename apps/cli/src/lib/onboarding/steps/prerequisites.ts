import { detectDocker, detectNode, detectOllama, detectSupabaseCli } from '../detect'
import type { OnboardingStep } from '../schema'

export const detectPrerequisitesStep: OnboardingStep = {
  id: 'detect_prerequisites',
  label: 'Detect prerequisites',
  async run(options) {
    const node = detectNode()
    if (!node.ok) throw new Error(`Node.js ${node.detail}`)

    if (options.mode === 'local') {
      const supabase = detectSupabaseCli()
      if (!supabase.ok) throw new Error(supabase.detail)

      const docker = detectDocker()
      if (!docker.ok) throw new Error(docker.detail)
    }

    if (options.ollama) {
      const ollama = await detectOllama(options.ollamaBaseUrl)
      if (!ollama.ok) throw new Error(ollama.detail)
    }

    return {
      id: 'detect_prerequisites',
      status: 'completed',
      detail: 'Environment prerequisites look good',
    }
  },
}
