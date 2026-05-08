import React, { useState, useCallback } from 'react'
import { CreateLenserProfileModal } from '@lenserfight/features/onboarding'
import { 
  DialogHeaderContext, 
  DialogFooterContext, 
  type DialogHeaderSlot 
} from '@lenserfight/ui/overlays'
import { Logo, StarBackground } from '@lenserfight/ui/components'

/**
 * OnboardingPage hosts the multi-step profile creation wizard in apps/auth.
 * It provides the necessary Dialog contexts for StepWizard to render its 
 * header and footer (buttons) correctly outside of a standard Modal.
 */
export const OnboardingPage: React.FC = () => {
  const [headerSlot, setHeaderSlot] = useState<DialogHeaderSlot | null>(null)
  const [footerSlot, setFooterSlot] = useState<React.ReactNode>(null)

  const setHeader = useCallback((slot: DialogHeaderSlot) => setHeaderSlot(slot), [])
  const clearHeader = useCallback(() => setHeaderSlot(null), [])
  const setFooter = useCallback((node: React.ReactNode) => setFooterSlot(node), [])
  const clearFooter = useCallback(() => setFooterSlot(null), [])

  const activeTitle = headerSlot?.title
  const activeDesc = headerSlot?.description
  const activeIcon = headerSlot?.icon

  return (
    <DialogHeaderContext.Provider value={{ setHeader, clearHeader }}>
      <DialogFooterContext.Provider value={{ setFooter, clearFooter }}>
        <div className="relative min-h-screen bg-greyscale-25 dark:bg-greyscale-900 flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
          <StarBackground />
          
          {/* Decorative background glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

          {/* Logo / Brand Header */}
          <div className="mb-8 z-10 animate-in fade-in slide-in-from-top-4 duration-700">
            <Logo size={32} showBeta />
          </div>

          <div className="relative z-10 w-full max-w-xl bg-surface-raised rounded-2xl border border-surface-border shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-500">
            {/* Header section (mimics Dialog header) */}
            {(activeTitle || activeDesc || activeIcon) && (
              <div className="px-6 py-4 border-b border-surface-border bg-surface-raised/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  {activeIcon && (
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-yellow-500/10 text-primary-yellow-600">
                      {activeIcon}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {activeTitle && (
                      <h2 className="text-base font-semibold text-greyscale-900 dark:text-greyscale-50 truncate">
                        {activeTitle}
                      </h2>
                    )}
                    {activeDesc && (
                      <p className="mt-0.5 text-xs text-greyscale-500 dark:text-greyscale-400 line-clamp-1">
                        {activeDesc}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-6 min-h-[300px] max-h-[60vh]">
              <CreateLenserProfileModal />
            </div>

            {/* Footer section (renders the hoisted ModalFooter from StepWizard) */}
            {footerSlot && (
              <div className="px-6 pb-5 bg-surface-raised/50 backdrop-blur-sm">
                {footerSlot}
              </div>
            )}
          </div>
          
          <div className="mt-8 text-xs text-greyscale-400 dark:text-greyscale-500 z-10 animate-in fade-in duration-1000 delay-500">
            Securely powered by LenserFight Identity
          </div>
        </div>
      </DialogFooterContext.Provider>
    </DialogHeaderContext.Provider>
  )
}
