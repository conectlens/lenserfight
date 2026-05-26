import React from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { Text } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'

const LOGO_URI_LIGHT = 'https://cdn.lenserfight.com/brand/favicons/original/ms-icon-150x150.png'
const LOGO_URI_DARK = 'https://cdn.lenserfight.com/brand/favicons/white/ms-icon-150x150.png'

export interface MobileLogoProps {
  size?: number
  showWordmark?: boolean
  showBeta?: boolean
  testID?: string
  accessibilityLabel?: string
  orientation?: 'horizontal' | 'vertical'
}

export const MobileLogo: React.FC<MobileLogoProps> = ({
  size = 32,
  showWordmark = true,
  showBeta = false,
  testID,
  accessibilityLabel = 'LenserFight',
  orientation = 'horizontal',
}) => {
  const theme = useNativeTheme()
  const logoUri = theme.colorScheme === 'dark' ? LOGO_URI_DARK : LOGO_URI_LIGHT

  const isVertical = orientation === 'vertical'

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        isVertical && styles.containerVertical,
      ]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.markWrap}>
        <Image
          source={{ uri: logoUri }}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
        {showBeta && (
          <View
            style={[
              styles.beta,
              {
                backgroundColor: theme.colors.primaryNavy,
                borderColor: theme.surface.base,
              },
            ]}
          >
            <Text
              variant="label"
              weight="bold"
              style={[styles.betaText, { color: theme.colors.primaryYellow }]}
            >
              Beta
            </Text>
          </View>
        )}
      </View>
      {showWordmark && (
        <Text
          variant="h4"
          weight="bold"
          style={[
            styles.wordmark,
            {
              color: theme.surface.text,
              fontSize: Math.round(size * 0.64),
            },
            isVertical && styles.wordmarkVertical,
          ]}
          numberOfLines={1}
        >
          LenserFight
        </Text>
      )}
    </View>
  )
}

MobileLogo.displayName = 'MobileLogo'

const styles = StyleSheet.create({
  beta: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    bottom: -5,
    justifyContent: 'center',
    minWidth: 28,
    paddingHorizontal: 4,
    paddingVertical: 1,
    position: 'absolute',
    right: -8,
  },
  betaText: {
    fontSize: 8,
    letterSpacing: 0,
    lineHeight: 10,
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
  },
  containerVertical: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 8,
    minHeight: undefined,
  },
  markWrap: {
    position: 'relative',
  },
  wordmark: {
    letterSpacing: 0,
  },
  wordmarkVertical: {
    textAlign: 'center',
    marginTop: 4,
  },
})
