import type { Env } from '@utils/r2-client'
import { downloadFromR2 } from '@utils/r2-client'

export const onRequestGet = async (
  context: EventContext<Env, string, Record<string, unknown>>
): Promise<Response> => {
  const { env, params } = context
  const fileId = params.fileId as string | undefined

  if (!fileId || typeof fileId !== 'string') {
    return new Response(JSON.stringify({ success: false, error: { message: 'Invalid file ID' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const file = await env.DB.prepare(
    `SELECT
        id, original_name, file_size, mime_type,
        download_count, max_downloads, expires_at, iv
      FROM vault_files
      WHERE id = ?`
  )
    .bind(fileId)
    .first<{
      id: string
      original_name: string
      file_size: number
      mime_type: string
      download_count: number
      max_downloads: number
      expires_at: string
      iv: string
    }>()

  if (!file) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { message: 'File tidak ditemukan atau telah dihapus' },
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const now = new Date()
  const expiresAt = new Date(file.expires_at)

  if (now > expiresAt) {
    return new Response(
      JSON.stringify({ success: false, error: { message: 'File telah kedaluwarsa (expired)' } }),
      { status: 410, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (file.max_downloads > 0 && file.download_count >= file.max_downloads) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { message: 'Batas download telah tercapai (download limit exceeded)' },
      }),
      { status: 410, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        originalName: file.original_name,
        fileSize: file.file_size,
        mimeType: file.mime_type,
        iv: file.iv,
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}

export const onRequestPost = async (
  context: EventContext<Env, string, Record<string, unknown>>
): Promise<Response> => {
  const { env, params } = context
  const fileId = params.fileId as string | undefined

  if (!fileId || typeof fileId !== 'string') {
    return new Response(JSON.stringify({ success: false, error: { message: 'Invalid file ID' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const file = await env.DB.prepare(
    `SELECT
        id, r2_key, original_name, mime_type,
        download_count, max_downloads, expires_at, iv
      FROM vault_files
      WHERE id = ?`
  )
    .bind(fileId)
    .first<{
      id: string
      r2_key: string
      original_name: string
      mime_type: string
      download_count: number
      max_downloads: number
      expires_at: string
      iv: string
    }>()

  if (!file) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { message: 'File tidak ditemukan atau telah dihapus' },
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const now = new Date()
  const expiresAt = new Date(file.expires_at)

  if (now > expiresAt) {
    return new Response(
      JSON.stringify({ success: false, error: { message: 'File telah kedaluwarsa (expired)' } }),
      { status: 410, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (file.max_downloads > 0 && file.download_count >= file.max_downloads) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { message: 'Batas download telah tercapai (download limit exceeded)' },
      }),
      { status: 410, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const r2Object = await downloadFromR2(env.R2, file.r2_key)

  if (!r2Object) {
    return new Response(
      JSON.stringify({ success: false, error: { message: 'File tidak ditemukan dalam storage' } }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
  }

  await env.DB.prepare('UPDATE vault_files SET download_count = download_count + 1 WHERE id = ?')
    .bind(fileId)
    .run()

  const fileData = await r2Object.arrayBuffer()

  const bytes = new Uint8Array(fileData)
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64Data = btoa(binary)

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        encryptedData: base64Data,
        originalName: file.original_name,
        mimeType: file.mime_type,
        iv: file.iv,
        fileSize: fileData.byteLength,
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  )
}
