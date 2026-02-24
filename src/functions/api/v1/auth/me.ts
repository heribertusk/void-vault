import { withAuth } from '@/middleware/auth'
import { jsonResponse } from '@/types/api'

interface Env {
  DB: D1Database
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context

  return withAuth(request, env, async (ctx) => {
    return jsonResponse({ user: ctx.user })
  })
}
