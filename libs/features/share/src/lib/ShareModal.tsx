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
  resourceId?: string
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
      name: 'Telegram',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      color: 'hover:bg-[#26A5E4] hover:text-white hover:border-[#26A5E4]',
    },
    {
      name: 'Reddit',
      icon: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      ),
      url: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      color: 'hover:bg-[#FF4500] hover:text-white hover:border-[#FF4500]',
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
