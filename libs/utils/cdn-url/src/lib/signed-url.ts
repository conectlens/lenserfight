async function importHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function toHex(buf: ArrayBuffer): string {
  const view = new Uint8Array(buf)
  let out = ''
  for (let i = 0; i < view.length; i++) {
    out += view[i].toString(16).padStart(2, '0')
  }
  return out
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function buildHmacInput(path: string, exp: number, clientIp?: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return clientIp
    ? `${cleanPath}:${exp}:${clientIp}`
    : `${cleanPath}:${exp}`
}

export async function buildSignedCDNUrl(
  baseUrl: string,
  path: string,
  secret: string,
  expirySeconds: number,
  clientIp?: string,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + expirySeconds
  const input = buildHmacInput(path, exp, clientIp)
  const key = await importHmacKey(secret)
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input))
  const sig = toHex(sigBuf)
  const cleanBase = baseUrl.replace(/\/+$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${cleanBase}${cleanPath}?sig=${sig}&exp=${exp}`
}

export async function validateSignedCDNUrl(
  url: string,
  secret: string,
  clientIp?: string,
): Promise<boolean> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  const sig = parsed.searchParams.get('sig')
  const expStr = parsed.searchParams.get('exp')
  if (!sig || !expStr) return false
  const exp = Number.parseInt(expStr, 10)
  if (!Number.isFinite(exp)) return false
  if (Math.floor(Date.now() / 1000) > exp) return false

  const input = buildHmacInput(parsed.pathname, exp, clientIp)
  const key = await importHmacKey(secret)
  try {
    return await crypto.subtle.verify(
      'HMAC',
      key,
      fromHex(sig),
      new TextEncoder().encode(input),
    )
  } catch {
    return false
  }
}
