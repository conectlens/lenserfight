import React, { useState } from 'react'

export interface MediaViewerProps {
  mediaType: 'image' | 'video' | 'audio' | 'document' | 'text' | 'unknown'
  url?: string | null
  contentText?: string | null
  mimeType?: string | null
  name?: string | null
  className?: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 px-2 py-1 text-xs rounded bg-greyscale-800/80 text-greyscale-200 hover:bg-greyscale-700 transition-colors"
      type="button"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function ImageViewer({ url, name }: { url: string; name?: string | null }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="block w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-status-blue rounded-lg overflow-hidden"
        type="button"
        aria-label={`Expand image${name ? `: ${name}` : ''}`}
      >
        <img
          src={url}
          alt={name ?? 'Generated image'}
          className="w-full h-auto object-contain max-h-96 rounded-lg bg-greyscale-100 dark:bg-greyscale-900"
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          <img
            src={url}
            alt={name ?? 'Generated image'}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl leading-none"
            type="button"
            aria-label="Close lightbox"
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}

function VideoViewer({ url, name }: { url: string; name?: string | null }) {
  return (
    <video
      controls
      className="w-full rounded-lg bg-black max-h-96"
      preload="metadata"
      aria-label={name ?? 'Video output'}
    >
      <source src={url} />
      Your browser does not support the video element.
    </video>
  )
}

function AudioViewer({ url, name }: { url: string; name?: string | null }) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-greyscale-100 dark:bg-greyscale-900">
      <p className="text-xs text-greyscale-500 truncate">{name ?? 'Audio output'}</p>
      <audio controls className="w-full" preload="metadata" aria-label={name ?? 'Audio output'}>
        <source src={url} />
        Your browser does not support the audio element.
      </audio>
    </div>
  )
}

function DocumentViewer({ url, name }: { url: string; name?: string | null }) {
  return (
    <div className="flex flex-col gap-2">
      <iframe
        src={url}
        title={name ?? 'Document'}
        className="w-full h-96 rounded-lg border border-greyscale-200 dark:border-greyscale-700 bg-white"
        sandbox="allow-same-origin allow-scripts"
      />
      <a
        href={url}
        download={name ?? true}
        className="self-end text-xs text-status-blue hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        Download {name ?? 'file'}
      </a>
    </div>
  )
}

function TextViewer({ text }: { text: string }) {
  return (
    <div className="relative">
      <pre className="whitespace-pre-wrap break-words text-sm font-mono p-4 rounded-lg bg-greyscale-100 dark:bg-greyscale-900 text-greyscale-800 dark:text-greyscale-200 overflow-auto max-h-96">
        {text}
      </pre>
      <CopyButton text={text} />
    </div>
  )
}

export function MediaViewer({
  mediaType,
  url,
  contentText,
  mimeType,
  name,
  className = '',
}: MediaViewerProps) {
  const container = `w-full ${className}`

  if (mediaType === 'text' || (!url && contentText)) {
    return (
      <div className={container}>
        <TextViewer text={contentText ?? ''} />
      </div>
    )
  }

  if (!url) {
    return (
      <div className={`${container} flex items-center justify-center h-24 rounded-lg bg-greyscale-100 dark:bg-greyscale-900 text-greyscale-400 text-sm`}>
        No preview available
      </div>
    )
  }

  // Derive type from mimeType when mediaType is ambiguous
  const resolvedType = (() => {
    if (mediaType !== 'unknown') return mediaType
    if (!mimeType) return 'unknown'
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    if (mimeType === 'application/pdf' || mimeType.startsWith('application/')) return 'document'
    return 'unknown'
  })()

  return (
    <div className={container}>
      {resolvedType === 'image' && <ImageViewer url={url} name={name} />}
      {resolvedType === 'video' && <VideoViewer url={url} name={name} />}
      {resolvedType === 'audio' && <AudioViewer url={url} name={name} />}
      {resolvedType === 'document' && <DocumentViewer url={url} name={name} />}
      {resolvedType === 'unknown' && (
        <a
          href={url}
          download={name ?? true}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-greyscale-200 dark:border-greyscale-700 text-sm text-status-blue hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>⬇</span>
          {name ?? 'Download file'}
        </a>
      )}
    </div>
  )
}
