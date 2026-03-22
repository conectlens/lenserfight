import React, { useRef, useState } from 'react'
import { FileText, Image, Music, Video, File, Upload, X } from 'lucide-react'
import { Button, LinearProgress } from '@lenserfight/ui/components'
import { VersionResource } from '@lenserfight/types'

interface ResourceAttachmentsPanelProps {
  resources: VersionResource[]
  isOwner: boolean
  onUploadAndAttach: (file: globalThis.File, bindingKey: string) => Promise<void>
  onDetach: (resourceId: string) => void
  uploadProgress: Record<string, { status: string; percent?: number }>
  isLoading?: boolean
}

const MEDIA_ICONS: Record<string, React.ElementType> = {
  text: FileText,
  document: FileText,
  image: Image,
  audio: Music,
  video: Video,
  json: FileText,
}

function formatBytes(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const ResourceAttachmentsPanel: React.FC<ResourceAttachmentsPanelProps> = ({
  resources,
  isOwner,
  onUploadAndAttach,
  onDetach,
  uploadProgress,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [bindingKey, setBindingKey] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const key = bindingKey.trim() || file.name.replace(/\.[^.]+$/, '').replace(/\s+/g, '_')
    await onUploadAndAttach(file, key)
    setBindingKey('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const activeUploads = Object.entries(uploadProgress).filter(([, p]) => p.status === 'uploading')

  if (isLoading) {
    return (
      <div className="mt-6 space-y-2">
        <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">Attachments</h4>

      {/* Resource list */}
      {resources.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {resources.map((vr) => {
            const res = vr.resource
            if (!res) return null
            const Icon = MEDIA_ICONS[res.mediaType] ?? File
            return (
              <div
                key={`${vr.versionId}-${vr.resourceId}`}
                className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              >
                <Icon size={16} className="text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                    {res.name}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {vr.bindingKey}{res.byteSize ? ` · ${formatBytes(res.byteSize)}` : ''}
                  </p>
                </div>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => onDetach(vr.resourceId)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Upload progress */}
      {activeUploads.map(([key, progress]) => (
        <div key={key} className="mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Uploading {key}...</p>
          <LinearProgress value={progress.percent ?? 0} className="h-1.5" />
        </div>
      ))}

      {/* Upload area (owner only) */}
      {isOwner && (
        <div>
          <div className="mb-2">
            <input
              type="text"
              value={bindingKey}
              onChange={(e) => setBindingKey(e.target.value)}
              placeholder="Binding key (e.g., context_doc)"
              className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center py-6 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={20} className="text-gray-400 mb-1.5" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Drop file or <span className="text-primary-600 dark:text-primary-400">browse</span>
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </div>
      )}

      {/* Empty state for non-owners */}
      {!isOwner && resources.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
          No attachments for this version.
        </p>
      )}
    </div>
  )
}
