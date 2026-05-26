interface ImportMetaEnv {
  readonly [key: string]: string | boolean | undefined
  readonly API_URL?: string
  readonly ARENA_URL?: string
  readonly AUTH_BASE_URL?: string
  readonly CAPTCHA_SITE_KEY?: string
  readonly CHAINABIT_API_URL?: string
  readonly CHAINABIT_APP_URL?: string
  readonly DATA_SOURCE?: string
  readonly DOCS_BASE_URL?: string
  readonly ENV_MODE?: string
  readonly GA_MEASUREMENT_ID?: string
  readonly EXPO_PUBLIC_POSTHOG_HOST?: string
  readonly EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN?: string
  readonly SUPABASE_PUBLIC_URL?: string
  readonly SUPABASE_PUBLISHABLE_KEY?: string
  readonly SUPABASE_URL?: string
  readonly WEB_BASE_URL?: string
  readonly DEV: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}
