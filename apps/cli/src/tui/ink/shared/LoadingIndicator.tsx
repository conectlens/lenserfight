import { Text } from 'ink'
import { useEffect, useState } from 'react'

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

interface LoadingIndicatorProps {
  label?: string
}

export function LoadingIndicator({ label = 'Loading…' }: LoadingIndicatorProps) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 80)
    return () => clearInterval(timer)
  }, [])

  return (
    <Text color="cyanBright">
      {FRAMES[frame]} {label}
    </Text>
  )
}
