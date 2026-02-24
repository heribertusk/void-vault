import type { Env } from '@utils/r2-client'
import { deleteFromR2 } from '@utils/r2-client'

export async function cleanupExpiredFiles(
  env: Env,
  _event: ScheduledEvent
): Promise<void> {
  console.log('Starting file cleanup...')

  const now = new Date().toISOString()

  const expiredFiles = await env.DB
    .prepare('SELECT id, r2_key FROM vault_files WHERE expires_at < ?')
    .bind(now)
    .all<{ id: string; r2_key: string }>()

  console.log(`Found ${expiredFiles.results.length} expired files`)

  for (const file of expiredFiles.results) {
    try {
      await deleteFromR2(env.R2, file.r2_key)

      await env.DB
        .prepare('DELETE FROM vault_files WHERE id = ?')
        .bind(file.id)
        .run()

      console.log(`Deleted file: ${file.id}`)
    } catch (error) {
      console.error(`Failed to delete file ${file.id}:`, error)
    }
  }

  const oneHourAgo = new Date(Date.now() - 3600000).toISOString()

  const result = await env.DB
    .prepare('DELETE FROM upload_log WHERE uploaded_at < ?')
    .bind(oneHourAgo)
    .run()

  console.log(`Cleaned up ${result.meta.changes} old upload log entries`)
}

export const scheduled = async (
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> => {
  ctx.waitUntil(cleanupExpiredFiles(env, event))
}
