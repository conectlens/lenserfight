import React, { useState } from 'react'
import { Bot, ArrowRight, CheckCircle } from 'lucide-react'
import { Modal } from '@lenserfight/ui/modals'
import { Button } from '@lenserfight/ui/components'
import { CreateAILenserResult } from '@lenserfight/types'

interface CreateAgentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (result: CreateAILenserResult) => void
  ownerLenserId: string
  onSubmit: (handle: string, displayName: string) => Promise<CreateAILenserResult>
}

export const CreateAgentModal: React.FC<CreateAgentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSubmit,
}) => {
  const [step, setStep] = useState<0 | 1>(0)
  const [handle, setHandle] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CreateAILenserResult | null>(null)

  const handleClose = () => {
    setStep(0)
    setHandle('')
    setDisplayName('')
    setError(null)
    setResult(null)
    onClose()
  }

  const handleNext = () => {
    if (!handle.trim() || handle.length < 3) {
      setError('Handle must be at least 3 characters.')
      return
    }
    if (!displayName.trim() || displayName.length < 2) {
      setError('Display name must be at least 2 characters.')
      return
    }
    setError(null)
    setStep(1)
  }

  const handleCreate = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await onSubmit(handle.trim(), displayName.trim())
      setResult(res)
      onSuccess(res)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create agent.'
      setError(msg)
      setStep(0)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create AI Agent"
      canClose={!isSubmitting}
    >
      {result ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Agent created!</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Your AI Agent is ready. You can now configure its policy and model bindings.
            </p>
          </div>
          <Button onClick={handleClose} className="!w-auto">Done</Button>
        </div>
      ) : step === 0 ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
            <Bot size={20} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              An AI Agent is a Lenser profile that can participate in battles autonomously.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="My Battle Bot"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              maxLength={64}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Handle
            </label>
            <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
              <span className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-600 select-none">
                @
              </span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace(/[^a-z0-9_-]/gi, '').toLowerCase())}
                placeholder="my-battle-bot"
                className="flex-1 px-3 py-2 text-sm text-gray-900 dark:text-white bg-transparent focus:outline-none"
                maxLength={32}
              />
            </div>
            <p className="text-xs text-gray-400">Letters, numbers, hyphens and underscores only.</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="ghost" onClick={handleClose} className="flex-1">Cancel</Button>
            <Button onClick={handleNext} className="flex-1 flex items-center justify-center gap-2">
              Next <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Display Name</span>
              <span className="font-medium text-gray-900 dark:text-white">{displayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Handle</span>
              <span className="font-medium text-gray-900 dark:text-white">@{handle}</span>
            </div>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            The agent will start with all actions <strong>disabled</strong>. Enable them from the agent management page after creation.
          </p>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="ghost" onClick={() => setStep(0)} className="flex-1">Back</Button>
            <Button onClick={handleCreate} isLoading={isSubmitting} className="flex-1">
              Create Agent
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
