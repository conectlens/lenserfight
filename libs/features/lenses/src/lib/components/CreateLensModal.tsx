import { LensKindPicker, LENS_KIND_REGISTRY } from '@lenserfight/features/lens-kinds'
import { useAICreationGeneration } from '@lenserfight/infra/ai-creation'
import { CreateVersionParamInput, LensKind, VisibilityEnum } from '@lenserfight/types'
import { Alert, FormError } from '@lenserfight/ui/components'
import { SelectField, LensContentEditor, type LensContentEditorHandle, InputField, TextArea } from '@lenserfight/ui/forms'
import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'
import { useFormValidation, isRequired, minLength } from '@lenserfight/utils/validation'
import { Globe, Lock, Info, Sparkles, Copy, Check } from 'lucide-react'
import React, { useMemo, useRef, useCallback, useEffect, useState } from 'react'

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
  /** auth.uid() of the active lenser — enables the AI generation button. */
  profileId?: string
  /** Injected from useFundingSource().resolveLocalKey — needed for local BYOK path. */
  resolveLocalKey?: (keyId: string) => Promise<string>
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

const LENS_CREATION_INSTRUCTIONS = `# How to Create a Lens on LenserFight

A **Lens** is a reusable AI prompt template that others can run, fork, and build battles around.

## Required fields

| Field | Description |
|-------|-------------|
| **Title** | Short, descriptive name (e.g. "Blog Post Outliner") |
| **Description** | One-sentence summary of what the Lens does |
| **Template body** | The prompt text. Use \`[[Parameter Label]]\` tokens for dynamic inputs |
| **Visibility** | \`public\` (discoverable), \`community\` (logged-in users only), or \`private\` |
| **Tags** | Up to 5 tags to help users find your Lens |

## Template body tips

- Write your prompt as if speaking directly to the AI model.
- Wrap dynamic inputs in double brackets: \`[[Topic]]\`, \`[[Tone]]\`, \`[[Word Count]]\`.
- Each \`[[Label]]\` automatically becomes a typed parameter users fill in before running.
- Keep the core instruction clear even when all parameters are at their defaults.

## Parameter types you can declare

\`text\` · \`textarea\` · \`number\` · \`boolean\` · \`select\` · \`multiselect\` · \`url\` · \`date\` · \`file\`

## Example Lens

**Title:** Blog Post Outliner
**Description:** Generates a structured outline for any blog topic.
**Template body:**
\`\`\`
You are an expert content strategist.

Create a detailed blog post outline for the topic: [[Topic]]

Tone: [[Tone]]
Target word count: [[Word Count]]
Audience: [[Target Audience]]

Return the outline as a numbered list with H2 and H3 headings.
\`\`\`

**Tags:** writing, content, blogging, outlines
**Visibility:** public

## Publishing checklist

- [ ] Title is unique and searchable
- [ ] Description explains the outcome, not the mechanism
- [ ] All \`[[tokens]]\` have clear, concise labels
- [ ] Template works well with default / empty parameter values
- [ ] At least one relevant tag added
- [ ] Visibility set to \`public\` for maximum reach

Paste this template into any AI provider (ChatGPT, Claude, Gemini, etc.), fill in the fields, and submit the output as your new Lens on LenserFight.`

export const CreateLensModal: React.FC<CreateLensModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  form,
  isSubmitting,
  error,
  isEditMode,
  lensId,
  profileId,
  resolveLocalKey,
}) => {
  const editorRef = useRef<LensContentEditorHandle>(null)
  const { tools } = useTools(undefined, isOpen)
  const [lensInstructionsCopied, setLensInstructionsCopied] = useState(false)

  // ── AI generation state ──────────────────────────────────────────────────
  const [aiPrompt, setAiPrompt] = useState('')
  const aiContext = useMemo(
    () => ({ userTagSlugs: form.tags.filter((t) => !LENS_KIND_REGISTRY[t as LensKind]) }),
    [form.tags],
  )
  const { generate, isGenerating, error: aiError, resetError: resetAiError } = useAICreationGeneration({
    profileId: profileId ?? '',
    generationType: 'lens',
    context: aiContext,
    resolveLocalKey,
  })

  const handleAIGenerate = useCallback(async () => {
    if (!profileId) return
    resetAiError()
    const output = await generate(aiPrompt || null)
    if (output?.type === 'lens') {
      const { title, content, description, suggestedTagSlugs, params } = output.result
      form.setTitle(title)
      form.setContent(content)
      // Pre-select suggested tag slugs that are not lens-kind tags
      if (suggestedTagSlugs.length > 0) {
        const withoutKinds = form.tags.filter((t) => LENS_KIND_REGISTRY[t as LensKind])
        form.setTags([...withoutKinds, ...suggestedTagSlugs])
      }
      // Sync params from content (debounced handler will also pick these up)
      if (params.length > 0) {
        form.setVersionParams(params.map((p) => ({ label: p.label, toolId: '' })))
      }
      void description // description is informational, title is set above
    }
  }, [profileId, aiPrompt, generate, form, resetAiError])

  // ── AI generation state ──────────────────────────────────────────────────
  const [aiPrompt, setAiPrompt] = useState('')
  const aiContext = useMemo(
    () => ({ userTagSlugs: form.tags.filter((t) => !LENS_KIND_REGISTRY[t as LensKind]) }),
    [form.tags],
  )
  const { generate, isGenerating, error: aiError, resetError: resetAiError } = useAICreationGeneration({
    profileId: profileId ?? '',
    generationType: 'lens',
    context: aiContext,
    resolveLocalKey,
  })

  const handleAIGenerate = useCallback(async () => {
    if (!profileId) return
    resetAiError()
    const output = await generate(aiPrompt || null)
    if (output?.type === 'lens') {
      const { title, content, description, suggestedTagSlugs, params } = output.result
      form.setTitle(title)
      form.setContent(content)
      // Pre-select suggested tag slugs that are not lens-kind tags
      if (suggestedTagSlugs.length > 0) {
        const withoutKinds = form.tags.filter((t) => LENS_KIND_REGISTRY[t as LensKind])
        form.setTags([...withoutKinds, ...suggestedTagSlugs])
      }
      // Sync params from content (debounced handler will also pick these up)
      if (params.length > 0) {
        form.setVersionParams(params.map((p) => ({ label: p.label, toolId: '' })))
      }
      void description // description is informational, title is set above
    }
  }, [profileId, aiPrompt, generate, form, resetAiError])

  // ── AI generation state ──────────────────────────────────────────────────
  const [aiPrompt, setAiPrompt] = useState('')
  const aiContext = useMemo(
    () => ({ userTagSlugs: form.tags.filter((t) => !LENS_KIND_REGISTRY[t as LensKind]) }),
    [form.tags],
  )
  const { generate, isGenerating, error: aiError, resetError: resetAiError } = useAICreationGeneration({
    profileId: profileId ?? '',
    generationType: 'lens',
    context: aiContext,
    resolveLocalKey,
  })

  const handleAIGenerate = useCallback(async () => {
    if (!profileId) return
    resetAiError()
    const output = await generate(aiPrompt || null)
    if (output?.type === 'lens') {
      const { title, content, description, suggestedTagSlugs, params } = output.result
      form.setTitle(title)
      form.setContent(content)
      // Pre-select suggested tag slugs that are not lens-kind tags
      if (suggestedTagSlugs.length > 0) {
        const withoutKinds = form.tags.filter((t) => LENS_KIND_REGISTRY[t as LensKind])
        form.setTags([...withoutKinds, ...suggestedTagSlugs])
      }
      // Sync params from content (debounced handler will also pick these up)
      if (params.length > 0) {
        form.setVersionParams(params.map((p) => ({ label: p.label, toolId: '' })))
      }
      void description // description is informational, title is set above
    }
  }, [profileId, aiPrompt, generate, form, resetAiError])

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

  const handleCopyLensInstructions = async () => {
    try {
      await navigator.clipboard.writeText(LENS_CREATION_INSTRUCTIONS)
      setLensInstructionsCopied(true)
      setTimeout(() => setLensInstructionsCopied(false), 2000)
    } catch (e) {
      console.error('Failed to copy lens instructions', e)
    }
  }

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
        {/* Section 0: AI generation (only shown when profileId is available and not editing) */}
        {profileId && !isEditMode && (
          <div className="rounded-2xl border border-surface-border bg-surface-sunken/60 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary-yellow-500" />
              <span className="text-xs font-bold text-greyscale-400 uppercase tracking-widest">
                Generate with AI
              </span>
            </div>
            <TextArea
              id="ai-lens-prompt"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe your lens idea… or leave empty for an AI suggestion"
              maxLength={2000}
              minRows={2}
              maxRows={5}
              disabled={isGenerating}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAIGenerate}
                disabled={isGenerating || isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-yellow-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    {aiPrompt.trim() ? 'Generate from prompt' : 'Suggest a lens'}
                  </>
                )}
              </button>
              <span className="text-xs text-greyscale-400">
                Uses your profile's AI funding source
              </span>
            </div>
            {aiError && (
              <Alert
                variant="error"
                title={friendlyAIError(aiError.code)}
                onDismiss={resetAiError}
              >
                {aiError.message}
              </Alert>
            )}
          </div>
        )}

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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLensInstructions}
                title="Copy Lens creation instructions for AI providers"
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
              >
                {lensInstructionsCopied ? (
                  <>
                    <Check size={13} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    Lens Instructions
                  </>
                )}
              </button>
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

// ─── AI error display helper ──────────────────────────────────────────────────

function friendlyAIError(code: string): string {
  switch (code) {
    case 'PROMPT_TOO_LONG':    return 'Prompt too long'
    case 'TIMEOUT':            return 'Request timed out'
    case 'RATE_LIMITED':       return 'Too many requests'
    case 'CREDIT_EXHAUSTED':   return 'Credits or quota exhausted'
    case 'PROVIDER_ERROR':     return 'AI provider error'
    case 'PARSE_ERROR':        return 'Unexpected AI response'
    case 'NO_LOCAL_KEY':       return 'No local BYOK key configured'
    case 'GATEWAY_ERROR':      return 'Gateway connection failed'
    case 'UNAUTHORIZED':       return 'Not authorized'
    default:                   return 'Generation failed'
  }
}


