import { Globe, Lock, Zap, ChevronDown, ChevronRight } from 'lucide-react'
import React, { useMemo, useRef, useCallback, useEffect, useState } from 'react'

import { LensVersionHistoryButton } from './LensVersionHistoryButton'

import { Button } from '@lenserfight/ui/components'
import { FormError } from '@lenserfight/ui/components'
import { Modal } from '@lenserfight/ui/modals'
import { SelectField, LensContentEditor, type LensContentEditorHandle } from '@lenserfight/ui/forms'
import { useFormValidation } from '@lenserfight/utils/validation'
import { LensParam, VisibilityEnum } from '@lenserfight/types'
import { isRequired, minLength } from '@lenserfight/utils/validation'

import { ParameterPanel } from './LensParameterPanel'
import { LensTagInput } from './LensTagInput'

// ─── Parameter Tool Cards ───────────────────────────────────────────────────

interface ParamTemplate {
  label: string
  emoji: string
  param: LensParam
}

const PARAM_TEMPLATES: ParamTemplate[] = [
  {
    label: 'Text Input',
    emoji: '✏️',
    param: { name: 'input', type: 'string', required: true, placeholder: 'Enter text…' },
  },
  {
    label: 'Number',
    emoji: '🔢',
    param: { name: 'count', type: 'number', required: false, min: 1, max: 100, default: '10' },
  },
  {
    label: 'Boolean Toggle',
    emoji: '🔀',
    param: { name: 'enabled', type: 'boolean', required: false, default: 'false' },
  },
  {
    label: 'File Upload',
    emoji: '📎',
    param: { name: 'attachment', type: 'string', required: false, description: 'Upload a file to attach' },
  },
  {
    label: 'Select',
    emoji: '🎛️',
    param: {
      name: 'option',
      type: 'select',
      required: true,
      options: [
        { label: 'Option A', value: 'a' },
        { label: 'Option B', value: 'b' },
      ],
    },
  },
  {
    label: 'URL',
    emoji: '🔗',
    param: { name: 'url', type: 'string', required: false, placeholder: 'https://…' },
  },
  {
    label: 'Date',
    emoji: '📅',
    param: { name: 'date', type: 'string', required: false, placeholder: 'YYYY-MM-DD' },
  },
  {
    label: 'Long Text',
    emoji: '📝',
    param: { name: 'description', type: 'string', required: false, placeholder: 'Enter description…' },
  },
]

const ParamToolCards: React.FC<{ onAdd: (p: LensParam) => void }> = ({ onAdd }) => {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Zap size={13} className="text-primary-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          Quick-add parameter
        </span>
        {open ? (
          <ChevronDown size={13} className="ml-auto text-gray-400" />
        ) : (
          <ChevronRight size={13} className="ml-auto text-gray-400" />
        )}
      </button>

      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-white dark:bg-gray-900">
          {PARAM_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              onClick={() => onAdd({ ...tpl.param })}
              className="flex flex-col items-center gap-1 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors text-center"
            >
              <span className="text-xl">{tpl.emoji}</span>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{tpl.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

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
    params: LensParam[]
    setParams: (v: LensParam[]) => void
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

  const handleAddParamFromTemplate = useCallback(
    (p: LensParam) => {
      // Add to params array
      form.setParams([...form.params, p])
      // Insert {{param}} at cursor in editor
      editorRef.current?.insertParam(p)
    },
    [form.params, form.setParams],
  )

  const visibilityOptions = [
    { value: 'public', label: 'Public', icon: Globe },
    { value: 'private', label: 'Private', icon: Lock },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'Edit Lens' : 'Create Lens'} panelClassName="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl">
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
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              Type <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] font-mono">@</kbd> to mention a parameter
            </span>
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
              params={form.params}
              onParamsChange={form.setParams}
              placeholder={"Write your lens in markdown (minimum 50 characters).\nType @ to insert a parameter, or use {{variable}} syntax.\n\nExample:\n## Task\nGenerate {{num_ideas}} ideas about {{topic}}"}
            />
          </div>
          <FormError message={errors.content} />
        </div>

        <div className="space-y-3">
          <ParamToolCards onAdd={handleAddParamFromTemplate} />
          <ParameterPanel params={form.params} onChange={form.setParams} />
        </div>

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
