/**
 * NativeThemeContext — React Native theme provider.
 *
 * Provides `useNativeTheme()` which returns resolved token objects
 * (raw hex colors, numeric spacing, elevation specs) for the current color scheme.
 *
 * Usage in apps/mobile:
 *   <NativeThemeProvider userPreference="system">
 *     <App />
 *   </NativeThemeProvider>
 *
 * Usage in components:
 *   const { surface, active, elevation } = useNativeTheme()
 */
import React, { createContext, useContext, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import {
  resolveNativeTheme,
  type ColorScheme,
  type NativeThemeTokens,
} from '@lenserfight/ui/tokens'

interface NativeThemeContextValue {
  tokens: NativeThemeTokens
}

const NativeThemeContext = createContext<NativeThemeContextValue | null>(null)

export interface NativeThemeProviderProps {
  /** User-persisted preference. 'system' follows the OS setting. */
  userPreference?: 'light' | 'dark' | 'system'
  children: React.ReactNode
}

/**
 * Wrap your app root with this provider.
 * The feature layer is responsible for reading/writing the preference to AsyncStorage.
 */
export const NativeThemeProvider: React.FC<NativeThemeProviderProps> = ({
  userPreference = 'system',
  children,
}) => {
  const systemScheme = useColorScheme() ?? 'light'

  const colorScheme: ColorScheme = useMemo(() => {
    if (userPreference === 'light') return 'light'
    if (userPreference === 'dark')  return 'dark'
    return systemScheme
  }, [userPreference, systemScheme])

  const tokens = useMemo(() => resolveNativeTheme(colorScheme), [colorScheme])

  return (
    <NativeThemeContext.Provider value={{ tokens }}>
      {children}
    </NativeThemeContext.Provider>
  )
}

/**
 * Returns the current resolved design tokens.
 * Falls back to light mode if no provider is mounted (safe default).
 */
export function useNativeTheme(): NativeThemeTokens {
  const ctx = useContext(NativeThemeContext)
  if (!ctx) {
    // Safe fallback — avoids crash outside provider
    return resolveNativeTheme('light')
  }
  return ctx.tokens
}
