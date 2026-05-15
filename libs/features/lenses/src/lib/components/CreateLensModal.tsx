import { LensKindPicker, LENS_KIND_REGISTRY, resolveLensKindFromTagSlugs } from '@lenserfight/features/lens-kinds'
import { CreateVersionParamInput, LensKind, VisibilityEnum } from '@lenserfight/types'
import { FormError } from '@lenserfight/ui/components'
import { SelectField, LensContentEditor, type LensContentEditorHandle, InputField } from '@lenserfight/ui/forms'
import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'
import { useFormValidation, isRequired, minLength } from '@lenserfight/utils/validation'
import { Globe, Lock, Info } from 'lucide-react'
import React, { useMemo, useRef, useCallback, useEffect } from 'react'

import { useTools } from '../hooks/useTools'

import { ParameterPanel } from './LensParameterPanel'
import { LensTagInput } from './LensTagInput'
import { LensVersionHistoryButton } from './LensVersionHistoryButton'

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

const VALIDATION_RULES = {
  title: [isRequired(), minLength(3, 'Title must be at least 3 characters')],
  content: [isRequired(), minLength(50, 'Content must be at least 50 characters')],
  tags: [],
}

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', icon: Globe },
  { value: 'private', label: 'Private', icon: Lock },
]

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
  const { tools } = useTools(undefined, isOpen)

  const formValues = useMemo(
    () => ({ title: form.title, content: form.content, tags: form.tags }),
    [form.title, form.content, form.tags]
  )

  const { errors, validate, clearError } = useFormValidation<typeof formValues>(VALIDATION_RULES)

  useEffect(() => {
    const t = setTimeout(() => form.syncParamsFromContent(form.content), 400)
    return () => clearTimeout(t)
  }, [form.content])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (validate(formValues)) onSubmit()
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

  const selectedKinds = useMemo<LensKind[]>(() => {
    return form.tags.filter((t) => LENS_KIND_REGISTRY[t as LensKind]) as LensKind[]
  }, [form.tags])

  const handleKindsChange = useCallback(
    (kinds: LensKind[]) => {
      const withoutKind = form.tags.filter((t) => !LENS_KIND_REGISTRY[t as LensKind])
      form.setTags([...withoutKind, ...kinds])
    },
    [form.tags, form.setTags]
  )

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Lens' : 'Create New Lens'}
      description={isEditMode ? 'Update your lens configuration and content.' : 'Lenses are modular AI instructions that can be reused across workflows.'}
      maxWidth="max-w-4xl"
      footer={
        <ModalFooter
          leftButton={{
            label: 'Discard',
            onClick: onClose,
            disabled: isSubmitting,
            variant: 'secondary'
          }}
          primaryButton={{
            label: isEditMode ? 'Update Lens' : 'Create Lens',
            onClick: () => handleSubmit(),
            isLoading: isSubmitting,
            className: 'min-w-[120px]'
          }}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        {/* Section 1: Identity */}
        <div className="space-y-8">
          <div className="space-y-2">
            <InputField
              label="Lens Title"
              value={form.title}
              onChange={handleTitleChange}
              placeholder="e.g. 'Midjourney Photorealistic Portrait'"
              error={errors.title}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <LensKindPicker value={selectedKinds} onChange={handleKindsChange} variant="carousel" />
          </div>
        </div>

        {/* Section 2: Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <label className="text-[13px] font-semibold text-greyscale-500 dark:text-greyscale-400">
                Lens Instructions
              </label>
              <div className="group relative">
                <Info className="h-3.5 w-3.5 text-greyscale-400 cursor-help" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2 bg-greyscale-900 text-white text-[11px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                  Use markdown and [[variable]] syntax to create dynamic parameters.
                </div>
              </div>
            </div>
            {lensId && (
              <LensVersionHistoryButton
                lensId={lensId}
                onRestore={(content) => {
                  form.setContent(content)
                  clearError('content')
                }}
              />
            )}
          </div>
          
          <div className={`
            rounded-2xl border transition-all duration-200 overflow-hidden
            ${errors.content ? 'border-red-500 shadow-sm shadow-red-500/10' : 'border-surface-border bg-surface-sunken'}
          `}>
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

        {/* Section 3: Parameters */}
        <div className="bg-surface-sunken/50 rounded-2xl p-6 border border-surface-border/50">
          <h3 className="text-xs font-bold text-greyscale-400 uppercase tracking-widest mb-4 px-1">
            Parameters & Variables
          </h3>
          {form.versionParams.length === 0 ? (
            <div className="text-center py-6 text-sm text-greyscale-500 dark:text-greyscale-400">
              No parameters detected. Type <code className="bg-greyscale-200 dark:bg-greyscale-800 text-greyscale-900 dark:text-greyscale-50 px-1.5 py-0.5 rounded font-mono text-xs">[[parameter_name]]</code> in the instructions above to add a dynamic variable.
            </div>
          ) : (
            <ParameterPanel
              versionParams={form.versionParams}
              onChange={form.setVersionParams}
              tools={tools}
            />
          )}
        </div>

        {/* Section 4: Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
          <LensTagInput tags={form.tags} onChange={form.setTags} />

          <SelectField
            label="Visibility"
            value={form.visibility}
            onChange={(val) => form.setVisibility(val as VisibilityEnum)}
            options={VISIBILITY_OPTIONS}
          />
        </div>

        {error && (
          <div className="flex items-start gap-3 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-900/50">
            <div className="mt-0.5">⚠️</div>
            <p className="leading-relaxed">{error}</p>
          </div>
        )}
      </form>
    </Dialog>
  )
}


