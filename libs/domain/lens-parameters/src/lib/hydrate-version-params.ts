import type { LensVersionParam, ToolRecord } from '@lenserfight/types'

/**
 * Maps a version_parameters + tools row from RPC/PostgREST JSON into LensVersionParam.
 */
export function mapVersionParamRow(row: Record<string, unknown>): LensVersionParam {
  const t = (row['tool'] ?? row) as Record<string, unknown>
  type ValidationSchema = {
    min?: number | null
    max?: number | null
    urlScheme?: string[] | null
    allowedMimeTypes?: string[] | null
  } | null

  const schema: ValidationSchema =
    (t['validation_schema'] as ValidationSchema) ??
    (t['validationSchema'] as ValidationSchema) ??
    null

  const tool: ToolRecord = {
    id: t['id'] as string,
    key: t['key'] as string,
    label: (t['label'] as string | null) ?? null,
    description: (t['description'] as string | null) ?? null,
    category: (t['category'] as ToolRecord['category']) ?? 'input',
    type: (t['type'] as ToolRecord['type']) ?? 'text',
    required: (t['required'] as boolean) ?? true,
    minLength: (t['min_length'] as number) ?? (t['minLength'] as number) ?? 0,
    maxLength: (t['max_length'] as number) ?? (t['maxLength'] as number) ?? 10000,
    placeholder: (t['placeholder'] as string | null) ?? null,
    helpText: (t['help_text'] as string | null) ?? (t['helpText'] as string | null) ?? null,
    validationSchema: schema,
    options: (t['options'] as { label: string; value: string }[] | null) ?? null,
    sortOrder: (t['sort_order'] as number) ?? (t['sortOrder'] as number) ?? 0,
    isSystem: (t['is_system'] as boolean) ?? (t['isSystem'] as boolean) ?? false,
    icon: (t['icon'] as string | null) ?? null,
    color: (t['color'] as string | null) ?? null,
  }

  return {
    id: row['id'] as string,
    versionId: (row['version_id'] as string) ?? (row['versionId'] as string) ?? '',
    label: row['label'] as string,
    toolId: (row['tool_id'] as string) ?? (row['toolId'] as string) ?? tool.id,
    tool,
    optional: (row['optional'] as boolean) ?? false,
  }
}

export function hydrateVersionParams(rows: unknown): LensVersionParam[] {
  if (!Array.isArray(rows)) return []
  return rows
    .filter((r): r is Record<string, unknown> => r != null && typeof r === 'object')
    .map((r) => mapVersionParamRow(r))
}
