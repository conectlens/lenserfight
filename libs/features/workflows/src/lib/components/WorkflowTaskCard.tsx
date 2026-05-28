import type { WorkflowTaskOutputType, WorkflowTaskRecord } from '@lenserfight/types'
import { ChevronDown, ChevronUp, FileText, Image, Mic, Trash2, Video } from 'lucide-react'
import React, { useRef, useState } from 'react'

const OUTPUT_TYPES: { type: WorkflowTaskOutputType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Text', icon: <FileText size={12} /> },
  { type: 'image', label: 'Image', icon: <Image size={12} /> },
  { type: 'video', label: 'Video', icon: <Video size={12} /> },
  { type: 'audio', label: 'Audio', icon: <Mic size={12} /> },
  { type: 'file', label: 'File', icon: <FileText size={12} /> },
]

interface WorkflowTaskCardProps {
  task: WorkflowTaskRecord
  isOwner: boolean
  onUpdate: (patch: Partial<WorkflowTaskRecord>) => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function WorkflowTaskCard({
  task,
  isOwner,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: WorkflowTaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [prompt, setPrompt] = useState(task.prompt_text ?? '')
  const titleRef = useRef<HTMLInputElement>(null)

  const commitTitle = () => {
    if (title.trim() && title !== task.title) onUpdate({ title: title.trim() })
  }

  const commitPrompt = () => {
    const trimmed = prompt.trim() || null
    if (trimmed !== task.prompt_text) onUpdate({ prompt_text: trimmed })
  }

  return (
    <div className="rounded-lg border border-surface-border bg-surface-base overflow-hidden">
      {/* Task header */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Reorder */}
        {isOwner && (
          <div className="flex flex-col gap-0.5 flex-shrink-0">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!onMoveUp}
              className="p-0.5 rounded text-greyscale-400 hover:text-greyscale-700 disabled:opacity-25 transition-colors"
            >
              <ChevronUp size={12} />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!onMoveDown}
              className="p-0.5 rounded text-greyscale-400 hover:text-greyscale-700 disabled:opacity-25 transition-colors"
            >
              <ChevronDown size={12} />
            </button>
          </div>
        )}

        {/* Title */}
        {isOwner ? (
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === 'Enter' && titleRef.current?.blur()}
            className="flex-1 min-w-0 bg-transparent text-sm font-medium text-greyscale-900 dark:text-greyscale-50 placeholder-greyscale-400 focus:outline-none focus:ring-1 focus:ring-primary/50 rounded px-1 -mx-1"
            placeholder="Task title…"
          />
        ) : (
          <span className="flex-1 min-w-0 text-sm font-medium text-greyscale-900 dark:text-greyscale-50 truncate">
            {task.title}
          </span>
        )}

        {/* Output type pills */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {OUTPUT_TYPES.map(({ type, label, icon }) => (
            <button
              key={type}
              type="button"
              disabled={!isOwner}
              onClick={() => isOwner && onUpdate({ output_type: type })}
              title={label}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                task.output_type === type
                  ? 'bg-primary-yellow-500/20 text-primary-yellow-700 dark:text-primary-yellow-400 ring-1 ring-primary-yellow-500/40'
                  : 'bg-surface-raised text-greyscale-500 hover:text-greyscale-700 dark:hover:text-greyscale-300'
              } ${!isOwner ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Expand prompt toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 p-1 rounded text-greyscale-400 hover:text-greyscale-700 dark:hover:text-greyscale-200 transition-colors"
          title={expanded ? 'Collapse prompt' : 'Expand prompt'}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {/* Delete */}
        {isOwner && (
          <button
            type="button"
            onClick={onDelete}
            className="flex-shrink-0 p-1 rounded text-greyscale-300 hover:text-status-red transition-colors"
            title="Delete task"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Expandable prompt area */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-surface-border">
          <p className="text-[10px] font-medium text-greyscale-400 uppercase tracking-wide mt-2 mb-1.5">
            Prompt
          </p>
          {isOwner ? (
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onBlur={commitPrompt}
              rows={4}
              placeholder="Describe what the AI should produce for this task. Be specific — this becomes the system instruction for the step."
              className="w-full text-sm text-greyscale-800 dark:text-greyscale-100 bg-surface-raised rounded-lg px-3 py-2 border border-surface-border focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y placeholder-greyscale-400"
            />
          ) : (
            <p className="text-sm text-greyscale-700 dark:text-greyscale-300 whitespace-pre-wrap">
              {task.prompt_text || <span className="italic text-greyscale-400">No prompt defined.</span>}
            </p>
          )}

          {/* Model hint */}
          {isOwner && (
            <div className="mt-2">
              <label className="text-[10px] font-medium text-greyscale-400 uppercase tracking-wide">
                Model hint (optional)
              </label>
              <input
                value={task.model_hint ?? ''}
                onChange={(e) => onUpdate({ model_hint: e.target.value || null })}
                placeholder="e.g. gpt-4o, claude-3-5-sonnet"
                className="mt-1 w-full text-xs text-greyscale-800 dark:text-greyscale-100 bg-surface-raised rounded px-2.5 py-1.5 border border-surface-border focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder-greyscale-400"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
