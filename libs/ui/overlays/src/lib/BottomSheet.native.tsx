/**
 * BottomSheet.native.tsx — Bottom sliding sheet for React Native.
 *
 * Uses RN Modal with slide-up animation. Drag-to-dismiss requires
 * react-native-gesture-handler (not installed) and is deferred.
 * Close via the close button or the drag handle area (tap to dismiss).
 *
 * Shares the same prop interface as the web BottomSheet.
 */
import React, { useEffect } from 'react'
import { BackHandler, Modal, StyleSheet, View } from 'react-native'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import { Text } from '@lenserfight/ui/primitives/native'
import { Pressable } from '@lenserfight/ui/primitives/native'
import { Backdrop } from './Backdrop.native'

export interface BottomSheetProps {
  open: boolean
  onClose?: () => void
  title?: string
  /** Not directly applicable on native (sheet auto-sizes). Kept for API compat. */
  maxHeight?: string
  children: React.ReactNode
  dismissOnBackdrop?: boolean
  className?: string
}

/**
 * @example
 * <BottomSheet open={isOpen} onClose={close} title="Share">
 *   <ShareOptions />
 * </BottomSheet>
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  title,
  children,
  dismissOnBackdrop = true,
}) => {
  const { surface, radius, elevation } = useNativeTheme()
  const spec = elevation(4)

  useEffect(() => {
    if (!open) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose?.()
      return true
    })
    return () => sub.remove()
  }, [open, onClose])

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Backdrop — tap to dismiss */}
        <Backdrop visible onDismiss={dismissOnBackdrop ? onClose : undefined} />

        {/* Sheet panel */}
        <View
          style={[
            styles.panel,
            {
              backgroundColor: surface.raised,
              borderTopLeftRadius: radius['2xl'],
              borderTopRightRadius: radius['2xl'],
              shadowColor: spec.iosShadow.color,
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: spec.iosShadow.opacity,
              shadowRadius: spec.iosShadow.radius,
              elevation: spec.androidElevation,
            },
          ]}
          accessible
          accessibilityViewIsModal
        >
          {/* Drag handle (decorative) */}
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: surface.border }]} />
          </View>

          {/* Header */}
          {(title || onClose) && (
            <View style={[styles.header, { borderBottomColor: surface.border }]}>
              {title && (
                <Text variant="h4" weight="semibold">
                  {title}
                </Text>
              )}
              {onClose && (
                <Pressable onPress={onClose} accessibilityLabel="Close" style={styles.closeBtn}>
                  <Text variant="bodyL" color="muted">
                    ✕
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>{children}</View>
        </View>
      </View>
    </Modal>
  )
}

BottomSheet.displayName = 'BottomSheet'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  panel: {
    maxHeight: '80%',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
})
