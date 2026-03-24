/**
 * Paginator.native.tsx — stub (web pagination pattern)
 *
 * Page number pagination is replaced by infinite scroll on mobile.
 * Use FlatList's onEndReached for progressive loading.
 * Renders null to prevent Metro bundler failures from shared imports.
 */
import React from 'react'

export interface PaginatorProps { [key: string]: unknown }
export const Paginator: React.FC<PaginatorProps> = () => null
Paginator.displayName = 'Paginator'
