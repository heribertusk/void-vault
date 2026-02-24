import { generateId, generateDeviceToken } from '@/utils/crypto'
import { requireAuthResult } from '@/middleware/auth'
import { apiError, errorResponse, jsonResponse } from '@/types/api'
import type { PendingDevice, DeviceApprovalRequest } from '@/types/device'

interface Env {
  DB: D1Database
  JWT_SECRET: string
}

export async function onRequestPost(context: {
  request: Request
  env: Env
  params: { id: string }
}): Promise<Response> {
  const { request, env, params } = context

  const authResult = await requireAuthResult(request, env)
  if (!authResult.valid) {
    return authResult.error
  }

  if (!authResult.ctx.user.is_admin) {
    return errorResponse(apiError('FORBIDDEN', 'Admin access required'), 403)
  }

  const pendingDevice = await env.DB.prepare(
    'SELECT id, device_name, device_fingerprint, requested_by, status FROM pending_devices WHERE id = ?'
  )
    .bind(params.id)
    .first<PendingDevice>()

  if (!pendingDevice) {
    return errorResponse(apiError('NOT_FOUND', 'Pending device not found'), 404)
  }

  if (pendingDevice.status !== 'pending') {
    return errorResponse(apiError('ALREADY_PROCESSED', 'Device request already processed'), 400)
  }

  let body: DeviceApprovalRequest
  try {
    body = await request.json()
  } catch {
    return errorResponse(apiError('INVALID_REQUEST', 'Invalid JSON body'), 400)
  }

  const newStatus = body.approved ? 'approved' : 'rejected'

  try {
    await env.DB.prepare('UPDATE pending_devices SET status = ? WHERE id = ?')
      .bind(newStatus, params.id)
      .run()
  } catch {
    return errorResponse(apiError('DATABASE_ERROR', 'Failed to update device status'), 500)
  }

  if (!body.approved) {
    return jsonResponse({
      success: true,
      message: 'Device request rejected',
    })
  }

  const { token, tokenHash } = await generateDeviceToken()
  const deviceId = await generateId()

  try {
    await env.DB.prepare(
      "DELETE FROM trusted_devices WHERE device_fingerprint = ? AND status = 'revoked'"
    )
      .bind(pendingDevice.device_fingerprint)
      .run()

    await env.DB.prepare(
      'INSERT INTO trusted_devices (id, user_id, device_name, token_hash, device_fingerprint, status) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(
        deviceId,
        pendingDevice.requested_by,
        pendingDevice.device_name,
        tokenHash,
        pendingDevice.device_fingerprint,
        'active'
      )
      .run()
  } catch {
    return errorResponse(apiError('DATABASE_ERROR', 'Failed to register device'), 500)
  }

  return jsonResponse({
    success: true,
    message: 'Device approved and registered',
    device_token: token,
    device_id: deviceId,
    device_name: pendingDevice.device_name,
  })
}
