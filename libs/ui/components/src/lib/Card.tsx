import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...rest }) => {
  return (
    <div
      {...rest}
      className={`bg-white dark:bg-surface-raised rounded-2xl shadow-sm border border-gray-100 dark:border-surface-border p-6 transition-colors duration-200 ${className}`}
    >
      {children}
    </div>
  )
}
