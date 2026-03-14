export type Validator = (value: any) => string | null

export const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export const isUrl = (
  message = 'Please enter a valid URL starting with http:// or https://'
): Validator => {
  return (value) => {
    if (!value) return null // Let required handle empty checks
    return isValidUrl(value) ? null : message
  }
}

export const isRequired = (message = 'This field is required'): Validator => {
  return (value) => {
    if (value === null || value === undefined || value === '') return message
    if (Array.isArray(value) && value.length === 0) return message
    return null
  }
}

export const isEmail = (message = 'Please enter a valid email address'): Validator => {
  return (value) => {
    if (!value) return null // Let required handle empty checks
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value) ? null : message
  }
}

export const minLength = (min: number, message?: string): Validator => {
  return (value) => {
    if (!value) return null
    const msg = message || `Must be at least ${min} characters`
    return String(value).length >= min ? null : msg
  }
}
