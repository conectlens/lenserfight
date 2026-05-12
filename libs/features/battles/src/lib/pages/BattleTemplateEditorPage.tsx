import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

import { battlesRepository } from '@lenserfight/data/repositories'
import type { BattleTemplateRecord, CreateTemplateInput } from '@lenserfight/data/repositories'
import { Button, PageHeader, SEOHead } from '@lenserfight/ui/components'

// Phase BD — dual-mode (create / edit) authoring page for battle templates.
// Mounted at /battles/templates/new and /battles/templates/:id/edit.

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

export function BattleTemplateEditorPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdit = Boolean(id)

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
      navigate('/battles/templates')
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
      navigate('/battles/templates')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: () => battlesRepository.deleteTemplate(id as string),
    onSuccess: () => {
      toast.success('Template deleted')
      qc.invalidateQueries({ queryKey: ['public-battle-templates'] })
      navigate('/battles/templates')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim()) {
      toast.error('Title is required.')
      return
    }
    if (!form.taskPrompt.trim()) {
      toast.error('Task prompt is required.')
      return
    }
    const input = formToInput(form)
    if (isEdit) updateMutation.mutate(input)
    else createMutation.mutate(input)
  }

  const handleDelete = () => {
    if (!isEdit) return
    if (!window.confirm('Delete this template? This cannot be undone from the UI.')) return
    deleteMutation.mutate()
  }

  const busy =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <SEOHead
        type="battles-list"
        overrideTitle={isEdit ? 'Edit Template — LenserFight' : 'New Template — LenserFight'}
      />

      <PageHeader
        title={isEdit ? 'Edit Battle Template' : 'New Battle Template'}
        description={
          isEdit
            ? 'Update your template. Toggle “public” to feature it in the public gallery.'
            : 'Compose a reusable task brief. Templates can be shared publicly or kept private.'
        }
      />

      {isEdit && isLoadingExisting ? (
        <div className="mt-6 h-40 rounded-2xl bg-surface-raised animate-pulse" />
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <Field label="Title" required>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              maxLength={200}
              className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm"
              required
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              rows={3}
              maxLength={2000}
              className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Task prompt" required>
            <textarea
              value={form.taskPrompt}
              onChange={(e) => setForm((s) => ({ ...s, taskPrompt: e.target.value }))}
              rows={8}
              maxLength={32000}
              className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm font-mono"
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Category">
              <select
                value={form.category}
                onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
                className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value || 'none'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Max contenders">
              <input
                type="number"
                min={2}
                max={16}
                value={form.maxContenders}
                onChange={(e) =>
                  setForm((s) => ({ ...s, maxContenders: Math.max(2, Number(e.target.value) || 2) }))
                }
                className="w-full rounded-xl border border-surface-border bg-surface-base px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-base px-4 py-3">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => setForm((s) => ({ ...s, isPublic: e.target.checked }))}
              className="h-4 w-4"
            />
            <div className="text-sm">
              <div className="font-semibold text-greyscale-100">Public</div>
              <div className="text-xs text-greyscale-400">
                Anyone can find this template in the public gallery and start a battle from it.
              </div>
            </div>
          </label>

          <div className="flex items-center justify-between gap-2 pt-2">
            <div>
              {isEdit && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  disabled={busy}
                >
                  <Trash2 size={14} className="mr-1" /> Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => navigate('/battles/templates')}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {isEdit ? (updateMutation.isPending ? 'Saving…' : 'Save') : createMutation.isPending ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wider text-greyscale-500">
        {label} {required && <span className="text-red-400">*</span>}
      </span>
      {children}
    </label>
  )
}

export default BattleTemplateEditorPage
