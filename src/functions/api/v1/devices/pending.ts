import { requireAuthResult } from '@/middleware/auth'
import { apiError, errorResponse, jsonResponse } from '@/types/api'
import type { PendingDevice } from '@/types/device'

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

  if (!authResult.ctx.user.is_admin) {
    return errorResponse(apiError('FORBIDDEN', 'Admin access required'), 403)
  }

  const result = await env.DB.prepare(
    'SELECT pd.id, pd.device_name, pd.device_fingerprint, pd.requested_by, pd.status, pd.created_at, u.email as requester_email FROM pending_devices pd JOIN users u ON pd.requested_by = u.id WHERE pd.status = ? ORDER BY pd.created_at DESC'
  )
    .bind('pending')
    .all<PendingDevice & { requester_email: string }>()

  return jsonResponse({
    devices: result.results,
  })
}
