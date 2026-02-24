import { verifyPassword } from '@/utils/crypto'
import { createSession, getUserByEmail } from '@/middleware/auth'
import { apiError, errorResponse, jsonResponse } from '@/types/api'
import type { User, LoginRequest } from '@/types/auth'

interface Env {
  DB: D1Database
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context

  let body: LoginRequest
  try {
    body = await request.json()
  } catch {
    return errorResponse(apiError('INVALID_REQUEST', 'Invalid JSON body'), 400)
  }

  if (!body.email || !body.password) {
    return errorResponse(apiError('MISSING_FIELDS', 'Email and password are required'), 400)
  }

  const user = await getUserByEmail(env, body.email.toLowerCase())
  if (!user) {
    return errorResponse(apiError('INVALID_CREDENTIALS', 'Invalid email or password'), 401)
  }

  const isValid = await verifyPassword(body.password, user.password_salt, user.password_hash)
  if (!isValid) {
    return errorResponse(apiError('INVALID_CREDENTIALS', 'Invalid email or password'), 401)
  }

  const sessionToken = await createSession(env, user.id)

  const userResponse: User = {
    id: user.id,
    email: user.email,
    is_admin: user.is_admin,
    unlimited_upload: user.unlimited_upload,
    created_at: user.created_at,
  }

  return jsonResponse({ user: userResponse, token: sessionToken })
}
