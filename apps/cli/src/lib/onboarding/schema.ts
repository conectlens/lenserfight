export type SetupMode = 'local' | 'cloud'

export type OnboardingStepId =
  | 'detect_prerequisites'
  | 'verify_workspace'
  | 'configure_project'
  | 'configure_env'
  | 'start_services'
  | 'verify_auth'
  | 'handoff'

export interface SetupOptions {
  mode: SetupMode
  dryRun: boolean
  nonInteractive: boolean
  resume: boolean
  skipDb: boolean
  skipAuth: boolean
  skipOpen: boolean
  ollama: boolean
  ollamaBaseUrl?: string
  json: boolean
  verbose: boolean
}

export interface OnboardingStepResult {
  id: OnboardingStepId
  status: 'completed' | 'skipped'
  detail: string
}

export interface OnboardingStep {
  id: OnboardingStepId
  label: string
  shouldSkip?(options: SetupOptions): boolean
  run(options: SetupOptions): Promise<OnboardingStepResult>
}
