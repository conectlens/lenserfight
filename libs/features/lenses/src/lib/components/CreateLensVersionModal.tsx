import React, { useState } from 'react'
import { Modal } from '@lenserfight/ui/modals'
import { Button } from '@lenserfight/ui/components'
import { LensVersionParam } from '@lenserfight/types'
import { LensVersionParameterEditor } from './LensVersionParameterEditor'

type EditableParam = Omit<LensVersionParam, 'id' | 'versionId'>

interface CreateLensVersionModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    templateBody: string
    changelog: string
    parameters: EditableParam[]
  }) => void
  isSubmitting: boolean
  initialContent?: string
}

const inputClass =
  'w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500'

export const CreateLensVersionModal: React.FC<CreateLensVersionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialContent = '',
}) => {
  const [templateBody, setTemplateBody] = useState(initialContent)
  const [changelog, setChangelog] = useState('')
  const [parameters, setParameters] = useState<EditableParam[]>([])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!templateBody.trim()) return
    onSubmit({ templateBody: templateBody.trim(), changelog: changelog.trim(), parameters })
  }

  // Reset form when modal opens with new content
  React.useEffect(() => {
    if (isOpen) {
      setTemplateBody(initialContent)
      setChangelog('')
      setParameters([])
    }
  }, [isOpen, initialContent])

  return (
    <Modal isOpen={isOpen} onClose={onClose} panelClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create New Version</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create an immutable draft version from this template. You can publish it once ready.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
            Template Body
          </label>
          <textarea
            value={templateBody}
            onChange={(e) => setTemplateBody(e.target.value)}
            rows={10}
            className={`${inputClass} resize-none font-mono text-xs`}
            placeholder="Enter the lens template..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
            Changelog
          </label>
          <textarea
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
            placeholder="Describe what changed in this version..."
          />
        </div>

        <LensVersionParameterEditor parameters={parameters} onChange={setParameters} />

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button variant="ghost" className="!w-auto" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={!templateBody.trim()}
            className="!w-auto px-6"
          >
            Create Draft
          </Button>
        </div>
      </form>
    </Modal>
  )
}
