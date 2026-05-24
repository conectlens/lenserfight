import { Check, Download, Loader2 } from 'lucide-react'
import React, { useState } from 'react'

export interface DownloadButtonProps {
  /** Suggested filename including extension (e.g. "result.txt", "output.png") */
  filename: string
  /**
   * Remote URL to fetch and download (media artifacts with signed URLs).
   * The component fetches the blob first so the browser treats it as a
   * same-origin download rather than a navigation — required for cross-origin
   * signed URLs (Supabase Storage). Falls back to a direct anchor click if
   * the fetch fails (CORS / network error).
   */
  url?: string
  /**
   * In-memory content to download (text / JSON artifacts).
   * When provided, `url` is ignored.
   */
  content?: string
  /** MIME type for in-memory content blobs. Defaults to "text/plain; charset=utf-8". */
  mimeType?: string
  /** Visual presentation. Defaults to "both" (icon + label). */
  mode?: 'icon' | 'label' | 'both'
  className?: string
}

/**
 * Triggers a browser file-save for either a remote URL or in-memory content.
 *
 * Strategy:
 *  1. `content` supplied → wrap in Blob, createObjectURL, click anchor.
 *  2. `url` supplied → fetch() → Blob → createObjectURL, click anchor.
 *     On any fetch error fall back to a direct anchor with target="_blank"
 *     so the file at least opens (the browser may still prompt to save).
 */
async function triggerDownload(
  filename: string,
  url?: string,
  content?: string,
  mimeType?: string,
): Promise<void> {
  let objectUrl: string | null = null

  const anchor = document.createElement('a')
  anchor.download = filename

  try {
    if (content !== undefined) {
      const blob = new Blob([content], { type: mimeType ?? 'text/plain; charset=utf-8' })
      objectUrl = URL.createObjectURL(blob)
      anchor.href = objectUrl
    } else if (url) {
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const blob = await response.blob()
        objectUrl = URL.createObjectURL(blob)
        anchor.href = objectUrl
      } catch {
        // Fetch failed (CORS / network) — fall back to direct navigation.
        anchor.href = url
        anchor.rel = 'noopener noreferrer'
        anchor.target = '_blank'
      }
    } else {
      return
    }

    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  } finally {
    if (objectUrl) {
      // Delay revocation to give the browser time to read the blob.
      setTimeout(() => URL.revokeObjectURL(objectUrl!), 10_000)
    }
  }
}

/**
 * Reusable download button for artifact results.
 *
 * Handles both URL-sourced media (fetch-then-blob, CORS-safe) and in-memory
 * text/JSON content (Blob + createObjectURL). Shows loading and success states.
 *
 * @example
 * // Media artifact with Supabase signed URL
 * <DownloadButton url={signedUrl} filename="result.png" />
 *
 * // Text artifact
 * <DownloadButton content={text} filename="output.txt" mimeType="text/plain" />
 *
 * // JSON artifact
 * <DownloadButton content={json} filename="output.json" mimeType="application/json" />
 */
export const DownloadButton: React.FC<DownloadButtonProps> = ({
  filename,
  url,
  content,
  mimeType,
  mode = 'both',
  className = '',
}) => {
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')

  const handleDownload = async () => {
    if (state !== 'idle') return
    setState('loading')
    try {
      await triggerDownload(filename, url, content, mimeType)
      setState('done')
      setTimeout(() => setState('idle'), 2_000)
    } catch {
      setState('idle')
    }
  }

  const icon =
    state === 'loading' ? (
      <Loader2 size={12} className="animate-spin" />
    ) : state === 'done' ? (
      <Check size={12} className="text-status-green" />
    ) : (
      <Download size={12} />
    )

  const label = state === 'done' ? 'Saved' : 'Download'

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={state === 'loading'}
      aria-label={`Download ${filename}`}
      title={`Download ${filename}`}
      className={`flex items-center gap-1 text-xs text-greyscale-500 transition-colors hover:text-greyscale-700 dark:hover:text-greyscale-300 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {(mode === 'icon' || mode === 'both') && icon}
      {(mode === 'label' || mode === 'both') && <span>{label}</span>}
    </button>
  )
}
