import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@lenserfight/features/auth/native'
import { HeaderIconButton, StackHeader } from '@lenserfight/ui/layout/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import { Tabs, useRouter } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet } from 'react-native'

import { useAuthSheet } from '../../context/AuthSheetContext'
import { useLensSheet } from '../../context/LensSheetContext'
import { useThreadSheet } from '../../context/ThreadSheetContext'

export default function TabsLayout() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const theme = useNativeTheme()
  const { open: openAuthSheet } = useAuthSheet()
  const { open: openThreadSheet } = useThreadSheet()
  const { open: openLensSheet } = useLensSheet()
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
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.surface.border,
          shadowOpacity: 0,
          elevation: 0,
        },
      }}
    >
      <Tabs.Screen
        name="tags"
        options={{
          title: t('tabs.tags'),
          headerLeft: () => null,
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
          headerLeft: () => null,
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'telescope' : 'telescope-outline'}
              size={22}
              color={focused ? iconActive : iconColor}
            />
          ),
          headerRight: () => (
            <HeaderIconButton
              icon="add-outline"
              onPress={withAuth(() => openLensSheet())}
              accessibilityLabel={t('actions.newLens')}
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
            withAuth(() => openThreadSheet())()
          },
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.threads'),
          headerLeft: () => null,
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
              onPress={withAuth(() => openThreadSheet())}
              accessibilityLabel={t('actions.newThread')}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          headerLeft: () => null,
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={22}
              color={focused ? iconActive : iconColor}
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
