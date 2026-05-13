import type React from 'react'
import type { AppError } from '../types'

export interface ErrorRendererProps {
  error: AppError
  onDismiss?: () => void
  onRetry?: () => void
}

export type ErrorRenderer = React.ComponentType<ErrorRendererProps>

export interface ErrorRegistryEntry {
  renderer: ErrorRenderer
  defaultZone: 'full-page' | 'banner' | 'inline' | 'toast-only'
  blocking: boolean
}

export type ErrorRegistry = Partial<Record<string, ErrorRegistryEntry>>
