/**
 * SelectField.native.tsx — stub (web-only component)
 *
 * Uses HTML <select>. On mobile, use a BottomSheet-based Picker at the feature layer.
 * Renders null to prevent Metro bundler failures from shared imports.
 */
import React from 'react'

export interface SelectFieldProps { [key: string]: unknown }
export const SelectField: React.FC<SelectFieldProps> = () => null
SelectField.displayName = 'SelectField'
