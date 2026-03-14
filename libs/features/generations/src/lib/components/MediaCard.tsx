import { Play, FileText, Music, Image as ImageIcon } from 'lucide-react'
import React, { useState } from 'react'

import { MediaLibraryItem } from '@lenserfight/types'

interface MediaCardProps {
  media?: MediaLibraryItem
  onClick?: () => void
  textPreview?: string
}

export const MediaCard: React.FC<MediaCardProps> = ({ media, onClick, textPreview }) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const handleMediaClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onClick) onClick()
  }

  if (!media) {
    return (
      <div className="bg-gray-200 dark:bg-gray-700 rounded-xl w-full h-full animate-pulse min-h-[150px]"></div>
    )
  }

  // Image Renderer
  if (media.media_kind === 'image') {
    return (
      <div
        className="relative w-full group cursor-pointer overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"
        onClick={handleMediaClick}
        style={{
          aspectRatio: media.width && media.height ? `${media.width}/${media.height}` : 'auto',
        }}
      >
        {!isLoaded && !imgError && (
          <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse z-10" />
        )}

        {!imgError ? (
          <img
            src={media.url}
            alt={media.file_name}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setIsLoaded(true)
              setImgError(true)
            }}
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-10 h-full text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800">
            <ImageIcon size={24} />
            <span className="text-xs mt-2">Failed to load</span>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
      </div>
    )
  }

  // Video Renderer (Thumbnail or Player)
  if (media.media_kind === 'video') {
    return (
      <div
        className="relative w-full h-full group cursor-pointer overflow-hidden rounded-xl bg-gray-900"
        onClick={handleMediaClick}
      >
        <video
          src={media.url}
          className="w-full h-full object-cover opacity-90 group-hover:opacity-75 transition-opacity"
          muted
          playsInline
          loop
          onMouseOver={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
          onMouseOut={(e) => {
            const el = e.target as HTMLVideoElement
            el.pause()
            el.currentTime = 0
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/30 group-hover:scale-110 transition-transform">
            <Play size={16} fill="currentColor" />
          </div>
        </div>
      </div>
    )
  }

  // Text Renderer
  if (media.media_kind === 'text') {
    return (
      <div
        className="relative w-full group cursor-pointer overflow-hidden rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-5 flex flex-col hover:border-primary/50 dark:hover:border-primary/50 transition-colors shadow-sm"
        onClick={handleMediaClick}
      >
        <div className="flex-1 overflow-hidden relative mb-2">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 font-bold">
            Generated Text
          </p>
          <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-6 font-mono leading-relaxed opacity-80 min-h-[80px]">
            {textPreview || media.file_name}
          </div>
        </div>
        <div className="pt-2 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center text-gray-400 dark:text-gray-500">
          <FileText size={14} />
          <span className="text-[10px]">PREVIEW</span>
        </div>
      </div>
    )
  }

  // Audio Renderer
  if (media.media_kind === 'audio') {
    return (
      <div
        className="relative w-full h-full group cursor-pointer overflow-hidden rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 p-6 flex flex-col justify-center items-center text-white min-h-[140px]"
        onClick={handleMediaClick}
      >
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-white/10">
          <Music size={20} />
        </div>
        <p className="text-xs font-medium text-gray-300 truncate max-w-full px-2">
          {media.file_name}
        </p>
        {media.duration_seconds && (
          <span className="text-[10px] text-gray-500 mt-1">
            {Math.floor(media.duration_seconds)}s
          </span>
        )}
      </div>
    )
  }

  // Fallback
  return (
    <div
      className="relative w-full h-full group cursor-pointer overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-4 text-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[100px]"
      onClick={handleMediaClick}
    >
      <FileText size={24} className="mb-2" />
      <span className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate w-full">
        {media.file_name}
      </span>
    </div>
  )
}
