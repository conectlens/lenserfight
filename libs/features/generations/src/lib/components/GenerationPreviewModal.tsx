import { ExternalLink, Calendar, X } from 'lucide-react'
import React from 'react'

import { Button } from '@lenserfight/ui/components'
import { AIGeneration, AIModel } from '@lenserfight/types'

interface GenerationPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  generation: AIGeneration | null
  models?: AIModel[]
}

export const GenerationPreviewModal: React.FC<GenerationPreviewModalProps> = ({
  isOpen,
  onClose,
  generation,
  models = [],
}) => {
  if (!generation || !generation.media) return null

  const { media } = generation
  const modelLabel = models.find((m) => m.id === generation.ai_model_slug)?.name || 'Unknown Model'

  if (!isOpen) return null

  const handleOpenOriginal = () => {
    if (generation.original_chat_url) {
      window.open(generation.original_chat_url, '_blank')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div
        className={`
            relative w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col-reverse md:flex-row 
            max-h-[calc(100vh-2rem)] 
            bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
            overflow-y-auto md:overflow-hidden
        `}
      >
        {/* Media Content Area */}
        <div
          className={`
                w-full md:flex-1 flex items-center justify-center relative min-h-[300px] bg-gray-50 dark:bg-black flex-shrink-0
                ${media.media_kind === 'text' ? 'md:overflow-hidden' : ''}
            `}
        >
          {media.media_kind === 'image' && (
            <img
              src={media.url}
              alt="Generated result"
              className="max-w-full max-h-[600px] md:max-h-full object-contain p-4"
            />
          )}

          {media.media_kind === 'video' && (
            <video
              src={media.url}
              controls
              autoPlay
              className="max-w-full max-h-[600px] md:max-h-full p-4"
            />
          )}

          {media.media_kind === 'text' && (
            <div className="p-8 md:p-12 w-full h-auto md:h-full md:overflow-y-auto generations-scroll">
              <div className="prose prose-lg max-w-none text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans leading-loose">
                {generation.input_text || 'Content not available for preview.'}
              </div>
            </div>
          )}

          {media.media_kind === 'audio' && (
            <div className="w-full p-10 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center mb-6">
                <svg
                  className="w-10 h-10 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 10l12-3"
                  />
                </svg>
              </div>
              <audio src={media.url} controls className="w-full max-w-md" />
            </div>
          )}
        </div>

        {/* Sidebar / Info Panel */}
        <div
          className={`
                w-full md:w-80 flex-shrink-0 p-6 flex flex-col 
                border-b md:border-b-0 md:border-l border-gray-200 dark:border-gray-800
                bg-white dark:bg-gray-900
                h-auto md:h-full md:overflow-hidden
            `}
        >
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <h3 className="font-bold text-lg">Details</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6 flex-1 md:overflow-y-auto generations-scroll">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Model
              </span>
              <p className="font-medium mt-1 text-sm">{modelLabel}</p>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Created
              </span>
              <div className="flex items-center gap-2 mt-1">
                <Calendar size={14} className="text-gray-500 dark:text-gray-400" />
                <p className="font-medium text-sm">
                  {new Date(generation.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {generation.input_text && media.media_kind !== 'text' && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Input
                </span>
                <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {generation.input_text}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-3 flex-shrink-0">
            {generation.original_chat_url && (
              <Button
                onClick={handleOpenOriginal}
                variant="secondary"
                className="w-full justify-center"
              >
                <ExternalLink size={16} className="mr-2" />
                Open Chat
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
