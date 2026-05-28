/**
 * Breadcrumbs.native.tsx — stub (web navigation pattern)
 *
 * On mobile, the back button in TopAppBar replaces breadcrumb navigation.
 * Renders null to prevent Metro bundler failures from shared imports.
 */
import React from 'react'

export interface BreadcrumbsProps { [key: string]: unknown }
export const Breadcrumbs: React.FC<BreadcrumbsProps> = () => null
Breadcrumbs.displayName = 'Breadcrumbs'
