import { Globe, Lock } from 'lucide-react'
import React, { useMemo, useRef, useCallback, useEffect } from 'react'

import { LensVersionHistoryButton } from './LensVersionHistoryButton'

import { Button } from '@lenserfight/ui/components'
import { FormError } from '@lenserfight/ui/components'
import { Modal } from '@lenserfight/ui/modals'
import { SelectField, LensContentEditor, type LensContentEditorHandle } from '@lenserfight/ui/forms'
import { useFormValidation } from '@lenserfight/utils/validation'
import { CreateVersionParamInput, VisibilityEnum } from '@lenserfight/types'
import { isRequired, minLength } from '@lenserfight/utils/validation'

import { ParameterPanel } from './LensParameterPanel'
import { LensTagInput } from './LensTagInput'
import { useTools } from '../hooks/useTools'

interface CreateLensModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: () => void
  form: {
    title: string
    setTitle: (v: string) => void
    content: string
    setContent: (v: string) => void
    tags: string[]
    setTags: (v: string[]) => void
    visibility: VisibilityEnum
    setVisibility: (v: VisibilityEnum) => void
    versionParams: CreateVersionParamInput[]
    setVersionParams: (v: CreateVersionParamInput[]) => void
    syncParamsFromContent: (content: string) => void
  }
  isSubmitting: boolean
  error: string | null
  isEditMode?: boolean
  lensId?: string
}

export const CreateLensModal: React.FC<CreateLensModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  form,
  isSubmitting,
  error,
  isEditMode,
  lensId,
}) => {
  const editorRef = useRef<LensContentEditorHandle>(null)
  const { tools } = useTools()

  const formValues = useMemo(
    () => ({ title: form.title, content: form.content, tags: form.tags }),
    [form.title, form.content, form.tags]
  )

  const validationRulesRef = useRef({
    title: [isRequired(), minLength(3, 'Title must be at least 3 characters')],
    content: [isRequired(), minLength(50, 'Content must be at least 50 characters')],
    tags: [],
  })

  const { errors, validate, clearError } = useFormValidation<typeof formValues>(
    validationRulesRef.current
  )

  // Debounced param extraction (safety net — editor also manages params)
  useEffect(() => {
    const t = setTimeout(() => form.syncParamsFromContent(form.content), 400)
    return () => clearTimeout(t)
  }, [form.content])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate(formValues)) {
      onSubmit()
    }
  }

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      form.setTitle(e.target.value)
      clearError('title')
    },
    [form.setTitle, clearError]
  )

  const handleContentChange = useCallback(
    (value: string) => {
      form.setContent(value)
      clearError('content')
    },
    [form.setContent, clearError]
  )

  const visibilityOptions = [
    { value: 'public', label: 'Public', icon: Globe },
    { value: 'private', label: 'Private', icon: Lock },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'Edit Lens' : 'Create Lens'} fullWidth>
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Title
          </label>
          <input
            type="text"
            value={form.title}
            onChange={handleTitleChange}
            placeholder="e.g. 'Midjourney Photorealistic Portrait'"
            className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all font-medium ${errors.title ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
          />
          <FormError message={errors.title} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Lens
            </label>
            {lensId && (
              <LensVersionHistoryButton
                lensId={lensId}
                onRestore={(content) => { form.setContent(content); clearError('content') }}
              />
            )}
          </div>
          <div className={`rounded-xl border overflow-hidden ${errors.content ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}>
            <LensContentEditor
              ref={editorRef}
              value={form.content}
              onChange={handleContentChange}
              versionParams={form.versionParams}
              onVersionParamsChange={form.setVersionParams}
              tools={tools}
              placeholder={"Write your lens in markdown (minimum 50 characters).\nType @ to insert a parameter, or use [[variable]] syntax.\n\nExample:\n## Task\nGenerate [[num_ideas]] ideas about [[topic]]"}
            />
          </div>
          <FormError message={errors.content} />
        </div>

        <ParameterPanel
          versionParams={form.versionParams}
          onChange={form.setVersionParams}
          tools={tools}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LensTagInput tags={form.tags} onChange={form.setTags} />

          <div className="space-y-2">
            <SelectField
              label="Visibility"
              value={form.visibility}
              onChange={(val) => form.setVisibility(val as VisibilityEnum)}
              options={visibilityOptions}
              className="w-full"
            />
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-4 justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-gray-100 dark:bg-gray-700 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 w-auto px-6"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            className="w-auto px-6 shadow-md"
          >
            {isEditMode ? 'Update Lens' : 'Save Lens'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
