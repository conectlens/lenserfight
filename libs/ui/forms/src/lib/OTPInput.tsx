/**
 * OTPInput.tsx — web stub (mobile-only component in production; web version for completeness).
 *
 * A simple web-based OTP input using individual <input> elements with auto-advance.
 */
import React, { useRef } from 'react'

export interface OTPInputProps {
  value:       string
  onChange:    (value: string) => void
  length?:     number
  secure?:     boolean
  error?:      string
  autoFocus?:  boolean
  style?:      React.CSSProperties
  onComplete?: (value: string) => void
}

export const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  length = 6,
  secure,
  error,
  autoFocus,
  style,
  onComplete,
}) => {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const chars = value.split('').slice(0, length)
  while (chars.length < length) chars.push('')

  const handleChange = (text: string, index: number) => {
    const char = text.slice(-1)
    const next = chars.map((c, i) => (i === index ? char : c))
    const newValue = next.join('')
    onChange(newValue)
    if (char && index < length - 1) refs.current[index + 1]?.focus()
    if (newValue.length === length) onComplete?.(newValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !chars[index] && index > 0) {
      refs.current[index - 1]?.focus()
      const next = chars.map((c, i) => (i === index - 1 ? '' : c))
      onChange(next.join(''))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 8, ...style }}>
        {chars.map((char, index) => (
          <input
            key={index}
            ref={(el) => { refs.current[index] = el }}
            value={char}
            onChange={(e) => handleChange(e.target.value, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            maxLength={1}
            type={secure ? 'password' : 'text'}
            inputMode="numeric"
            autoFocus={autoFocus && index === 0}
            style={{
              width: 48, height: 48, textAlign: 'center', fontSize: 20,
              fontWeight: 600, borderRadius: 12, border: `2px solid ${error ? '#ea3942' : char ? '#213f74' : '#dcdde0'}`,
            }}
            aria-label={`Digit ${index + 1} of ${length}`}
          />
        ))}
      </div>
      {error && <p style={{ color: '#ea3942', fontSize: 12, marginTop: 8 }}>{error}</p>}
    </div>
  )
}

OTPInput.displayName = 'OTPInput'
