/**
 * Object-key helpers for uploads.
 *
 * A storage object key travels through three places that must agree byte for
 * byte: the signing request, the signed token's embedded path, and the eventual
 * PUT. Spaces and non-ASCII punctuation survive some of those hops percent-
 * encoded and others raw, so a key built straight from a user's filename can
 * sign successfully and then fail the upload with a 400. Reducing the key to a
 * conservative character set up front removes the class of mismatch instead of
 * trying to encode consistently at every hop.
 */

/** Reduce one path segment to `[a-z0-9._-]`, collapsing everything else to `-`. */
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

/**
 * Turn a user-supplied filename into a safe object-key filename, preserving a
 * recognisable stem and the extension.
 *
 * Strips any directory prefix first — browsers can report a path for a
 * directory upload, and an unnoticed `/` would silently create a nested key.
 * The extension is sanitized too, not just lowercased: a non-ASCII extension is
 * rarer than a non-ASCII stem but breaks the upload exactly the same way.
 *
 * @param fileName the original filename, e.g. `Start to Fight!'.jpg`
 * @param prefix   optional leading segment (a timestamp or id), sanitized too
 */
export function buildStorageObjectFileName(fileName: string, prefix?: string | number): string {
  const baseName = fileName.replace(/^.*[/\\]/, '')
  const dot = baseName.lastIndexOf('.')

  // A leading dot is a dotfile, not an extension separator: `.env` has stem
  // `.env` and no extension, rather than an empty stem.
  const hasExt = dot > 0
  const stem = hasExt ? baseName.slice(0, dot) : baseName
  const rawExt = hasExt ? baseName.slice(dot + 1) : ''

  const safeStem = sanitizeStoragePathSegment(stem)
  const safeExt = rawExt ? sanitizeStoragePathSegment(rawExt) : ''
  const head = prefix === undefined ? '' : `${sanitizeStoragePathSegment(String(prefix))}-`

  return safeExt ? `${head}${safeStem}.${safeExt}` : `${head}${safeStem}`
}
