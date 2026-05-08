import { BookOpen, ExternalLink } from 'lucide-react'
import React from 'react'
import { DOCS_BASE_URL } from '@lenserfight/utils/env'

export interface HelpButtonProps {
  /** Relative docs path, e.g. '/tutorials/walkthroughs/create-a-lens' */
  path: string
  label?: string
  className?: string
}

/**
 * Renders a pill link to a specific docs page.
 * Callers own the path — this component is path-agnostic (GRASP: Information Expert).
 */
export const HelpButton: React.FC<HelpButtonProps> = ({ path, label = 'Getting Started', className = '' }) => (
  <a
    href={`${DOCS_BASE_URL}${path}`}
    target="_blank"
    rel="noopener noreferrer"
    className={`inline-flex items-center gap-1.5 rounded-full border border-surface-border px-3 py-1.5 text-xs font-medium text-greyscale-500 transition-colors hover:border-primary-yellow-500 hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:border-primary-yellow-500 dark:hover:text-greyscale-0 ${className}`}
  >
    <BookOpen size={12} />
    {label}
    <ExternalLink size={10} />
  </a>
)
