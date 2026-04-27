import type { OnboardingStep } from '../schema'

export const handoffStep: OnboardingStep = {
  id: 'handoff',
  label: 'Print next steps',
  async run(options) {
    return {
      id: 'handoff',
      status: 'completed',
      detail: options.mode === 'local'
        ? 'Run `pnpm nx run web:serve` and `lf doctor` next'
        : 'Run `lf auth login`, `lf doctor --mode cloud`, and then your target app',
    }
  },
}
