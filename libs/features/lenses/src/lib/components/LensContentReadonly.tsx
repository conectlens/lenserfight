import React from 'react'
import { LensParam } from '@lenserfight/types'
import { parseContentSegments } from '@lenserfight/utils/text'
import { ParamChip } from '@lenserfight/ui/forms'

interface LensContentReadonlyProps {
  content: string
  params: LensParam[]
  className?: string
}

/**
 * Renders lens content with inline parameter badges (readonly).
 * Uses the same parseContentSegments() as the editor for consistency.
 */
export const LensContentReadonly: React.FC<LensContentReadonlyProps> = ({
  content,
  params,
  className = '',
}) => {
  const segments = parseContentSegments(content)
  const paramMap = new Map(params.map((p) => [p.name, p]))

  return (
    <div className={`whitespace-pre-wrap font-sans text-gray-800 dark:text-gray-200 leading-relaxed ${className}`}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <React.Fragment key={i}>{seg.content}</React.Fragment>
        }

        const param = paramMap.get(seg.name)
        return (
          <ParamChip
            key={`${seg.name}-${i}`}
            name={seg.name}
            type={param?.type}
            required={param?.required}
            readonly
            size="xs"
          />
        )
      })}
    </div>
  )
}
