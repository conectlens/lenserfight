/**
 * OAuthButtonGroup.native.tsx — stub (web-only component)
 *
 * The web version uses import.meta.env and DOM/Tailwind which are not
 * supported by Hermes / Metro. Native OAuth is handled by OAuthButtons
 * in apps/mobile. Renders null to prevent Metro bundler failures.
 */
import React from 'react'

export interface OAuthButtonGroupProps { [key: string]: unknown }
export const OAuthButtonGroup: React.FC<OAuthButtonGroupProps> = () => null
OAuthButtonGroup.displayName = 'OAuthButtonGroup'
