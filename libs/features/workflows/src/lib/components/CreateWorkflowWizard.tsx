import { lensesService, workflowsService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useAIModels } from '@lenserfight/features/generations'
import {
  LENS_KIND_ORDER,
  LENS_KIND_REGISTRY,
  resolveLensKindFromTagSlugs,
} from '@lenserfight/features/lens-kinds'
import { FundingSourceToggle, useFundingSource } from '@lenserfight/features/lenses'
import { useChainabitConnection } from '@lenserfight/features/store'
import { Alert, Button, StepWizard } from '@lenserfight/ui/components'
import { Field, Input, SearchBar, SelectField, TextArea } from '@lenserfight/ui/forms'
import { DialogFooterContext, DialogHeaderContext, ModalFooter } from '@lenserfight/ui/overlays'
import { useWizardStep } from '@lenserfight/ui/routing'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CalendarClock, Check, GitBranch, GitFork, KeyRound, Layers, Sparkles } from 'lucide-react'
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useCreateWorkflow } from '../hooks/useCreateWorkflow'
import { useTemplateWorkflows } from '../hooks/useTemplateWorkflows'
import { useUpdateWorkflow } from '../hooks/useUpdateWorkflow'

import { WorkflowCronPanel } from './WorkflowCronPanel'

import type { WorkflowCronPanelRef } from './WorkflowCronPanel'
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
  {
    label: 'Schedule',
    title: 'Schedule your workflow',
    description: 'Set up a recurring CRON schedule — optional, skip anytime.',
    icon: <CalendarClock size={20} />,
  },
]

const CREATE_WORKFLOW_COMPLETE_ICON = <Sparkles size={14} />

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
  const navigate = useNavigate()
  const [showTemplatePicker, setShowTemplatePicker] = useState(!editMode)
  const { data: templates = [], isLoading: templatesLoading } = useTemplateWorkflows(12)
  const { mutate: forkTemplate, isPending: isForking } = useMutation({
    mutationFn: (templateId: string) => workflowsService.forkWorkflow(templateId),
    onSuccess: (newWorkflow) => {
      onCancel()
      navigate(`/workflows/${newWorkflow.id}`)
    },
  })
  const { user } = useAuth()
  const { step, goToStep } = useWizardStep({ maxStep: editMode ? 1 : 3 })
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
  const chainabit = useChainabitConnection()

  const cronPanelRef = useRef<WorkflowCronPanelRef>(null)

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

  const handleCreate = async () => {
    setLocalError(null)
    try {
      // Case A: create mode, step 3 — workflow already created, flush any pending cron then finish
      if (!editMode && createdWorkflowId) {
        await cronPanelRef.current?.save()
        onCreated(createdWorkflowId)
        return
      }

      // Case B: edit mode, step 1 — save metadata changes and close
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

      // Case C: create mode, step 2 — create workflow, advance to schedule step
      const workflow = await submit({
        title: titleValue,
        description: description.trim() || undefined,
        visibility,
      })

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
      goToStep(3)
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof (err as { message?: string })?.message === 'string'
            ? (err as { message: string }).message
            : 'Something went wrong. Please try again.'
      setLocalError(msg)
    }
  }

  const handleNext = () => {
    if (step === 0) {
      if (titleValue.length < 3) {
        setLocalError('Title must be at least 3 characters.')
        return
      }
      setLocalError(null)
      goToStep(1)
    } else if (step === 1 && !editMode) {
      if (defaultModelId && typeof window !== 'undefined') {
        localStorage.setItem('lf-workflow-global-model', defaultModelId)
      }
      setLocalError(null)
      goToStep(2)
    } else if (step === 2) {
      handleCreate()
    }
  }

  const { setHeader, clearHeader } = useContext(DialogHeaderContext)
  const { setFooter, clearFooter } = useContext(DialogFooterContext)

  const stableOnCancel = useCallback(() => onCancel(), [onCancel])

  useEffect(() => {
    if (!showTemplatePicker || editMode) return
    setHeader({
      title: 'Start your workflow',
      description: 'Pick a template to get started quickly, or build from scratch.',
      icon: <Sparkles size={18} />,
      action: (
        <Button size="sm" onClick={() => setShowTemplatePicker(false)} className="gap-1.5">
          <GitBranch size={12} /> Start blank
        </Button>
      ),
    })
    setFooter(
      <ModalFooter
        leftButton={{ label: 'Cancel', onClick: stableOnCancel, variant: 'ghost' }}
      />
    )
    return () => {
      clearHeader()
      clearFooter()
    }
  }, [showTemplatePicker, editMode, stableOnCancel, setHeader, setFooter, clearHeader, clearFooter])

  if (showTemplatePicker && !editMode) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {templatesLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-surface-raised animate-pulse" />
        ))}
        {!templatesLoading && templates.length === 0 && (
          <div className="sm:col-span-2 flex flex-col items-center gap-3 rounded-2xl border border-surface-border bg-surface-raised p-6 text-center">
            <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
              No templates available yet.
            </p>
            <Button size="sm" onClick={() => setShowTemplatePicker(false)} className="gap-1.5">
              <GitBranch size={12} /> Start blank
            </Button>
          </div>
        )}
        {!templatesLoading && templates.map((tpl) => (
          <div
            key={tpl.id}
            className="flex flex-col gap-2 rounded-2xl border border-surface-border bg-surface-raised p-3 hover:border-primary-yellow-500/40 hover:bg-primary-yellow-500/5 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50 truncate leading-tight">
                {tpl.title.replace(/^Template\s*·\s*/i, '')}
              </p>
              {tpl.description && (
                <p className="mt-0.5 text-[11px] text-greyscale-400 line-clamp-2 leading-relaxed">
                  {tpl.description}
                </p>
              )}
              <p className="mt-1 text-[10px] text-greyscale-400">
                {tpl.node_count} node{tpl.node_count !== 1 ? 's' : ''}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              isLoading={isForking}
              onClick={() => forkTemplate(tpl.id)}
              className="gap-1.5 self-start"
            >
              <GitFork size={11} /> Use template
            </Button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <StepWizard
      steps={editMode ? [WIZARD_STEPS[0], WIZARD_STEPS[3]] : WIZARD_STEPS}
      currentStep={step}
      onNext={handleNext}
      onBack={() => goToStep(Math.max(0, step - 1))}
      onComplete={handleCreate}
      onCancel={handleCancel}
      canProceed={step === 0 ? titleValue.length >= 3 : true}
      isCompleting={isSubmitting}
      completeLabel={editMode ? 'Save Changes' : createdWorkflowId ? 'Done' : 'Create workflow'}
      completeIcon={editMode || createdWorkflowId ? undefined : CREATE_WORKFLOW_COMPLETE_ICON}
      skipButton={
        !editMode && step === 3
          ? { label: 'Skip for now', onClick: () => onCreated(createdWorkflowId!) }
          : undefined
      }
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

      {step === 1 && !editMode && (
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
            localKeyAvailability={funding.localKeyAvailability}
            onAddLocalKey={funding.addLocalKey}
            onRemoveLocalKey={funding.removeLocalKey}
            onUpdateLocalKey={funding.updateLocalKey}
            onPairGateway={funding.pairGateway}
            onRefreshLocalKeys={funding.refreshLocalKeys}
            walletBalance={funding.walletBalance}
            canUseBYOK={funding.canUseBYOK}
            chainabitState={chainabit.state}
            chainabitModels={chainabit.models}
            onChainabitConnect={chainabit.reconnect}
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

      {step === 3 && createdWorkflowId && (
        <div className="space-y-3">
          <WorkflowCronPanel
            ref={cronPanelRef}
            workflowId={createdWorkflowId}
            isOwner={true}
            hideSaveButton={true}
          />
          <p className="text-xs leading-5 text-greyscale-400 px-1">
            Schedules save when you click Done or skip. You can also manage them later from the Run panel.
          </p>
        </div>
      )}

      {step === 1 && editMode && initialWorkflow && (
        <WorkflowCronPanel workflowId={initialWorkflow.id} isOwner={true} />
      )}
    </StepWizard>
  )
}
