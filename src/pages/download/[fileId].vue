<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useDecryption } from '@/composables/useDecryption'
import { useEncryption } from '@/composables/useEncryption'
import type { ApiResponse } from '@/types/api'

interface FileInfoResponse {
  originalName: string
  fileSize: number
  mimeType: string
  iv: string
}

interface DownloadResponse {
  encryptedData: string
  originalName: string
  mimeType: string
  iv: string
}

const route = useRoute()
const { triggerDownload, extractKeyFromUrl } = useDecryption()
const { decryptFile } = useEncryption()

const loading = ref(true)
const error = ref<string | null>(null)
const fileInfo = ref<FileInfoResponse | null>(null)
const downloading = ref(false)

const fileId = computed(() => route.params.fileId as string)
const hasKey = ref(false)

async function fetchFileInfo() {
  try {
    const response = await fetch(`/api/v1/download/${fileId.value}`)

    if (!response.ok) {
      const data = (await response.json()) as ApiResponse<never>
      error.value = data.error?.message || 'Failed to fetch file info'
      return
    }

    const data = (await response.json()) as ApiResponse<FileInfoResponse>

    if (!data.success || !data.data) {
      error.value = data.error?.message || 'Invalid response'
      return
    }

    fileInfo.value = data.data
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Network error'
  } finally {
    loading.value = false
  }
}

async function handleDownload() {
  const keyHex = extractKeyFromUrl()

  if (!keyHex) {
    error.value = 'No decryption key found in URL'
    return
  }

  if (!fileInfo.value) {
    error.value = 'File info not available'
    return
  }

  downloading.value = true
  error.value = null

  try {
    const response = await fetch(`/api/v1/download/${fileId.value}`, {
      method: 'POST',
    })

    if (!response.ok) {
      const data = (await response.json()) as ApiResponse<never>
      throw new Error(data.error?.message || 'Failed to download file')
    }

    const data = (await response.json()) as ApiResponse<DownloadResponse>

    if (!data.success || !data.data) {
      throw new Error(data.error?.message || 'Invalid response')
    }

    const { encryptedData, originalName, mimeType, iv } = data.data

    const binaryString = atob(encryptedData)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    const decryptedBuffer = await decryptFile(bytes.buffer, keyHex, iv)

    const blob = new Blob([decryptedBuffer], { type: mimeType })

    const cleanFileName = originalName.replace(/\.encrypted$/, '')
    triggerDownload(blob, cleanFileName)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Download failed'
  } finally {
    downloading.value = false
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

onMounted(() => {
  const keyHex = extractKeyFromUrl()
  hasKey.value = !!keyHex
  fetchFileInfo()
})
</script>

<template>
  <div class="min-h-screen bg-gray-900 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-white mb-2">
          VoidVault
        </h1>
        <p class="text-gray-400 mb-8">
          Secure File Download
        </p>
      </div>

      <div
        v-if="loading"
        class="text-center py-8"
      >
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
        <p class="text-gray-400">
          Loading file info...
        </p>
      </div>

      <div
        v-else-if="error"
        class="text-center py-8"
      >
        <div class="text-red-400 mb-4">
          <svg
            class="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <p class="text-red-400 text-lg mb-2">
          Download Failed
        </p>
        <p class="text-gray-400">
          {{ error }}
        </p>
        <p
          v-if="!hasKey"
          class="text-yellow-400 text-sm mt-4"
        >
          No decryption key found. Make sure you have the complete URL.
        </p>
      </div>

      <div
        v-else-if="fileInfo"
        class="space-y-6"
      >
        <div class="bg-gray-700 rounded-lg p-4">
          <div class="flex items-center space-x-3">
            <svg
              class="w-10 h-10 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <div>
              <p class="text-white font-medium truncate">
                {{ fileInfo.originalName }}
              </p>
              <p class="text-gray-400 text-sm">
                {{ formatFileSize(fileInfo.fileSize) }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-if="!hasKey"
          class="bg-yellow-900/30 border border-yellow-500 rounded-lg p-4"
        >
          <p class="text-yellow-400 text-sm">
            Warning: No decryption key found in URL. You need the complete link to download this
            file.
          </p>
        </div>

        <button
          :disabled="downloading || !hasKey"
          class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
          @click="handleDownload"
        >
          <div
            v-if="downloading"
            class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"
          />
          <svg
            v-else
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span>{{ downloading ? 'Decrypting...' : 'Download & Decrypt' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
