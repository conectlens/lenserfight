import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { AgentTeamRecord } from '@lenserfight/types'
import { Button } from '@lenserfight/ui/components'
import { Dialog } from '@lenserfight/ui/overlays'
import { BookOpen, Code2, Megaphone, Mic2, Search, Sparkles } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

interface Template {
  id: string
  icon: React.ReactNode
  label: string
  name: string
  purpose: string
}

const TEMPLATES: Template[] = [
  {
    id: 'research',
    icon: <Search size={16} />,
    label: 'Research Crew',
    name: 'Research Crew',
    purpose: 'Multi-agent research pipeline with a planner, web researcher, critic, and editor.',
  },
  {
    id: 'coding',
    icon: <Code2 size={16} />,
    label: 'Coding Team',
    name: 'Coding Team',
    purpose: 'Software delivery team with an architect, developer, code reviewer, and tester.',
  },
  {
    id: 'marketing',
    icon: <Megaphone size={16} />,
    label: 'Marketing Team',
    name: 'Marketing Team',
    purpose: 'Content and growth team with a strategist, copywriter, designer, and analyst.',
  },
  {
    id: 'debate',
    icon: <Mic2 size={16} />,
    label: 'Debate Team',
    name: 'Debate Team',
    purpose: 'Structured argumentation crew with a proposer, opposer, and moderator.',
  },
  {
    id: 'content',
    icon: <BookOpen size={16} />,
    label: 'Content Production',
    name: 'Content Production',
    purpose: 'End-to-end content pipeline with a director, writer, editor, and publisher.',
  },
]

interface CreateTeamDialogProps {
  open: boolean
  onClose: () => void
  aiLenserId: string
  onCreated: (team: AgentTeamRecord) => void
}

export const CreateTeamDialog: React.FC<CreateTeamDialogProps> = ({
  open,
  onClose,
  aiLenserId,
  onCreated,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTemplateSelect = (tpl: Template) => {
    setSelectedTemplate(tpl.id)
    setName(tpl.name)
    setPurpose(tpl.purpose)
    setDescription('')
  }

  const handleGenerate = () => {
    if (!description.trim()) return
    // Parse description into a name heuristically for now
    const words = description.trim().split(/\s+/)
    const generated = words
      .filter((w) => w.length > 3)
      .slice(0, 4)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(' ')
    setName(generated || description.slice(0, 40))
    setPurpose(description)
    setSelectedTemplate(null)
  }

  const handleClose = () => {
    setSelectedTemplate(null)
    setDescription('')
    setName('')
    setPurpose('')
    setIsActive(true)
    setError(null)
    onClose()
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Team name is required.')
      return
    }
    if (!aiLenserId) {
      setError('No AI Lenser available.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const team = await agentWorkspaceService.createTeam({
        ai_lenser_id: aiLenserId,
        name: name.trim(),
        description: purpose.trim() || null,
        status: isActive ? 'active' : 'paused',
        initial_members: [],
      })
      if (!team) throw new Error('Team creation failed')
      toast.success(`Team "${team.name}" created`)
      onCreated(team)
      handleClose()
    } catch (err) {
      setError((err as Error).message ?? 'Failed to create team')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="New team"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={submitting || !name.trim()}
              isLoading={submitting}
            >
              {submitting ? 'Creating…' : 'Create team'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Template tiles */}
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Start from a template
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TEMPLATES.map((tpl) => (
              <Button
                key={tpl.id}
                type="button"
                onClick={() => handleTemplateSelect(tpl)}
                className={[
                  'flex items-center gap-2.5 rounded-2xl border px-3 py-3 text-left text-sm transition',
                  selectedTemplate === tpl.id
                    ? 'border-primary-yellow-400 bg-primary-yellow-50 text-primary-yellow-700 dark:border-primary-yellow-500 dark:bg-primary-yellow-900/20 dark:text-primary-yellow-300'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:border-gray-600',
                ].join(' ')}
              >
                <span className="shrink-0">{tpl.icon}</span>
                <span className="font-semibold">{tpl.label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* AI description */}
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Or describe your team
          </p>
          <div className="flex gap-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g., A research crew with a planner, web researcher, critic, and final editor"
              className="flex-1 resize-none rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-yellow-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
            />
            <Button
              type="button"
              variant="secondary"
              className="self-start"
              onClick={handleGenerate}
              disabled={!description.trim()}
              title="Generate name from description"
            >
              <Sparkles size={16} />
            </Button>
          </div>
        </div>

        {/* Name + settings */}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Team name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Autonomous Crew"
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-yellow-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Purpose
            </label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
              placeholder="What does this team do?"
              className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-yellow-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Activation mode
            </label>
            <div className="flex gap-3">
              {[
                { value: true, label: 'Active' },
                { value: false, label: 'Draft' },
              ].map((opt) => (
                <label key={String(opt.value)} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    checked={isActive === opt.value}
                    onChange={() => setIsActive(opt.value)}
                    className="accent-primary-yellow-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
