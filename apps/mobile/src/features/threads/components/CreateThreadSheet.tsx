/**
 * CreateThreadSheet — bottom sheet for creating or editing a thread.
 *
 * Follows Apple HIG sheet guidance:
 * - Slides up from the bottom with a grab handle (provided by Sheet)
 * - No explicit close/X button in the header; dismiss via drag-down or Cancel action
 * - Title is centred in the header area
 * - Scrollable content area to accommodate the keyboard
 * - Cancel and primary action buttons at the bottom of the sheet
 */
import { useCreateThread } from '@lenserfight/features/threads'
import { Sheet, MobileButton } from '@lenserfight/ui/components/native'
import { InlineNotice } from '@lenserfight/ui/feedback/native'
import { Field, Input, TextArea } from '@lenserfight/ui/forms/native'
import { Text } from '@lenserfight/ui/primitives/native'
import { useNativeTheme } from '@lenserfight/ui/providers/native'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import type { EditThreadData } from '../../../context/ThreadSheetContext'

interface CreateThreadSheetProps {
  visible: boolean
  onDismiss: () => void
  editData?: EditThreadData | null
}

type Visibility = 'public' | 'private'

export const CreateThreadSheet: React.FC<CreateThreadSheetProps> = ({
  visible,
  onDismiss,
  editData,
}) => {
  const { t } = useTranslation()
  const theme = useNativeTheme()
  const { createThread, isSubmitting, error } = useCreateThread()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')

  useEffect(() => {
    if (visible) {
      if (editData) {
        setTitle(editData.title)
        setContent(editData.content)
        setVisibility(editData.visibility)
      } else {
        setTitle('')
        setContent('')
        setVisibility('public')
      }
    }
  }, [visible, editData])

  const handleSubmit = async () => {
    if (!title.trim()) return
    await createThread(
      title.trim(),
      content,
      [],
      visibility,
      () => onDismiss(),
      editData?.id ?? null,
      null
    )
  }

  const isEdit = !!editData

  return (
    <Sheet
      visible={visible}
      onDismiss={isSubmitting ? undefined : onDismiss}
      dismissAccessibilityLabel={t('actions.close')}
      testID="create-thread-sheet"
    >
      {/* Sheet title — centred, no close button per HIG */}
      <View style={styles.header}>
        <Text variant="bodyL" weight="bold" style={{ color: theme.surface.text }}>
          {isEdit ? t('threads.editPost') : t('threads.newPost')}
        </Text>
      </View>

      {/* Title */}
      <Field label={t('threads.postTitle')} required>
        <Input
          value={title}
          onChangeText={setTitle}
          placeholder={t('threads.titlePlaceholder')}
          autoCapitalize="sentences"
          maxLength={200}
          editable={!isSubmitting}
          testID="thread-title-input"
        />
      </Field>

      {/* Content */}
      <Field label={t('threads.content')}>
        <TextArea
          value={content}
          onChangeText={setContent}
          placeholder={t('threads.contentPlaceholder')}
          numberOfLines={6}
          maxLength={5000}
          editable={!isSubmitting}
          testID="thread-content-input"
        />
      </Field>

      {/* Visibility */}
      <Field label={t('threads.visibility')}>
        <View style={styles.visibilityRow}>
          {(['public', 'private'] as Visibility[]).map((v) => (
            <View key={v} style={styles.visibilityOption}>
              <MobileButton
                label={t(`visibility.${v}`)}
                onPress={() => setVisibility(v)}
                variant={visibility === v ? 'primary' : 'outline'}
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

      {/* Actions — Cancel left, primary right per HIG */}
      <View style={styles.actions}>
        <View style={styles.cancelBtn}>
          <MobileButton
            label={t('actions.cancel')}
            onPress={onDismiss}
            variant="outline"
            disabled={isSubmitting}
          />
        </View>
        <View style={styles.submitBtn}>
          <MobileButton
            label={isEdit ? t('actions.update') : t('actions.publish')}
            onPress={handleSubmit}
            variant="primary"
            loading={isSubmitting}
            disabled={!title.trim() || isSubmitting}
            testID="thread-submit-btn"
          />
        </View>
      </View>
    </Sheet>
  )
}

CreateThreadSheet.displayName = 'CreateThreadSheet'

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
