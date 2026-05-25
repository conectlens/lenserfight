/** Parse data URI → base64 payload and mime (no prefix). */
export function dataUriToBase64(url: string): { mimeType: string; base64: string } | null {
  const match = /^data:([^;,]+)?(?:;base64)?,(.+)$/i.exec(url)
  if (!match) return null
  return { mimeType: match[1] || 'application/octet-stream', base64: match[2] }
}

export function isDataUri(url: string): boolean {
  return url.startsWith('data:')
}
