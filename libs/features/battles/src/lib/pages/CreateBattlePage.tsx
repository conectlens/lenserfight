import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@lenserfight/ui/components'

export function CreateBattlePage() {
  const [title, setTitle] = useState('')
  const [taskPrompt, setTaskPrompt] = useState('')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 relative">
      {/* Coming Soon overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--cl-surface-base)]/80 backdrop-blur-sm rounded-2xl">
        <p className="text-4xl mb-3">🔒</p>
        <p className="text-xl font-bold text-[var(--cl-surface-text)] mb-1">Invite-gated</p>
        <p className="text-sm text-[var(--cl-surface-text-muted)] text-center max-w-xs">
          Battle creation is currently limited to invited creators. Join the waitlist to get early access.
        </p>
        <Link
          to="/battles"
          className="mt-6 text-sm text-[var(--cl-surface-text-muted)] border border-[var(--cl-surface-border)] rounded-lg px-4 py-2 hover:border-[var(--cl-surface-border-subtle)] transition-colors"
        >
          Browse existing battles
        </Link>
      </div>

      {/* Form (blurred behind overlay) */}
      <div className="space-y-6 opacity-40 pointer-events-none select-none">
        <div>
          <Link to="/battles" className="text-xs text-[var(--cl-surface-text-disabled)] mb-2 inline-block">
            ← All Battles
          </Link>
          <h1 className="text-2xl font-bold text-[var(--cl-surface-text)]">Create a Battle</h1>
          <p className="text-sm text-[var(--cl-surface-text-muted)] mt-1">
            Set a clear task, invite two contenders, and let the community judge the result.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--cl-surface-text)] mb-1">Battle Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. GPT-4o vs Claude 3.7 — Technical Writing"
              className="w-full border border-[var(--cl-surface-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--cl-surface-border-subtle)] bg-[var(--cl-surface-base)] text-[var(--cl-surface-text)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--cl-surface-text)] mb-1">Task Prompt</label>
            <textarea
              value={taskPrompt}
              onChange={(e) => setTaskPrompt(e.target.value)}
              placeholder="Describe the task clearly. Both contenders will respond to the same prompt."
              rows={5}
              className="w-full border border-[var(--cl-surface-border)] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[var(--cl-surface-border-subtle)] bg-[var(--cl-surface-base)] text-[var(--cl-surface-text)]"
            />
            <p className="text-xs text-[var(--cl-surface-text-disabled)] mt-1">
              A good task prompt is specific, measurable, and fair to both contenders.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800 mb-1">Invite-gated creation</p>
            <p className="text-xs text-amber-700">
              Battle creation is currently limited to verified creators. This ensures quality and prevents spam during
              the beta. Submission and judging are open to all.
            </p>
          </div>

          <Button variant="dark" disabled>
            Create Battle
          </Button>
        </div>
      </div>
    </div>
  )
}
