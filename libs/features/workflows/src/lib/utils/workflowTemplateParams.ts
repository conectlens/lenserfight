import type { LensVersion, LensVersionParam, ToolRecord } from '@lenserfight/types'

const FALLBACK_TEXT_TOOL: ToolRecord = {
  id: 'workflow-fallback-text-tool',
  key: 'text',
  label: 'Text',
  description: 'Autodetected parameter from template token',
  category: 'input',
  type: 'text',
  required: true,
  minLength: 0,
  maxLength: 100000,
  placeholder: null,
  helpText: null,
  validationSchema: null,
  options: null,
  sortOrder: 0,
  isSystem: false,
  icon: null,
  color: null,
}

function normalizeTokenName(raw: string): string {
  return raw.trim().replace(/\s+/g, '_').toLowerCase()
}

/**
 * Supports all prompt token styles that appear in existing lenses:
 * - [[name]]
 * - {{name}}
 * - [ name ] (single-bracket placeholders with inner spaces)
 */
export function extractTemplateParamLabels(templateBody: string): string[] {
  const labels = new Set<string>()

  for (const match of templateBody.matchAll(/\[\[\s*([a-zA-Z0-9_ -]+?)\s*\]\]/g)) {
    labels.add(normalizeTokenName(match[1]))
  }
  for (const match of templateBody.matchAll(/\{\{\s*([a-zA-Z0-9_ -]+?)\s*\}\}/g)) {
    labels.add(normalizeTokenName(match[1]))
  }
  // Intentionally require inner spaces to avoid capturing markdown links [text](url).
  for (const match of templateBody.matchAll(/\[\s+([a-zA-Z0-9_ -]+?)\s+\]/g)) {
    labels.add(normalizeTokenName(match[1]))
  }

  return [...labels]
}

export function buildEffectiveVersionParams(version: LensVersion | null | undefined): LensVersionParam[] {
  if (!version) return []

  const existing = version.parameters ?? []
  const existingLabels = new Set(existing.map((p) => p.label.toLowerCase()))
  const templateLabels = extractTemplateParamLabels(version.templateBody ?? '')

  const synthetic: LensVersionParam[] = templateLabels
    .filter((label) => !existingLabels.has(label))
    .map((label) => ({
      id: `synthetic-${version.id}-${label}`,
      versionId: version.id,
      label,
      toolId: FALLBACK_TEXT_TOOL.id,
      tool: FALLBACK_TEXT_TOOL,
    }))

  return [...existing, ...synthetic]
}
