import { useLenserOptional } from '@lenserfight/features/profile/native'
import {
  DetailSection,
  EmptyContentState,
  ErrorState,
  LoadingState,
  MobileButton,
} from '@lenserfight/ui/components/native'
import { SafeAreaContainer } from '@lenserfight/ui/layout/native'
import { Chip, Text } from '@lenserfight/ui/primitives/native'
import { Input } from '@lenserfight/ui/forms/native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as Clipboard from 'expo-clipboard'
import { ScrollView, View } from 'react-native'

import { useLensDetail } from '../../hooks/useMobileContent'
import { screenStyles } from '../../styles/screenStyles'

import type { LensVersionParam } from '@lenserfight/types'
import { StyleSheet } from 'react-native'

/** Render a single version parameter as a labelled text input. */
const VersionParamField: React.FC<{
  param: LensVersionParam
  value: string
  onChange: (val: string) => void
}> = ({ param, value, onChange }) => {
  const toolType = param.tool?.type ?? 'text'
  const isMultiline = toolType === 'textarea' || toolType === 'json'
  return (
    <View style={paramStyles.row}>
      <View style={paramStyles.labelRow}>
        <Text variant="caption" weight="semibold" style={paramStyles.label}>
          {param.label}
        </Text>
        <Text variant="caption" color="muted" style={paramStyles.type}>
          {toolType}
        </Text>
        {!param.optional && (
          <Text variant="caption" color="muted">
            *
          </Text>
        )}
      </View>
      <Input
        value={value}
        onChangeText={onChange}
        placeholder={param.tool?.placeholder ?? `Enter ${param.label}…`}
        multiline={isMultiline}
        numberOfLines={isMultiline ? 4 : 1}
        keyboardType={toolType === 'number' || toolType === 'integer' ? 'numeric' : 'default'}
        autoCapitalize="none"
      />
    </View>
  )
}

const paramStyles = StyleSheet.create({
  row: { gap: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { flex: 1 },
  type: { textTransform: 'uppercase' },
})

/** Fill [[label]] template placeholders with the provided values. */
function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\[\[(\w+)!?\]\]/g, (_, key) => values[key] ?? `[[${key}]]`)
}

export default function LensDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { t } = useTranslation()
  const router = useRouter()
  const lenser = useLenserOptional()
  const query = useLensDetail(id, lenser?.lenser?.id)
  const lens = query.data

  // Parameter values keyed by param label
  const [paramValues, setParamValues] = useState<Record<string, string>>({})

  const versionParams = lens?.latestPublishedVersion?.parameters ?? []
  const hasParams = versionParams.length > 0

  const handleParamChange = (label: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [label]: value }))
  }

  const handleCopy = () => {
    if (!lens) return
    const template = lens.latestPublishedVersion?.templateBody ?? lens.content
    void Clipboard.setStringAsync(fillTemplate(template, paramValues))
  }

  return (
    <>
      <Stack.Screen options={{ title: t('lenses.detail') }} />
      <SafeAreaContainer testID="lens-detail-screen">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={screenStyles.scroll}
        >
          {query.isLoading && <LoadingState label={t('states.loading')} />}
          {query.isError && (
            <ErrorState
              message={query.error.message}
              fallbackMessage={t('states.error')}
              retryLabel={t('states.retry')}
              onRetry={() => query.refetch()}
            />
          )}
          {!query.isLoading && !query.isError && !lens && (
            <EmptyContentState title={t('states.empty')} description={t('states.notFound')} />
          )}

          {lens && (
            <>
              {/* ── Overview ── */}
              <DetailSection title={lens.title}>
                {lens.description ? (
                  <Text variant="bodyM" color="muted">
                    {lens.description}
                  </Text>
                ) : null}
                <Text variant="caption" color="muted">
                  @{lens.author.handle}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {lens.tags.map((tag) => (
                    <Chip
                      key={tag.id}
                      label={tag.name}
                      onPress={() => router.push(`/tag/${tag.slug}`)}
                    />
                  ))}
                </View>
              </DetailSection>

              {/* ── Parameters ── */}
              {hasParams && (
                <DetailSection title={t('lenses.parameters')}>
                  <Text variant="caption" color="muted" style={{ marginBottom: 4 }}>
                    {t('lenses.parametersHint')}
                  </Text>
                  {versionParams.map((param) => (
                    <VersionParamField
                      key={param.label}
                      param={param}
                      value={paramValues[param.label] ?? ''}
                      onChange={(val) => handleParamChange(param.label, val)}
                    />
                  ))}
                  <View style={{ marginTop: 8 }}>
                    <MobileButton
                      label={t('lenses.copyFilled')}
                      onPress={handleCopy}
                      variant="outline"
                      fullWidth
                    />
                  </View>
                </DetailSection>
              )}

              {/* ── Content ── */}
              <DetailSection title={t('lenses.detail')}>
                {!hasParams && (
                  <View style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
                    <MobileButton
                      label={t('lenses.copy')}
                      onPress={handleCopy}
                      variant="outline"
                    />
                  </View>
                )}
                <Text variant="bodyM">{lens.latestPublishedVersion?.templateBody ?? lens.content}</Text>
              </DetailSection>
            </>
          )}
        </ScrollView>
      </SafeAreaContainer>
    </>
  )
}
