import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type {
  CreateEvaluationInput,
  EvaluationRecord,
  EvaluationTargetType,
} from '@lenserfight/types'
import { Button } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { Drawer, DrawerFooter } from '@lenserfight/ui/overlays'
import { Plus, Trash2 } from 'lucide-react'
import React, { useState } from 'react'

import { DrawerDocsLink } from './DrawerDocsLink'

interface Props {
  open: boolean
  onClose: () => void
  ownerLenserId: string
  aiLenserId?: string | null
  onSaved?: (record: EvaluationRecord) => void
}

const TARGETS: EvaluationTargetType[] = ['lens', 'workflow', 'agent', 'team']
const TARGET_OPTIONS = TARGETS.map((t) => ({ value: t, label: t }))

const RUBRIC_OPTIONS = [
  { value: 'binary_pass', label: 'Binary pass / fail' },
  { value: 'scale_1_5', label: 'Scale 1–5' },
  { value: 'custom', label: 'Custom' },
]

interface SimpleCase {
  prompt: string
  expected: string
  weight: number
  tags: string
}

const defaultCase = (): SimpleCase => ({ prompt: '', expected: '', weight: 1, tags: '' })

function casesToJson(cases: SimpleCase[]): string {
  return JSON.stringify(
    cases.map((c) => ({
      input: { prompt: c.prompt },
      expected: { contains: c.expected },
      weight: c.weight,
      tags: c.tags ? c.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    })),
    null,
    2
  )
}

function safeParseJson<T>(raw: string, fallback: T): { value: T; error: string | null } {
  try {
    return { value: JSON.parse(raw || (Array.isArray(fallback) ? '[]' : '{}')), error: null }
  } catch {
    return { value: fallback, error: 'Invalid JSON' }
  }
}

export const EvaluationDrawer: React.FC<Props> = ({
  open,
  onClose,
  ownerLenserId,
  aiLenserId,
  onSaved,
}) => {
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple')

  // Shared fields
  const [name, setName] = useState('Quality eval')
  const [description, setDescription] = useState('')
  const [targetType, setTargetType] = useState<EvaluationTargetType>('workflow')
  const [targetId, setTargetId] = useState('')

  // Simple mode state
  const [rubric, setRubric] = useState('binary_pass')
  const [weight, setWeight] = useState(1)
  const [cases, setCases] = useState<SimpleCase[]>([defaultCase()])

  // Advanced mode state (JSON strings)
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

  const scoringJsonError = safeParseJson(scoringJson, {}).error
  const casesJsonError = safeParseJson(casesJson, []).error

  const switchToAdvanced = () => {
    setScoringJson(JSON.stringify({ rubric, weight }, null, 2))
    setCasesJson(casesToJson(cases))
    setMode('advanced')
  }

  const addCase = () => setCases((prev) => [...prev, defaultCase()])
  const removeCase = (idx: number) => setCases((prev) => prev.filter((_, i) => i !== idx))
  const updateCase = (idx: number, patch: Partial<SimpleCase>) =>
    setCases((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)))

  const handleSave = async () => {
    setSubmitting(true)
    setError(null)
    try {
      let scoring: Record<string, unknown> = {}
      let parsedCases: CreateEvaluationInput['cases'] = []

      if (mode === 'simple') {
        scoring = { rubric, weight }
        parsedCases = cases.map((c) => ({
          input: { prompt: c.prompt },
          expected: { contains: c.expected },
          weight: c.weight,
          tags: c.tags ? c.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        }))
      } else {
        try {
          scoring = JSON.parse(scoringJson || '{}')
        } catch {
          throw new Error('Scoring rules must be valid JSON object')
        }
        try {
          const parsed = JSON.parse(casesJson || '[]')
          if (!Array.isArray(parsed)) throw new Error()
          parsedCases = parsed
        } catch {
          throw new Error('Cases must be a valid JSON array')
        }
      }

      const record = await agentWorkspaceService.createEvaluation({
        owner_lenser_id: ownerLenserId,
        ai_lenser_id: aiLenserId ?? null,
        target_type: targetType,
        target_id: targetId,
        name,
        description: description || null,
        scoring_rules: scoring,
        cases: parsedCases,
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
      title="Add automated evaluation"
      footer={
        <DrawerFooter
          onCancel={onClose}
          onSubmit={handleSave}
          submitLabel={submitting ? 'Saving…' : 'Create evaluation'}
          isLoading={submitting}
          disabled={
            submitting ||
            !name ||
            !targetId ||
            (mode === 'advanced' && (!!scoringJsonError || !!casesJsonError))
          }
        />
      }
    >
      <div className="space-y-4">
        <DrawerDocsLink
          path="/how-to/agents/workspace/drawers/evaluation"
          tip="Create or run an evaluation suite. Bind a model profile, add cases, optionally schedule on a cron. Failed cases open a side-by-side diff."
        />
        {/* Mode toggle */}
        <div className="flex gap-1 rounded-2xl border border-gray-200 p-1 dark:border-gray-700">
          {(['simple', 'advanced'] as const).map((m) => (
            <Button
              key={m}
              type="button"
              size="sm"
              variant={mode === m ? 'dark' : 'ghost'}
              onClick={() => (m === 'advanced' ? switchToAdvanced() : setMode('simple'))}
              className="flex-1"
              aria-pressed={mode === m}
            >
              {m === 'simple' ? 'Simple' : 'Advanced (JSON)'}
            </Button>
          ))}
        </div>

        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Description">
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputClass} resize-none`}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target type">
            <SelectField
              value={targetType}
              onChange={(v) => setTargetType(v as EvaluationTargetType)}
              options={TARGET_OPTIONS}
            />
          </Field>
          <Field label="Target ID">
            <input
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              placeholder="uuid"
              className={inputClass}
            />
          </Field>
        </div>

        {mode === 'simple' ? (
          <>
            <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                Scoring rules
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rubric">
                  <SelectField value={rubric} onChange={setRubric} options={RUBRIC_OPTIONS} />
                </Field>
                <Field label="Weight">
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  Test cases
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCase}
                >
                  <Plus size={12} className="mr-1 inline" />
                  Add case
                </Button>
              </div>
              <div className="space-y-3">
                {cases.map((c, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-700"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Case {idx + 1}
                      </span>
                      {cases.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeCase(idx)}
                          className="text-gray-400 hover:text-red-500"
                          aria-label="Remove case"
                        >
                          <Trash2 size={13} />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Field label="Prompt">
                        <input
                          value={c.prompt}
                          onChange={(e) => updateCase(idx, { prompt: e.target.value })}
                          placeholder="Input prompt"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="Expected output contains">
                        <input
                          value={c.expected}
                          onChange={(e) => updateCase(idx, { expected: e.target.value })}
                          placeholder="ok"
                          className={inputClass}
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Weight">
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            value={c.weight}
                            onChange={(e) => updateCase(idx, { weight: Number(e.target.value) })}
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Tags (comma separated)">
                          <input
                            value={c.tags}
                            onChange={(e) => updateCase(idx, { tags: e.target.value })}
                            placeholder="smoke, regression"
                            className={inputClass}
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <Field label="Scoring rules (JSON)">
              <textarea
                rows={3}
                value={scoringJson}
                onChange={(e) => setScoringJson(e.target.value)}
                className={`${inputClass} resize-none font-mono text-xs ${scoringJsonError ? 'border-red-400 focus:border-red-400' : ''}`}
              />
              {scoringJsonError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{scoringJsonError}</p>
              )}
            </Field>
            <Field label="Cases (JSON array)">
              <textarea
                rows={6}
                value={casesJson}
                onChange={(e) => setCasesJson(e.target.value)}
                className={`${inputClass} resize-none font-mono text-xs ${casesJsonError ? 'border-red-400 focus:border-red-400' : ''}`}
              />
              {casesJsonError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{casesJsonError}</p>
              )}
            </Field>
          </>
        )}

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </p>
        )}


      </div>
    </Drawer>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-yellow-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
      {label}
    </span>
    {children}
  </label>
)
