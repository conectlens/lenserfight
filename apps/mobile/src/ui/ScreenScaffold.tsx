import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaContainer, TopAppBar } from '@lenserfight/ui/layout/native'
import { IconButton, Text } from '@lenserfight/ui/primitives/native'
import { useTranslation } from 'react-i18next'

interface ScreenScaffoldProps {
  title: string
  subtitle?: string
  onBack?: () => void
  children: React.ReactNode
  scroll?: boolean
  testID?: string
}

export const ScreenScaffold: React.FC<ScreenScaffoldProps> = ({
  title,
  subtitle,
  onBack,
  children,
  scroll = true,
  testID,
}) => {
  const { t } = useTranslation()
  const content = <View style={styles.content}>{children}</View>

  return (
    <SafeAreaContainer testID={testID}>
      <TopAppBar
        title={title}
        subtitle={subtitle}
        leading={
          onBack ? (
            <IconButton
              onPress={onBack}
              accessibilityLabel={t('actions.back')}
              icon={<Text variant="h2">‹</Text>}
            />
          ) : undefined
        }
      />
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaContainer>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    padding: 16,
  },
  scroll: {
    paddingBottom: 32,
  },
})
