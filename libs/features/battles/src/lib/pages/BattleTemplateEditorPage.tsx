import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FileText, Settings2, Trash2 } from 'lucide-react'

import { battlesRepository } from '@lenserfight/data/repositories'
import type { BattleTemplateRecord, CreateTemplateInput } from '@lenserfight/data/repositories'
import { Button } from '@lenserfight/ui/components'
import { StepWizard } from '@lenserfight/ui/components'
import type { WizardStepConfig } from '@lenserfight/ui/components'
import { Input, TextArea } from '@lenserfight/ui/forms'
import { AnimatePresence, motion } from 'framer-motion'

export interface BattleTemplateEditorPageProps {
  onSuccess?: () => void
  onClose?: () => void
}

// ─── Step config ──────────────────────────────────────────────────────────────

const WIZARD_STEPS: WizardStepConfig[] = [
  {
    label: 'Brief',
    title: 'Task brief',
    description: 'Give your template a title and write the task prompt that contenders will respond to.',
    icon: <FileText size={16} />,
  },
  {
    label: 'Settings',
    title: 'Template settings',
    description: 'Choose a category, contender limit, and whether to share publicly.',
    icon: <Settings2 size={16} />,
  },
]

const CATEGORY_OPTIONS = [
  { value: '', label: 'Uncategorized' },
  { value: 'creative', label: 'Creative' },
  { value: 'technical', label: 'Technical' },
  { value: 'business', label: 'Business' },
  { value: 'gaming', label: 'Gaming' },
]

interface FormState {
  title: string
  description: string
  taskPrompt: string
  category: string
  maxContenders: number
  isPublic: boolean
}

const INITIAL: FormState = {
  title: '',
  description: '',
  taskPrompt: '',
  category: '',
  maxContenders: 2,
  isPublic: false,
}

function recordToForm(rec: BattleTemplateRecord): FormState {
  return {
    title: rec.title ?? '',
    description: rec.description ?? '',
    taskPrompt: rec.task_prompt ?? '',
    category: rec.category ?? '',
    maxContenders: rec.max_contenders ?? 2,
    isPublic: Boolean(rec.is_public),
  }
}

function formToInput(form: FormState): CreateTemplateInput {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    taskPrompt: form.taskPrompt,
    category: form.category || null,
    maxContenders: form.maxContenders,
    isPublic: form.isPublic,
  }
}

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 32 : -32 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.25, ease: [0, 0, 0.2, 1] as [number, number, number, number] } },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -32 : 32, transition: { duration: 0.18 } }),
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BattleTemplateEditorPage({ onSuccess, onClose }: BattleTemplateEditorPageProps) {
  const { id } = useParams<{ id?: string }>()
  const qc = useQueryClient()
  const isEdit = Boolean(id)

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [form, setForm] = useState<FormState>(INITIAL)

  const { data: existing, isLoading: isLoadingExisting } = useQuery<BattleTemplateRecord | null>({
    queryKey: ['battle-template', id],
    queryFn: () => (id ? battlesRepository.getTemplateById(id) : Promise.resolve(null)),
    enabled: isEdit,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (existing) setForm(recordToForm(existing))
  }, [existing])

  const createMutation = useMutation({
    mutationFn: (input: CreateTemplateInput) => battlesRepository.createTemplate(input),
    onSuccess: () => {
      toast.success('Template created')
      qc.invalidateQueries({ queryKey: ['public-battle-templates'] })
      onSuccess?.()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: (input: Partial<CreateTemplateInput>) =>
      battlesRepository.updateTemplate(id as string, input),
    onSuccess: () => {
      toast.success('Template saved')
      qc.invalidateQueries({ queryKey: ['public-battle-templates'] })
      qc.invalidateQueries({ queryKey: ['battle-template', id] })
      onSuccess?.()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => battlesRepository.deleteTemplate(id as string),
    onSuccess: () => {
      toast.success('Template deleted')
      qc.invalidateQueries({ queryKey: ['public-battle-templates'] })
      onSuccess?.()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const busy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const handleDelete = () => {
    if (!isEdit) return
    if (!window.confirm('Delete this template? This cannot be undone from the UI.')) return
    deleteMutation.mutate()
  }

  const handleSave = () => {
    if (!form.title.trim()) { toast.error('Title is required.'); return }
    if (!form.taskPrompt.trim()) { toast.error('Task prompt is required.'); return }
    const input = formToInput(form)
    if (isEdit) updateMutation.mutate(input)
    else createMutation.mutate(input)
  }

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  const canProceed = step === 0
    ? form.title.trim().length >= 3 && form.taskPrompt.trim().length >= 1
    : true

  const stepValidity: boolean[] = [
    form.title.trim().length >= 3 && form.taskPrompt.trim().length >= 1,
    true,
  ]

  if (isEdit && isLoadingExisting) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 rounded-2xl bg-surface-raised animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="w-full">
      <StepWizard
        steps={WIZARD_STEPS}
        currentStep={step}
        onNext={() => go(step + 1)}
        onBack={() => go(step - 1)}
        onComplete={handleSave}
        onCancel={onClose}
        canProceed={canProceed}
        isNextLoading={busy}
        isCompleting={busy}
        nextLabel="Next"
        completeLabel={isEdit ? 'Save Template' : 'Create Template'}
        stepValidity={stepValidity}
        onStepClick={go}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {/* ── Step 0: Task brief ──────────────────────────────────── */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                    Title <span className="text-status-red">*</span>
                  </label>
                  <Input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                    maxLength={200}
                    placeholder="e.g. Write a cover letter for a senior engineer role"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                    Short description <span className="font-normal text-greyscale-400">(optional)</span>
                  </label>
                  <Input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                    maxLength={200}
                    placeholder="One-line summary shown in the gallery"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                    Task prompt <span className="text-status-red">*</span>
                  </label>
                  <TextArea
                    value={form.taskPrompt}
                    onChange={(e) => setForm((s) => ({ ...s, taskPrompt: e.target.value }))}
                    placeholder="Write the full task brief that contenders will receive. Be specific about what a great response looks like."
                    minRows={6}
                    autoResize={false}
                    className="font-mono text-sm"
                  />
                  <p className="mt-1.5 text-xs text-greyscale-400">
                    {form.taskPrompt.length.toLocaleString()} / 32,000 characters
                  </p>
                </div>
              </div>
            )}

            {/* ── Step 1: Settings ────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                      Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
                      className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-greyscale-900 dark:text-greyscale-50 focus:border-primary-yellow-500 focus:outline-none"
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value || 'none'} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                      Max contenders
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={16}
                      value={form.maxContenders}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, maxContenders: Math.max(2, Number(e.target.value) || 2) }))
                      }
                      className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-greyscale-900 dark:text-greyscale-50 focus:border-primary-yellow-500 focus:outline-none"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface-base px-4 py-3 cursor-pointer hover:border-greyscale-400 dark:hover:border-greyscale-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(e) => setForm((s) => ({ ...s, isPublic: e.target.checked }))}
                    className="h-4 w-4 accent-primary-yellow-500"
                  />
                  <div className="text-sm">
                    <div className="font-semibold text-greyscale-900 dark:text-greyscale-50">Public template</div>
                    <div className="text-xs text-greyscale-400 mt-0.5">
                      Anyone can find this template in the public gallery and start a battle from it.
                    </div>
                  </div>
                </label>

                {isEdit && (
                  <div className="border-t border-surface-border pt-4">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={handleDelete}
                      disabled={busy}
                    >
                      <Trash2 size={14} className="mr-1" /> Delete template
                    </Button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </StepWizard>
    </div>
  )
}

export default BattleTemplateEditorPage
