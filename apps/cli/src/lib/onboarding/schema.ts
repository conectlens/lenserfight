export type SetupMode = 'local' | 'cloud'

export type OnboardingStepId =
  // env setup steps (used by lf setup --mode local|cloud)
  | 'detect_prerequisites'
  | 'verify_workspace'
  | 'configure_project'
  | 'configure_env'
  | 'start_services'
  | 'verify_auth'
  | 'handoff'
  // product journey steps (used by lf setup --mode journey)
  | 'lens_created'
  | 'workflow_created'
  | 'agent_created'
  | 'team_created'
  | 'battle_created'
  | 'battle_joined'
  | 'invite_sent'
  | 'battle_result_shared'
  | 'profile_published'

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
