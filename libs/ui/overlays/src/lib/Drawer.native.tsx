/**
 * Drawer.native.tsx — Side drawer for React Native.
 *
 * Animated slide from the left (or right). No gesture dragging in MVP;
 * add react-native-gesture-handler in a future phase for swipe-to-close.
 */
import React, { useEffect, useRef } from 'react'
import { Animated, BackHandler, Modal, StyleSheet, View } from 'react-native'
import type { ViewStyle } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers'
import { Backdrop } from './Backdrop.native'

export interface DrawerProps {
  open:                boolean
  onClose?:            () => void
  side?:               'left' | 'right'
  /** Drawer width in pixels. Default: 280 */
  width?:              number
  children:            React.ReactNode
  footer?:              React.ReactNode
  dismissOnBackdrop?:  boolean
}

/**
 * @example
 * <Drawer open={menuOpen} onClose={close}>
 *   <NavMenu />
 * </Drawer>
 */
export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  side    = 'left',
  width   = 280,
  children,
  footer,
  dismissOnBackdrop = true,
}) => {
  const { surface, elevation } = useNativeTheme()
  const spec    = elevation(4)
  const translate = useRef(new Animated.Value(side === 'left' ? -width : width)).current

  useEffect(() => {
    Animated.timing(translate, {
      toValue:         open ? 0 : (side === 'left' ? -width : width),
      duration:        250,
      useNativeDriver: true,
    }).start()
  }, [open, width, side, translate])

  useEffect(() => {
    if (!open) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose?.()
      return true
    })
    return () => sub.remove()
  }, [open, onClose])

  const shadowStyle: ViewStyle = {
    shadowColor:   spec.iosShadow.color,
    shadowOffset:  { width: side === 'left' ? 4 : -4, height: 0 },
    shadowOpacity: spec.iosShadow.opacity,
    shadowRadius:  spec.iosShadow.radius,
    elevation:     spec.androidElevation,
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <Backdrop visible onDismiss={dismissOnBackdrop ? onClose : undefined} />

        <Animated.View
          style={[
            styles.panel,
            shadowStyle,
            {
              width,
              backgroundColor: surface.base,
              [side]:          0,
              transform:       [{ translateX: translate }],
            },
          ]}
          accessible
          accessibilityViewIsModal
        >
          {children}
          {footer && <View>{footer}</View>}
        </Animated.View>
      </View>
    </Modal>
  )
}

Drawer.displayName = 'Drawer'

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  panel: {
    position:    'absolute',
    top:         0,
    bottom:      0,
    overflow:    'hidden',
  },
})
