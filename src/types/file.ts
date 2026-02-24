export interface VaultFile {
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
}

export interface FileTypeWhitelist {
  id: number
  extension: string
  category: string
  is_active: boolean
}

export interface UploadRequest {
  file: File
  max_downloads: number
  expires_in_hours: number
}

export interface UploadResponse {
  success: boolean
  file_id: string
  share_url: string
}

export interface FileValidationResult {
  valid: boolean
  error?: string
}

export const EXPIRATION_OPTIONS = [
  { label: '1 Hour', value: 1 },
  { label: '6 Hours', value: 6 },
  { label: '24 Hours', value: 24 },
  { label: '7 Days', value: 168 },
] as const

export const DOWNLOAD_LIMIT_OPTIONS = [
  { label: '1 Download', value: 1 },
  { label: '3 Downloads', value: 3 },
  { label: '5 Downloads', value: 5 },
  { label: 'Unlimited', value: 0 },
] as const
