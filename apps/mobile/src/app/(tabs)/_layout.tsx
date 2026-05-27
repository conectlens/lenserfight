import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@lenserfight/features/auth/native'
import { HeaderIconButton, StackHeader } from '@lenserfight/ui/layout/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import { Tabs, useRouter } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useAuthSheet } from '../../context/AuthSheetContext'

export default function TabsLayout() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const theme = useNativeTheme()
  const { open: openAuthSheet } = useAuthSheet()
  const router = useRouter()

  const iconColor = theme.surface.textMuted
  const iconActive = theme.active

  /** Guard for actions that require authentication. */
  const withAuth = (action: () => void) => () => {
    if (!isAuthenticated) {
      openAuthSheet('login')
    } else {
      action()
    }
  }

  return (
    <Tabs
      screenOptions={{
        // Custom header for all tab screens — title + right action per tab.
        headerShown: true,
        header: (props) => <StackHeader {...props} />,
        tabBarActiveTintColor: iconActive,
        tabBarInactiveTintColor: iconColor,
        tabBarStyle: {
          backgroundColor: theme.surface.base,
          borderTopColor: theme.surface.border,
        },
      }}
    >
      <Tabs.Screen
        name="tags"
        options={{
          title: t('tabs.tags'),
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'pricetag' : 'pricetag-outline'}
              size={22}
              color={focused ? iconActive : iconColor}
            />
          ),
          headerRight: () => (
            <HeaderIconButton
              icon="search-outline"
              onPress={() => router.push('/search/tags' as never)}
              accessibilityLabel={t('actions.search')}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="lenses"
        options={{
          title: t('tabs.lenses'),
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'telescope' : 'telescope-outline'}
              size={22}
              color={focused ? iconActive : iconColor}
            />
          ),
          headerRight: () => (
            <HeaderIconButton
              icon="search-outline"
              onPress={() => router.push('/search/lenses' as never)}
              accessibilityLabel={t('actions.search')}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name="add-circle"
              size={28}
              color={focused ? iconActive : iconColor}
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault()
            withAuth(() => router.push('/thread/create' as never))()
          },
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.threads'),
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              size={22}
              color={focused ? iconActive : iconColor}
            />
          ),
          headerRight: () => (
            <HeaderIconButton
              icon="create-outline"
              onPress={withAuth(() => router.push('/thread/create' as never))}
              accessibilityLabel={t('actions.newThread')}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={22}
              color={focused ? iconActive : iconColor}
            />
          ),
          headerRight: () => (
            <HeaderIconButton
              icon="settings-outline"
              onPress={withAuth(() => router.push('/settings' as never))}
              accessibilityLabel={t('actions.settings')}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="battles"
        options={{
          href: null,
        }}
      />
    </Tabs>
  )
}
