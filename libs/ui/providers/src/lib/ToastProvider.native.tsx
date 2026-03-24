/**
 * ToastProvider.native.tsx — Simple in-app toast system for React Native (mobile-only).
 *
 * Provides `useToast()` hook for showing transient notifications.
 * Uses a Modal-based queue. For a full-featured implementation,
 * integrate react-native-toast-message in a future phase.
 *
 * Wrap your app root with <ToastProvider> alongside <NativeThemeProvider>.
 */
import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Animated, Modal, StyleSheet, View } from 'react-native'
import { Text } from '@lenserfight/ui/primitives'
import { useNativeTheme } from './NativeThemeContext'

export type ToastVariant = 'default' | 'success' | 'error' | 'warning'

export interface ToastItem {
  id:       string
  message:  string
  variant?: ToastVariant
  duration?: number
}

interface ToastContextValue {
  show: (message: string, options?: Partial<Omit<ToastItem, 'id' | 'message'>>) => void
}

const ToastContext = createContext<ToastContextValue>({ show: () => undefined })

export function useToast(): ToastContextValue {
  return useContext(ToastContext)
}

const variantBg: Record<ToastVariant, string> = {
  default: '#1f2022',
  success: '#2eb773',
  error:   '#ea3942',
  warning: '#e8c645',
}

// ── Single toast renderer ────────────────────────────────────────────────────

const Toast: React.FC<{ item: ToastItem; onDone: (id: string) => void }> = ({
  item,
  onDone,
}) => {
  const opacity = useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    const duration = item.duration ?? 3000
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(duration),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDone(item.id))
  }, [item, opacity, onDone])

  const bg = variantBg[item.variant ?? 'default']

  return (
    <Animated.View style={[styles.toast, { backgroundColor: bg, opacity }]}>
      <Text variant="bodyS" weight="medium" style={{ color: '#ffffff' }}>
        {item.message}
      </Text>
    </Animated.View>
  )
}

// ── Provider ─────────────────────────────────────────────────────────────────

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((message: string, options?: Partial<Omit<ToastItem, 'id' | 'message'>>) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev.slice(-2), { id, message, ...options }])
  }, [])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toasts.length > 0 && (
        <View style={styles.container} pointerEvents="none">
          {toasts.map((toast) => (
            <Toast key={toast.id} item={toast} onDone={remove} />
          ))}
        </View>
      )}
    </ToastContext.Provider>
  )
}

ToastProvider.displayName = 'ToastProvider'

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom:   56,
    left:     16,
    right:    16,
    gap:       8,
    zIndex:   500,
    pointerEvents: 'none',
  },
  toast: {
    borderRadius:    12,
    paddingHorizontal: 16,
    paddingVertical:   12,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.2,
    shadowRadius:    8,
    elevation:       8,
  },
})
