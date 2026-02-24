import type { AuthContext, User, UserWithPassword } from '@/types/auth'
import { apiError, errorResponse } from '@/types/api'
import { hashToken } from '@/utils/crypto'

interface Env {
  DB: D1Database
}

const SESSION_DURATION_HOURS = 24

export async function withAuth(
  request: Request,
  env: Env,
  handler: (ctx: AuthContext) => Promise<Response>
): Promise<Response> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse(apiError('UNAUTHORIZED', 'Missing authorization token'), 401)
  }

  const sessionToken = authHeader.substring(7)
  const tokenHash = await hashToken(sessionToken)

  const session = await env.DB.prepare(
    'SELECT user_id, expires_at FROM sessions WHERE token_hash = ?'
  )
    .bind(tokenHash)
    .first<{ user_id: string; expires_at: string }>()

  if (!session) {
    return errorResponse(apiError('UNAUTHORIZED', 'Invalid session'), 401)
  }

  const expiresAt = new Date(session.expires_at)
  if (expiresAt < new Date()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run()
    return errorResponse(apiError('SESSION_EXPIRED', 'Session has expired'), 401)
  }

  const user = await env.DB.prepare(
    'SELECT id, email, is_admin, unlimited_upload, created_at FROM users WHERE id = ?'
  )
    .bind(session.user_id)
    .first<User>()

  if (!user) {
    return errorResponse(apiError('USER_NOT_FOUND', 'User not found'), 401)
  }

  return handler({ user, sessionToken })
}

export const requireAuth = withAuth

export async function requireAuthResult(
  request: Request,
  env: Env
): Promise<{ valid: true; ctx: AuthContext } | { valid: false; error: Response }> {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('[AUTH] Missing or invalid Authorization header:', authHeader)
    return {
      valid: false,
      error: errorResponse(apiError('UNAUTHORIZED', 'Missing authorization token'), 401),
    }
  }

  const sessionToken = authHeader.substring(7)
  console.error('[AUTH] Token length:', sessionToken.length, 'First 10 chars:', sessionToken.substring(0, 10))
  const tokenHash = await hashToken(sessionToken)
  console.error('[AUTH] Token hash:', tokenHash)

  const session = await env.DB.prepare(
    'SELECT user_id, expires_at FROM sessions WHERE token_hash = ?'
  )
    .bind(tokenHash)
    .first<{ user_id: string; expires_at: string }>()

  if (!session) {
    return {
      valid: false,
      error: errorResponse(apiError('UNAUTHORIZED', 'Invalid session'), 401),
    }
  }

  const expiresAt = new Date(session.expires_at)
  if (expiresAt < new Date()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run()
    return {
      valid: false,
      error: errorResponse(apiError('SESSION_EXPIRED', 'Session has expired'), 401),
    }
  }

  const user = await env.DB.prepare(
    'SELECT id, email, is_admin, unlimited_upload, created_at FROM users WHERE id = ?'
  )
    .bind(session.user_id)
    .first<User>()

  if (!user) {
    return {
      valid: false,
      error: errorResponse(apiError('USER_NOT_FOUND', 'User not found'), 401),
    }
  }

  return { valid: true, ctx: { user, sessionToken } }
}

export async function requireAdmin(
  ctx: AuthContext,
  env: Env,
  handler: () => Promise<Response>
): Promise<Response> {
  if (!ctx.user.is_admin) {
    return errorResponse(apiError('FORBIDDEN', 'Admin access required'), 403)
  }
  return handler()
}

export async function createSession(env: Env, userId: string): Promise<string> {
  const { generateToken, hashToken, generateId } = await import('@/utils/crypto')
  
  const sessionToken = await generateToken()
  const tokenHash = await hashToken(sessionToken)
  const sessionId = await generateId()
  
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS)

  await env.DB.prepare(
    'INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
  )
    .bind(sessionId, userId, tokenHash, expiresAt.toISOString())
    .run()

  return sessionToken
}

export async function deleteSession(env: Env, sessionToken: string): Promise<void> {
  const tokenHash = await hashToken(sessionToken)
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run()
}

export async function getUserByEmail(env: Env, email: string): Promise<UserWithPassword | null> {
  return env.DB.prepare(
    'SELECT id, email, password_hash, password_salt, is_admin, unlimited_upload, created_at FROM users WHERE email = ?'
  )
    .bind(email)
    .first<UserWithPassword>()
}

export async function getUserCount(env: Env): Promise<number> {
  const result = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>()
  return result?.count ?? 0
}
