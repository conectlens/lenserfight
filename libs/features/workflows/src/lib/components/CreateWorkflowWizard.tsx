import { lensesService, workflowsService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useAIModels } from '@lenserfight/features/generations'
import {
  LENS_KIND_ORDER,
  LENS_KIND_REGISTRY,
  resolveLensKindFromTagSlugs,
} from '@lenserfight/features/lens-kinds'
import { FundingSourceToggle, useFundingSource } from '@lenserfight/features/lenses'
import { Alert, Badge, Button, StepWizard } from '@lenserfight/ui/components'
import { Field, Input, SearchBar, SelectField, TextArea } from '@lenserfight/ui/forms'
import { useWizardStep } from '@lenserfight/ui/routing'
import { useQuery } from '@tanstack/react-query'
import { Check, GitBranch, KeyRound, Layers, Sparkles } from 'lucide-react'
import React, { useState } from 'react'

import { useCreateWorkflow } from '../hooks/useCreateWorkflow'
import { useUpdateWorkflow } from '../hooks/useUpdateWorkflow'

import type { LensKind, LensViewModel, PersonalLensFeedItem } from '@lenserfight/types'
import type { WizardStepConfig } from '@lenserfight/ui/components'

export interface CreateWorkflowWizardProps {
  onCreated: (workflowId: string) => void
  onCancel: () => void
  /** When provided, the wizard runs in edit mode: only step 0 is shown and it updates the existing workflow. */
  editMode?: boolean
  initialWorkflow?: {
    id: string
    title: string
    description?: string | null
    visibility: string
  }
}

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
  { value: 'unlisted', label: 'Unlisted' },
] as const

const WIZARD_STEPS: WizardStepConfig[] = [
  {
    label: 'Details',
    title: 'Build a Connected Lens workflow',
    description: 'Give your workflow a name and visibility, then pick the starting lenses.',
    icon: <GitBranch size={20} />,
  },
  {
    label: 'Funding & Model',
    title: 'Choose how to run',
    description: 'Select a funding source and default AI model for this workflow.',
    icon: <KeyRound size={20} />,
  },
  {
    label: 'Add Lenses',
    title: 'Choose starting lenses',
    description: 'Pick one or more lenses to add as nodes. You can always add more in the canvas editor.',
    icon: <Layers size={20} />,
  },
]

// ─── Lens picker (inline, no new file) ────────────────────────────────────────

type PickableLens = Pick<LensViewModel, 'id' | 'title' | 'description' | 'visibility' | 'tags'>

interface LensPickerProps {
  lenserId: string | undefined
  selected: string[]
  onToggle: (id: string, title: string) => void
}

function LensPicker({ lenserId, selected, onToggle }: LensPickerProps) {
  const [tab, setTab] = useState<'mine' | 'popular'>('mine')
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<LensKind | null>(null)

  // My lenses via personal feed (session-based, respects RLS)
  const { data: personalData, isLoading: loadingPersonal } = useQuery({
    queryKey: ['lens-picker-personal', lenserId],
    queryFn: () => lensesService.getPersonalFeed(lenserId ?? '', 0, 12),
    enabled: !!lenserId,
    staleTime: 1000 * 60,
  })
  const myLenses: PickableLens[] = (personalData?.data ?? []) as PersonalLensFeedItem[]

  // Auto-switch to popular if user has no personal lenses
  const effectiveTab = myLenses.length === 0 && !loadingPersonal ? 'popular' : tab

  // Popular lenses
  const { data: popularData, isLoading: loadingPopular } = useQuery({
    queryKey: ['lens-picker-popular'],
    queryFn: () => lensesService.sort('popular', 0, 12),
    enabled: effectiveTab === 'popular' || myLenses.length === 0,
    staleTime: 1000 * 60 * 5,
  })
  const popularLenses: PickableLens[] = popularData?.data ?? []

  // Search results (respects RLS — only public or owned lenses returned)
  const { data: searchData, isLoading: loadingSearch } = useQuery({
    queryKey: ['lens-picker-search', search],
    queryFn: () => lensesService.search(search, 0, 8),
    enabled: search.length >= 2,
    staleTime: 5000,
  })
  const searchResults: PickableLens[] = searchData?.data ?? []

  const rawLenses: PickableLens[] =
    search.length >= 2 ? searchResults : effectiveTab === 'mine' ? myLenses : popularLenses
  const displayLenses: PickableLens[] = kindFilter
    ? rawLenses.filter(
        (l) => resolveLensKindFromTagSlugs(l.tags?.map((t) => t.slug) ?? []) === kindFilter,
      )
    : rawLenses
  const isLoading =
    search.length >= 2 ? loadingSearch : effectiveTab === 'mine' ? loadingPersonal : loadingPopular

  return (
    <div className="space-y-3">
      {/* Search */}
      <SearchBar
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch('')}
        placeholder="Search lenses…"
      />

      {/* Tabs (only shown when search is empty) */}
      {search.length < 2 && myLenses.length > 0 && (
        <div className="flex gap-2">
          {(['mine', 'popular'] as const).map((t) => (
            <Button
              key={t}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTab(t)}
              className={`!rounded-full !text-xs !font-semibold !px-3 !py-1 ${
                effectiveTab === t
                  ? '!bg-primary-yellow-500 !text-white hover:!bg-primary-yellow-500'
                  : '!bg-surface-raised !text-greyscale-500 hover:!text-greyscale-900 dark:hover:!text-greyscale-50 hover:!bg-surface-raised'
              }`}
            >
              {t === 'mine' ? 'My Lenses' : 'Popular'}
            </Button>
          ))}
        </div>
      )}

      {/* Kind filter */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setKindFilter(null)}
          className={`text-xs rounded-full px-2.5 py-1 font-semibold transition-colors ${
            kindFilter === null
              ? 'bg-primary-yellow-500/15 text-primary-yellow-600'
              : 'bg-surface-raised text-greyscale-500 hover:text-greyscale-900 dark:hover:text-greyscale-50'
          }`}
        >
          All kinds
        </button>
        {LENS_KIND_ORDER.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKindFilter(kindFilter === k ? null : k)}
            title={LENS_KIND_REGISTRY[k].description}
            className={`text-xs rounded-full px-2.5 py-1 font-semibold transition-colors ${
              kindFilter === k
                ? 'bg-primary-yellow-500/15 text-primary-yellow-600'
                : 'bg-surface-raised text-greyscale-500 hover:text-greyscale-900 dark:hover:text-greyscale-50'
            }`}
          >
            {LENS_KIND_REGISTRY[k].label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="max-h-64 overflow-y-auto space-y-1 rounded-2xl border border-surface-border bg-surface-base p-1">
        {isLoading && (
          <div className="flex flex-col gap-1 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl bg-surface-raised animate-pulse" />
            ))}
          </div>
        )}
        {!isLoading && displayLenses.length === 0 && (
          <p className="py-6 text-center text-sm text-greyscale-400">
            {search.length >= 2 ? 'No lenses found.' : 'No lenses available.'}
          </p>
        )}
        {!isLoading &&
          displayLenses.map((lens) => {
            const isSelected = selected.includes(lens.id)
            return (
              <Button
                key={lens.id}
                type="button"
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => onToggle(lens.id, lens.title)}
                className={`!justify-start !gap-3 !rounded-xl !px-3 !py-2.5 text-left !font-normal !border ${
                  isSelected
                    ? '!bg-primary-yellow-500/10 !border-primary-yellow-500/30 hover:!bg-primary-yellow-500/10'
                    : 'hover:!bg-surface-raised !border-transparent'
                }`}
              >
                <div
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors ${
                    isSelected
                      ? 'bg-primary-yellow-500 border-primary-yellow-500'
                      : 'border-greyscale-300 dark:border-greyscale-600'
                  }`}
                >
                  {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-greyscale-900 dark:text-greyscale-50">
                    {lens.title}
                  </p>
                </div>
                {lens.visibility !== 'public' && (
                  <span className="flex-shrink-0 text-xs text-greyscale-400 capitalize">{lens.visibility}</span>
                )}
              </Button>
            )
          })}
      </div>

      {selected.length > 0 && (
        <p className="text-xs text-greyscale-500">
          {selected.length} lens{selected.length > 1 ? 'es' : ''} selected — will be added as nodes in the canvas.
        </p>
      )}
    </div>
  )
}

// ─── Wizard ──────────────────────────────────────────────────────────────────

export const CreateWorkflowWizard: React.FC<CreateWorkflowWizardProps> = ({ onCreated, onCancel, editMode, initialWorkflow }) => {
  const { user } = useAuth()
  const { step, goToStep } = useWizardStep({ maxStep: editMode ? 0 : 2 })
  const { submit, isSubmitting: isCreating, error: submissionError } = useCreateWorkflow()
  const { mutateAsync: updateWorkflow, isPending: isUpdating } = useUpdateWorkflow(initialWorkflow?.id ?? '')
  const isSubmitting = isCreating || isUpdating
  const { models, isLoading: modelsLoading } = useAIModels()

  const [title, setTitle] = useState(initialWorkflow?.title ?? '')
  const [description, setDescription] = useState(initialWorkflow?.description ?? '')
  const [visibility, setVisibility] = useState<(typeof VISIBILITY_OPTIONS)[number]['value']>(
    (initialWorkflow?.visibility as (typeof VISIBILITY_OPTIONS)[number]['value']) ?? 'public'
  )
  const [localError, setLocalError] = useState<string | null>(null)
  const [createdWorkflowId, setCreatedWorkflowId] = useState<string | null>(null)
  const [defaultModelId, setDefaultModelId] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('lf-workflow-global-model') ?? ''
  })

  // Funding source (delegates to useFundingSource from lenses feature)
  const funding = useFundingSource(defaultModelId)

  // Lens picker state: map of id → title for selected lenses
  const [selectedLenses, setSelectedLenses] = useState<Map<string, string>>(new Map())

  const modelOptions = models
    .filter((m) => !!m.key && m.is_active)
    .map((m) => ({
      value: m.key,
      label: `${m.name} (${m.providerDisplayName ?? m.provider})`,
    }))

  const titleValue = title.trim()
  const error = localError ?? submissionError

  const toggleLens = (id: string, title: string) => {
    setSelectedLenses((prev) => {
      const next = new Map(prev)
      if (next.has(id)) next.delete(id)
      else next.set(id, title)
      return next
    })
  }

  const reset = () => {
    setTitle('')
    setDescription('')
    setVisibility('public')
    setLocalError(null)
    setCreatedWorkflowId(null)
    setSelectedLenses(new Map())
    setDefaultModelId(localStorage.getItem('lf-workflow-global-model') ?? '')
  }

  const handleCancel = () => {
    reset()
    onCancel()
  }

  const handleNext = () => {
    if (step === 0) {
      if (titleValue.length < 3) {
        setLocalError('Title must be at least 3 characters.')
        return
      }
      setLocalError(null)
      goToStep(1)
    } else if (step === 1) {
      // Persist model selection for the builder page
      if (defaultModelId && typeof window !== 'undefined') {
        localStorage.setItem('lf-workflow-global-model', defaultModelId)
      }
      setLocalError(null)
      goToStep(2)
    }
  }

  const handleCreate = async () => {
    setLocalError(null)
    try {
      if (editMode && initialWorkflow) {
        await updateWorkflow({
          title: titleValue,
          description: description.trim() || null,
          visibility,
        })
        onCreated(initialWorkflow.id)
        onCancel()
        return
      }

      const workflow = await submit({
        title: titleValue,
        description: description.trim() || undefined,
        visibility,
      })

      // Upsert selected lenses as initial nodes
      if (selectedLenses.size > 0) {
        const nodes = Array.from(selectedLenses.entries()).map(([lens_id, label], i) => ({
          lens_id,
          version_id: null,
          label,
          ordinal: i,
          position_x: i * 220,
          position_y: 0,
        }))
        await workflowsService.upsertNodes(workflow.id, nodes)
      }

      setCreatedWorkflowId(workflow.id)
      onCreated(workflow.id)
    } catch (err) {
      // Stay on current step — never navigate back automatically on error
      const msg =
        err instanceof Error
          ? err.message
          : typeof (err as { message?: string })?.message === 'string'
            ? (err as { message: string }).message
            : 'Something went wrong. Please try again.'
      setLocalError(msg)
    }
  }

  if (createdWorkflowId) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-status-green/10">
          <Check size={28} className="text-status-green" />
        </div>
        <div className="space-y-2">
          <Badge color="green" variant="outline">Workflow created</Badge>
          <h2 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-50">
            Your workflow is ready.
          </h2>
          <p className="text-sm leading-6 text-greyscale-500 dark:text-greyscale-400">
            {selectedLenses.size > 0
              ? `Added ${selectedLenses.size} lens${selectedLenses.size > 1 ? 'es' : ''} as nodes. Connect them in the canvas builder.`
              : 'We saved the metadata and handed you off to the builder so you can start connecting lenses.'}
          </p>
        </div>
        <Button onClick={handleCancel} variant="ghost" className="w-auto">
          Close
        </Button>
      </div>
    )
  }

  return (
    <StepWizard
      steps={editMode ? [WIZARD_STEPS[0]] : WIZARD_STEPS}
      currentStep={step}
      onNext={handleNext}
      onBack={() => goToStep(Math.max(0, step - 1))}
      onComplete={handleCreate}
      onCancel={handleCancel}
      canProceed={step === 0 ? titleValue.length >= 3 : true}
      isCompleting={isSubmitting}
      completeLabel={editMode ? 'Save Changes' : 'Create workflow'}
      completeIcon={editMode ? undefined : <Sparkles size={14} />}
    >
      {step === 0 && (
        <div className="space-y-4">
          <Field
            id="workflow-title"
            label="Workflow title"
            required
            error={localError && titleValue.length < 3 ? localError : undefined}
            hint="Keep it concise but descriptive."
          >
            <Input
              id="workflow-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Research → Draft → Polish"
              maxLength={120}
            />
          </Field>

          <Field
            id="workflow-description"
            label="Description"
            hint="Optional context for other lensers who open the workflow later."
          >
            <TextArea
              id="workflow-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what this workflow should do."
              minRows={4}
              maxRows={8}
            />
          </Field>

          <SelectField
            label="Visibility"
            value={visibility}
            onChange={(value) => setVisibility(value as (typeof VISIBILITY_OPTIONS)[number]['value'])}
            options={[...VISIBILITY_OPTIONS]}
            placeholder="Choose visibility"
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <FundingSourceToggle
            fundingSource={funding.fundingSource}
            onFundingSourceChange={funding.setFundingSource}
            selectedKeyRefId={funding.selectedKeyRefId}
            onKeyRefIdChange={funding.setSelectedKeyRefId}
            availableKeys={funding.availableKeys}
            selectedLocalKeyId={funding.selectedLocalKeyId}
            onLocalKeyIdChange={funding.setSelectedLocalKeyId}
            availableLocalKeys={funding.localKeys}
            onAddLocalKey={funding.addLocalKey}
            walletBalance={funding.walletBalance}
            canUseBYOK={funding.canUseBYOK}
          />

          <SelectField
            label="Default AI Model"
            value={defaultModelId}
            onChange={setDefaultModelId}
            options={modelOptions}
            placeholder={modelsLoading ? 'Loading models…' : 'Select a model'}
            disabled={modelsLoading}
          />

          <p className="text-xs leading-5 text-greyscale-400">
            You can change the model per-node or globally later in the builder.
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <LensPicker
            lenserId={user?.id}
            selected={Array.from(selectedLenses.keys())}
            onToggle={toggleLens}
          />
          <p className="text-xs leading-5 text-greyscale-400">
            Selection is optional — you can add and connect lenses later in the canvas editor.
          </p>
          {error && step === 2 && (
            <Alert variant="error" title={error} onDismiss={() => setLocalError(null)} />
          )}
        </div>
      )}
    </StepWizard>
  )
}
