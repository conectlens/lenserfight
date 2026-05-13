import { Copy, Check, Link as LinkIcon, Smartphone, Facebook, Linkedin } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Button } from '@lenserfight/ui/components'
import { Modal } from '@lenserfight/ui/modals'
import { ShareResourceType } from '@lenserfight/types'

import { useShareLink } from './useShareLink'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  resourceType: ShareResourceType
  resourceId: string
  slug?: string
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  title,
  resourceType,
  resourceId,
  slug,
}) => {
  const { generateLink, shortUrl, isLoading, error, reset } = useShareLink()
  const [copied, setCopied] = useState(false)
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  useEffect(() => {
    if (isOpen) {
      generateLink(resourceType, resourceId, slug)
    } else {
      reset()
      setCopied(false)
    }
  }, [isOpen, resourceType, resourceId])

  const handleCopy = async () => {
    if (!shortUrl) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shortUrl)
      } else {
        const el = document.createElement('textarea')
        el.value = shortUrl
        el.style.position = 'fixed'
        el.style.opacity = '0'
        document.body.appendChild(el)
        el.focus()
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Failed to copy', e)
    }
  }

  const handleNativeShare = async () => {
    if (canNativeShare && shortUrl) {
      try {
        await navigator.share({
          title: 'LenserFight',
          text: `Check out "${title}" on LenserFight!`,
          url: shortUrl,
        })
      } catch (e) {
        // Cancelled
      }
    }
  }

  const encodedUrl = shortUrl ? encodeURIComponent(shortUrl) : ''
  const encodedTitle = encodeURIComponent(`Check out "${title}" on LenserFight!`)

  const shareLinks = [
    {
      name: 'X',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
        </svg>
      ),
      url: `https://x.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      color:
        'hover:bg-black hover:text-white hover:border-black dark:hover:bg-black dark:hover:border-black',
    },
    {
      name: 'Facebook',
      icon: <Facebook size={20} />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]',
    },
    {
      name: 'LinkedIn',
      icon: <Linkedin size={20} />,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      color: 'hover:bg-[#0A66C2] hover:text-white hover:border-[#0A66C2]',
    },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share">
      <div className="space-y-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Generating unique link...</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="text-center py-4">
            <p className="text-red-500 mb-2">{error}</p>
            <Button onClick={() => generateLink(resourceType, resourceId, slug)} className="w-auto">
              Retry
            </Button>
          </div>
        )}

        {!isLoading && shortUrl && (
          <>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="bg-white dark:bg-gray-700 p-2 rounded-lg border border-gray-100 dark:border-gray-600 text-primary-600 dark:text-primary-400">
                <LinkIcon size={18} />
              </div>
              <input
                readOnly
                value={shortUrl}
                className="flex-1 bg-transparent border-none text-sm text-gray-700 dark:text-gray-200 focus:ring-0 truncate outline-none"
              />
              <button
                onClick={handleCopy}
                className={`p-2 rounded-lg transition-colors ${copied ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>

            <div className="flex items-center justify-center gap-4">
              {shareLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center p-3 rounded-xl border border-gray-200 dark:border-gray-700 transition-all text-gray-600 dark:text-gray-400 ${link.color}`}
                  title={`Share on ${link.name}`}
                >
                  {link.icon}
                </a>
              ))}

              {canNativeShare && (
                <button
                  onClick={handleNativeShare}
                  className="flex items-center justify-center p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-gray-600 dark:text-gray-400"
                  title="More sharing options"
                >
                  <Smartphone size={20} />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
