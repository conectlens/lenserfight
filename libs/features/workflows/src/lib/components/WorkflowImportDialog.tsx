/**
 * Paste-a-document import dialog for workflows.
 *
 * Follows the shape of the lens parameter import dialogs (paste area, toolbar,
 * parse, preview, confirm) because users already know that flow. It does not
 * share code with them: those dialogs coerce a flat map of parameter values
 * against a known parameter list, this one validates a nested document and
 * builds a graph. The only genuinely common behaviour is "copy a template",
 * which is two lines.
 *
 * CSV is intentionally not offered. A workflow has nested lens definitions,
 * per-step parameter maps, and a connection graph; flattening that into rows
 * would lose all three.
 */
import { WORKFLOW_DOCUMENT_FORMATS, type WorkflowDocumentFormat } from '@lenserfight/domain/workflow-protocol'
import { Button } from '@lenserfight/ui/components'
import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'
import { copyTextToClipboard } from '@lenserfight/utils/text'
import { AlertTriangle, Check, Clipboard, Info, Zap } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import { useWorkflowImport } from '../import/useWorkflowImport'
import { buildWorkflowInstructionsText } from '../utils/workflow-instructions'

import type { WorkflowProtocolIssue } from '@lenserfight/domain/workflow-protocol'

export interface WorkflowImportDialogProps {
  open: boolean
  onClose: () => void
  /** Called with the new workflow id once an import succeeds. */
  onImported: (workflowId: string) => void
  /** Current lenser id — scopes lens reuse to lenses the user owns. */
  lenserId: string | undefined
  /** Visibility chosen in the wizard. Not part of the portable document. */
  visibility?: 'public' | 'private' | 'unlisted'
}

const FORMAT_LABELS: Record<WorkflowDocumentFormat, string> = {
  json: 'JSON',
  yaml: 'YAML',
}

type FormatChoice = WorkflowDocumentFormat | 'auto'

export const WorkflowImportDialog: React.FC<WorkflowImportDialogProps> = ({
  open,
  onClose,
  onImported,
  lenserId,
  visibility,
}) => {
  const [rawText, setRawText] = useState('')
  const [formatChoice, setFormatChoice] = useState<FormatChoice>('auto')
  const [copied, setCopied] = useState(false)
  const [activateSchedule, setActivateSchedule] = useState(false)

  const { preview, result, isImporting, runPreview, runImport, reset } = useWorkflowImport({
    lenserId,
  })

  const explicitFormat = formatChoice === 'auto' ? undefined : formatChoice

  const errors = useMemo(
    () => (preview?.issues ?? []).filter((issue) => issue.severity === 'error'),
    [preview],
  )
  const warnings = useMemo(
    () => (preview?.issues ?? []).filter((issue) => issue.severity === 'warning'),
    [preview],
  )

  const handleCopyInstructions = async () => {
    try {
      await copyTextToClipboard(
        buildWorkflowInstructionsText(formatChoice === 'yaml' ? 'yaml' : 'json'),
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable — leave the button state alone.
    }
  }

  const handleTextChange = (value: string) => {
    setRawText(value)
    // Preview refers to text that no longer exists; drop it rather than show
    // results for the previous paste.
    if (preview || result) reset()
  }

  const handleParse = () => {
    if (!rawText.trim()) return
    runPreview(rawText, explicitFormat)
  }

  const handleConfirm = async () => {
    if (!preview?.ok) return
    const imported = await runImport(
      rawText,
      {
        ...(visibility ? { visibility } : {}),
        activateSchedule,
      },
      explicitFormat,
    )
    if (imported?.ok && imported.workflowId) {
      const newId = imported.workflowId
      // Keep the pasted text until the very end so a persistence failure
      // leaves the user something to retry with.
      setRawText('')
      reset()
      onImported(newId)
      onClose()
    }
  }

  const handleClose = () => {
    setRawText('')
    reset()
    onClose()
  }

  const canConfirm = !!preview?.ok && !isImporting

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Import a workflow"
      description="Paste a JSON or YAML workflow document. Copy the instructions first, send them to any AI model, then paste its answer here."
      maxWidth="max-w-3xl"
      footer={
        <ModalFooter
          leftButton={{ label: 'Cancel', onClick: handleClose, variant: 'ghost' }}
          primaryButton={{
            label: isImporting
              ? 'Creating…'
              : preview?.ok
                ? `Create workflow (${preview.steps.length} step${preview.steps.length === 1 ? '' : 's'})`
                : 'Create workflow',
            onClick: handleConfirm,
            disabled: !canConfirm,
          }}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <textarea
          value={rawText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={'{\n  "protocol": "lenserfight.workflow/v1",\n  "title": "…",\n  "steps": [ … ]\n}'}
          rows={10}
          spellCheck={false}
          aria-label="Workflow document"
          className="w-full rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-xs font-mono text-greyscale-900 dark:text-greyscale-50 placeholder-greyscale-400 focus:outline-none focus:ring-2 focus:ring-primary-yellow-500 resize-y"
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1" role="group" aria-label="Document format">
            {(['auto', ...WORKFLOW_DOCUMENT_FORMATS] as FormatChoice[]).map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => {
                  setFormatChoice(choice)
                  if (preview || result) reset()
                }}
                aria-pressed={formatChoice === choice}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  formatChoice === choice
                    ? 'bg-primary-yellow-500/15 text-primary-yellow-600'
                    : 'bg-surface-raised text-greyscale-500 hover:text-greyscale-900 dark:hover:text-greyscale-50'
                }`}
              >
                {choice === 'auto' ? 'Auto-detect' : FORMAT_LABELS[choice]}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyInstructions}
            className="flex items-center gap-1.5"
          >
            {copied ? <Check size={13} /> : <Clipboard size={13} />}
            {copied ? 'Instructions copied' : 'Copy instructions'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleParse}
            disabled={!rawText.trim()}
            className="flex items-center gap-1.5"
          >
            <Zap size={13} />
            Validate
          </Button>

          {preview && (
            <span className="text-xs text-greyscale-400">
              Read as{' '}
              <span className="font-medium text-greyscale-600 dark:text-greyscale-300">
                {FORMAT_LABELS[preview.format]}
              </span>
            </span>
          )}
        </div>

        {errors.length > 0 && <IssueList issues={errors} tone="error" title="Fix before importing" />}
        {warnings.length > 0 && <IssueList issues={warnings} tone="warning" title="Applied automatically" />}

        {preview?.ok && preview.document && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-2">
              <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                {preview.document.title}
              </p>
              {preview.document.outcome && (
                <p className="mt-0.5 text-xs text-greyscale-500">{preview.document.outcome}</p>
              )}
              <p className="mt-1.5 text-[11px] text-greyscale-400">
                {preview.steps.length} step{preview.steps.length === 1 ? '' : 's'} ·{' '}
                {preview.connectionCount} connection{preview.connectionCount === 1 ? '' : 's'} ·{' '}
                {preview.lensDefinitionCount} lens definition
                {preview.lensDefinitionCount === 1 ? '' : 's'}
              </p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-surface-border">
              <table className="w-full text-xs">
                <thead className="bg-surface-raised">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-greyscale-500">#</th>
                    <th className="px-3 py-2 text-left font-medium text-greyscale-500">Kind</th>
                    <th className="px-3 py-2 text-left font-medium text-greyscale-500">Step</th>
                    <th className="px-3 py-2 text-left font-medium text-greyscale-500">Node type</th>
                    <th className="px-3 py-2 text-left font-medium text-greyscale-500">Params</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {preview.steps.map((step) => (
                    <tr key={step.step} className="bg-surface-base">
                      <td className="px-3 py-2 font-mono text-greyscale-500">{step.step}</td>
                      <td className="px-3 py-2 capitalize text-greyscale-500">{step.kind}</td>
                      <td className="px-3 py-2 text-greyscale-800 dark:text-greyscale-100">
                        {step.name}
                      </td>
                      <td className="px-3 py-2 font-mono text-greyscale-500">{step.nodeType}</td>
                      <td className="px-3 py-2 text-greyscale-500">{step.parameterCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.schedule && (
              <label className="flex items-start gap-2 rounded-lg border border-surface-border bg-surface-base px-3 py-2">
                <input
                  type="checkbox"
                  checked={activateSchedule}
                  onChange={(e) => setActivateSchedule(e.target.checked)}
                  disabled={!preview.schedule.isActive}
                  className="mt-0.5 accent-primary-yellow-500"
                />
                <span className="text-xs text-greyscale-600 dark:text-greyscale-300">
                  Start the schedule{' '}
                  <span className="font-mono text-greyscale-800 dark:text-greyscale-100">
                    {preview.schedule.cron}
                  </span>{' '}
                  immediately.
                  <span className="block text-[11px] text-greyscale-400">
                    Imported schedules are created paused by default.
                  </span>
                </span>
              </label>
            )}
          </div>
        )}

        {result && !result.ok && (
          <IssueList
            issues={result.issues.filter((issue) => issue.severity === 'error')}
            tone="error"
            title={result.rolledBack ? 'Import failed and was rolled back' : 'Import failed'}
          />
        )}
      </div>
    </Dialog>
  )
}

interface IssueListProps {
  issues: WorkflowProtocolIssue[]
  tone: 'error' | 'warning'
  title: string
}

const IssueList: React.FC<IssueListProps> = ({ issues, tone, title }) => {
  if (issues.length === 0) return null
  const isError = tone === 'error'

  return (
    <div
      role={isError ? 'alert' : undefined}
      className={`flex flex-col gap-1 rounded-lg border px-3 py-2 ${
        isError
          ? 'border-status-red/30 bg-status-red/5'
          : 'border-primary-yellow-500/30 bg-primary-yellow-500/5'
      }`}
    >
      <span
        className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${
          isError ? 'text-status-red' : 'text-primary-yellow-600'
        }`}
      >
        {isError ? <AlertTriangle size={12} /> : <Info size={12} />}
        {title}
      </span>
      {issues.map((issue, index) => (
        <p
          key={`${issue.path}-${index}`}
          className={`text-xs ${isError ? 'text-status-red' : 'text-greyscale-600 dark:text-greyscale-300'}`}
        >
          {issue.path && <span className="font-mono text-[11px] opacity-70">{issue.path}: </span>}
          {issue.message}
        </p>
      ))}
    </div>
  )
}
