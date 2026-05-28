import React from 'react'
import { LensVersionParam } from '@lenserfight/types'
import { parseContentSegments } from '@lenserfight/utils/text'
import { ParamChip } from '@lenserfight/ui/forms'

interface LensContentReadonlyProps {
  content: string
  /**
   * Version params with hydrated tool info (from fn_get_version_params_with_tools).
   * Used to render chip tooltips with type, helpText, etc. from the tool definition.
   */
  versionParams?: LensVersionParam[]
  className?: string
}

/**
 * Renders lens content with inline parameter badges (readonly).
 * Handles both [[name]] (display format) and [[:uuid]] (stored format) tokens.
 * For [[:uuid]] segments, looks up the matching versionParam by id to get the label.
 */
export const LensContentReadonly: React.FC<LensContentReadonlyProps> = ({
  content: rawContent,
  versionParams = [],
  className = '',
}) => {
  // Normalize legacy {{param}} → [[param]]
  const content = rawContent.replace(/\{\{(\w+)\}\}/g, '[[$1]]')
  const segments = parseContentSegments(content)

  // Map by label (for [[name]] segments) and by id (for [[:uuid]] segments)
  const paramByLabel = new Map(versionParams.map((vp) => [vp.label.toLowerCase(), vp]))
  const paramById = new Map(versionParams.map((vp) => [vp.id, vp]))

  return (
    <div className={`whitespace-pre-wrap font-sans text-gray-800 dark:text-gray-200 leading-relaxed ${className}`}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <React.Fragment key={i}>{seg.content}</React.Fragment>
        }

        // Resolve the versionParam for this segment
        const vp = seg.type === 'param-ref'
          ? paramById.get(seg.id)
          : paramByLabel.get(seg.name)

        const displayName = vp?.label ?? (seg.type === 'param' ? seg.name : seg.id.slice(0, 8))

        return (
          <ParamChip
            key={`${displayName}-${i}`}
            name={displayName}
            type={vp?.tool.type}
            required={vp?.tool.required}
            helpText={vp?.tool.helpText}
            readonly
            size="xs"
          />
        )
      })}
    </div>
  )
}
