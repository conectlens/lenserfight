import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BookOpen, Settings2, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

import { battlesRepository } from '@lenserfight/data/repositories'
import type { BattleTemplateRecord, CreateTemplateInput } from '@lenserfight/data/repositories'
import { Badge, Button, HelpButton, StepWizard } from '@lenserfight/ui/components'
import type { WizardStepConfig } from '@lenserfight/ui/components'
import { Input, TextArea } from '@lenserfight/ui/forms'

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
    action: (
      <div className="flex items-center gap-2">
        <Badge color="purple" variant="outline">Template</Badge>
        <HelpButton path="/tutorials/battle-walkthroughs/your-first-battle" label="About templates" />
      </div>
    ),
  },
  {
    label: 'Settings',
    title: 'Template settings',
    description: 'Choose a category, contender limit, and whether to share publicly.',
    action: <HelpButton path="/how-to/battles/create-a-battle" label="Battle templates" />,
  },
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

const CATEGORY_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: '', label: 'Uncategorized', description: 'No specific category' },
  { value: 'creative', label: 'Creative', description: 'Writing, art, storytelling' },
  { value: 'technical', label: 'Technical', description: 'Code, engineering, data' },
  { value: 'business', label: 'Business', description: 'Strategy, marketing, ops' },
  { value: 'gaming', label: 'Gaming', description: 'Game design, narratives' },
]

const CONTENDER_OPTIONS = [2, 4, 8, 16]

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
        completeIcon={<BookOpen size={15} className="mr-1.5" />}
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
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                    Template title
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
                    placeholder="Add context for participants and voters, e.g. what success looks like."
                    minRows={4}
                    autoResize={false}
                  />
                </div>
              </div>
            )}

            {/* ── Step 1: Settings ────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-6">

                <div>
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-greyscale-400">
                    Category
                  </h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value || 'none'}
                        type="button"
                        variant="ghost"
                        onClick={() => setForm((s) => ({ ...s, category: opt.value }))}
                        className={`!justify-start !gap-3 !rounded-2xl !border-2 !px-4 !py-3 w-full !font-normal text-left !transition-colors ${
                          form.category === opt.value
                            ? '!border-primary-yellow-500 !bg-primary-yellow-500/5 hover:!bg-primary-yellow-500/5'
                            : '!border-surface-border hover:!border-greyscale-300 dark:hover:!border-greyscale-600 !bg-transparent hover:!bg-transparent'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${form.category === opt.value ? 'text-primary-yellow-600 dark:text-primary-yellow-400' : 'text-greyscale-900 dark:text-greyscale-50'}`}>
                            {opt.label}
                          </p>
                          <p className="text-xs text-greyscale-400 mt-0.5">{opt.description}</p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-surface-border pt-6">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-greyscale-400">
                    Max contenders
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {CONTENDER_OPTIONS.map((n) => (
                      <Button
                        key={n}
                        type="button"
                        variant="ghost"
                        onClick={() => setForm((s) => ({ ...s, maxContenders: n }))}
                        className={`!rounded-xl !border-2 !px-4 !py-2 !text-sm !font-semibold !transition-colors ${
                          form.maxContenders === n
                            ? '!border-primary-yellow-500 !bg-primary-yellow-500/5 !text-primary-yellow-600 hover:!bg-primary-yellow-500/5 dark:!text-primary-yellow-400'
                            : '!border-surface-border hover:!border-greyscale-300 dark:hover:!border-greyscale-600 !bg-transparent hover:!bg-transparent !text-greyscale-700 dark:!text-greyscale-300'
                        }`}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-surface-border pt-6">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-greyscale-400">
                    Visibility
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setForm((s) => ({ ...s, isPublic: !s.isPublic }))}
                    className={`!justify-start !gap-3 !rounded-2xl !border-2 !px-4 !py-3 w-full !font-normal text-left !transition-colors ${
                      form.isPublic
                        ? '!border-primary-yellow-500 !bg-primary-yellow-500/5 hover:!bg-primary-yellow-500/5'
                        : '!border-surface-border hover:!border-greyscale-300 dark:hover:!border-greyscale-600 !bg-transparent hover:!bg-transparent'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${form.isPublic ? 'text-primary-yellow-600 dark:text-primary-yellow-400' : 'text-greyscale-900 dark:text-greyscale-50'}`}>
                        {form.isPublic ? 'Public template' : 'Private template'}
                      </p>
                      <p className="text-xs text-greyscale-400 mt-0.5">
                        {form.isPublic
                          ? 'Anyone can find this template in the public gallery and start a battle from it.'
                          : 'Only you can see and use this template.'}
                      </p>
                    </div>
                  </Button>
                </div>

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
