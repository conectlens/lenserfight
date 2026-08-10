import { buildStorageObjectFileName, sanitizeStoragePathSegment } from '@lenserfight/utils/text'

// Re-exported so existing importers keep working. The implementation moved to
// @lenserfight/utils/text so thread uploads can share it instead of carrying a
// second copy of the same rules — see issue #485.
export { sanitizeStoragePathSegment }

/** Builds a lens-resources object key: {authUserId}/{versionId}/{paramLabel}/{fileName} */
export function buildLensResourceObjectKey(
  authUserId: string,
  versionId: string,
  bindingKey: string,
  fileName: string,
  uniqueId?: string,
): string {
  const safeFile = buildStorageObjectFileName(fileName, uniqueId)
  return `${authUserId}/${versionId}/${sanitizeStoragePathSegment(bindingKey)}/${safeFile}`
}
