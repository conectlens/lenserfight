import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CreateLenserProfileModal } from '@lenserfight/features/onboarding'
import { Dialog } from '@lenserfight/ui/overlays'
import { StarBackground } from '@lenserfight/ui/components'
import { sanitizeReturnUrl } from '../utils/validateReturnUrl'

/**
 * OnboardingPage hosts the multi-step profile creation wizard in apps/auth.
 * It uses the standard Dialog component for a consistent, premium experience.
 * Users can now close/skip this page to go directly to their return_url.
 */
export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const rawReturnUrl = searchParams.get('return_url')
  const returnUrl = sanitizeReturnUrl(rawReturnUrl)

  const handleClose = () => {
    // If it's an absolute URL, use window.location.replace
    if (returnUrl.startsWith('http://') || returnUrl.startsWith('https://')) {
      window.location.replace(returnUrl)
    } else {
      navigate(returnUrl, { replace: true })
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <StarBackground />

      {/* Decorative background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[160px] pointer-events-none" />

      <Dialog
        open
        onClose={handleClose}
        maxWidth="max-w-xl"
        containerClassName="!z-0"
        panelClassName=""
      >
        <CreateLenserProfileModal />
      </Dialog>

      {/* Footer Branding */}
      <div className="fixed bottom-8 left-0 right-0 z-10 flex flex-col items-center gap-3 animate-in fade-in duration-1000 delay-500">
        <p className="text-[10px] uppercase tracking-widest text-greyscale-500 font-bold">
          Securely powered by LenserFight Identity
        </p>
        <a
          href="https://app.chainabit.com?utm_source=lenserfight_onboarding"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/5 border border-orange-500/10 text-[11px] text-orange-500 hover:bg-orange-500/10 transition-all duration-300 font-semibold"
        >
          <img src="https://cdn.lenserfight.com/brand/chainabit/favicon-32x32.png" width={14} height={14} alt="" className="rounded-sm grayscale hover:grayscale-0 transition-all" />
          Sponsored by Chainabit
        </a>
      </div>
    </div>
  )
}
