/**
 * BottomNavigation.native.tsx — Bottom tab bar for React Native.
 *
 * SafeAreaView-aware to avoid the home indicator on iPhone X+.
 * Badge support via absolutely positioned View.
 * Shares the same props interface as the web version.
 */
import React from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import { Pressable, Text } from '@lenserfight/ui/primitives/native'

export interface BottomNavItem {
  key:        string
  label:      string
  icon:       React.ReactNode
  activeIcon?: React.ReactNode
  badge?:     number | string
}

export interface BottomNavigationProps {
  items:     BottomNavItem[]
  activeKey: string
  onChange:  (key: string) => void
  style?:    ViewStyle
}

/**
 * @example
 * <BottomNavigation
 *   items={[
 *     { key: 'home', label: 'Home', icon: <HomeIcon /> },
 *     { key: 'arena', label: 'Arena', icon: <SwordIcon /> },
 *   ]}
 *   activeKey={tab}
 *   onChange={setTab}
 * />
 */
export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  items,
  activeKey,
  onChange,
  style,
}) => {
  const { surface, active, elevation } = useNativeTheme()
  const spec = elevation(3)

  const shadowStyle: ViewStyle = Platform.OS === 'ios'
    ? {
        shadowColor:   spec.iosShadow.color,
        shadowOffset:  { width: 0, height: -2 },
        shadowOpacity: spec.iosShadow.opacity,
        shadowRadius:  spec.iosShadow.radius,
      }
    : { elevation: spec.androidElevation }

  return (
    <SafeAreaView
      style={[
        { backgroundColor: surface.base },
        shadowStyle,
        style,
      ]}
    >
      <View
        style={[
          styles.bar,
          { borderTopColor: surface.border },
        ]}
        accessibilityRole="tablist"
      >
        {items.map((item) => {
          const isActive = item.key === activeKey
          const iconColor = isActive ? active : surface.textMuted

          return (
            <Pressable
              key={item.key}
              onPress={() => onChange(item.key)}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isActive }}
              style={styles.item}
              pressedOpacity={0.6}
            >
              {/* Icon + badge */}
              <View style={styles.iconWrap}>
                {isActive && item.activeIcon ? item.activeIcon : item.icon}

                {item.badge != null && (
                  <View style={styles.badge}>
                    <Text variant="label" weight="bold" style={{ color: '#ffffff', fontSize: 10 }}>
                      {typeof item.badge === 'number' && item.badge > 99 ? '99+' : String(item.badge)}
                    </Text>
                  </View>
                )}
              </View>

              <Text
                variant="label"
                style={{
                  color:      iconColor,
                  marginTop:  2,
                  fontWeight: isActive ? '600' : '400',
                }}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </SafeAreaView>
  )
}

BottomNavigation.displayName = 'BottomNavigation'

const styles = StyleSheet.create({
  bar: {
    flexDirection:  'row',
    alignItems:     'stretch',
    borderTopWidth: 1,
    minHeight:      56,
  },
  item: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
  },
  badge: {
    position:        'absolute',
    top:             -4,
    right:           -8,
    minWidth:        16,
    height:          16,
    borderRadius:    8,
    backgroundColor: '#ea3942',
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: 3,
  },
})
