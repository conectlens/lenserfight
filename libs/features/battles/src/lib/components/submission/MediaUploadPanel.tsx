import React, { useCallback, useRef, useState } from 'react'
import { UploadCloud, X } from 'lucide-react'
import { toast } from 'sonner'

import { battlesRepository } from '@lenserfight/data/repositories'
import type { SubmissionOutputModality, SubmissionRecord } from '@lenserfight/data/repositories'
import { Button } from '@lenserfight/ui/components'
import {
  checkMediaQuality,
  type MediaQualityRule,
} from '@lenserfight/utils/text'

// Phase BC — drag-drop or file-picker entry point for image/video/audio
// contender submissions. Hands the file to battlesRepository.uploadSubmissionMedia,
// then commits via submitMediaEntry. Modality is auto-detected from MIME prefix.

export interface MediaUploadPanelProps {
  battleId: string
  contenderId: string
  onSubmitted?: (submission: SubmissionRecord) => void
  className?: string
  /**
   * Optional per-modality client-side quality rule. When provided, the panel
   * runs {@link checkMediaQuality} before allowing submit and surfaces the
   * violations inline. Mirrors fn_check_media_quality (Phase BK).
   */
  qualityRule?: MediaQualityRule
}

interface SelectedFile {
  file: File
  previewUrl: string
  modality: SubmissionOutputModality
}

function inferModality(mime: string): SubmissionOutputModality {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'text'
}

const MAX_BYTES = 50 * 1024 * 1024

export function MediaUploadPanel({ battleId, contenderId, onSubmitted, className, qualityRule }: MediaUploadPanelProps) {
  const [selected, setSelected] = useState<SelectedFile | null>(null)
  const [progress, setProgress] = useState(0)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [violations, setViolations] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSelect = useCallback(async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error('File exceeds 50MB limit.')
      return
    }
    const modality = inferModality(file.type)
    if (modality === 'text') {
      toast.error(`Unsupported file type: ${file.type || 'unknown'}`)
      return
    }
    if (selected?.previewUrl) URL.revokeObjectURL(selected.previewUrl)
    setSelected({ file, previewUrl: URL.createObjectURL(file), modality })
    setProgress(0)

    if (qualityRule && qualityRule.modality === modality) {
      try {
        const result = await checkMediaQuality(file, qualityRule)
        setViolations(result.violations)
      } catch {
        setViolations([])
      }
    } else {
      setViolations([])
    }
  }, [selected, qualityRule])

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setDragOver(false)
      const file = event.dataTransfer.files?.[0]
      if (file) handleSelect(file)
    },
    [handleSelect]
  )

  const handleClear = useCallback(() => {
    if (selected?.previewUrl) URL.revokeObjectURL(selected.previewUrl)
    setSelected(null)
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ''
  }, [selected])

  const handleSubmit = useCallback(async () => {
    if (!selected || busy) return
    if (violations.length > 0) {
      toast.error('Media does not meet template quality rules — see violations.')
      return
    }
    setBusy(true)
    try {
      const { publicUrl, mimeType, outputModality } = await battlesRepository.uploadSubmissionMedia(
        battleId,
        contenderId,
        selected.file,
        setProgress
      )
      const submission = await battlesRepository.submitMediaEntry(
        battleId,
        contenderId,
        publicUrl,
        mimeType,
        outputModality
      )
      toast.success('Media submitted')
      onSubmitted?.(submission)
      handleClear()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }, [battleId, contenderId, selected, busy, onSubmitted, handleClear])

  return (
    <div
      role="region"
      aria-label="Upload media"
      className={`rounded-2xl border border-dashed p-4 ${
        dragOver ? 'border-primary-yellow-500 bg-primary-yellow-500/5' : 'border-surface-border'
      } ${className ?? ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {!selected ? (
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
          <UploadCloud size={28} className="text-greyscale-400" />
          <p className="text-sm text-greyscale-300">
            Drag a file here, or pick one. Image, video, or audio (≤ 50&nbsp;MB).
          </p>
          <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
            Choose file
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleSelect(f)
            }}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-greyscale-100">{selected.file.name}</p>
              <p className="text-xs text-greyscale-500">
                {selected.modality} • {(selected.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              aria-label="Remove file"
              className="text-greyscale-400 hover:text-greyscale-200"
              disabled={busy}
            >
              <X size={18} />
            </button>
          </div>

          <div className="overflow-hidden rounded-xl bg-surface-sunken">
            {selected.modality === 'image' && (
              <img
                src={selected.previewUrl}
                alt={selected.file.name}
                className="max-h-72 w-full object-contain"
              />
            )}
            {selected.modality === 'video' && (
              <video src={selected.previewUrl} controls className="max-h-72 w-full" />
            )}
            {selected.modality === 'audio' && (
              <div className="flex items-center gap-3 p-3">
                <div className="h-10 w-10 rounded-full bg-primary-yellow-500/20" aria-hidden="true" />
                <audio src={selected.previewUrl} controls className="flex-1" />
              </div>
            )}
          </div>

          {busy && (
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full bg-primary-yellow-500 transition-all"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          )}

          {violations.length > 0 && (
            <ul
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300 space-y-0.5"
            >
              {violations.map((v) => (
                <li key={v}>• {v}</li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={handleClear} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={busy || violations.length > 0}>
              {busy ? 'Submitting…' : 'Submit'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
