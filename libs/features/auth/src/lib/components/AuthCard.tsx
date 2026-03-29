import React from 'react'
import { Logo } from '@lenserfight/ui/components'

export const AuthCard: React.FC<{
  children: React.ReactNode
  title: string
  subtitle?: string
  backButton?: React.ReactNode
}> = ({ children, title, subtitle, backButton }) => {
  return (
    <div className="min-h-screen flex flex-col justify-start md:justify-center items-center
bg-[var(--cl-grey-50)]
dark:bg-[var(--cl-dark-700)]
p-4 md:p-6 relative transition-colors duration-200">
      {backButton && (
        <div className="w-full md:absolute md:top-6 md:left-6 z-10 mb-6 md:mb-0">{backButton}</div>
      )}
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-6">
            <div className="h-24 w-24 flex items-center justify-center bg-[var(--surface-card)] dark:bg-gray-800 rounded-3xl shadow-sm border border-[var(--border-default)] dark:border-gray-700 p-4 transition-colors">
              <Logo size={64} showWordmark={false} showBeta={true} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] dark:text-white tracking-tight text-center">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[var(--text-secondary)] dark:text-gray-400 mt-2 font-medium text-center">
              {subtitle}
            </p>
          )}
        </div>

        <div className="bg-[var(--surface-card)] dark:bg-gray-800 rounded-3xl border border-[var(--border-default)] dark:border-gray-700 p-8 sm:p-10 shadow-[0_8px_24px_rgba(0,0,0,0.06)] relative overflow-hidden transition-colors">
          {children}
        </div>
      </div>
    </div>
  )
}
