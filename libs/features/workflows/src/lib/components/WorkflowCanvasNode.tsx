import { getWorkflowNodeCatalogEntry } from '@lenserfight/infra/execution'
import { Handle, Position } from '@xyflow/react'
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Braces,
  BrainCircuit,
  Calendar,
  ClipboardList,
  Clock,
  Code2,
  Database,
  EyeOff,
  FileText,
  HardDrive,
  HelpCircle,
  Link,
  Lock,
  Mail,
  MessageSquare,
  MousePointerClick,
  Play,
  Radio,
  Rss,
  Repeat,
  Table2,
  Scale,
  Search,
  Send,
  Split,
  Variable,
  Webhook,
  Workflow,
  Zap,
} from 'lucide-react'
import React from 'react'

import { WorkflowNodeQuickActions } from '../canvas/components/WorkflowNodeQuickActions'
import { getNodeExecutionRingClassName } from '../execution/workflowNodeExecutionStatus'

import { WorkflowNodeExecutionBadge } from './WorkflowNodeExecutionBadge'

import type { WorkflowNodeCategory } from '@lenserfight/infra/execution'
import type { NodeProps } from '@xyflow/react'
import type { WorkflowNodeData } from '../types'

// Types extracted to shared module — re-exported for backward compatibility
export type { WorkflowNodeConfig, WorkflowNodeData } from '../types'

interface NodeCategoryMeta {
  category: WorkflowNodeCategory
  icon: React.ReactNode
  accent: string // border + bg accent for category indication
}

const CATEGORY_ACCENT: Record<WorkflowNodeCategory, string> = {
  lens: 'border-primary-yellow-400/50 bg-primary-yellow-500/5',
  trigger: 'border-emerald-400/50 bg-emerald-500/5',
  logic: 'border-violet-400/50 bg-violet-500/5',
  data: 'border-sky-400/50 bg-sky-500/5',
  ai_primitive: 'border-fuchsia-400/50 bg-fuchsia-500/5',
  battle: 'border-rose-400/50 bg-rose-500/5',
  storage: 'border-cyan-400/50 bg-cyan-500/5',
  communication: 'border-amber-400/50 bg-amber-500/5',
  integration: 'border-indigo-400/50 bg-indigo-500/5',
  media: 'border-pink-400/50 bg-pink-500/5',
  utility: 'border-zinc-400/50 bg-zinc-500/5',
}

const CATEGORY_BADGE: Record<WorkflowNodeCategory, string> = {
  lens: 'bg-primary-yellow-100 text-primary-yellow-700 dark:bg-primary-yellow-900/30 dark:text-primary-yellow-300',
  trigger: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  logic: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  data: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  ai_primitive: 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
  battle: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  storage: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  communication: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  integration: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  media: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  utility: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900/30 dark:text-zinc-400',
}

function getNodeCategoryMeta(nodeType?: string): NodeCategoryMeta | null {
  if (!nodeType) return null
  const entry = getWorkflowNodeCatalogEntry(nodeType)
  if (!entry || entry.category === 'lens') return null
  return {
    category: entry.category,
    icon: renderNodeIcon(entry.iconKey),
    accent: CATEGORY_ACCENT[entry.category],
  }
}

function renderNodeIcon(iconKey: string): React.ReactNode {
  switch (iconKey) {
    case 'AlertTriangle':
      return <AlertTriangle size={10} />
    case 'Bell':
      return <Bell size={10} />
    case 'BookOpen':
      return <BookOpen size={10} />
    case 'ClipboardList':
    case 'FormInput':
      return <ClipboardList size={10} />
    case 'MousePointerClick':
      return <MousePointerClick size={10} />
    case 'Play':
      return <Play size={10} />
    case 'Radio':
      return <Radio size={10} />
    case 'Zap':
      return <Zap size={10} />
    case 'Brain':
    case 'BrainCircuit':
    case 'Fingerprint':
      return <BrainCircuit size={10} />
    case 'Braces':
      return <Braces size={10} />
    case 'CalendarClock':
      return <Calendar size={10} />
    case 'Clock':
      return <Clock size={10} />
    case 'Code2':
      return <Code2 size={10} />
    case 'Database':
      return <Database size={10} />
    case 'FileText':
      return <FileText size={10} />
    case 'HardDrive':
      return <HardDrive size={10} />
    case 'HelpCircle':
    case 'CircleHelp':
      return <HelpCircle size={10} />
    case 'Link':
      return <Link size={10} />
    case 'Mail':
      return <Mail size={10} />
    case 'MessageSquare':
    case 'MessagesSquare':
      return <MessageSquare size={10} />
    case 'Repeat':
      return <Repeat size={10} />
    case 'Rss':
      return <Rss size={10} />
    case 'Scale':
      return <Scale size={10} />
    case 'Search':
      return <Search size={10} />
    case 'Send':
      return <Send size={10} />
    case 'GitBranch':
    case 'Split':
      return <Split size={10} />
    case 'Table2':
    case 'Sheet':
      return <Table2 size={10} />
    case 'Variable':
      return <Variable size={10} />
    case 'Webhook':
      return <Webhook size={10} />
    case 'Workflow':
      return <Workflow size={10} />
    default:
      return <Workflow size={10} />
  }
}

/** Visibility-based border + background styles (overridden by selected state). */
const VISIBILITY_BORDER: Record<string, string> = {
  private:  'border-status-red/40 bg-status-red/5 dark:bg-status-red/10',
  unlisted: 'border-greyscale-400/40 bg-greyscale-100/40 dark:bg-greyscale-800/30',
  public:   'border-surface-border hover:border-greyscale-300 dark:hover:border-greyscale-600',
}

const VISIBILITY_ICONS: Record<string, React.ReactNode> = {
  private:  <Lock   size={9} className="text-status-red/70 flex-shrink-0" />,
  unlisted: <EyeOff size={9} className="text-greyscale-400 flex-shrink-0" />,
}

export function WorkflowCanvasNode({ id, data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData
  const {
    label, ordinal, isPersisted, lens_id, lensVisibility, isLensOwner,
    onRemove, onDuplicate, onConfigNode, onEditLens, config,
    executionStatus, executionWarning,
  } = nodeData

  const categoryMeta = getNodeCategoryMeta(config?.node_type ?? config?.nodeType)
  const visibilityIcon = lensVisibility ? (VISIBILITY_ICONS[lensVisibility] ?? null) : null
  const visibilityBorder = categoryMeta
    ? categoryMeta.accent
    : VISIBILITY_BORDER[lensVisibility ?? 'public'] ?? VISIBILITY_BORDER['public']

  const isUtilityNode = !!categoryMeta

  // Execution ring layers outside the category/visibility border via ring-*.
  // When selected, the selection ring takes visual priority.
  const executionRing = selected ? '' : getNodeExecutionRingClassName(executionStatus ?? null)

  // Show badge for any non-null, non-pending status.
  const showBadge = !!executionStatus && executionStatus !== 'pending'

  return (
    <div
      onDoubleClick={() => { if (onConfigNode && (lens_id || isUtilityNode)) onConfigNode(id, lens_id ?? '__utility') }}
      aria-label={`${label}${executionStatus ? `, status: ${executionStatus}` : ''}`}
      data-execution-status={executionStatus ?? undefined}
      className={`relative flex items-center gap-2 min-w-[160px] max-w-[240px] rounded-2xl border px-3 py-2.5 shadow-neu-1 transition-colors ${
        selected
          ? 'border-primary-yellow-500 bg-primary-yellow-500/10 ring-2 ring-primary-yellow-500/30'
          : visibilityBorder
      } ${executionRing} ${!isPersisted ? 'opacity-60' : ''}`}
    >
      {/* Target handle — left */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !rounded-full !bg-greyscale-500 dark:!bg-greyscale-400 !border-2 !border-surface-base hover:!bg-primary-yellow-500 transition-colors dark:!border-surface-raised"
      />

      {/* Category icon or ordinal badge */}
      {categoryMeta ? (
        <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
          CATEGORY_BADGE[categoryMeta.category]
        } border border-surface-border transition-colors`}>
          {categoryMeta.icon}
        </span>
      ) : (
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-raised text-[10px] font-bold text-greyscale-700 dark:text-greyscale-300 border border-surface-border transition-colors">
          {ordinal + 1}
        </span>
      )}

      {/* Visibility icon — colored by type */}
      {visibilityIcon}

      {/* Label */}
      <span className="flex-1 truncate text-xs font-medium text-greyscale-900 dark:text-greyscale-50 leading-tight">
        {label}
      </span>

      <WorkflowNodeQuickActions
        canConfigure={!!onConfigNode && (Boolean(lens_id) || isUtilityNode)}
        canDuplicate={!!onDuplicate}
        canEditLens={!!isLensOwner && !!onEditLens && !!lens_id}
        canDelete={!!onRemove}
        canViewDocs={isUtilityNode}
        nodeType={config?.node_type ?? config?.nodeType}
        onConfigure={() => onConfigNode?.(id, lens_id ?? '__utility')}
        onDuplicate={() => onDuplicate?.(id)}
        onEditLens={() => { if (lens_id) onEditLens?.(lens_id) }}
        onDelete={() => onRemove?.(id)}
      />

      {/* Source handle — right */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !rounded-full !bg-greyscale-500 dark:!bg-greyscale-400 !border-2 !border-surface-base hover:!bg-primary-yellow-500 transition-colors dark:!border-surface-raised"
      />

      {/* Execution status badge — top-right corner */}
      {showBadge && <WorkflowNodeExecutionBadge status={executionStatus!} />}

      {/* Dry-run side-effect warning — bottom-center */}
      {executionWarning && (
        <div
          title={executionWarning}
          aria-label={executionWarning}
          className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-full border border-amber-400/50 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 text-[8px] font-medium text-amber-700 dark:text-amber-300 whitespace-nowrap"
        >
          <AlertTriangle size={7} />
          dry run
        </div>
      )}
    </div>
  )
}
