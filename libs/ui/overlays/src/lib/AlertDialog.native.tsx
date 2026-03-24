/**
 * AlertDialog.native.tsx — Confirmation dialog for React Native.
 *
 * Extends Dialog with confirm/cancel action buttons.
 */
import React from 'react'
import type { ViewStyle } from 'react-native'
import { Dialog } from './Dialog.native'
import { Pressable } from '@lenserfight/ui/primitives'
import { Text } from '@lenserfight/ui/primitives'
import { useNativeTheme } from '@lenserfight/ui/providers'
import { View, StyleSheet } from 'react-native'

export interface AlertDialogProps {
  open:              boolean
  onClose:           () => void
  onConfirm:         () => void
  title:             string
  description?:      string
  confirmLabel?:     string
  cancelLabel?:      string
  destructive?:      boolean
  loading?:          boolean
  style?:            ViewStyle
}

/**
 * @example
 * <AlertDialog
 *   open={confirmDelete}
 *   onClose={cancel}
 *   onConfirm={deletePost}
 *   title="Delete post?"
 *   destructive
 * />
 */
export const AlertDialog: React.FC<AlertDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  destructive,
  loading,
  style,
}) => {
  const { active, radius } = useNativeTheme()
  const confirmColor = destructive ? '#ea3942' : active

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      dismissOnBackdrop={false}
      style={style}
      footer={
        <View style={styles.actions}>
          <Pressable
            onPress={onClose}
            accessibilityLabel={cancelLabel}
            style={[styles.btn, styles.cancelBtn]}
          >
            <Text variant="bodyS" weight="medium" color="muted">{cancelLabel}</Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            disabled={loading}
            accessibilityLabel={confirmLabel}
            style={[styles.btn, { backgroundColor: confirmColor, borderRadius: radius.lg }]}
          >
            <Text variant="bodyS" weight="semibold" style={{ color: '#ffffff' }}>
              {loading ? '…' : confirmLabel}
            </Text>
          </Pressable>
        </View>
      }
    />
  )
}

AlertDialog.displayName = 'AlertDialog'

const styles = StyleSheet.create({
  actions: {
    flexDirection:  'row',
    gap:             8,
    justifyContent: 'flex-end',
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical:   10,
  },
  cancelBtn: {
    borderRadius: 8,
  },
})
