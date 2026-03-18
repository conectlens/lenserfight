import { Globe, Lock } from 'lucide-react'
import React, { useMemo, useRef, useCallback } from 'react'

import { Button } from '@lenserfight/ui/components'
import { FormError } from '@lenserfight/ui/components'
import { Modal } from '@lenserfight/ui/modals'
import { SelectField } from '@lenserfight/ui/forms'
import { useFormValidation } from '@lenserfight/utils/validation'
import { VisibilityEnum } from '@lenserfight/types'
import { isRequired, minLength } from '@lenserfight/utils/validation'

import { PromptTagInput } from './PromptTagInput'

interface CreatePromptModalProps {
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
  }
  isSubmitting: boolean
  error: string | null
  isEditMode?: boolean
}

export const CreatePromptModal: React.FC<CreatePromptModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  form,
  isSubmitting,
  error,
  isEditMode,
}) => {
  const formValues = useMemo(
    () => ({ title: form.title, content: form.content, tags: form.tags }),
    [form.title, form.content, form.tags]
  )

  const validationRulesRef = useRef({
    title: [isRequired(), minLength(3, 'Title must be at least 3 characters')],
    content: [isRequired(), minLength(10, 'Content must be at least 10 characters')],
    tags: [],
  })

  const { errors, validate, clearError } = useFormValidation<typeof formValues>(
    validationRulesRef.current
  )

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
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      form.setContent(e.target.value)
      clearError('content')
    },
    [form.setContent, clearError]
  )

  const visibilityOptions = [
    { value: 'public', label: 'Public', icon: Globe },
    { value: 'private', label: 'Private', icon: Lock },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'Edit Prompt' : 'Create Prompt'}>
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
          <label className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Prompt
          </label>
          <textarea
            value={form.content}
            onChange={handleContentChange}
            placeholder="Enter your full prompt content here. Use {{variables}} for dynamic inputs..."
            rows={6}
            className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none ${errors.content ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
          />
          <FormError message={errors.content} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PromptTagInput tags={form.tags} onChange={form.setTags} />

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
            {isEditMode ? 'Update Prompt' : 'Save Prompt'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
