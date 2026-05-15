import {
  agentsService,
  workflowsService,
  type AgentProfileView,
  type WorkflowRecord,
} from '@lenserfight/data/repositories'
import { Button, HelpButton, Tooltip } from '@lenserfight/ui/components'
import { SelectField, type Option } from '@lenserfight/ui/forms'
import { Drawer, DrawerFooter } from '@lenserfight/ui/overlays'
import type { WorkflowScheduleRecord } from '@lenserfight/types'
import { useQuery } from '@tanstack/react-query'
import { HelpCircle } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  workflows: WorkflowRecord[]
  initial?: WorkflowScheduleRecord | null
  /**
   * Human lenser whose workspace the drawer is operating in. Used to defensively
   * filter `workflows` (the schedule RPC only accepts workflows owned by the
   * active workspace — passing a foreign workflow ID raises 42501) and to fetch
   * the list of AI agents the owner can assign as the runner.
   */
  ownerLenserId?: string | null
  /** Default assignee target — typically the active ai_lenser_id */
  defaultAssigneeId?: string | null
  defaultAssigneeType?: 'agent' | 'team'
  teamOptions?: Array<{ id: string; name: string }>
  onSaved?: () => void
}

const DOCS_CRON_PATH = '/reference/cron-expressions'
const DOCS_INPUTS_PATH = '/reference/workflow-inputs-template'

const COMMON_TIMEZONES: string[] = (() => {
  try {
    const intl = Intl as unknown as {
      supportedValuesOf?: (key: string) => string[]
    }
    if (typeof intl.supportedValuesOf === 'function') {
      return intl.supportedValuesOf('timeZone')
    }
  } catch {
    // ignore — fall through to curated list
  }
  return [
    'UTC',
    'Europe/London',
    'Europe/Istanbul',
    'Europe/Berlin',
    'America/New_York',
    'America/Los_Angeles',
    'America/Sao_Paulo',
    'Asia/Tokyo',
    'Asia/Singapore',
    'Asia/Kolkata',
    'Australia/Sydney',
  ]
})()

// Each CRON field accepts `*`, `*/n`, `n`, `n-m`, `n-m/k`, or comma-list of those.
const CRON_FIELD = /^(\*(\/\d+)?|\d+(-\d+)?(\/\d+)?(,\d+(-\d+)?(\/\d+)?)*)$/

function validateCron(expr: string): string | null {
  const trimmed = expr.trim()
  if (!trimmed) return 'CRON expression is required.'
  const parts = trimmed.split(/\s+/)
  if (parts.length !== 5) {
    return `Expected 5 fields (minute hour day-of-month month day-of-week). Got ${parts.length}.`
  }
  const labels = ['minute', 'hour', 'day-of-month', 'month', 'day-of-week']
  for (let i = 0; i < parts.length; i++) {
    if (!CRON_FIELD.test(parts[i])) {
      return `Invalid syntax in the ${labels[i]} field: "${parts[i]}". Use *, n, n-m, */n, or n,m.`
    }
  }
  return null
}

function validateTimezone(tz: string): string | null {
  const trimmed = tz.trim()
  if (!trimmed) return 'Timezone is required. Use UTC if unsure.'
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: trimmed })
    return null
  } catch {
    return `"${trimmed}" is not a valid IANA timezone. Try UTC, Europe/Istanbul, America/New_York…`
  }
}

interface InputsValidation {
  error: string | null
  parsed: Record<string, unknown>
}

function validateInputsTemplate(raw: string): InputsValidation {
  const trimmed = raw.trim()
  if (!trimmed) return { error: null, parsed: {} }
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (err) {
    return {
      error: `Inputs template is not valid JSON: ${(err as Error).message}`,
      parsed: {},
    }
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      error: 'Inputs template must be a JSON object (e.g. {"topic": "AI news"}).',
      parsed: {},
    }
  }
  return { error: null, parsed: parsed as Record<string, unknown> }
}

export const ScheduleDrawer: React.FC<Props> = ({
  open,
  onClose,
  workflows,
  initial,
  ownerLenserId,
  defaultAssigneeId,
  defaultAssigneeType = 'agent',
  teamOptions = [],
  onSaved,
}) => {
  const isEdit = !!initial

  // Defensively filter workflows to the active owner. The schedule RPC raises
  // 42501 when the workflow is not owned by the calling workspace, so never
  // offer a foreign workflow in the dropdown.
  const ownedWorkflows = useMemo(() => {
    if (!ownerLenserId) return workflows
    return workflows.filter((w) => w.lenser_id === ownerLenserId)
  }, [workflows, ownerLenserId])

  // Load assignees (AI agents owned by the active workspace) on open.
  const agentsQuery = useQuery<AgentProfileView[]>({
    queryKey: ['agents', 'schedule-assignees', ownerLenserId ?? ''],
    queryFn: () => agentsService.getAgentsByOwner(ownerLenserId!),
    enabled: open && !!ownerLenserId,
    staleTime: 30_000,
  })
  const ownedAgents = agentsQuery.data ?? []

  const [workflowId, setWorkflowId] = useState(
    initial?.workflow_id ?? ownedWorkflows[0]?.id ?? ''
  )
  const [cron, setCron] = useState(initial?.cron_expr ?? '0 9 * * 1')
  const [timezone, setTimezone] = useState(initial?.timezone ?? 'UTC')
  const [assigneeType, setAssigneeType] = useState<'agent' | 'team'>(
    (initial?.assignee_type as 'agent' | 'team') ?? defaultAssigneeType
  )
  const [assigneeId, setAssigneeId] = useState(
    initial?.assignee_id ?? defaultAssigneeId ?? ''
  )
  const [active, setActive] = useState(initial?.is_active ?? true)
  const [inputsJson, setInputsJson] = useState(
    JSON.stringify(initial?.inputs_template ?? {}, null, 2)
  )
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [touched, setTouched] = useState({
    cron: false,
    timezone: false,
    inputs: false,
  })

  useEffect(() => {
    if (!open) return
    setWorkflowId(initial?.workflow_id ?? ownedWorkflows[0]?.id ?? '')
    setCron(initial?.cron_expr ?? '0 9 * * 1')
    setTimezone(initial?.timezone ?? 'UTC')
    setAssigneeType(
      (initial?.assignee_type as 'agent' | 'team') ?? defaultAssigneeType
    )
    setAssigneeId(initial?.assignee_id ?? defaultAssigneeId ?? '')
    setActive(initial?.is_active ?? true)
    setInputsJson(JSON.stringify(initial?.inputs_template ?? {}, null, 2))
    setServerError(null)
    setTouched({ cron: false, timezone: false, inputs: false })
  }, [
    open,
    initial,
    defaultAssigneeId,
    defaultAssigneeType,
    ownedWorkflows,
  ])

  const cronError = validateCron(cron)
  const tzError = validateTimezone(timezone)
  const inputsValidation = validateInputsTemplate(inputsJson)
  const inputsError = inputsValidation.error

  const showCronError = touched.cron && cronError
  const showTzError = touched.timezone && tzError
  const showInputsError = touched.inputs && inputsError

  const hasBlockingError =
    !workflowId || !!cronError || !!tzError || !!inputsError

  // ── Options ────────────────────────────────────────────────────────────────

  const workflowOptions: Option[] = useMemo(
    () =>
      ownedWorkflows.map((w) => ({
        value: w.id,
        label: w.title,
      })),
    [ownedWorkflows]
  )

  const assigneeTypeOptions: Option[] = [
    { value: 'agent', label: 'Agent (single AI lenser)' },
    { value: 'team', label: 'Team (group of agents)' },
  ]

  const timezoneOptions: Option[] = useMemo(() => {
    const set = new Set(COMMON_TIMEZONES)
    if (timezone && !set.has(timezone)) set.add(timezone)
    return Array.from(set).map((tz) => ({ value: tz, label: tz }))
  }, [timezone])

  const agentAssigneeOptions: Option[] = useMemo(() => {
    const opts = ownedAgents.map((a) => ({
      value: a.ai_lenser_id,
      label: a.display_name || a.handle || a.ai_lenser_id,
    }))
    if (assigneeId && !opts.some((o) => o.value === assigneeId)) {
      opts.push({ value: assigneeId, label: `Unknown agent (${assigneeId.slice(0, 8)}…)` })
    }
    return opts
  }, [ownedAgents, assigneeId])

  const teamAssigneeOptions: Option[] = useMemo(() => {
    const opts = teamOptions.map((t) => ({ value: t.id, label: t.name }))
    if (assigneeId && !opts.some((o) => o.value === assigneeId)) {
      opts.push({ value: assigneeId, label: `Unknown team (${assigneeId.slice(0, 8)}…)` })
    }
    return opts
  }, [teamOptions, assigneeId])

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setTouched({ cron: true, timezone: true, inputs: true })
    if (hasBlockingError) return

    setSubmitting(true)
    setServerError(null)
    try {
      await workflowsService.upsertSchedule({
        workflow_id: workflowId,
        schedule_id: initial?.id ?? null,
        cron_expr: cron.trim(),
        timezone: timezone.trim(),
        is_active: active,
        assignee_type: assigneeType,
        assignee_id: assigneeId || null,
        inputs_template: inputsValidation.parsed,
      })
      onSaved?.()
      onClose()
    } catch (err) {
      setServerError((err as Error).message ?? 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width="w-[560px]"
      title={isEdit ? 'Edit execution schedule' : 'New autonomous schedule'}
      footer={
        <DrawerFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Tooltip
            content={
              hasBlockingError
                ? 'Resolve the validation errors before saving.'
                : isEdit
                  ? 'Apply changes to this schedule.'
                  : 'Create the schedule and start dispatching runs.'
            }
            position="top"
          >
            <Button
              type="button"
              onClick={handleSave}
              disabled={submitting || hasBlockingError}
              isLoading={submitting}
            >
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
            </Button>
          </Tooltip>
        </DrawerFooter>
      }
    >
      <div className="space-y-4">
        <FieldLabel
          label="Workflow"
          tooltip="Only workflows owned by this workspace can be scheduled. Foreign workflows raise a permission error on save."
        >
          {workflowOptions.length === 0 ? (
            <EmptyHint>
              No workflows are owned by this workspace. Create or fork a
              workflow before scheduling one.
            </EmptyHint>
          ) : (
            <SelectField
              value={workflowId}
              onChange={setWorkflowId}
              options={workflowOptions}
              placeholder="Select a workflow…"
            />
          )}
        </FieldLabel>

        <div className="grid grid-cols-2 gap-3">
          <FieldLabel
            label="CRON expression"
            tooltip="5-field CRON: minute hour day-of-month month day-of-week. Evaluated in the timezone below."
            trailing={<HelpButton path={DOCS_CRON_PATH} label="What is CRON?" />}
          >
            <input
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, cron: true }))}
              placeholder="0 9 * * 1"
              aria-invalid={!!showCronError}
              aria-describedby={showCronError ? 'cron-error' : undefined}
              className={`${inputClass} font-mono ${
                showCronError ? errorRing : ''
              }`}
            />
            {showCronError && (
              <ErrorText id="cron-error">{cronError}</ErrorText>
            )}
            {!showCronError && (
              <HintText>
                Examples: <code>0 9 * * 1-5</code> (weekdays 09:00) ·{' '}
                <code>*/30 * * * *</code> (every 30 min)
              </HintText>
            )}
          </FieldLabel>

          <FieldLabel
            label="Timezone (IANA)"
            tooltip="IANA timezone identifier. The CRON expression is evaluated in this zone, including DST."
          >
            <SelectField
              value={timezone}
              onChange={(v) => {
                setTimezone(v)
                setTouched((t) => ({ ...t, timezone: true }))
              }}
              options={timezoneOptions}
              placeholder="UTC"
              error={showTzError ? (tzError ?? undefined) : undefined}
            />
          </FieldLabel>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldLabel
            label="Assignee type"
            tooltip="Agent dispatches one AI lenser; Team dispatches every active member of an agent team."
          >
            <SelectField
              value={assigneeType}
              onChange={(v) => {
                const next = v as 'agent' | 'team'
                setAssigneeType(next)
                setAssigneeId('')
              }}
              options={assigneeTypeOptions}
            />
          </FieldLabel>

          <FieldLabel
            label={assigneeType === 'team' ? 'Team' : 'Agent'}
            tooltip={
              assigneeType === 'team'
                ? 'The agent team that will run each dispatched workflow.'
                : 'The AI lenser that will run each dispatched workflow. Must be owned by this workspace.'
            }
          >
            {assigneeType === 'team' ? (
              teamAssigneeOptions.length > 0 ? (
                <SelectField
                  value={assigneeId}
                  onChange={setAssigneeId}
                  options={teamAssigneeOptions}
                  placeholder="— select team —"
                />
              ) : (
                <EmptyHint>
                  No teams available. Create a team first in the Teams tab.
                </EmptyHint>
              )
            ) : (
              <SelectField
                value={assigneeId}
                onChange={setAssigneeId}
                options={agentAssigneeOptions}
                placeholder={
                  agentsQuery.isLoading ? 'Loading agents…' : '— select agent —'
                }
                isLoading={agentsQuery.isLoading}
              />
            )}
          </FieldLabel>
        </div>

        <FieldLabel
          label="Inputs template (JSON)"
          tooltip="Root inputs passed to every dispatched run. Must be a JSON object — the keys match your workflow's root-node input names."
          trailing={
            <HelpButton path={DOCS_INPUTS_PATH} label="Inputs format" />
          }
        >
          <textarea
            rows={5}
            value={inputsJson}
            onChange={(e) => setInputsJson(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, inputs: true }))}
            spellCheck={false}
            aria-invalid={!!showInputsError}
            aria-describedby={showInputsError ? 'inputs-error' : undefined}
            className={`${inputClass} resize-none font-mono text-xs ${
              showInputsError ? errorRing : ''
            }`}
          />
          {showInputsError ? (
            <ErrorText id="inputs-error">{inputsError}</ErrorText>
          ) : (
            <HintText>
              Use <code>{`{}`}</code> for no defaults, or{' '}
              <code>{`{ "topic": "AI news" }`}</code> for keyed defaults.
            </HintText>
          )}
        </FieldLabel>

        <Tooltip
          content="Paused schedules stay configured but do not dispatch. Resume any time."
          position="top"
        >
          <label className="flex w-full items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <span>Active</span>
          </label>
        </Tooltip>

        {serverError && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {serverError}
          </p>
        )}


      </div>
    </Drawer>
  )
}

// ── Subcomponents ────────────────────────────────────────────────────────────

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-yellow-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const errorRing = 'border-red-400 focus:border-red-500'

const FieldLabel: React.FC<{
  label: string
  tooltip?: string
  trailing?: React.ReactNode
  children: React.ReactNode
}> = ({ label, tooltip, trailing, children }) => (
  <div className="block">
    <div className="mb-1 flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
        {label}
        {tooltip && (
          <Tooltip content={tooltip} position="top" contentClassName="max-w-xs whitespace-normal text-left">
            <HelpCircle
              size={12}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              aria-label={`${label} — help`}
            />
          </Tooltip>
        )}
      </span>
      {trailing}
    </div>
    {children}
  </div>
)

const ErrorText: React.FC<{ id?: string; children: React.ReactNode }> = ({
  id,
  children,
}) => (
  <p id={id} className="mt-1.5 text-xs font-medium text-red-500">
    {children}
  </p>
)

const HintText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{children}</p>
)

const EmptyHint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="rounded-2xl border border-dashed border-gray-300 px-3 py-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
    {children}
  </p>
)
