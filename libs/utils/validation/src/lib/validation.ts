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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isValidUUID = (v: string | null | undefined): v is string => !!v && UUID_RE.test(v)

export const minLength = (min: number, message?: string): Validator => {
  return (value) => {
    if (!value) return null
    const msg = message || `Must be at least ${min} characters`
    return String(value).length >= min ? null : msg
  }
}

/** Validates a profile handle (without or with a leading @).
 *  Matches the lensers.profiles storage format: 4–24 chars, [a-z0-9._]. */
export const isHandle = (
  message = 'Username must be 4–24 characters (letters, numbers, dots, underscores)'
): Validator => {
  return (value) => {
    if (!value) return null
    const stripped = String(value).startsWith('@') ? String(value).slice(1) : String(value)
    return /^[a-zA-Z0-9._]{4,24}$/.test(stripped) ? null : message
  }
}

/** Accepts either a valid email address or a valid profile handle (with or without @). */
export const isEmailOrHandle = (
  message = 'Please enter a valid email or username'
): Validator => {
  return (value) => {
    if (!value) return null
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) return null
    const stripped = String(value).startsWith('@') ? String(value).slice(1) : String(value)
    return /^[a-zA-Z0-9._]{4,24}$/.test(stripped) ? null : message
  }
}
