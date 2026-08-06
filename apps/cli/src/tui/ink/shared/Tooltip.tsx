import { Text } from 'ink'

interface TooltipProps {
  text: string
}

/** A single dim hint line, e.g. under a focused control. Not a floating overlay — terminals have no z-index. */
export function Tooltip({ text }: TooltipProps) {
  return <Text dimColor>{text}</Text>
}
