import React from 'react'

interface FormErrorProps {
  message?: string | null
}

export const FormError: React.FC<FormErrorProps> = ({ message }) => {
  if (!message) return null

  return (
    <p className="mt-1.5 text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
      {message}
    </p>
  )
}
