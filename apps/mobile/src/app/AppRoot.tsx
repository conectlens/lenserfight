import '../i18n'

import React, { useEffect, useMemo, useState } from 'react'
import { Linking, StatusBar, useColorScheme, View } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { PostHogProvider } from 'posthog-react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { AuthProvider, useAuth } from '@lenserfight/features/auth/native'
import { LenserProvider } from '@lenserfight/features/profile/native'
import { BottomNavigation } from '@lenserfight/ui/layout/native'
import { OfflineBanner } from '@lenserfight/ui/feedback/native'
import { NativeThemeProvider, useNativeTheme } from '@lenserfight/ui/providers/native'
import { useTranslation } from 'react-i18next'
import { PUBLIC_POSTHOG_PROJECT_TOKEN, PUBLIC_POSTHOG_HOST } from '@lenserfight/utils/env'
import { LoginScreen, MagicLinkScreen, RegisterScreen } from '../features/auth/AuthScreens'
import { BattleDetailScreen, BattleListScreen } from '../features/content/BattleScreens'
import { LensDetailScreen, LensListScreen } from '../features/content/LensScreens'
import { TagDetailScreen, TagListScreen } from '../features/content/TagScreens'
import { ThreadDetailScreen, ThreadListScreen } from '../features/content/ThreadScreens'
import { ProfileScreen } from '../features/profile/ProfileScreen'
import { useMobileNavigation, parseDeepLink } from '../navigation/useMobileNavigation'
import type { MainTab } from '../navigation/types'
import { LoadingState } from '../ui/StateViews'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 3,
    },
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

const MobileExperience: React.FC = () => {
  const { t } = useTranslation()
  const auth = useAuth()
  const theme = useNativeTheme()
  const isOffline = useIsOffline()
  const initialRoute = auth.isAuthenticated
    ? ({ name: 'main', tab: 'threads' as MainTab } as const)
    : ({ name: 'login' } as const)
  const navigator = useMobileNavigation(initialRoute)

  useEffect(() => {
    if (auth.isAuthenticated && ['login', 'magicLink', 'register'].includes(navigator.route.name)) {
      navigator.goTab('threads')
    }
  }, [auth.isAuthenticated, navigator])

  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      const route = parseDeepLink(url)
      if (!route) return
      if (route.name === 'threadDetail') navigator.goThread(route.id)
      else if (route.name === 'lensDetail') navigator.goLens(route.id)
      else if (route.name === 'tagDetail') navigator.goTag(route.slug)
      else if (route.name === 'battleDetail') navigator.goBattle(route.id)
      else if (route.name === 'magicLink') navigator.goMagicLink()
    }
    const sub = Linking.addEventListener('url', handleUrl)
    Linking.getInitialURL().then((url) => { if (url) handleUrl({ url }) })
    return () => sub.remove()
  }, [navigator])

  const iconColor = theme.surface.textMuted
  const iconActive = theme.active

  const navItems = useMemo(
    () => [
      {
        key: 'threads',
        label: t('tabs.threads'),
        icon: <Ionicons name="chatbubbles-outline" size={22} color={iconColor} />,
        activeIcon: <Ionicons name="chatbubbles" size={22} color={iconActive} />,
      },
      {
        key: 'lenses',
        label: t('tabs.lenses'),
        icon: <Ionicons name="telescope-outline" size={22} color={iconColor} />,
        activeIcon: <Ionicons name="telescope" size={22} color={iconActive} />,
      },
      {
        key: 'tags',
        label: t('tabs.tags'),
        icon: <Ionicons name="pricetag-outline" size={22} color={iconColor} />,
        activeIcon: <Ionicons name="pricetag" size={22} color={iconActive} />,
      },
      {
        key: 'battles',
        label: t('tabs.battles'),
        icon: <Ionicons name="flash-outline" size={22} color={iconColor} />,
        activeIcon: <Ionicons name="flash" size={22} color={iconActive} />,
      },
      {
        key: 'profile',
        label: t('tabs.profile'),
        icon: <Ionicons name="person-circle-outline" size={22} color={iconColor} />,
        activeIcon: <Ionicons name="person-circle" size={22} color={iconActive} />,
      },
    ],
    [t, iconColor, iconActive]
  )

  if (auth.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.surface.base }}>
        <LoadingState label={t('app.loading')} />
      </View>
    )
  }

  if (!auth.isAuthenticated) {
    if (navigator.route.name === 'magicLink') {
      return (
        <MagicLinkScreen
          onAuthenticated={() => navigator.goTab('threads')}
          onLogin={navigator.goLogin}
          onMagicLink={navigator.goMagicLink}
          onRegister={navigator.goRegister}
        />
      )
    }
    if (navigator.route.name === 'register') {
      return (
        <RegisterScreen
          onAuthenticated={() => navigator.goTab('threads')}
          onLogin={navigator.goLogin}
          onMagicLink={navigator.goMagicLink}
          onRegister={navigator.goRegister}
        />
      )
    }
    return (
      <LoginScreen
        onAuthenticated={() => navigator.goTab('threads')}
        onLogin={navigator.goLogin}
        onMagicLink={navigator.goMagicLink}
        onRegister={navigator.goRegister}
      />
    )
  }

  const route = navigator.route
  const mainTab = route.name === 'main' ? route.tab : null

  return (
    <View style={{ flex: 1, backgroundColor: theme.surface.base }}>
      <OfflineBanner isOffline={isOffline} />
      {route.name === 'main' && route.tab === 'threads' && <ThreadListScreen navigator={navigator} />}
      {route.name === 'main' && route.tab === 'lenses' && <LensListScreen navigator={navigator} />}
      {route.name === 'main' && route.tab === 'tags' && <TagListScreen navigator={navigator} />}
      {route.name === 'main' && route.tab === 'battles' && <BattleListScreen navigator={navigator} />}
      {route.name === 'main' && route.tab === 'profile' && (
        <ProfileScreen onSignedOut={navigator.goLogin} />
      )}
      {route.name === 'threadDetail' && <ThreadDetailScreen navigator={navigator} id={route.id} />}
      {route.name === 'lensDetail' && <LensDetailScreen navigator={navigator} id={route.id} />}
      {route.name === 'tagDetail' && <TagDetailScreen navigator={navigator} slug={route.slug} />}
      {route.name === 'battleDetail' && <BattleDetailScreen navigator={navigator} id={route.id} />}
      {mainTab && (
        <BottomNavigation
          items={navItems}
          activeKey={mainTab}
          onChange={(key) => navigator.goTab(key as MainTab)}
        />
      )}
    </View>
  )
}

const AppStatusBar: React.FC = () => {
  const colorScheme = useColorScheme()
  return <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
}

const AppInner: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <NativeThemeProvider>
      <AuthProvider>
        <LenserProvider>
          <AppStatusBar />
          <MobileExperience />
        </LenserProvider>
      </AuthProvider>
    </NativeThemeProvider>
  </QueryClientProvider>
)

export const AppRoot: React.FC = () => {
  if (!PUBLIC_POSTHOG_PROJECT_TOKEN) {
    return <AppInner />
  }
  return (
    <PostHogProvider
      apiKey={PUBLIC_POSTHOG_PROJECT_TOKEN}
      options={{ host: PUBLIC_POSTHOG_HOST }}
    >
      <AppInner />
    </PostHogProvider>
  )
}

export default AppRoot
