import { generateId } from '@/utils/crypto'
import { generateDeviceFingerprint, parseUserAgent } from '@/utils/device-fingerprint'
import { apiError, errorResponse, jsonResponse } from '@/types/api'
import { getUserByEmail } from '@/middleware/auth'
import type { DeviceRegistrationRequest } from '@/types/device'

interface Env {
  DB: D1Database
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context

  let body: DeviceRegistrationRequest
  try {
    body = await request.json()
  } catch {
    return errorResponse(apiError('INVALID_REQUEST', 'Invalid JSON body'), 400)
  }

  if (!body.device_name || !body.user_email) {
    return errorResponse(apiError('MISSING_FIELDS', 'Device name and user email are required'), 400)
  }

  const user = await getUserByEmail(env, body.user_email)
  if (!user) {
    return errorResponse(apiError('USER_NOT_FOUND', 'User not found'), 404)
  }

  const userAgent = request.headers.get('User-Agent') || 'Unknown'
  const clientHints = request.headers.get('Sec-CH-UA') || ''

  let fingerprint = body.device_fingerprint
  if (!fingerprint) {
    fingerprint = await generateDeviceFingerprint(userAgent, clientHints)
  }

  const existingPending = await env.DB.prepare(
    'SELECT id FROM pending_devices WHERE device_fingerprint = ? AND status = ?'
  )
    .bind(fingerprint, 'pending')
    .first()

  if (existingPending) {
    return errorResponse(apiError('REQUEST_EXISTS', 'Device request already pending'), 409)
  }

  const existingDevice = await env.DB.prepare(
    'SELECT id FROM trusted_devices WHERE device_fingerprint = ? AND status = ?'
  )
    .bind(fingerprint, 'active')
    .first()

  if (existingDevice) {
    return errorResponse(apiError('DEVICE_REGISTERED', 'Device already registered'), 409)
  }

  const requestId = await generateId()
  const deviceName = body.device_name || parseUserAgent(userAgent)

  try {
    await env.DB.prepare(
      "DELETE FROM pending_devices WHERE device_fingerprint = ? AND status IN ('approved', 'rejected')"
    )
      .bind(fingerprint)
      .run()

    await env.DB.prepare(
      'INSERT INTO pending_devices (id, device_name, device_fingerprint, requested_by, status) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(requestId, deviceName, fingerprint, user.id, 'pending')
      .run()
  } catch {
    return errorResponse(apiError('DATABASE_ERROR', 'Failed to create device request'), 500)
  }

  return jsonResponse({
    success: true,
    message: 'Device registration request submitted. Awaiting admin approval.',
    request_id: requestId,
  })
}
