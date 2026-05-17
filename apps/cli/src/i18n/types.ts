/**
 * LenserFight CLI i18n quote system.
 *
 * Lenser persona quotes for onboarding, progress, and ceremony moments.
 * Stored statically per locale — no runtime fetch required.
 */

export type LenserPersona =
  | 'developer'
  | 'judge'
  | 'creator'
  | 'founder'
  | 'operator'
  | 'strategist'

export type QuoteContext =
  | 'onboarding.init'
  | 'onboarding.auth'
  | 'onboarding.gateway'
  | 'onboarding.provider'
  | 'onboarding.first-lens'
  | 'onboarding.first-battle'
  | 'onboarding.complete'
  | 'doctor.success'
  | 'doctor.warning'
  | 'battle.created'
  | 'battle.joined'
  | 'battle.finalized'
  | 'gateway.connected'
  | 'provider.detected'
  | 'spec.validated'
  | 'workflow.completed'
  | 'team.created'
  | 'publish.success'
  | 'update.available'

export interface LenserQuote {
  id: string
  persona: LenserPersona
  context: QuoteContext
  text: string
  icon?: string
}

export type Locale = 'en' | 'tr' | 'es' | 'fr' | 'de' | 'zh'

export type QuoteRegistry = Record<Locale, LenserQuote[]>
