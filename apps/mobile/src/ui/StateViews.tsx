import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { EmptyState, InlineNotice } from '@lenserfight/ui/feedback/native'
import { Text } from '@lenserfight/ui/primitives/native'
import { useTranslation } from 'react-i18next'
import { MobileButton } from './MobileButton'

export const LoadingState: React.FC<{ label?: string }> = ({ label }) => {
  const { t } = useTranslation()
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" />
      <Text variant="bodyM" color="muted">
        {label ?? t('states.loading')}
      </Text>
    </View>
  )
}

export const EmptyContentState: React.FC<{ title?: string; description?: string }> = ({
  title,
  description,
}) => {
  const { t } = useTranslation()
  return <EmptyState title={title ?? t('states.empty')} description={description} />
}

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => {
  const { t } = useTranslation()
  return (
    <View style={styles.notice}>
      <InlineNotice variant="error" message={message ?? t('states.error')} />
      {onRetry && <MobileButton label={t('states.retry')} onPress={onRetry} variant="secondary" />}
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
    minHeight: 240,
  },
  notice: {
    gap: 12,
  },
})
