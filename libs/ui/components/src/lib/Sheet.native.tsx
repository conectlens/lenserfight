import React, { useEffect, useMemo, useRef } from 'react'
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native'
import type { ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNativeTheme } from '@lenserfight/ui/providers/native'

export interface SheetProps {
  visible: boolean
  onDismiss: () => void
  children: React.ReactNode
  testID?: string
  dismissAccessibilityLabel?: string
}

/**
 * Sheet — a bottom sheet that follows Apple Human Interface Guidelines.
 *
 * Presentation: Spring ease-out, sliding up from the bottom edge.
 * Dismissal:    Ease-in curve, sliding back down to the bottom edge.
 *
 * References:
 *   https://developer.apple.com/design/human-interface-guidelines/sheets
 */
export const Sheet: React.FC<SheetProps> = ({
  visible,
  onDismiss,
  children,
  testID,
  dismissAccessibilityLabel = 'Close',
}) => {
  const theme = useNativeTheme()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()

  // HIG: sheets reach at most ~90 % of the screen height
  const sheetMaxHeight = height * 0.88

  // 25 % drag distance or a fast flick triggers dismissal
  const dismissDistance = sheetMaxHeight * 0.25

  // Start off-screen (bottom)
  const translateY = useRef(new Animated.Value(sheetMaxHeight)).current
  const backdropAlpha = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      // ── Presentation ──────────────────────────────────────────────────────
      // Apple HIG: sheets use a spring curve when appearing so the motion
      // feels natural and responsive. The sheet "arrives" with slight
      // deceleration rather than a hard stop.
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          // Tuned to match UIKit's default sheet spring (≈ 0.7 damping ratio)
          damping: 28,
          stiffness: 240,
          mass: 1,
        }),
        Animated.timing(backdropAlpha, {
          toValue: 0.5,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      // ── Dismissal ─────────────────────────────────────────────────────────
      // Apple HIG: sheets use an accelerating (ease-in) curve when
      // disappearing so they "slip away" quickly and feel snappy.
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: sheetMaxHeight,
          duration: 280,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAlpha, {
          toValue: 0,
          duration: 240,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [backdropAlpha, sheetMaxHeight, translateY, visible])

  // ── Drag-to-dismiss gesture ────────────────────────────────────────────────
  const pan = useMemo(
    () =>
      PanResponder.create({
        // Only claim the gesture when the user is dragging downward more than
        // they are dragging sideways (prevents stealing horizontal scrolls)
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),

        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) translateY.setValue(gesture.dy)
        },

        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > dismissDistance || gesture.vy > 0.6) {
            // Flick or drag past threshold → dismiss with acceleration
            Animated.timing(translateY, {
              toValue: sheetMaxHeight,
              duration: 240,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }).start(onDismiss)
            return
          }

          // Otherwise snap back with a spring (same curve as presentation)
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 26,
            stiffness: 240,
          }).start()
        },
      }),
    [dismissDistance, onDismiss, sheetMaxHeight, translateY]
  )

  const elevation = theme.elevation(4)
  const sheetShadow: ViewStyle =
    Platform.OS === 'ios'
      ? {
          shadowColor: elevation.iosShadow.color,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: elevation.iosShadow.opacity,
          shadowRadius: elevation.iosShadow.radius,
        }
      : { elevation: elevation.androidElevation }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop — tapping it dismisses the sheet */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={dismissAccessibilityLabel}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: theme.colors.black,
                opacity: backdropAlpha,
              },
            ]}
          />
        </Pressable>

        {/* Sheet surface */}
        <Animated.View
          testID={testID}
          accessible
          accessibilityViewIsModal
          style={[
            styles.sheet,
            sheetShadow,
            {
              backgroundColor: theme.surface.base,
              borderTopLeftRadius: theme.radius['2xl'],
              borderTopRightRadius: theme.radius['2xl'],
              maxHeight: sheetMaxHeight,
              paddingBottom: Math.max(insets.bottom, theme.spacing[4]),
              transform: [{ translateY }],
            },
          ]}
        >
          {/* HIG: drag indicator ("grab handle") centered at the top */}
          <View {...pan.panHandlers} style={styles.handleArea}>
            <View style={[styles.handle, { backgroundColor: theme.surface.border }]} />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.content,
              {
                paddingBottom: theme.spacing[8],
                paddingHorizontal: theme.spacing[6],
              },
            ]}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

Sheet.displayName = 'Sheet'

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  flex: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  handle: {
    borderRadius: 2.5,
    height: 5,
    width: 36,
  },
  handleArea: {
    alignItems: 'center',
    paddingBottom: 8,
    paddingTop: 12,
  },
  sheet: {
    overflow: 'hidden',
  },
})
