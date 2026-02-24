import { withAuth, deleteSession } from '@/middleware/auth'
import { jsonResponse } from '@/types/api'

interface Env {
  DB: D1Database
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context

  return withAuth(request, env, async (ctx) => {
    await deleteSession(env, ctx.sessionToken)
    return jsonResponse({ message: 'Logged out successfully' })
  })
}
