import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { Drawer } from '@lenserfight/ui/overlays'
import type {
  CreateEvaluationInput,
  EvaluationRecord,
  EvaluationTargetType,
} from '@lenserfight/types'
import React, { useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  ownerLenserId: string
  aiLenserId?: string | null
  onSaved?: (record: EvaluationRecord) => void
}

const TARGETS: EvaluationTargetType[] = ['lens', 'workflow', 'agent', 'team']

export const EvaluationDrawer: React.FC<Props> = ({
  open,
  onClose,
  ownerLenserId,
  aiLenserId,
  onSaved,
}) => {
  const [name, setName] = useState('Quality eval')
  const [description, setDescription] = useState('')
  const [targetType, setTargetType] = useState<EvaluationTargetType>('workflow')
  const [targetId, setTargetId] = useState('')
  const [scoringJson, setScoringJson] = useState(
    JSON.stringify({ rubric: 'binary_pass', weight: 1 }, null, 2)
  )
  const [casesJson, setCasesJson] = useState(
    JSON.stringify(
      [{ input: { prompt: 'example' }, expected: { contains: 'ok' }, weight: 1, tags: ['smoke'] }],
      null,
      2
    )
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSubmitting(true)
    setError(null)
    try {
      let scoring: Record<string, unknown> = {}
      let cases: CreateEvaluationInput['cases'] = []
      try {
        scoring = JSON.parse(scoringJson || '{}')
      } catch {
        throw new Error('Scoring rules must be valid JSON object')
      }
      try {
        const parsed = JSON.parse(casesJson || '[]')
        if (!Array.isArray(parsed)) throw new Error()
        cases = parsed
      } catch {
        throw new Error('Cases must be a valid JSON array')
      }

      const record = await agentWorkspaceService.createEvaluation({
        owner_lenser_id: ownerLenserId,
        ai_lenser_id: aiLenserId ?? null,
        target_type: targetType,
        target_id: targetId,
        name,
        description: description || null,
        scoring_rules: scoring,
        cases,
      })
      onSaved?.(record)
      onClose()
    } catch (err) {
      setError((err as Error).message ?? 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width="w-[640px]"
      title="Create evaluation"
    >
      <div className="space-y-4">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Description">
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} resize-none`} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target type">
            <select value={targetType} onChange={(e) => setTargetType(e.target.value as EvaluationTargetType)} className={inputClass}>
              {TARGETS.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </Field>
          <Field label="Target ID">
            <input value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="uuid" className={inputClass} />
          </Field>
        </div>
        <Field label="Scoring rules (JSON)">
          <textarea rows={3} value={scoringJson} onChange={(e) => setScoringJson(e.target.value)} className={`${inputClass} resize-none font-mono text-xs`} />
        </Field>
        <Field label="Cases (JSON array)">
          <textarea rows={6} value={casesJson} onChange={(e) => setCasesJson(e.target.value)} className={`${inputClass} resize-none font-mono text-xs`} />
        </Field>
        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-200">Cancel</button>
          <button type="button" onClick={handleSave} disabled={submitting || !name || !targetId} className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900">
            {submitting ? 'Saving…' : 'Create evaluation'}
          </button>
        </div>
      </div>
    </Drawer>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{label}</span>
    {children}
  </label>
)
