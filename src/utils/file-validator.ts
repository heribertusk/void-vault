export async function getAllowedExtensions(db: D1Database): Promise<Set<string>> {
  const result = await db
    .prepare('SELECT extension FROM file_type_whitelist WHERE is_active = 1')
    .all<{ extension: string }>()

  return new Set(result.results.map((r) => r.extension.toLowerCase()))
}

export function validateFileSize(
  fileSize: number,
  maxSizeBytes: number = 104857600
): { valid: boolean; error?: string } {
  if (fileSize <= 0) {
    return { valid: false, error: 'File is empty' }
  }

  if (fileSize > maxSizeBytes) {
    const maxSizeMB = Math.round(maxSizeBytes / 1048576)
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` }
  }

  return { valid: true }
}

export function validateFileExtension(
  filename: string,
  allowedExtensions: Set<string>
): { valid: boolean; error?: string } {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) {
    return { valid: false, error: 'File must have an extension' }
  }

  const extension = filename.substring(lastDot).toLowerCase()

  if (!allowedExtensions.has(extension)) {
    return {
      valid: false,
      error: `File type "${extension}" is not allowed`,
    }
  }

  return { valid: true }
}

export function validateExpiration(
  expiresInHours: number
): { valid: boolean; error?: string } {
  const validOptions = [1, 6, 24, 168]

  if (!validOptions.includes(expiresInHours)) {
    return { valid: false, error: 'Invalid expiration time' }
  }

  return { valid: true }
}

export function validateDownloadLimit(
  maxDownloads: number
): { valid: boolean; error?: string } {
  const validOptions = [0, 1, 3, 5]

  if (!validOptions.includes(maxDownloads)) {
    return { valid: false, error: 'Invalid download limit' }
  }

  return { valid: true }
}

export function calculateExpiresAt(expiresInHours: number): string {
  const now = new Date()
  now.setHours(now.getHours() + expiresInHours)
  return now.toISOString()
}
