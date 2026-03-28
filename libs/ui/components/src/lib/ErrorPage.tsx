import React from 'react'

export type ErrorCode = 401 | 403 | 404 | 500 | 503

export interface ErrorPageActionProps {
  label: string
  onClick: () => void
}

export interface ErrorPageProps {
  code?: ErrorCode
  title?: string
  description?: string
  primaryAction?: ErrorPageActionProps
  secondaryAction?: ErrorPageActionProps
  className?: string
  /** Render inline inside a layout container instead of full-screen */
  inline?: boolean
}

interface ErrorMeta {
  title: string
  description: string
  blobClass: string
}

const errorDefaults: Record<ErrorCode, ErrorMeta> = {
  401: {
    title: 'Authentication Required',
    description: 'You need to sign in to access this page.',
    blobClass: 'bg-primary-yellow-500/10',
  },
  403: {
    title: 'Access Denied',
    description: "You don't have permission to view this page.",
    blobClass: 'bg-status-red/10',
  },
  404: {
    title: 'Page Not Found',
    description: "The page you're looking for doesn't exist or has been moved.",
    blobClass: 'bg-primary-yellow-500/10',
  },
  500: {
    title: 'Something Went Wrong',
    description: "We're experiencing an internal error. Please try again later.",
    blobClass: 'bg-status-purple/10',
  },
  503: {
    title: 'Service Unavailable',
    description: "We're temporarily down for maintenance. Please check back soon.",
    blobClass: 'bg-greyscale-200 dark:bg-greyscale-800',
  },
}

function defaultPrimaryAction(code: ErrorCode): ErrorPageActionProps {
  return {
    label: code === 401 ? 'Sign In' : 'Go Back Home',
    onClick: () => {
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    },
  }
}

export function ErrorPage({
  code = 404,
  title,
  description,
  primaryAction,
  secondaryAction,
  className = '',
  inline = false,
}: ErrorPageProps) {
  const meta = errorDefaults[code]
  const resolvedTitle = title ?? meta.title
  const resolvedDescription = description ?? meta.description
  const resolvedPrimary = primaryAction ?? defaultPrimaryAction(code)

  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden bg-greyscale-25 px-6 dark:bg-primary-dark-700 ${inline ? 'w-full py-16' : 'min-h-screen py-20'} ${className}`}
    >
      {/* Decorative blob */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center ${meta.blobClass}`}
        aria-hidden="true"
      >
        <div className="h-80 w-80 rounded-full blur-3xl opacity-60" />
      </div>

      <div className="relative z-10 flex max-w-md flex-col items-center text-center">
        <p className="text-8xl font-extrabold tracking-tight text-deep-lens-navy-500 dark:text-greyscale-100 select-none">
          {code}
        </p>

        <h1 className="mt-4 text-2xl font-bold text-greyscale-900 dark:text-greyscale-50">
          {resolvedTitle}
        </h1>

        <p className="mt-2 text-base text-greyscale-500 dark:text-greyscale-400">
          {resolvedDescription}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={resolvedPrimary.onClick}
            className="rounded-xl bg-primary-yellow-500 px-5 py-2.5 text-sm font-semibold text-deep-lens-navy-500 transition-colors hover:bg-primary-yellow-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50"
          >
            {resolvedPrimary.label}
          </button>
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="rounded-xl border border-greyscale-300 bg-white px-5 py-2.5 text-sm font-semibold text-greyscale-700 transition-colors hover:bg-greyscale-50 dark:border-greyscale-700 dark:bg-primary-dark-500 dark:text-greyscale-300 dark:hover:bg-primary-dark-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
