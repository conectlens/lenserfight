import { Button } from '@lenserfight/ui/components'
import { TextArea } from '@lenserfight/ui/forms'
import React, { useState } from 'react'

import { useSubmitEntry } from '../../hooks/mutations/useSubmitEntry'

interface SubmitTextFormProps {
  battleId: string
  contenderId: string
}

const MIN_LENGTH = 20

export const SubmitTextForm: React.FC<SubmitTextFormProps> = ({ battleId, contenderId }) => {
  const [text, setText] = useState('')
  const submitEntry = useSubmitEntry(battleId)

  const isValid = text.trim().length >= MIN_LENGTH
  const remaining = MIN_LENGTH - text.trim().length

  const handleSubmit = async () => {
    if (!isValid) return
    await submitEntry.mutateAsync({ contenderId, contentText: text.trim() })
    setText('')
  }

  if (submitEntry.isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
        <span className="text-2xl">✅</span>
        <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
          Submission received
        </p>
        <p className="text-xs text-greyscale-500">Waiting for the other contender…</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-greyscale-500">
        Your submission
      </p>
      <TextArea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your response to the battle prompt…"
        minRows={8}
        autoResize={false}
      />
      <div className="flex items-center justify-between gap-3">
        <span className={`text-xs ${isValid ? 'text-greyscale-500' : 'text-greyscale-600'}`}>
          {isValid ? `${text.trim().length} chars` : `${remaining} more chars needed`}
        </span>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!isValid || submitEntry.isPending}
          isLoading={submitEntry.isPending}
          className="w-auto"
        >
          Submit
        </Button>
      </div>
      {submitEntry.error && (
        <p className="text-xs text-red-400">{(submitEntry.error as Error).message}</p>
      )}
    </div>
  )
}
