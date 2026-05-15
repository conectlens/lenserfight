import { queryKeys } from '@lenserfight/data/cache'
import {
  agentWorkspaceService,
  type CreateEvaluationCaseInput,
} from '@lenserfight/data/repositories'
import type { EvaluationCaseRecord, EvaluationRecord } from '@lenserfight/types'
import { Button } from '@lenserfight/ui/components'
import { AlertDialog, Drawer } from '@lenserfight/ui/overlays'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

import { DrawerDocsLink } from './DrawerDocsLink'

interface Props {
  open: boolean
  onClose: () => void
  evaluation: EvaluationRecord | null
  aiLenserId: string
}

const CaseRow: React.FC<{
  caseRecord: EvaluationCaseRecord
  onDelete: () => void
}> = ({ caseRecord, onDelete }) => {
  const inputSummary = JSON.stringify(caseRecord.input)
  const expectedSummary = caseRecord.expected ? JSON.stringify(caseRecord.expected) : null

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate font-mono text-xs text-gray-700 dark:text-gray-300">
            in: {inputSummary.length > 100 ? inputSummary.slice(0, 100) + '…' : inputSummary}
          </p>
          {expectedSummary && (
            <p className="truncate font-mono text-xs text-gray-500 dark:text-gray-400">
              ex: {expectedSummary.length > 100 ? expectedSummary.slice(0, 100) + '…' : expectedSummary}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400">
              weight {caseRecord.weight}
            </span>
            {(caseRecord.tags ?? []).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-primary-yellow-200 px-2 py-0.5 text-[11px] font-semibold text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:text-primary-yellow-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <Button
          type="button"
          onClick={onDelete}
          aria-label="Delete case"
          className="mt-0.5 shrink-0 rounded-xl border border-gray-200 p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <Trash2 size={13} />
        </Button>
      </div>
    </div>
  )
}

export const EvaluationCasesDrawer: React.FC<Props> = ({
  open,
  onClose,
  evaluation,
}) => {
  const queryClient = useQueryClient()

  const [addingCase, setAddingCase] = useState(false)
  const [inputJson, setInputJson] = useState('{}')
  const [expectedJson, setExpectedJson] = useState('{}')
  const [weight, setWeight] = useState('1')
  const [tags, setTags] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const cases = useQuery<EvaluationCaseRecord[]>({
    queryKey: queryKeys.agents.evaluationCases(evaluation?.id ?? ''),
    queryFn: () => agentWorkspaceService.listEvaluationCases(evaluation!.id),
    enabled: open && !!evaluation,
    staleTime: 20_000,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.evaluationCases(evaluation?.id ?? ''),
    })

  const deleteCase = useMutation({
    mutationFn: (id: string) => agentWorkspaceService.deleteEvaluationCase(id),
    onSuccess: () => {
      toast.success('Case removed')
      invalidate()
      setConfirmDeleteId(null)
    },
    onError: (e) => toast.error((e as Error).message),
  })

  const handleAddCase = async () => {
    setSubmitting(true)
    setAddError(null)
    try {
      let parsedInput: Record<string, unknown> = {}
      let parsedExpected: Record<string, unknown> | null = null
      try {
        parsedInput = JSON.parse(inputJson || '{}')
      } catch {
        throw new Error('Input must be valid JSON')
      }
      try {
        parsedExpected = expectedJson.trim() ? JSON.parse(expectedJson) : null
      } catch {
        throw new Error('Expected must be valid JSON')
      }
      const parsedWeight = parseFloat(weight)
      const parsedTags = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const input: CreateEvaluationCaseInput = {
        evaluation_id: evaluation!.id,
        input: parsedInput,
        expected: parsedExpected,
        weight: isNaN(parsedWeight) ? 1 : parsedWeight,
        tags: parsedTags,
      }
      await agentWorkspaceService.createEvaluationCase(input)
      toast.success('Case added')
      invalidate()
      setAddingCase(false)
      setInputJson('{}')
      setExpectedJson('{}')
      setWeight('1')
      setTags('')
    } catch (err) {
      setAddError((err as Error).message ?? 'Add failed')
    } finally {
      setSubmitting(false)
    }
  }

  const caseList = cases.data ?? []

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width="w-[560px]"
      title="Test cases"
      headerExtra={
        <DrawerDocsLink
          path="/how-to/agents/workspace/drawers/evaluation-cases"
          tip="CRUD over the case list. Each case is one input + one assertion (substring/regex/jsonpath/score_gte) with a weight. Bulk-import via the JSON paste field."
        />
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {evaluation?.name}{' '}
            {!cases.isLoading && (
              <span className="text-gray-400">({caseList.length} case{caseList.length !== 1 ? 's' : ''})</span>
            )}
          </p>
          {!addingCase && (
            <Button
              type="button"
              variant="dark"
              size="sm"
              onClick={() => setAddingCase(true)}
            >
              <Plus size={13} className="mr-1.5 inline" />
              Add case
            </Button>
          )}
        </div>

        {cases.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
              />
            ))}
          </div>
        ) : caseList.length === 0 && !addingCase ? (
          <p className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-6 text-center text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-700">
            No test cases yet. Add cases to define expected behavior.
          </p>
        ) : (
          <div className="space-y-2">
            {caseList.map((c) => (
              <CaseRow
                key={c.id}
                caseRecord={c}
                onDelete={() => setConfirmDeleteId(c.id)}
              />
            ))}
          </div>
        )}

        {addingCase && (
          <div className="space-y-3 rounded-2xl border border-primary-yellow-200/70 bg-primary-yellow-50/50 p-4 dark:border-primary-yellow-500/20 dark:bg-primary-yellow-500/5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-yellow-700 dark:text-primary-yellow-300">
              New case
            </p>
            <Field label="Input (JSON)">
              <textarea
                rows={4}
                value={inputJson}
                onChange={(e) => setInputJson(e.target.value)}
                placeholder="{}"
                className={`${inputClass} resize-none font-mono text-xs`}
              />
            </Field>
            <Field label="Expected (JSON, optional)">
              <textarea
                rows={3}
                value={expectedJson}
                onChange={(e) => setExpectedJson(e.target.value)}
                placeholder="{}"
                className={`${inputClass} resize-none font-mono text-xs`}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Weight">
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  min="0"
                  step="0.1"
                  className={inputClass}
                />
              </Field>
              <Field label="Tags (comma-separated)">
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="smoke, edge-case"
                  className={inputClass}
                />
              </Field>
            </div>
            {addError && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {addError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setAddingCase(false)
                  setAddError(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="dark"
                size="sm"
                onClick={handleAddCase}
                disabled={submitting}
                isLoading={submitting}
              >
                {submitting ? 'Adding…' : 'Add'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="Remove test case?"
        bodyText="This case and its results will be permanently deleted."
        variant="destructive"
        confirmAction={{
          label: 'Remove',
          onClick: () => confirmDeleteId && deleteCase.mutate(confirmDeleteId),
          loading: deleteCase.isPending,
        }}
      />
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
