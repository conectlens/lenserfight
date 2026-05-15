/**
 * Tabs.native.tsx — Tab navigation for React Native.
 *
 * TabList uses a horizontal ScrollView for overflow.
 * TabPanel hides with opacity+display trick to preserve scroll position.
 * Supports 'underline' and 'pills' variants matching the web API.
 */
import React, { useState, useId } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers'
import { Pressable } from '@lenserfight/ui/primitives'
import { Text } from '@lenserfight/ui/primitives'

export type TabsVariant = 'underline' | 'pills'

// ── Context ─────────────────────────────────────────────────────────────────

interface TabsContextValue {
  activeKey:  string
  onChange:   (key: string) => void
  variant:    TabsVariant
}

const TabsContext = React.createContext<TabsContextValue>({
  activeKey: '',
  onChange:  () => undefined,
  variant:   'underline',
})

// ── Tabs container ───────────────────────────────────────────────────────────

export interface TabsProps {
  defaultKey?: string
  activeKey?:  string
  onChange?:   (key: string) => void
  variant?:    TabsVariant
  style?:      ViewStyle
  children:    React.ReactNode
}

export const Tabs: React.FC<TabsProps> = ({
  defaultKey,
  activeKey: controlledKey,
  onChange,
  variant = 'underline',
  style,
  children,
}) => {
  const [internalKey, setInternalKey] = useState(defaultKey ?? '')
  const activeKey = controlledKey ?? internalKey

  const handleChange = (key: string) => {
    if (!controlledKey) setInternalKey(key)
    onChange?.(key)
  }

  return (
    <TabsContext.Provider value={{ activeKey, onChange: handleChange, variant }}>
      <View style={style}>{children}</View>
    </TabsContext.Provider>
  )
}

// ── TabList ──────────────────────────────────────────────────────────────────

export interface TabListProps {
  style?: ViewStyle
  children: React.ReactNode
}

export const TabList: React.FC<TabListProps> = ({ style, children }) => {
  const { variant } = React.useContext(TabsContext)
  const { surface } = useNativeTheme()

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabListContent}
      style={[
        styles.tabList,
        variant === 'underline' && { borderBottomWidth: 1, borderBottomColor: surface.border },
        style,
      ]}
    >
      {children}
    </ScrollView>
  )
}

// ── Tab ──────────────────────────────────────────────────────────────────────

export interface TabProps {
  tabKey:    string
  label:     string
  disabled?: boolean
  icon?:     React.ReactNode
}

export const Tab: React.FC<TabProps> = ({ tabKey, label, disabled, icon }) => {
  const { activeKey, onChange, variant } = React.useContext(TabsContext)
  const { active, surface } = useNativeTheme()
  const isActive = activeKey === tabKey

  return (
    <Pressable
      onPress={() => !disabled && onChange(tabKey)}
      disabled={disabled}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      style={[
        styles.tab,
        variant === 'pills' && isActive && {
          backgroundColor: active + '18',
          borderRadius:    20,
        },
      ]}
    >
      {icon && <View style={styles.tabIcon}>{icon}</View>}
      <Text
        variant="bodyS"
        weight={isActive ? 'semibold' : 'regular'}
        style={{ color: isActive ? active : surface.textMuted }}
      >
        {label}
      </Text>
      {variant === 'underline' && isActive && (
        <View style={[styles.indicator, { backgroundColor: active }]} />
      )}
    </Pressable>
  )
}

// ── TabPanel ─────────────────────────────────────────────────────────────────

export interface TabPanelProps {
  tabKey:    string
  style?:    ViewStyle
  children:  React.ReactNode
}

export const TabPanel: React.FC<TabPanelProps> = ({ tabKey, style, children }) => {
  const { activeKey } = React.useContext(TabsContext)
  const isActive = activeKey === tabKey

  // Use opacity 0 + pointerEvents none instead of unmounting to preserve scroll state
  return (
    <View
      style={[style, !isActive && styles.hidden]}
      pointerEvents={isActive ? 'auto' : 'none'}
      accessible={isActive}
    >
      {children}
    </View>
  )
}

Tabs.displayName    = 'Tabs'
TabList.displayName = 'TabList'
Tab.displayName     = 'Tab'
TabPanel.displayName = 'TabPanel'

const styles = StyleSheet.create({
  tabList: {
    flexGrow: 0,
  },
  tabListContent: {
    flexDirection: 'row',
  },
  tab: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: 16,
    paddingVertical:   10,
    position:         'relative',
  },
  tabIcon: {
    marginRight: 6,
  },
  indicator: {
    position: 'absolute',
    bottom:   0,
    left:     16,
    right:    16,
    height:   2,
    borderRadius: 1,
  },
  hidden: {
    opacity:  0,
    position: 'absolute',
    pointerEvents: 'none',
  },
})
