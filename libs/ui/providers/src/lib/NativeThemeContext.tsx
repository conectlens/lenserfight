/**
 * NativeThemeContext.tsx — web stub.
 *
 * On web, the real implementation lives in NativeThemeContext.native.tsx.
 * Metro picks the .native.tsx file for React Native bundles automatically.
 *
 * This stub provides the same API surface so that shared TypeScript code
 * can import { useNativeTheme, NativeThemeProvider } without breaking the
 * web bundle.
 */
import React from 'react'
import {
  resolveNativeTheme,
  type NativeThemeTokens,
  type ColorScheme,
} from '@lenserfight/ui/tokens'

export type { NativeThemeTokens, ColorScheme }

export interface NativeThemeProviderProps {
  userPreference?: 'light' | 'dark' | 'system'
  children: React.ReactNode
}

/** No-op on web — children rendered as-is */
export const NativeThemeProvider: React.FC<NativeThemeProviderProps> = ({ children }) => (
  <>{children}</>
)

/** Returns a static light-mode token set on web (tokens are pure TS, no RN APIs). */
export function useNativeTheme(): NativeThemeTokens {
  return resolveNativeTheme('light')
}
