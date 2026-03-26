import { Badge, Button, Card } from '@lenserfight/ui/components'
import { Field, Input, SelectField, TextArea } from '@lenserfight/ui/forms'
import { useWizardStep } from '@lenserfight/ui/routing'
import { ArrowLeft, ArrowRight, Check, GitBranch, Sparkles } from 'lucide-react'
import React, { useState } from 'react'

import { useCreateWorkflow } from '../hooks/useCreateWorkflow'

export interface CreateWorkflowWizardProps {
  onCreated: (workflowId: string) => void
  onCancel: () => void
}

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'private', label: 'Private' },
  { value: 'unlisted', label: 'Unlisted' },
] as const

export const CreateWorkflowWizard: React.FC<CreateWorkflowWizardProps> = ({ onCreated, onCancel }) => {
  const { step, goToStep } = useWizardStep({ maxStep: 1 })
  const { submit, isSubmitting, error: submissionError } = useCreateWorkflow()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<(typeof VISIBILITY_OPTIONS)[number]['value']>('public')
  const [localError, setLocalError] = useState<string | null>(null)
  const [createdWorkflowId, setCreatedWorkflowId] = useState<string | null>(null)

  const titleValue = title.trim()
  const descriptionValue = description.trim()
  const error = localError ?? submissionError

  const reset = () => {
    setTitle('')
    setDescription('')
    setVisibility('public')
    setLocalError(null)
    setCreatedWorkflowId(null)
  }

  const handleCancel = () => {
    reset()
    onCancel()
  }

  const handleNext = () => {
    if (titleValue.length < 3) {
      setLocalError('Title must be at least 3 characters.')
      return
    }
    setLocalError(null)
    goToStep(1)
  }

  const handleCreate = async () => {
    try {
      const workflow = await submit({
        title: titleValue,
        description: descriptionValue || undefined,
        visibility,
      })
      setCreatedWorkflowId(workflow.id)
      onCreated(workflow.id)
    } catch {
      goToStep(0)
    }
  }

  if (createdWorkflowId) {
    return (
      <Card className="mx-auto max-w-2xl border border-status-green/20 bg-gradient-to-br from-surface-raised to-surface-base p-6 shadow-neu-2">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-status-green/10">
            <Check size={28} className="text-status-green" />
          </div>
          <div className="space-y-2">
            <Badge color="green" variant="outline">Workflow created</Badge>
            <h2 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-50">
              Your workflow is ready.
            </h2>
            <p className="text-sm leading-6 text-greyscale-500 dark:text-greyscale-400">
              We saved the metadata and handed you off to the builder so you can start connecting lenses.
            </p>
          </div>
          <Button onClick={handleCancel} variant="ghost" className="w-auto">
            Close
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-2xl space-y-6 border border-surface-border bg-surface-raised p-6 shadow-neu-2">
      <div className="space-y-3">
        <Badge color="blue" variant="outline">New workflow</Badge>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-status-blue/10">
            <GitBranch size={20} className="text-status-blue" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-50">
              Build a Connected Lens workflow
            </h1>
            <p className="text-sm leading-6 text-greyscale-500 dark:text-greyscale-400">
              Start with the workflow metadata, review it once, then move into the canvas builder.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {['Details', 'Review'].map((label, index) => {
          const done = index < step
          const active = index === step
          return (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2">
                <div
                  className={[
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    done
                      ? 'bg-greyscale-900 text-greyscale-0 dark:bg-greyscale-0 dark:text-greyscale-900'
                      : active
                        ? 'border-2 border-status-blue text-status-blue'
                        : 'border border-surface-border text-greyscale-400',
                  ].join(' ')}
                >
                  {done ? <Check size={13} /> : index + 1}
                </div>
                <span className={['hidden text-sm font-semibold sm:block', active ? 'text-greyscale-900 dark:text-greyscale-50' : 'text-greyscale-400'].join(' ')}>
                  {label}
                </span>
              </div>
              {index === 0 && <div className="h-px flex-1 bg-surface-border" />}
            </React.Fragment>
          )
        })}
      </div>

      {step === 0 ? (
        <div className="space-y-5">
          <div className="space-y-4">
            <Field
              id="workflow-title"
              label="Workflow title"
              required
              error={localError && titleValue.length < 3 ? localError : undefined}
              hint="Keep it concise but descriptive."
            >
              <Input
                id="workflow-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Research → Draft → Polish"
                maxLength={120}
              />
            </Field>

            <Field
              id="workflow-description"
              label="Description"
              hint="Optional context for other lensers who open the workflow later."
            >
              <TextArea
                id="workflow-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what this workflow should do."
                minRows={4}
                maxRows={8}
              />
            </Field>

            <SelectField
              label="Visibility"
              value={visibility}
              onChange={(value) => setVisibility(value as (typeof VISIBILITY_OPTIONS)[number]['value'])}
              options={[...VISIBILITY_OPTIONS]}
              placeholder="Choose visibility"
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-status-red">{error}</p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
            <Button variant="ghost" onClick={handleCancel} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleNext} className="w-full gap-2 sm:w-auto">
              Next <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <Badge color="blue" variant="outline">Step 2 of 2</Badge>
            <h2 className="text-xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-50">
              Review workflow metadata
            </h2>
            <p className="text-sm leading-6 text-greyscale-500 dark:text-greyscale-400">
              This creates the workflow shell only. You’ll land in the builder immediately after creation.
            </p>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-base p-4 shadow-neu-1">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-greyscale-500 dark:text-greyscale-400">Title</span>
                <span className="font-semibold text-greyscale-900 dark:text-greyscale-50">{titleValue}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-greyscale-500 dark:text-greyscale-400">Visibility</span>
                <span className="font-semibold capitalize text-greyscale-900 dark:text-greyscale-50">{visibility}</span>
              </div>
              {descriptionValue && (
                <div className="space-y-1">
                  <span className="text-greyscale-500 dark:text-greyscale-400">Description</span>
                  <p className="leading-6 text-greyscale-700 dark:text-greyscale-300">{descriptionValue}</p>
                </div>
              )}
            </div>
          </div>

          <p className="text-sm leading-6 text-greyscale-500 dark:text-greyscale-400">
            The workflow will be created under your current lenser profile. You can add lenses and edges right after this step.
          </p>

          {error && (
            <p className="text-sm font-medium text-status-red">{error}</p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
            <Button variant="ghost" onClick={() => goToStep(0)} className="w-full sm:w-auto">
              <ArrowLeft size={14} />
              Back
            </Button>
            <Button onClick={handleCreate} isLoading={isSubmitting} className="w-full gap-2 sm:w-auto">
              <Sparkles size={14} />
              Create workflow
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
