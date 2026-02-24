import { requireAuthResult } from '@/middleware/auth'
import { requireDeviceAuth } from '@/middleware/device-auth'
import { apiError, errorResponse, jsonResponse } from '@/types/api'
import type { TrustedDevice } from '@/types/device'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

export async function onRequestGet(context: {
  request: Request
  env: Env
}): Promise<Response> {
  const { request, env } = context

  const authResult = await requireAuthResult(request, env)
  if (!authResult.valid) {
    return authResult.error
  }

  if (authResult.ctx.user.is_admin) {
    const result = await env.DB.prepare(
      "SELECT td.id, td.user_id, td.device_name, td.device_fingerprint, td.status, td.last_used, td.created_at, u.email as user_email FROM trusted_devices td JOIN users u ON td.user_id = u.id WHERE td.status = 'active' ORDER BY td.created_at DESC"
    ).all<TrustedDevice & { user_email: string }>()

    return jsonResponse({
      devices: result.results,
    })
  }

  const result = await env.DB.prepare(
    'SELECT id, user_id, device_name, device_fingerprint, status, last_used, created_at FROM trusted_devices WHERE user_id = ? ORDER BY created_at DESC'
  )
    .bind(authResult.ctx.user.id)
    .all<TrustedDevice>()

  return jsonResponse({
    devices: result.results,
  })
}

export async function onRequestDelete(context: {
  request: Request
  env: Env
}): Promise<Response> {
  const { request, env } = context

  const url = new URL(request.url)
  const deviceId = url.searchParams.get('device_id')

  if (!deviceId) {
    return errorResponse(apiError('MISSING_DEVICE_ID', 'Device ID is required'), 400)
  }

  const device = await env.DB.prepare(
    'SELECT id, user_id FROM trusted_devices WHERE id = ?'
  )
    .bind(deviceId)
    .first<TrustedDevice>()

  if (!device) {
    return errorResponse(apiError('NOT_FOUND', 'Device not found'), 404)
  }

  const authResult = await requireAuthResult(request, env)
  if (authResult.valid && authResult.ctx.user.is_admin) {
    try {
      await env.DB.prepare('UPDATE trusted_devices SET status = ? WHERE id = ?')
        .bind('revoked', deviceId)
        .run()
    } catch {
      return errorResponse(apiError('DATABASE_ERROR', 'Failed to revoke device'), 500)
    }

    return jsonResponse({
      success: true,
      message: 'Device revoked successfully',
    })
  }

  const deviceAuth = await requireDeviceAuth(request, env)
  if (!deviceAuth.valid) {
    return deviceAuth.error
  }

  if (device.user_id !== deviceAuth.context.userId) {
    return errorResponse(apiError('FORBIDDEN', 'You can only revoke your own devices'), 403)
  }

  try {
    await env.DB.prepare('UPDATE trusted_devices SET status = ? WHERE id = ?')
      .bind('revoked', deviceId)
      .run()
  } catch {
    return errorResponse(apiError('DATABASE_ERROR', 'Failed to revoke device'), 500)
  }

  return jsonResponse({
    success: true,
    message: 'Device revoked successfully',
  })
}
