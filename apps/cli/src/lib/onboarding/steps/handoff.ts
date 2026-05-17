import type { OnboardingStep } from '../schema'
import { getQuote, formatQuote } from '../../../i18n'

export const handoffStep: OnboardingStep = {
  id: 'handoff',
  label: 'Print next steps',
  async run(options) {
    const quote = formatQuote(getQuote('onboarding.complete'))
    const suffix = quote ? `\n  ${quote}` : ''
    return {
      id: 'handoff',
      status: 'completed',
      detail: options.mode === 'local'
        ? `Run \`pnpm nx run web:serve\` and \`lf doctor\` next${suffix}`
        : `Run \`lf auth login\`, \`lf doctor --mode cloud\`, and then your target app${suffix}`,
    }
  },
}
