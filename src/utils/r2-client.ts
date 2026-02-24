import { generateToken } from './crypto'

export interface Env {
  R2: R2Bucket
  DB: D1Database
  JWT_SECRET: string
}

export async function uploadToR2(
  bucket: R2Bucket,
  key: string,
  data: ArrayBuffer,
  contentType: string
): Promise<void> {
  await bucket.put(key, data, {
    httpMetadata: {
      contentType,
    },
  })
}

export async function downloadFromR2(
  bucket: R2Bucket,
  key: string
): Promise<R2ObjectBody | null> {
  return await bucket.get(key)
}

export async function deleteFromR2(
  bucket: R2Bucket,
  key: string
): Promise<void> {
  await bucket.delete(key)
}

export async function generateR2Key(): Promise<string> {
  return generateToken(32)
}

export async function checkRateLimit(
  db: D1Database,
  deviceId: string,
  maxUploadsPerHour: number = 10
): Promise<{ allowed: boolean; remaining: number }> {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString()

  const result = await db
    .prepare(
      'SELECT COUNT(*) as count FROM upload_log WHERE device_id = ? AND uploaded_at > ?'
    )
    .bind(deviceId, oneHourAgo)
    .first<{ count: number }>()

  const count = result?.count ?? 0
  const remaining = Math.max(0, maxUploadsPerHour - count)

  return {
    allowed: count < maxUploadsPerHour,
    remaining,
  }
}

export async function logUpload(
  db: D1Database,
  deviceId: string
): Promise<void> {
  await db
    .prepare('INSERT INTO upload_log (device_id, uploaded_at) VALUES (?, ?)')
    .bind(deviceId, new Date().toISOString())
    .run()
}
