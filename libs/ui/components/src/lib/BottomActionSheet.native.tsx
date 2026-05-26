import React, { useEffect, useMemo, useRef } from 'react'
import {
  Animated,
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

export interface BottomActionSheetProps {
  visible: boolean
  onDismiss: () => void
  children: React.ReactNode
  testID?: string
  dismissAccessibilityLabel?: string
}

export const BottomActionSheet: React.FC<BottomActionSheetProps> = ({
  visible,
  onDismiss,
  children,
  testID,
  dismissAccessibilityLabel = 'Close',
}) => {
  const theme = useNativeTheme()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const sheetMaxHeight = height * 0.88
  const dismissDistance = sheetMaxHeight * 0.25
  const translateY = useRef(new Animated.Value(sheetMaxHeight)).current
  const backdropAlpha = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animations = visible
      ? [
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 26,
            stiffness: 210,
            mass: 1,
          }),
          Animated.timing(backdropAlpha, {
            toValue: 0.5,
            duration: 280,
            useNativeDriver: true,
          }),
        ]
      : [
          Animated.timing(translateY, {
            toValue: sheetMaxHeight,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(backdropAlpha, {
            toValue: 0,
            duration: 240,
            useNativeDriver: true,
          }),
        ]

    Animated.parallel(animations).start()
  }, [backdropAlpha, sheetMaxHeight, translateY, visible])

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) translateY.setValue(gesture.dy)
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > dismissDistance || gesture.vy > 0.6) {
            onDismiss()
            return
          }

          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 22,
            stiffness: 200,
          }).start()
        },
      }),
    [dismissDistance, onDismiss, translateY]
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

BottomActionSheet.displayName = 'BottomActionSheet'

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  flex: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  handle: {
    borderRadius: 2,
    height: 4,
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
