import { Badge, Button, Card, DesktopFrame } from '@lenserfight/ui/components'
import { Lock, Sparkles, Wand2, ArrowRight } from 'lucide-react'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'


export function CreateBattlePage() {
  const [title, setTitle] = useState('')
  const [taskPrompt, setTaskPrompt] = useState('')

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <Card className="space-y-6 p-6 lg:sticky lg:top-24">
          <Badge color="yellow" variant="outline">
            Invite-gated
          </Badge>
          <div className="space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-yellow-500/15 text-primary-yellow-800 dark:bg-primary-yellow-500/10 dark:text-primary-yellow-400">
              <Lock size={22} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
              Battle creation is limited to invited creators during beta.
            </h1>
            <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
              The form is shown as a preview so the workflow stays understandable, but the actual creation path is
              locked until invite access is granted.
            </p>
          </div>

          <div className="space-y-3">
            {[
              'Write a clear task prompt.',
              'Invite two contenders with comparable conditions.',
              'Publish the result page for voting and sharing.',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-surface-border bg-surface-raised p-4">
                <Sparkles size={16} className="mt-1 shrink-0 text-status-blue" />
                <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">{item}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/battles"
              className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-base px-5 py-3 text-sm font-semibold text-greyscale-700 transition-colors hover:border-status-blue hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
            >
              Browse battles
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-greyscale-900 px-5 py-3 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 dark:bg-greyscale-0 dark:text-greyscale-900"
            >
              Request access <ArrowRight size={16} />
            </Link>
          </div>
        </Card>

        <DesktopFrame title="Create battle preview" url="lenserfight.com/battles/create" label="Locked preview">
          <div className="space-y-5 opacity-70">
            <Card className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <Badge color="gray" variant="outline">
                  Draft
                </Badge>
                <span className="text-xs text-greyscale-500">Preview only</span>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                  Battle title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. GPT-4o vs Claude — Technical Writing"
                  className="w-full rounded-2xl border border-surface-border bg-surface-base px-4 py-3 text-sm text-greyscale-900 outline-none transition-colors placeholder:text-greyscale-400 focus:border-status-blue"
                />
              </div>
            </Card>

            <Card className="space-y-4 p-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                  Lens prompt
                </label>
                <textarea
                  value={taskPrompt}
                  onChange={(e) => setTaskPrompt(e.target.value)}
                  placeholder="Describe the task clearly. Both contenders will receive the same Lens."
                  rows={7}
                  className="w-full resize-none rounded-2xl border border-surface-border bg-surface-base px-4 py-3 text-sm text-greyscale-900 outline-none transition-colors placeholder:text-greyscale-400 focus:border-status-blue"
                />
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
                Invite-gated creation keeps the beta high quality while the public can still browse and vote.
              </div>
              <Button variant="dark" disabled className="w-auto">
                Create Battle
              </Button>
            </Card>

            <Card className="flex items-center justify-between gap-3 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-greyscale-500">
                  What happens next
                </p>
                <p className="mt-1 text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                  The community votes, the rubric is shown, and the result becomes public.
                </p>
              </div>
              <Wand2 size={18} className="text-status-blue" />
            </Card>
          </div>
        </DesktopFrame>
      </div>
    </div>
  )
}
