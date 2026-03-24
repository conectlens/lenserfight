/**
 * Footer.native.tsx — stub (web-only component)
 *
 * The web Footer is a document-level construct not applicable on native.
 * Renders null to prevent Metro bundler failures from shared imports.
 */
import React from 'react'

export interface FooterProps {
  [key: string]: unknown
}

export const Footer: React.FC<FooterProps> = () => null
Footer.displayName = 'Footer'
