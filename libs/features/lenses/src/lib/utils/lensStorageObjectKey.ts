/** Safe path segment for Supabase Storage object keys (no spaces/special chars). */
export function sanitizeStoragePathSegment(segment: string): string {
  const cleaned = segment
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  return cleaned.length > 0 ? cleaned : 'file'
}

/** Builds a lens-resources object key: {authUserId}/{versionId}/{paramLabel}/{fileName} */
export function buildLensResourceObjectKey(
  authUserId: string,
  versionId: string,
  bindingKey: string,
  fileName: string
): string {
  const baseName = fileName.replace(/^.*[/\\]/, '')
  const dot = baseName.lastIndexOf('.')
  const ext = dot >= 0 ? baseName.slice(dot).toLowerCase() : ''
  const stem = dot >= 0 ? baseName.slice(0, dot) : baseName
  const safeFile = `${sanitizeStoragePathSegment(stem)}${ext}`
  return `${authUserId}/${versionId}/${sanitizeStoragePathSegment(bindingKey)}/${safeFile}`
}
