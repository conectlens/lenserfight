import React from 'react'
import { registerErrorRenderer } from './registry'
import { UnauthorizedPage } from '../error-boundary/UnauthorizedPage'
import { ForbiddenPage } from '../error-boundary/ForbiddenPage'
import { NotFoundPage } from '../error-boundary/NotFoundPage'
import { ServerErrorPage } from '../error-boundary/ServerErrorPage'
import { NetworkErrorPage } from '../error-boundary/NetworkErrorPage'

// Bootstrap default registrations for all 9 existing error kinds.
// These mirror the switch statement in GlobalErrorRenderer exactly — behavior is identical.

registerErrorRenderer('unauthorized', {
  renderer: ({ onDismiss }) => React.createElement(UnauthorizedPage, { onDismiss }),
  defaultZone: 'full-page',
  blocking: true,
})

registerErrorRenderer('forbidden', {
  renderer: ({ error, onDismiss }) =>
    React.createElement(ForbiddenPage, { message: error.message, onDismiss }),
  defaultZone: 'full-page',
  blocking: true,
})

registerErrorRenderer('not_found', {
  renderer: ({ onDismiss }) => React.createElement(NotFoundPage, { onDismiss }),
  defaultZone: 'full-page',
  blocking: false,
})

registerErrorRenderer('server_error', {
  renderer: ({ error, onRetry }) =>
    React.createElement(ServerErrorPage, { message: error.message, onRetry }),
  defaultZone: 'full-page',
  blocking: false,
})

registerErrorRenderer('rate_limit', {
  renderer: ({ onRetry }) =>
    React.createElement(ServerErrorPage, {
      message: 'Too many requests. Please wait a moment before trying again.',
      onRetry,
    }),
  defaultZone: 'banner',
  blocking: false,
})

registerErrorRenderer('network', {
  renderer: ({ onRetry }) => React.createElement(NetworkErrorPage, { onRetry }),
  defaultZone: 'banner',
  blocking: false,
})

// 'api', 'constraint_violation', 'unknown' are not registered here —
// they fall through to the GenericErrorPage fallback in GlobalErrorRenderer,
// preserving the existing default-case behavior.
