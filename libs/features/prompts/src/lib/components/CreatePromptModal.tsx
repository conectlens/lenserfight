import { Globe, Lock } from 'lucide-react'
import React, { useMemo, useRef, useCallback, useEffect } from 'react'

import { Button } from '@lenserfight/ui/components'
import { FormError } from '@lenserfight/ui/components'
import { Modal } from '@lenserfight/ui/modals'
import { SelectField } from '@lenserfight/ui/forms'
import { useFormValidation } from '@lenserfight/utils/validation'
import { PromptParam, VisibilityEnum } from '@lenserfight/types'
import { isRequired, minLength } from '@lenserfight/utils/validation'

import { ParameterPanel } from './ParameterPanel'
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
    params: PromptParam[]
    setParams: (v: PromptParam[]) => void
    syncParamsFromContent: (content: string) => void
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // Debounced param extraction
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
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      form.setContent(e.target.value)
      clearError('content')
    },
    [form.setContent, clearError]
  )

  const handleContentKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const el = e.currentTarget
        const start = el.selectionStart
        const next = form.content.slice(0, start) + '  ' + form.content.slice(el.selectionEnd)
        form.setContent(next)
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = start + 2
            textareaRef.current.selectionEnd = start + 2
          }
        })
      }
    },
    [form.content, form.setContent]
  )

  const visibilityOptions = [
    { value: 'public', label: 'Public', icon: Globe },
    { value: 'private', label: 'Private', icon: Lock },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'Edit Prompt' : 'Create Prompt'} panelClassName="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
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
          <div className={`rounded-xl border overflow-hidden ${errors.content ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}>
            <textarea
              ref={textareaRef}
              value={form.content}
              onChange={handleContentChange}
              onKeyDown={handleContentKeyDown}
              rows={10}
              placeholder={"Write your prompt in markdown.\nUse {{variable}} for dynamic parameters.\n\nExample:\n## Task\nGenerate {{num_ideas}} ideas about **{{topic}}**"}
              className="w-full px-4 py-3 font-mono text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none resize-none transition-all"
            />
          </div>
          <FormError message={errors.content} />
        </div>

        <ParameterPanel params={form.params} onChange={form.setParams} />

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
