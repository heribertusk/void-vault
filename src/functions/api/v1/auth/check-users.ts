import type { ExecutionContext } from '@cloudflare/workers-types'

interface Env {
  DB: D1Database
}

export async function onRequest(ctx: { env: Env; request: Request; context: ExecutionContext }) {
  try {
    const result = await ctx.env.DB.prepare('SELECT COUNT(*) as count FROM users').first()

    const hasUsers = (result?.count as number) > 0

    return new Response(JSON.stringify({ hasUsers }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ hasUsers: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
