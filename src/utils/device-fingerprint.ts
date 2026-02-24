import { hashToken } from './crypto'

export async function generateDeviceFingerprint(
  userAgent: string,
  clientHints: string
): Promise<string> {
  const combined = `${userAgent}|${clientHints}`
  return hashToken(combined)
}

export function parseUserAgent(userAgent: string): string {
  const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)
  const osMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS)[\s/]?[\d._]*/)

  const browser = browserMatch ? browserMatch[1] : 'Unknown Browser'
  const os = osMatch ? osMatch[1] : 'Unknown OS'

  return `${browser} on ${os}`
}
