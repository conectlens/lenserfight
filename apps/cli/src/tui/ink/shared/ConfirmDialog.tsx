import { sym } from '@lenserfight/cli-client'
import { Box, Text, useInput } from 'ink'

import type { ConfirmRequest } from '../state/types'

const RISK_COLOR: Record<ConfirmRequest['risk'], string> = {
  LOW: 'blueBright',
  MEDIUM: 'yellowBright',
  HIGH: 'redBright',
  CRITICAL: 'redBright',
}

interface ConfirmDialogProps {
  request: ConfirmRequest
  onResolve: (id: string) => void
}

/** Ink-native confirm modal — never a stdin readline prompt, so it composes with the rest of the render tree. */
export function ConfirmDialog({ request, onResolve }: ConfirmDialogProps) {
  useInput((input, key) => {
    if (key.return || input.toLowerCase() === 'y') {
      request.onConfirm()
      onResolve(request.id)
      return
    }
    if (key.escape || input.toLowerCase() === 'n') {
      request.onCancel?.()
      onResolve(request.id)
    }
  })

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={RISK_COLOR[request.risk]}
      paddingX={2}
      paddingY={1}
      marginTop={1}
    >
      <Text color={RISK_COLOR[request.risk]} bold>
        {sym.warn} {request.title} · {request.risk}
      </Text>
      <Box marginTop={1}>
        <Text>{request.description}</Text>
      </Box>
      <Box marginTop={1}>
        <Text>
          <Text color="greenBright" bold>
            [{request.confirmLabel} — y/Enter]
          </Text>
          <Text>{'  '}</Text>
          <Text color="gray">[{request.cancelLabel} — n/Esc]</Text>
        </Text>
      </Box>
    </Box>
  )
}
