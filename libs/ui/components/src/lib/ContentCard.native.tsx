import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Chip, Pressable, Surface, Text } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'

export interface ContentCardTag {
  id?: string
  slug?: string
  name?: string
}

export interface SummaryCardProps {
  title: string
  subtitle?: string | null
  meta?: string
  tags?: ContentCardTag[]
  onPress?: () => void
  testID?: string
  accessibilityHint?: string
}

export interface DetailSectionProps {
  title: string
  children: React.ReactNode
  testID?: string
}

const trim = (value?: string | null, length = 140): string | undefined => {
  if (!value) return undefined
  return value.length > length ? `${value.slice(0, length - 1)}...` : value
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  subtitle,
  meta,
  tags = [],
  onPress,
  testID,
  accessibilityHint,
}) => {
  const theme = useNativeTheme()
  const content = (
    <Surface
      borderRadius={theme.radius.xl}
      style={[styles.card, { padding: theme.spacing[4] }]}
      testID={testID}
    >
      <Text variant="h4" weight="semibold">
        {title}
      </Text>
      {subtitle && (
        <Text variant="bodyM" color="muted">
          {trim(subtitle)}
        </Text>
      )}
      {meta && (
        <Text variant="caption" color="muted">
          {meta}
        </Text>
      )}
      {tags.length > 0 && (
        <View style={[styles.tags, { gap: theme.spacing[2] }]}>
          {tags.slice(0, 4).map((tag) => (
            <Chip key={tag.id ?? tag.slug ?? tag.name} label={tag.name ?? tag.slug ?? 'tag'} />
          ))}
        </View>
      )}
    </Surface>
  )

  if (!onPress) return content

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
    >
      {content}
    </Pressable>
  )
}

export const DetailSection: React.FC<DetailSectionProps> = ({ title, children, testID }) => {
  const theme = useNativeTheme()

  return (
    <Surface
      borderRadius={theme.radius.xl}
      style={[styles.card, { padding: theme.spacing[4] }]}
      testID={testID}
    >
      <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </Surface>
  )
}

SummaryCard.displayName = 'SummaryCard'
DetailSection.displayName = 'DetailSection'

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  sectionTitle: {
    marginBottom: 2,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
})
