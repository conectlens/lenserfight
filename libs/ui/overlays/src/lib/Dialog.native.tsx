/**
 * Dialog.native.tsx — Modal dialog for React Native.
 *
 * Uses RN's built-in Modal with transparent background and fade animation.
 * Android hardware back button closes the dialog via BackHandler.
 */
import React, { useEffect } from 'react'
import { BackHandler, Modal, StyleSheet, View } from 'react-native'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers'
import { Text } from '@lenserfight/ui/primitives'
import { Pressable } from '@lenserfight/ui/primitives'
import { Backdrop } from './Backdrop.native'

export interface DialogProps {
  open:                boolean
  onClose?:            () => void
  title?:              string
  description?:        string
  children?:           React.ReactNode
  /** Footer slot — typically action buttons */
  footer?:             React.ReactNode
  dismissOnBackdrop?:  boolean
  style?:              ViewStyle
}

/**
 * @example
 * <Dialog open={isOpen} onClose={close} title="Confirm action">
 *   <Text>Are you sure?</Text>
 * </Dialog>
 */
export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissOnBackdrop = true,
  style,
}) => {
  const { surface, radius, elevation } = useNativeTheme()
  const spec = elevation(3)

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
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Backdrop visible onDismiss={dismissOnBackdrop ? onClose : undefined} />

        <View
          style={[
            styles.panel,
            {
              backgroundColor: surface.overlay,
              borderRadius:    radius['2xl'],
              shadowColor:     spec.iosShadow.color,
              shadowOffset:    spec.iosShadow.offset,
              shadowOpacity:   spec.iosShadow.opacity,
              shadowRadius:    spec.iosShadow.radius,
              elevation:       spec.androidElevation,
            },
            style,
          ]}
          accessible
          accessibilityViewIsModal
        >
          {/* Header */}
          {(title || onClose) && (
            <View style={styles.header}>
              {title && <Text variant="h4" weight="semibold">{title}</Text>}
              {description && (
                <Text variant="bodyS" color="muted" style={{ marginTop: 4 }}>{description}</Text>
              )}
              {onClose && (
                <Pressable
                  onPress={onClose}
                  accessibilityLabel="Close dialog"
                  style={styles.closeBtn}
                >
                  <Text variant="bodyL">✕</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Content */}
          {children && <View style={styles.content}>{children}</View>}

          {/* Footer */}
          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </View>
    </Modal>
  )
}

Dialog.displayName = 'Dialog'

const styles = StyleSheet.create({
  overlay: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        24,
  },
  panel: {
    width:    '100%',
    maxWidth: 480,
    overflow: 'hidden',
  },
  header: {
    padding:         20,
    paddingBottom:   12,
    flexDirection:   'row',
    alignItems:      'flex-start',
    flexWrap:        'wrap',
  },
  closeBtn: {
    marginLeft: 'auto',
    padding:    4,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom:     16,
  },
  footer: {
    padding:      16,
    borderTopWidth: 1,
    borderTopColor: '#dcdde0',
    flexDirection:  'row',
    gap:            8,
    justifyContent: 'flex-end',
  },
})
