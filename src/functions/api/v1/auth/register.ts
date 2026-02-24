import { generateId, generateSalt, hashPassword } from '@/utils/crypto'
import { createSession, getUserByEmail, getUserCount } from '@/middleware/auth'
import { apiError, errorResponse, jsonResponse } from '@/types/api'
import type { User, RegisterRequest } from '@/types/auth'

interface Env {
  DB: D1Database
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context

  let body: RegisterRequest
  try {
    body = await request.json()
  } catch {
    return errorResponse(apiError('INVALID_REQUEST', 'Invalid JSON body'), 400)
  }

  if (!body.email || !body.password) {
    return errorResponse(apiError('MISSING_FIELDS', 'Email and password are required'), 400)
  }

  if (!isValidEmail(body.email)) {
    return errorResponse(apiError('INVALID_EMAIL', 'Invalid email format'), 400)
  }

  if (body.password.length < 8) {
    return errorResponse(apiError('WEAK_PASSWORD', 'Password must be at least 8 characters'), 400)
  }

  const existingUser = await getUserByEmail(env, body.email)
  if (existingUser) {
    return errorResponse(apiError('EMAIL_EXISTS', 'Email already registered'), 409)
  }

  const userCount = await getUserCount(env)
  const isFirstUser = userCount === 0

  const userId = await generateId()
  const salt = await generateSalt()
  const passwordHash = await hashPassword(body.password, salt)

  try {
    await env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, password_salt, is_admin, unlimited_upload) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(userId, body.email.toLowerCase(), passwordHash, salt, isFirstUser ? 1 : 0, 0)
      .run()
  } catch {
    return errorResponse(apiError('DATABASE_ERROR', 'Failed to create user'), 500)
  }

  const sessionToken = await createSession(env, userId)

  const user: User = {
    id: userId,
    email: body.email.toLowerCase(),
    is_admin: isFirstUser,
    unlimited_upload: false,
    created_at: new Date().toISOString(),
  }

  return jsonResponse({ user, token: sessionToken }, 201)
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
