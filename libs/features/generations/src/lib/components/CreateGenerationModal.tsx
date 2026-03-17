import { Image as ImageIcon, Video, Type, AlertCircle } from 'lucide-react'
import React, { useState, useEffect } from 'react'

import { Button } from '@lenserfight/ui/components'
import { Modal } from '@lenserfight/ui/modals'
import { SelectField } from '@lenserfight/ui/forms'
import { generationService } from '@lenserfight/data/repositories'
import {
  CreateGenerationDTO,
  MediaKind,
  AIModel,
} from '@lenserfight/types'
import { isValidUrl } from '@lenserfight/utils/validation'
import { InputField } from '@lenserfight/features/auth'
import { useAuthenticatedLenser } from '../hooks/useAuthenticatedLenser'

interface CreateGenerationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  promptId: string
  existingUrls?: string[]
}

const RESULT_TYPES: { value: MediaKind; label: string; icon: any }[] = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'image', label: 'Image', icon: ImageIcon },
  { value: 'video', label: 'Video', icon: Video },
]

export const CreateGenerationModal: React.FC<CreateGenerationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  promptId,
  existingUrls = [],
}) => {
  const { lenser } = useAuthenticatedLenser()
  const [aiModelSlug, setAIModelSlug] = useState('')
  const [chatUrl, setChatUrl] = useState('')
  const [resultType, setResultType] = useState<MediaKind>('text')
  const [content, setContent] = useState('') // Text body or URL
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  // Fetch models on mount
  useEffect(() => {
    if (isOpen) {
      // Reset form
      setAIModelSlug('')
      setChatUrl('')
      setResultType('text')
      setContent('')
      setError(null)

      // Fetch models
      const fetchModels = async () => {
        setIsLoadingModels(true)
        try {
          const models = await generationService.getAIModels()
          setAvailableModels(models)
        } catch (e) {
          console.error('Failed to load AI models', e)
        } finally {
          setIsLoadingModels(false)
        }
      }
      fetchModels()
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lenser) return

    if (!aiModelSlug) {
      setError('Please select an AI Model.')
      return
    }

    if (chatUrl && !isValidUrl(chatUrl)) {
      setError('Original Chat URL must be a valid link starting with http:// or https://')
      return
    }

    if (!content.trim()) {
      setError(
        resultType === 'text'
          ? 'Please enter the generated text.'
          : 'Please enter a valid media URL.'
      )
      return
    }

    // Validate Media URL for Image/Video
    if (resultType !== 'text') {
      const cleanUrl = content.trim()
      if (!isValidUrl(cleanUrl)) {
        setError('Media URL must be a valid link starting with http:// or https://')
        return
      }

      if (existingUrls.includes(cleanUrl)) {
        setError('This media URL has already been added to this prompt.')
        return
      }
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const dto: CreateGenerationDTO = {
        lenser_id: lenser.id,
        prompt_template_id: promptId,
        ai_model_slug: aiModelSlug,
        visibility: 'public',
        input_text: resultType === 'text' ? content : undefined, // Store text result here
        original_chat_url: chatUrl || null,
        media: {
          lenser_id: lenser.id,
          media_kind: resultType,
          // For text, we use a placeholder URL or data URI, logic handled by Repo usually,
          // but here we ensure the required fields are met.
          url: resultType === 'text' ? '#' : content.trim(),
          file_name: `${resultType}-result-${Date.now()}`,
          mime_type:
            resultType === 'image'
              ? 'image/png'
              : resultType === 'video'
                ? 'video/mp4'
                : 'text/plain',
        },
      }

      await generationService.createGeneration(dto)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to save result.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isMedia = resultType === 'image' || resultType === 'video'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add AI Result">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Model Selection */}
        <div className="space-y-4">
          <SelectField
            label="AI Model"
            value={aiModelSlug}
            onChange={setAIModelSlug}
            options={availableModels.map((m) => ({ value: m.slug, label: m.name }))}
            placeholder={isLoadingModels ? 'Loading models...' : 'Select Model (e.g. Midjourney)'}
            required
            disabled={isLoadingModels}
          />

          <InputField
            label="Original Chat URL"
            value={chatUrl}
            onChange={(e) => setChatUrl(e.target.value)}
            placeholder="https://chat.openai.com/share/..."
            className="!mb-0"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Optional. Link to the public chat history for this result.
          </p>
        </div>

        {/* Type Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Result Type
          </label>
          <div className="flex bg-gray-50 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
            {RESULT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  setResultType(type.value)
                  setContent('')
                  setError(null)
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${resultType === type.value
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-gray-600'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
              >
                <type.icon size={16} />
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Input */}
        <div className="space-y-4">
          {resultType === 'text' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Generated Text
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none text-sm leading-relaxed text-gray-900 dark:text-white"
                rows={6}
                placeholder="Paste the output from the AI model here..."
              />
            </div>
          ) : (
            <div>
              <InputField
                label={`${resultType === 'image' ? 'Image' : 'Video'} URL`}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value)
                  setError(null)
                }}
                placeholder={`https://example.com/${resultType}.png`}
              />

              {/* Preview Area */}
              <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 min-h-[200px] flex items-center justify-center overflow-hidden relative">
                {content && isValidUrl(content) ? (
                  resultType === 'image' ? (
                    <img
                      src={content}
                      alt="Preview"
                      className="max-w-full max-h-[300px] object-contain"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <video
                      src={content}
                      controls
                      className="max-w-full max-h-[300px]"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  )
                ) : (
                  <div className="text-gray-400 dark:text-gray-500 text-sm flex flex-col items-center">
                    {resultType === 'image' ? (
                      <ImageIcon size={32} className="mb-2 opacity-50" />
                    ) : (
                      <Video size={32} className="mb-2 opacity-50" />
                    )}
                    Preview will appear here
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-auto"
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="w-auto">
            Save Result
          </Button>
        </div>
      </form>
    </Modal>
  )
}
