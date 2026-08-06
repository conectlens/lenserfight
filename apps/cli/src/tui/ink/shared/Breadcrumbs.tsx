import { sym } from '@lenserfight/cli-client'
import { Text } from 'ink'

import type { ViewFrame } from '../state/types'

interface BreadcrumbsProps {
  trail: ViewFrame[]
  extra?: string
}

export function Breadcrumbs({ trail, extra }: BreadcrumbsProps) {
  return (
    <Text>
      {trail.map((frame, i) => (
        <Text key={frame.id}>
          {i > 0 ? <Text color="gray"> {sym.arrow} </Text> : null}
          <Text color={i === trail.length - 1 && !extra ? 'whiteBright' : 'gray'} bold={i === trail.length - 1 && !extra}>
            {frame.title}
          </Text>
        </Text>
      ))}
      {extra ? (
        <Text>
          <Text color="gray"> {sym.arrow} </Text>
          <Text color="whiteBright" bold>
            {extra}
          </Text>
        </Text>
      ) : null}
    </Text>
  )
}
