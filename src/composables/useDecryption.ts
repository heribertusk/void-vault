import { useEncryption } from './useEncryption'
import type { ApiResponse } from '@/types/api'

interface DownloadResponse {
  encryptedData: string
  originalName: string
  iv: string
}

export interface DownloadResult {
  success: boolean
  error?: string
}

export function useDecryption() {
  const { decryptFile, parseKeyFromUrl } = useEncryption()

  async function downloadAndDecrypt(
    fileId: string,
    keyHex: string
  ): Promise<{ blob: Blob; filename: string } | null> {
    try {
      const response = await fetch(`/api/v1/download/${fileId}`)

      if (!response.ok) {
        const error = (await response.json()) as ApiResponse<never>
        const errorMsg = error.error?.message || 'Failed to download file'
        throw new Error(errorMsg)
      }

      const data = (await response.json()) as ApiResponse<DownloadResponse>

      if (!data.success || !data.data) {
        const errorMsg = data.error?.message || 'Invalid response'
        throw new Error(errorMsg)
      }

      const { encryptedData, originalName, iv } = data.data

      const binaryString = atob(encryptedData)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const decryptedBuffer = await decryptFile(bytes.buffer, keyHex, iv)

      const blob = new Blob([decryptedBuffer])

      return { blob, filename: originalName }
    } catch (error) {
      console.error('Download/decrypt error:', error)
      return null
    }
  }

  function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function extractKeyFromUrl(): string | null {
    const fragment = window.location.hash.slice(1)
    return parseKeyFromUrl(fragment)
  }

  return {
    downloadAndDecrypt,
    triggerDownload,
    extractKeyFromUrl,
  }
}
