import { withAuth, requireAdmin } from '@/middleware/auth'
import { apiError, errorResponse, jsonResponse } from '@/types/api'
import type { User, UpdateUserRequest } from '@/types/auth'

interface Env {
  DB: D1Database
}

interface Params {
  id: string
}

export async function onRequestPatch(context: {
  request: Request
  env: Env
  params: Params
}): Promise<Response> {
  const { request, env, params } = context

  return withAuth(request, env, async (ctx) => {
    return requireAdmin(ctx, env, async () => {
      let body: UpdateUserRequest
      try {
        body = await request.json()
      } catch {
        return errorResponse(apiError('INVALID_REQUEST', 'Invalid JSON body'), 400)
      }

      const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?')
        .bind(params.id)
        .first<{ id: string }>()

      if (!user) {
        return errorResponse(apiError('USER_NOT_FOUND', 'User not found'), 404)
      }

      const updates: string[] = []
      const values: unknown[] = []

      if (body.unlimited_upload !== undefined) {
        updates.push('unlimited_upload = ?')
        values.push(body.unlimited_upload ? 1 : 0)
      }

      if (updates.length === 0) {
        return errorResponse(apiError('NO_UPDATES', 'No valid fields to update'), 400)
      }

      values.push(params.id)

      await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run()

      const updatedUser = await env.DB.prepare(
        'SELECT id, email, is_admin, unlimited_upload, created_at FROM users WHERE id = ?'
      )
        .bind(params.id)
        .first<User>()

      return jsonResponse({ user: updatedUser })
    })
  })
}

export async function onRequestDelete(context: {
  request: Request
  env: Env
  params: Params
}): Promise<Response> {
  const { request, env, params } = context

  return withAuth(request, env, async (ctx) => {
    return requireAdmin(ctx, env, async () => {
      if (ctx.user.id === params.id) {
        return errorResponse(apiError('CANNOT_DELETE_SELF', 'Cannot delete your own account'), 400)
      }

      const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?')
        .bind(params.id)
        .first<{ id: string }>()

      if (!user) {
        return errorResponse(apiError('USER_NOT_FOUND', 'User not found'), 404)
      }

      await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(params.id).run()
      await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(params.id).run()

      return jsonResponse({ message: 'User deleted successfully' })
    })
  })
}
