import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Chip, Pressable, Surface, Text } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'

interface SummaryCardProps {
  title: string
  subtitle?: string
  meta?: string
  tags?: Array<{ id?: string; slug?: string; name?: string }>
  onPress?: () => void
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
}) => {
  const { radius, spacing } = useNativeTheme()
  const content = (
    <Surface borderRadius={radius.xl} style={[styles.card, { padding: spacing[4] }]} testID={testID}>
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
        <View style={styles.tags}>
          {tags.slice(0, 4).map((tag) => (
            <Chip key={tag.id ?? tag.slug ?? tag.name} label={tag.name ?? tag.slug ?? 'tag'} />
          ))}
        </View>
      )}
    </Surface>
  )

  if (!onPress) return content
  return (
    <Pressable onPress={onPress} accessibilityLabel={title} accessibilityRole="button">
      {content}
    </Pressable>
  )
}

export const DetailSection: React.FC<{
  title: string
  children: React.ReactNode
}> = ({ title, children }) => {
  const { radius, spacing } = useNativeTheme()
  return (
    <Surface borderRadius={radius.xl} style={[styles.card, { padding: spacing[4] }]}>
      <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </Surface>
  )
}

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
    gap: 8,
    marginTop: 2,
  },
})
