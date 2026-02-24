import { withAuth, requireAdmin, getUserByEmail } from '@/middleware/auth'
import { generateId, generateSalt, hashPassword } from '@/utils/crypto'
import { apiError, errorResponse, jsonResponse } from '@/types/api'
import type { User, CreateUserRequest } from '@/types/auth'

interface Env {
  DB: D1Database
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context

  return withAuth(request, env, async (ctx) => {
    return requireAdmin(ctx, env, async () => {
      const result = await env.DB.prepare(
        'SELECT id, email, is_admin, unlimited_upload, created_at FROM users ORDER BY created_at DESC'
      ).all<User>()

      return jsonResponse({ users: result.results })
    })
  })
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context

  return withAuth(request, env, async (ctx) => {
    return requireAdmin(ctx, env, async () => {
      let body: CreateUserRequest
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

      const userId = await generateId()
      const salt = await generateSalt()
      const passwordHash = await hashPassword(body.password, salt)

      try {
        await env.DB.prepare(
          'INSERT INTO users (id, email, password_hash, password_salt, is_admin, unlimited_upload) VALUES (?, ?, ?, ?, ?, ?)'
        )
          .bind(
            userId,
            body.email.toLowerCase(),
            passwordHash,
            salt,
            0,
            body.unlimited_upload ? 1 : 0
          )
          .run()
      } catch {
        return errorResponse(apiError('DATABASE_ERROR', 'Failed to create user'), 500)
      }

      const user: User = {
        id: userId,
        email: body.email.toLowerCase(),
        is_admin: false,
        unlimited_upload: body.unlimited_upload ?? false,
        created_at: new Date().toISOString(),
      }

      return jsonResponse({ user }, 201)
    })
  })
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
