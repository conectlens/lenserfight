import { Plus, Trash2, Github, Linkedin, Facebook, Instagram, Twitter, Youtube } from 'lucide-react'
import React, { useState, useEffect, useRef } from 'react'

import { Button } from '@lenserfight/ui/components'
import { Modal } from '@lenserfight/ui/modals'
import { SelectField } from '@lenserfight/ui/forms'
import { socialLinksService } from '@lenserfight/data/repositories'
import { Lenser, SocialLink, SocialPlatform } from '@lenserfight/types'
import { isValidUrl } from '@lenserfight/utils/validation'
import { InputField } from '@lenserfight/features/auth'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Lenser>) => Promise<void> | void
  currentData: Lenser
  isLoading: boolean
}

const PLATFORMS: { value: SocialPlatform; label: string; icon: any }[] = [
  { value: 'LinkedIn', label: 'LinkedIn', icon: Linkedin },
  { value: 'GitHub', label: 'GitHub', icon: Github },
  { value: 'X', label: 'X (Twitter)', icon: Twitter },
  { value: 'Instagram', label: 'Instagram', icon: Instagram },
  { value: 'Facebook', label: 'Facebook', icon: Facebook },
  { value: 'Youtube', label: 'YouTube', icon: Youtube },
]

const URL_VALIDATORS: Record<string, { regex: RegExp; placeholder: string; example: string }> = {
  LinkedIn: {
    regex: /^https:\/\/(www\.)?linkedin\.com\/in\/.+/,
    placeholder: 'https://linkedin.com/in/username',
    example: 'https://linkedin.com/in/johndoe',
  },
  GitHub: {
    regex: /^https:\/\/(www\.)?github\.com\/.+/,
    placeholder: 'https://github.com/username',
    example: 'https://github.com/johndoe',
  },
  X: {
    regex: /^https:\/\/(www\.)?(twitter\.com|x\.com)\/.+/,
    placeholder: 'https://x.com/username',
    example: 'https://x.com/johndoe',
  },
  Instagram: {
    regex: /^https:\/\/(www\.)?instagram\.com\/.+/,
    placeholder: 'https://instagram.com/username',
    example: 'https://instagram.com/johndoe',
  },
  Facebook: {
    regex: /^https:\/\/(www\.)?facebook\.com\/.+/,
    placeholder: 'https://facebook.com/username',
    example: 'https://facebook.com/johndoe',
  },
  Youtube: {
    regex: /^https:\/\/(www\.)?youtube\.com\/.+/,
    placeholder: 'https://youtube.com/@channel',
    example: 'https://youtube.com/@johndoe',
  },
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentData,
  isLoading,
}) => {
  const [displayName, setDisplayName] = useState(currentData.display_name)
  const [headline, setHeadline] = useState(currentData.headline || '')
  const [bio, setBio] = useState(currentData.bio || '')
  const [websiteUrl, setWebsiteUrl] = useState(currentData.website_url || '')
  const [urlError, setUrlError] = useState<string | null>(null)

  const [socialLinks, setSocialLinks] = useState<Partial<SocialLink>[]>([])
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [linkErrors, setLinkErrors] = useState<Record<number, string>>({})

  // Local submitting state for social links sync
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      const loadLinks = async () => {
        setLoadingLinks(true)
        try {
          // Using handle instead of ID
          const links = await socialLinksService.getLinks(currentData.handle)
          setSocialLinks(links.filter((l) => l.platform !== 'Other'))
        } catch (e) {
          console.error('Failed to load social links', e)
        } finally {
          if (isMounted.current) setLoadingLinks(false)
        }
      }
      loadLinks()
    }
  }, [isOpen, currentData.handle])

  const getAvailablePlatforms = (currentIndex: number) => {
    const usedPlatforms = socialLinks
      .map((l, i) => (i === currentIndex ? null : l.platform))
      .filter(Boolean)

    return PLATFORMS.filter((p) => !usedPlatforms.includes(p.value))
  }

  const handleAddLink = () => {
    const available = getAvailablePlatforms(-1)
    if (available.length === 0) return
    setSocialLinks([...socialLinks, { platform: available[0].value, url: '', label: '' }])
  }

  const handleRemoveLink = (index: number) => {
    const newLinks = [...socialLinks]
    newLinks.splice(index, 1)
    setSocialLinks(newLinks)

    const newErrors = { ...linkErrors }
    delete newErrors[index]
    setLinkErrors(newErrors)
  }

  const handleLinkChange = (index: number, field: keyof SocialLink, value: string) => {
    const newLinks = [...socialLinks]
    newLinks[index] = { ...newLinks[index], [field]: value }
    setSocialLinks(newLinks)

    if (field === 'url') {
      const newErrors = { ...linkErrors }
      delete newErrors[index]
      setLinkErrors(newErrors)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting || isLoading || loadingLinks) return

    setUrlError(null)
    setLinkErrors({})

    const trimmedWebsiteUrl = websiteUrl.trim()

    if (trimmedWebsiteUrl && !isValidUrl(trimmedWebsiteUrl)) {
      setUrlError('Website must be a valid URL starting with http:// or https://')
      return
    }

    let hasError = false
    const errors: Record<number, string> = {}

    socialLinks.forEach((link, index) => {
      if (!link.url || !link.url.trim()) {
        errors[index] = 'URL is required'
        hasError = true
        return
      }

      const validator = URL_VALIDATORS[link.platform!]
      if (validator && !validator.regex.test(link.url)) {
        errors[index] = `Invalid format. Example: ${validator.example}`
        hasError = true
      }
    })

    if (hasError) {
      setLinkErrors(errors)
      return
    }

    setIsSubmitting(true)

    try {
      // Using handle instead of ID
      await socialLinksService.syncLinks(currentData.handle, socialLinks as any)

      await onSave({
        display_name: displayName,
        headline: headline,
        bio: bio,
        website_url: trimmedWebsiteUrl || undefined,
      })
    } catch (e: any) {
      console.error('Failed to save profile', e)
      if (
        e.message &&
        (e.message.toLowerCase().includes('website') || e.message.toLowerCase().includes('url'))
      ) {
        setUrlError(e.message)
      } else {
        alert(e.message || 'Failed to save changes. Please check your inputs.')
      }
    } finally {
      if (isMounted.current) {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4">
          <InputField
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={50}
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />

          <InputField
            label="Headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Role, Title, or Tagline"
            maxLength={100}
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="Tell us about yourself..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors outline-none resize-none text-sm placeholder-gray-400 dark:placeholder-gray-500"
            />
            <div className="text-right text-xs text-gray-400 dark:text-gray-500 mt-1">
              {bio.length}/300
            </div>
          </div>

          <InputField
            label="Website"
            value={websiteUrl}
            onChange={(e) => {
              setWebsiteUrl(e.target.value)
              setUrlError(null)
            }}
            placeholder="https://yoursite.com"
            error={urlError || undefined}
            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-bold text-gray-900 dark:text-white">
              Social Links
            </label>
            {getAvailablePlatforms(-1).length > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleAddLink}
                className="flex items-center gap-1.5 w-auto text-xs"
              >
                <Plus size={14} strokeWidth={3} /> Add Link
              </Button>
            )}
          </div>

          {loadingLinks ? (
            <div className="text-center py-6 text-xs text-gray-400 dark:text-gray-500">
              Loading links...
            </div>
          ) : (
            <div className="space-y-4">
              {socialLinks.map((link, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2"
                >
                  <div className="flex gap-2 items-start">
                    <div className="w-1/3 min-w-[130px]">
                      <SelectField
                        value={link.platform!}
                        onChange={(val) => handleLinkChange(index, 'platform', val)}
                        options={(() => {
                          const available = getAvailablePlatforms(index)
                          const current = PLATFORMS.find((p) => p.value === link.platform)
                          if (current && !available.some((p) => p.value === current.value)) {
                            return [...available, current]
                          }
                          return available
                        })()}
                        className="w-full"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        value={link.url}
                        onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                        placeholder={URL_VALIDATORS[link.platform!].placeholder}
                        className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500 ${linkErrors[index] ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(index)}
                      className="p-2.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                      title="Remove link"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  {linkErrors[index] && (
                    <p className="text-xs text-red-500 ml-[34%] pl-2">{linkErrors[index]}</p>
                  )}
                </div>
              ))}
              {socialLinks.length === 0 && (
                <div className="text-center py-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/30 dark:bg-gray-800/30">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Connect your social profiles to build trust.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading || isSubmitting || loadingLinks}
            className="w-auto px-6 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isLoading || isSubmitting}
            disabled={isLoading || isSubmitting || loadingLinks}
            className="w-auto px-6 shadow-md"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}
