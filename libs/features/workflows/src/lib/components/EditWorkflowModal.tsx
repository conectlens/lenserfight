import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'
import { SelectField } from '@lenserfight/ui/forms'
import { FormError } from '@lenserfight/ui/components'
import React, { useRef, useState } from 'react'

import { useUpdateWorkflow } from '../hooks/useUpdateWorkflow'

import type { WorkflowRecord } from '@lenserfight/data/repositories'

interface EditWorkflowModalProps {
  isOpen: boolean
  onClose: () => void
  workflow: WorkflowRecord
}

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
  { value: 'unlisted', label: 'Unlisted' },
]

export function EditWorkflowModal({ isOpen, onClose, workflow }: EditWorkflowModalProps) {
  const [title, setTitle] = useState(workflow.title)
  const [description, setDescription] = useState(workflow.description ?? '')
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>(
    (workflow.visibility as 'public' | 'private' | 'unlisted') ?? 'public'
  )
  const [titleError, setTitleError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const { mutateAsync: updateWorkflow, isPending, error } = useUpdateWorkflow(workflow.id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (title.trim().length < 3) {
      setTitleError('Title must be at least 3 characters')
      return
    }
    setTitleError(null)
    await updateWorkflow({
      title: title.trim(),
      description: description.trim() || null,
      visibility,
    })
    onClose()
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Edit Workflow"
      maxWidth="max-w-md"
      footer={
        <ModalFooter
          leftButton={{ label: 'Cancel', onClick: onClose, variant: 'secondary' }}
          primaryButton={{
            label: 'Save Changes',
            onClick: () => formRef.current?.requestSubmit(),
            isLoading: isPending,
            disabled: isPending,
          }}
        />
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-greyscale-700 dark:text-greyscale-300">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleError(null) }}
            maxLength={120}
            className="w-full rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-sm text-greyscale-900 placeholder:text-greyscale-400 focus:outline-none focus:ring-2 focus:ring-primary-yellow-500/40 dark:text-greyscale-50"
            placeholder="Workflow title"
          />
          {titleError && <p className="text-xs text-red-500">{titleError}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-greyscale-700 dark:text-greyscale-300">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-surface-border bg-surface-raised px-3 py-2 text-sm text-greyscale-900 placeholder:text-greyscale-400 focus:outline-none focus:ring-2 focus:ring-primary-yellow-500/40 dark:text-greyscale-50"
            placeholder="Optional description"
          />
        </div>

        <SelectField
          label="Visibility"
          value={visibility}
          onChange={(v) => setVisibility(v as 'public' | 'private' | 'unlisted')}
          options={VISIBILITY_OPTIONS}
        />

        {error && <FormError message={(error as Error).message} />}
      </form>
    </Dialog>
  )
}
