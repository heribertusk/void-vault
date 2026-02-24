import type { TrustedDevice } from '@/types/device'

const RATE_LIMIT_PER_HOUR = 10

interface Env {
  DB: D1Database
}

export async function checkRateLimit(
  env: Env,
  device: TrustedDevice,
  unlimitedUpload: boolean
): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
  if (unlimitedUpload) {
    return { allowed: true, remaining: -1, resetAt: '' }
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const result = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM upload_log WHERE device_id = ? AND uploaded_at > ?'
  )
    .bind(device.id, oneHourAgo)
    .first<{ count: number }>()

  const uploadCount = result?.count ?? 0
  const remaining = Math.max(0, RATE_LIMIT_PER_HOUR - uploadCount)
  const allowed = uploadCount < RATE_LIMIT_PER_HOUR

  const resetAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  return { allowed, remaining, resetAt }
}

export async function recordUpload(env: Env, deviceId: string): Promise<void> {
  await env.DB.prepare('INSERT INTO upload_log (device_id, uploaded_at) VALUES (?, ?)')
    .bind(deviceId, new Date().toISOString())
    .run()
}

export async function cleanupOldUploadLogs(env: Env): Promise<void> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  await env.DB.prepare('DELETE FROM upload_log WHERE uploaded_at < ?').bind(oneDayAgo).run()
}
