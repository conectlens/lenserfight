import { sym } from '@lenserfight/cli-client'
import { Text } from 'ink'

export type StatusTone = 'success' | 'warn' | 'error' | 'info' | 'muted'

const TONE_COLOR: Record<StatusTone, string> = {
  success: 'greenBright',
  warn: 'yellowBright',
  error: 'redBright',
  info: 'cyanBright',
  muted: 'gray',
}

const TONE_GLYPH: Record<StatusTone, string> = {
  success: sym.pass,
  warn: sym.warn,
  error: sym.fail,
  info: sym.info,
  muted: sym.dot,
}

/** Maps common backend status strings to a badge tone. Extend as new statuses appear. */
export function toneForStatus(status: string): StatusTone {
  const s = status.toLowerCase()
  if (['approved', 'active', 'healthy', 'completed', 'done', 'success', 'running'].includes(s)) return 'success'
  if (['pending', 'queued', 'waiting', 'blocked', 'paused', 'in_progress'].includes(s)) return 'warn'
  if (['rejected', 'failed', 'error', 'down', 'cancelled', 'dead'].includes(s)) return 'error'
  if (['not_required', 'skipped', 'draft', 'inactive'].includes(s)) return 'muted'
  return 'info'
}

interface StatusBadgeProps {
  label: string
  tone?: StatusTone
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  const resolved = tone ?? toneForStatus(label)
  return (
    <Text color={TONE_COLOR[resolved]} bold>
      {TONE_GLYPH[resolved]} {label}
    </Text>
  )
}
