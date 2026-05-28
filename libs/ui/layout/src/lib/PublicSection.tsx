import React from 'react'

interface PublicSectionProps {
  title?: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  centered?: boolean
}

export const PublicSection: React.FC<PublicSectionProps> = ({
  title,
  subtitle,
  children,
  className = '',
  centered = false,
}) => {
  return (
    <section className={`py-20 md:py-24 px-6 max-w-5xl mx-auto ${className}`}>
      {(title || subtitle) && (
        <div className={`mb-16 ${centered ? 'text-center' : ''}`}>
          {title && (
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-6 leading-[1.1]">
              {title}
            </h1>
          )}
          {subtitle && (
            <p
              className={`text-lg md:text-xl text-gray-500 dark:text-gray-400 leading-relaxed max-w-3xl font-medium tracking-wide opacity-90 ${centered ? 'mx-auto' : ''}`}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className={`w-full ${centered ? 'mx-auto' : ''}`}>{children}</div>
    </section>
  )
}
