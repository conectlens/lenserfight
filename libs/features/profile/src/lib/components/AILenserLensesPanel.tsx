import { Badge } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { Brain, Link2 } from 'lucide-react'
import React from 'react'

import type { AgentLensBindingRecord, LensViewModel } from '@lenserfight/types'

interface AILenserLensesPanelProps {
  lenses: LensViewModel[]
  lensBindings: AgentLensBindingRecord[]
  selectedLensId: string
  onSelectLens: (lensId: string) => void
  isSaving?: boolean
}

export const AILenserLensesPanel: React.FC<AILenserLensesPanelProps> = ({
  lenses,
  lensBindings,
  selectedLensId,
  onSelectLens,
  isSaving = false,
}) => {
  const defaultBinding = lensBindings.find((binding) => binding.is_default) ?? null

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2">
          <Brain size={16} className="text-primary-yellow-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Main lens configuration</h3>
        </div>

        <SelectField
          label="Default instruction lens"
          value={selectedLensId}
          onChange={onSelectLens}
          disabled={isSaving || lenses.length === 0}
          options={[
            { value: '', label: 'Select a lens' },
            ...lenses.map((lens) => ({ value: lens.id, label: lens.title })),
          ]}
        />

        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          The default lens acts as the main instruction source when workflows do not override behavior.
        </p>

        {defaultBinding && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge color="yellow">Default binding active</Badge>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Binding id: {defaultBinding.id}
            </span>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lenses.map((lens) => {
          const isDefault = defaultBinding?.lens_id === lens.id

          return (
            <div
              key={lens.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{lens.title}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">@{lens.author.handle}</p>
                </div>
                {isDefault && <Badge color="yellow">Main</Badge>}
              </div>

              {lens.description && (
                <p className="mb-4 line-clamp-3 text-sm text-gray-600 dark:text-gray-300">
                  {lens.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-700/60">
                  <Link2 size={12} />
                  {lensBindings.some((binding) => binding.lens_id === lens.id) ? 'Connected' : 'Available'}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-700/60">
                  {lens.visibility}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {lenses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          This AI workspace does not own any lenses yet. Create or fork a lens inside the active AI workspace before assigning a main instruction lens.
        </div>
      )}
    </div>
  )
}
