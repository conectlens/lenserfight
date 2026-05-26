import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { EmptyState, InlineNotice } from '@lenserfight/ui/feedback/native'
import { Text } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import { MobileButton } from './MobileButton.native'

export interface LoadingStateProps {
  label?: string
}

export interface EmptyContentStateProps {
  title: string
  description?: string
}

export interface ErrorStateProps {
  message?: string
  fallbackMessage: string
  retryLabel?: string
  onRetry?: () => void
}

export const LoadingState: React.FC<LoadingStateProps> = ({ label = 'Loading' }) => {
  const theme = useNativeTheme()

  return (
    <View style={[styles.center, { minHeight: theme.spacing[24] * 2.5 }]}>
      <ActivityIndicator size="large" color={theme.active} />
      <Text variant="bodyM" color="muted" align="center">
        {label}
      </Text>
    </View>
  )
}

export const EmptyContentState: React.FC<EmptyContentStateProps> = ({ title, description }) => (
  <EmptyState title={title} description={description} />
)

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  fallbackMessage,
  retryLabel,
  onRetry,
}) => (
  <View style={styles.notice}>
    <InlineNotice variant="error" message={message ?? fallbackMessage} />
    {onRetry && retryLabel && (
      <MobileButton label={retryLabel} onPress={onRetry} variant="secondary" />
    )}
  </View>
)

LoadingState.displayName = 'LoadingState'
EmptyContentState.displayName = 'EmptyContentState'
ErrorState.displayName = 'ErrorState'

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
  },
  notice: {
    gap: 12,
  },
})
