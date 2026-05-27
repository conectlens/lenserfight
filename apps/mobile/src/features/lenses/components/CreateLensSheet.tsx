/**
 * CreateLensSheet — bottom sheet for creating or editing a Lens.
 *
 * Follows Apple HIG sheet guidance:
 * - Slides up from the bottom with a grab handle (provided by Sheet)
 * - No explicit close/X button in the header; dismiss via drag-down or Discard action
 * - Title is centred in the header area
 * - Scrollable content area to accommodate the keyboard
 * - Discard and primary action buttons at the bottom of the sheet
 */
import { useCreateLens } from '@lenserfight/features/lenses'
import { Sheet, MobileButton } from '@lenserfight/ui/components/native'
import { InlineNotice } from '@lenserfight/ui/feedback/native'
import { Field, Input, TextArea } from '@lenserfight/ui/forms/native'
import { Text } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import type { VisibilityEnum } from '@lenserfight/types'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import type { EditLensData } from '../../../context/LensSheetContext'

interface CreateLensSheetProps {
  visible: boolean
  onDismiss: () => void
  editData?: EditLensData | null
}

export const CreateLensSheet: React.FC<CreateLensSheetProps> = ({
  visible,
  onDismiss,
  editData,
}) => {
  const { t } = useTranslation()
  const theme = useNativeTheme()

  const {
    openModal,
    closeModal,
    form,
    isSubmitting,
    error,
    submit,
    isEditMode,
  } = useCreateLens()

  useEffect(() => {
    if (visible) {
      if (editData) {
        openModal({
          id: editData.id,
          title: editData.title,
          content: editData.content,
          tags: editData.tags,
          visibility: editData.visibility,
        })
      } else {
        openModal()
      }
    } else {
      closeModal()
    }
  // openModal/closeModal are stable callbacks
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const handleDismiss = () => {
    if (!isSubmitting) onDismiss()
  }

  const handleSubmit = () => {
    submit((_id) => onDismiss())
  }

  const tagsText = form.tags.join(', ')
  const handleTagsChange = (raw: string) => {
    form.setTags(
      raw
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    )
  }

  return (
    <Sheet
      visible={visible}
      onDismiss={handleDismiss}
      dismissAccessibilityLabel={t('actions.close')}
      testID="create-lens-sheet"
    >
      {/* Sheet title — centred, no close button per HIG */}
      <View style={styles.header}>
        <Text variant="bodyL" weight="bold" style={{ color: theme.surface.text }}>
          {isEditMode ? t('lenses.editLens') : t('lenses.newLens')}
        </Text>
      </View>

      {/* Title */}
      <Field label={t('lenses.lensTitle')} required>
        <Input
          value={form.title}
          onChangeText={form.setTitle}
          placeholder={t('lenses.titlePlaceholder')}
          autoCapitalize="words"
          maxLength={120}
          editable={!isSubmitting}
          testID="lens-title-input"
        />
      </Field>

      {/* Instructions / Content */}
      <Field
        label={t('lenses.instructions')}
        hint={t('lenses.instructionsHint')}
        required
      >
        <TextArea
          value={form.content}
          onChangeText={(val) => {
            form.setContent(val)
            form.syncParamsFromContent(val)
          }}
          placeholder={t('lenses.instructionsPlaceholder')}
          numberOfLines={8}
          maxLength={10000}
          editable={!isSubmitting}
          testID="lens-content-input"
        />
      </Field>

      {/* Tags */}
      <Field label={t('lenses.tags')} hint={t('lenses.tagsHint')}>
        <Input
          value={tagsText}
          onChangeText={handleTagsChange}
          placeholder={t('lenses.tagsPlaceholder')}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={200}
          editable={!isSubmitting}
          testID="lens-tags-input"
        />
      </Field>

      {/* Visibility */}
      <Field label={t('lenses.visibility')}>
        <View style={styles.visibilityRow}>
          {(['public', 'private'] as VisibilityEnum[]).map((v) => (
            <View key={v} style={styles.visibilityOption}>
              <MobileButton
                label={t(`visibility.${v}`)}
                onPress={() => form.setVisibility(v)}
                variant={form.visibility === v ? 'primary' : 'outline'}
                size="sm"
                disabled={isSubmitting}
                accessibilityLabel={t(`visibility.${v}`)}
              />
            </View>
          ))}
        </View>
      </Field>

      {/* Error */}
      {error && <InlineNotice variant="error" message={error} />}

      {/* Actions — Discard left, primary right per HIG */}
      <View style={styles.actions}>
        <View style={styles.cancelBtn}>
          <MobileButton
            label={t('actions.discard')}
            onPress={handleDismiss}
            variant="outline"
            disabled={isSubmitting}
          />
        </View>
        <View style={styles.submitBtn}>
          <MobileButton
            label={isEditMode ? t('lenses.updateLens') : t('lenses.createLens')}
            onPress={handleSubmit}
            variant="primary"
            loading={isSubmitting}
            disabled={!form.title.trim() || !form.content.trim() || isSubmitting}
            testID="lens-submit-btn"
          />
        </View>
      </View>
    </Sheet>
  )
}

CreateLensSheet.displayName = 'CreateLensSheet'

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  submitBtn: {
    flex: 2,
  },
  visibilityOption: {
    flex: 1,
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 10,
  },
})
