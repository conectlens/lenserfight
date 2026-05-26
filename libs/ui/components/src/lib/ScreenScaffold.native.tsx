import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { SafeAreaContainer, TopAppBar } from '@lenserfight/ui/layout/native'
import { IconButton, Text } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'

export interface ScreenScaffoldProps {
  title: string
  subtitle?: string
  onBack?: () => void
  backAccessibilityLabel?: string
  children: React.ReactNode
  scroll?: boolean
  contentStyle?: StyleProp<ViewStyle>
  testID?: string
}

export const ScreenScaffold: React.FC<ScreenScaffoldProps> = ({
  title,
  subtitle,
  onBack,
  backAccessibilityLabel = 'Back',
  children,
  scroll = true,
  contentStyle,
  testID,
}) => {
  const theme = useNativeTheme()
  const content = (
    <View
      style={[
        styles.content,
        {
          gap: theme.spacing[4],
          padding: theme.spacing[4],
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  )

  return (
    <SafeAreaContainer testID={testID}>
      <TopAppBar
        title={title}
        subtitle={subtitle}
        leading={
          onBack ? (
            <IconButton
              onPress={onBack}
              accessibilityLabel={backAccessibilityLabel}
              icon={<Text variant="h2">{'<'}</Text>}
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

ScreenScaffold.displayName = 'ScreenScaffold'

const styles = StyleSheet.create({
  content: {},
  scroll: {
    paddingBottom: 32,
  },
})
