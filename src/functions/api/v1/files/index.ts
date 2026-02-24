import type { Env } from '@utils/r2-client'
import { requireAuthResult } from '@middleware/auth'

export const onRequestGet = async (
  context: EventContext<Env, string, Record<string, unknown>>
): Promise<Response> => {
  const authResult = await requireAuthResult(context.request, context.env)

  if (!authResult.valid) {
    return authResult.error
  }

  const { env } = context
  const userId = authResult.ctx.user.id

  const files = await env.DB
    .prepare(
      `SELECT
        id, user_id, r2_key, original_name, file_size, mime_type,
        download_count, max_downloads, expires_at, created_at
      FROM vault_files
      WHERE user_id = ?
      ORDER BY created_at DESC`
    )
    .bind(userId)
    .all<{
      id: string
      user_id: string
      r2_key: string
      original_name: string
      file_size: number
      mime_type: string
      download_count: number
      max_downloads: number
      expires_at: string
      created_at: string
    }>()

  return new Response(
    JSON.stringify({
      files: files.results.map((f: {
        id: string
        original_name: string
        file_size: number
        mime_type: string
        download_count: number
        max_downloads: number
        expires_at: string
        created_at: string
      }) => ({
        id: f.id,
        original_name: f.original_name,
        file_size: f.file_size,
        mime_type: f.mime_type,
        download_count: f.download_count,
        max_downloads: f.max_downloads,
        expires_at: f.expires_at,
        created_at: f.created_at,
      })),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
