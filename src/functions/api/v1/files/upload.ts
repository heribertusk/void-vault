import {
  validateFileSize,
  validateFileExtension,
  validateExpiration,
  validateDownloadLimit,
  calculateExpiresAt,
  getAllowedExtensions,
} from '@utils/file-validator'
import {
  uploadToR2,
  generateR2Key,
  checkRateLimit,
  logUpload,
  type Env,
} from '@utils/r2-client'
import { generateId } from '@utils/crypto'
import { requireDeviceAuth } from '@middleware/device-auth'

interface UploadFormData {
  file: File
  max_downloads: string
  expires_in_hours: string
  iv: string
}

async function parseFormData(request: Request): Promise<UploadFormData | null> {
  const contentType = request.headers.get('Content-Type') || ''

  if (!contentType.includes('multipart/form-data')) {
    return null
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const maxDownloads = formData.get('max_downloads')
  const expiresInHours = formData.get('expires_in_hours')
  const iv = formData.get('iv')

  if (!(file instanceof File) || !maxDownloads || !expiresInHours || typeof iv !== 'string') {
    return null
  }

  return {
    file,
    max_downloads: maxDownloads.toString(),
    expires_in_hours: expiresInHours.toString(),
    iv,
  }
}

export const onRequestPost = async (
  context: EventContext<Env, string, Record<string, unknown>>
): Promise<Response> => {
  const authResult = await requireDeviceAuth(context.request, context.env)

  if (!authResult.valid) {
    return authResult.error
  }

  const device = authResult.context
  const { env, request } = context

  const formData = await parseFormData(request)

  if (!formData) {
    return new Response(
      JSON.stringify({ error: 'Invalid form data' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const maxDownloads = parseInt(formData.max_downloads, 10)
  const expiresInHours = parseInt(formData.expires_in_hours, 10)
  const iv = formData.iv as string

  const dlLimitValidation = validateDownloadLimit(maxDownloads)
  if (!dlLimitValidation.valid) {
    return new Response(
      JSON.stringify({ error: dlLimitValidation.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const expValidation = validateExpiration(expiresInHours)
  if (!expValidation.valid) {
    return new Response(
      JSON.stringify({ error: expValidation.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const sizeValidation = validateFileSize(formData.file.size)
  if (!sizeValidation.valid) {
    return new Response(
      JSON.stringify({ error: sizeValidation.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const allowedExtensions = await getAllowedExtensions(env.DB)
  const extValidation = validateFileExtension(formData.file.name, allowedExtensions)
  if (!extValidation.valid) {
    return new Response(
      JSON.stringify({ error: extValidation.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const user = await env.DB
    .prepare('SELECT unlimited_upload FROM users WHERE id = ?')
    .bind(device.userId)
    .first<{ unlimited_upload: number }>()

  const hasUnlimitedUpload = user?.unlimited_upload === 1

  if (!hasUnlimitedUpload) {
    const rateLimit = await checkRateLimit(env.DB, device.deviceId)

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Upload rate limit exceeded. Please try again later.',
          remaining: rateLimit.remaining,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  const fileId = await generateId()
  const r2Key = await generateR2Key()
  const fileBuffer = await formData.file.arrayBuffer()

  await uploadToR2(env.R2, r2Key, fileBuffer, formData.file.type)

  const expiresAt = calculateExpiresAt(expiresInHours)

  await env.DB
    .prepare(
      `INSERT INTO vault_files
        (id, user_id, r2_key, original_name, file_size, mime_type, download_count, max_downloads, expires_at, created_at, iv)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
    )
    .bind(
      fileId,
      device.userId,
      r2Key,
      formData.file.name,
      formData.file.size,
      formData.file.type,
      maxDownloads,
      expiresAt,
      new Date().toISOString(),
      iv
    )
    .run()

  await logUpload(env.DB, device.deviceId)

  return new Response(
    JSON.stringify({
      success: true,
      file_id: fileId,
    }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  )
}
