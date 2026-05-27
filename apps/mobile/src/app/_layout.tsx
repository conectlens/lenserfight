import '../i18n'

import { AuthProvider, useAuth } from '@lenserfight/features/auth/native'
import { LenserProvider } from '@lenserfight/features/profile/native'
import { BottomActionSheet } from '@lenserfight/ui/components/native'
import { OfflineBanner } from '@lenserfight/ui/feedback/native'
import { StackHeader } from '@lenserfight/ui/layout/native'
import { NativeThemeProvider } from '@lenserfight/ui/providers/native'
import { PUBLIC_POSTHOG_PROJECT_TOKEN, PUBLIC_POSTHOG_HOST } from '@lenserfight/utils/env'
import NetInfo from '@react-native-community/netinfo'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { PostHogProvider } from 'posthog-react-native'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusBar, useColorScheme } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AuthSheetProvider, useAuthSheet } from '../context/AuthSheetContext'

import { LoginScreen } from '../features/auth/components/login'
import { MagicLinkScreen } from '../features/auth/components/magic-link'
import { RegisterScreen } from '../features/auth/components/register'

// Ensure deep links into detail routes still mount the (tabs) stack first.
export const unstable_settings = {
  initialRouteName: '(tabs)',
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 3 },
  },
})

function useIsOffline(): boolean {
  const [isOffline, setIsOffline] = useState(false)
  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false)
    })
  }, [])
  return isOffline
}

/**
 * Auth sheet overlay — lives at the root so it overlays all routes.
 * Auth state changes auto-close the sheet.
 */
const AuthSheetOverlay: React.FC = () => {
  const { t } = useTranslation()
  const { isOpen, mode, close, setMode } = useAuthSheet()
  const { isAuthenticated } = useAuth()

  // Auto-close when auth completes
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      const timer = setTimeout(close, 0)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isAuthenticated, isOpen, close])

  const sharedAuthProps = {
    onAuthenticated: close,
    onLogin: () => setMode('login'),
    onMagicLink: () => setMode('magicLink'),
    onRegister: () => setMode('register'),
  }

  const authContent =
    mode === 'magicLink' ? (
      <MagicLinkScreen {...sharedAuthProps} />
    ) : mode === 'register' ? (
      <RegisterScreen {...sharedAuthProps} />
    ) : (
      <LoginScreen {...sharedAuthProps} />
    )

  return (
    <BottomActionSheet
      visible={isOpen}
      onDismiss={close}
      dismissAccessibilityLabel={t('actions.close')}
      testID="auth-sheet"
    >
      {authContent}
    </BottomActionSheet>
  )
}

const AppStatusBar: React.FC = () => {
  const colorScheme = useColorScheme()
  return <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
}

const RootLayoutInner: React.FC = () => {
  const isOffline = useIsOffline()

  return (
    <>
      <AppStatusBar />
      <OfflineBanner isOffline={isOffline} />
      <Stack screenOptions={{ header: (props) => <StackHeader {...props} /> }}>
        {/* Tabs manages its own per-tab headers; suppress the root Stack header here */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <AuthSheetOverlay />
    </>
  )
}

function AppProviders({ children }: { children: React.ReactNode }) {
  const inner = (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NativeThemeProvider>
          <AuthProvider>
            <LenserProvider>
              <AuthSheetProvider>{children}</AuthSheetProvider>
            </LenserProvider>
          </AuthProvider>
        </NativeThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )

  if (PUBLIC_POSTHOG_PROJECT_TOKEN) {
    return (
      <PostHogProvider
        apiKey={PUBLIC_POSTHOG_PROJECT_TOKEN}
        options={{ host: PUBLIC_POSTHOG_HOST }}
      >
        {inner}
      </PostHogProvider>
    )
  }

  return inner
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootLayoutInner />
    </AppProviders>
  )
}
