import React from 'react'
import { LensParam, LensVersionParam } from '@lenserfight/types'
import { parseContentSegments } from '@lenserfight/utils/text'
import { ParamChip } from '@lenserfight/ui/forms'

interface LensContentReadonlyProps {
  content: string
  params: LensParam[]
  /**
   * Optional rich version params (LensVersionParam[]). When provided, the chip
   * tooltip will show label, helpText, and defaultValue in addition to the
   * type/required data available from the legacy LensParam shape.
   */
  versionParams?: LensVersionParam[]
  className?: string
}

/**
 * Renders lens content with inline parameter badges (readonly).
 * Uses the same parseContentSegments() as the editor for consistency.
 * Each parameter chip gets a unique deterministic color by name and a
 * rich hover tooltip when versionParams are supplied.
 */
export const LensContentReadonly: React.FC<LensContentReadonlyProps> = ({
  content: rawContent,
  params,
  versionParams,
  className = '',
}) => {
  // Normalize legacy {{param}} → [[param]] so both syntaxes render as chips
  const content = rawContent.replace(/\{\{(\w+)\}\}/g, '[[$1]]')
  const segments = parseContentSegments(content)
  const paramMap = new Map(params.map((p) => [p.name, p]))
  const versionParamMap = new Map((versionParams ?? []).map((vp) => [vp.key, vp]))

  return (
    <div className={`whitespace-pre-wrap font-sans text-gray-800 dark:text-gray-200 leading-relaxed ${className}`}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <React.Fragment key={i}>{seg.content}</React.Fragment>
        }

        const param = paramMap.get(seg.name)
        const vp = versionParamMap.get(seg.name)

        return (
          <ParamChip
            key={`${seg.name}-${i}`}
            name={seg.name}
            type={vp?.type ?? param?.type}
            required={vp?.required ?? param?.required}
            label={vp?.label}
            helpText={vp?.helpText}
            defaultValue={vp?.defaultValue}
            readonly
            size="xs"
          />
        )
      })}
    </div>
  )
}
