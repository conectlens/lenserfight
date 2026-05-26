import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import { MobileButton } from './MobileButton.native'
import { MobileLogo } from './MobileLogo.native'

export interface HomeHeaderProps {
  showAction?: boolean
  actionLabel?: string
  onAction?: () => void
  logoLabel?: string
  testID?: string
  actionTestID?: string
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  showAction = false,
  actionLabel,
  onAction,
  logoLabel,
  testID,
  actionTestID,
}) => {
  const theme = useNativeTheme()
  const canRenderAction = showAction && actionLabel && onAction

  return (
    <View
      testID={testID}
      style={[
        styles.header,
        {
          backgroundColor: theme.surface.base,
          borderBottomColor: theme.surface.borderSubtle,
          paddingHorizontal: theme.spacing[4],
        },
      ]}
    >
      <MobileLogo size={28} showWordmark accessibilityLabel={logoLabel} />
      {canRenderAction && (
        <MobileButton
          label={actionLabel}
          onPress={onAction}
          size="sm"
          variant="primary"
          testID={actionTestID}
        />
      )}
    </View>
  )
}

HomeHeader.displayName = 'HomeHeader'

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 60,
    paddingVertical: 8,
  },
})
