import { hashToken } from '@/utils/crypto'
import type { TrustedDevice, DeviceContext } from '@/types/device'
import type { User } from '@/types/auth'

interface Env {
  DB: D1Database
}

export async function getDeviceByTokenHash(env: Env, tokenHash: string): Promise<TrustedDevice | null> {
  const result = await env.DB.prepare(
    'SELECT id, user_id, device_name, token_hash, device_fingerprint, status, last_used, created_at FROM trusted_devices WHERE token_hash = ? AND status = ?'
  )
    .bind(tokenHash, 'active')
    .first<TrustedDevice>()

  return result ?? null
}

export async function getDeviceByFingerprint(
  env: Env,
  fingerprint: string
): Promise<TrustedDevice | null> {
  const result = await env.DB.prepare(
    'SELECT id, user_id, device_name, token_hash, device_fingerprint, status, last_used, created_at FROM trusted_devices WHERE device_fingerprint = ? AND status = ?'
  )
    .bind(fingerprint, 'active')
    .first<TrustedDevice>()

  return result ?? null
}

export async function getUserWithUploadFlag(env: Env, userId: string): Promise<User | null> {
  const result = await env.DB.prepare(
    'SELECT id, email, is_admin, unlimited_upload, created_at FROM users WHERE id = ?'
  )
    .bind(userId)
    .first<User>()

  return result ?? null
}

export async function updateDeviceLastUsed(env: Env, deviceId: string): Promise<void> {
  await env.DB.prepare('UPDATE trusted_devices SET last_used = ? WHERE id = ?')
    .bind(new Date().toISOString(), deviceId)
    .run()
}

export async function validateDeviceToken(
  env: Env,
  token: string
): Promise<DeviceContext | null> {
  const tokenHash = await hashToken(token)
  const device = await getDeviceByTokenHash(env, tokenHash)

  if (!device) {
    return null
  }

  const user = await getUserWithUploadFlag(env, device.user_id)
  if (!user) {
    return null
  }

  await updateDeviceLastUsed(env, device.id)

  return {
    deviceId: device.id,
    userId: device.user_id,
    deviceName: device.device_name,
    unlimitedUpload: !!user.unlimited_upload,
  }
}

export function extractDeviceToken(request: Request): string | null {
  const authHeader = request.headers.get('X-Device-Token')
  if (authHeader) {
    return authHeader
  }

  const authHeaderBearer = request.headers.get('Authorization')
  if (authHeaderBearer?.startsWith('Bearer ')) {
    return authHeaderBearer.slice(7)
  }

  return null
}

export async function requireDeviceAuth(
  request: Request,
  env: Env
): Promise<{ valid: true; context: DeviceContext } | { valid: false; error: Response }> {
  const token = extractDeviceToken(request)

  if (!token) {
    return {
      valid: false,
      error: new Response(JSON.stringify({ error: 'DEVICE_TOKEN_REQUIRED' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  }

  const context = await validateDeviceToken(env, token)

  if (!context) {
    return {
      valid: false,
      error: new Response(JSON.stringify({ error: 'INVALID_DEVICE_TOKEN' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  }

  return { valid: true, context }
}
