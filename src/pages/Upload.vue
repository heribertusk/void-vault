<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import FileUploader from '@/components/FileUploader.vue'
import ShareableLink from '@/components/ShareableLink.vue'

const DEVICE_TOKEN_KEY = 'voidvault_device_token'

const deviceToken = ref<string | null>(null)
const tokenInput = ref('')
const isUploading = ref(false)
const uploadError = ref<string | null>(null)
const uploadResult = ref<{ fileId: string; key: string; iv: string } | null>(null)
const tokenError = ref<string | null>(null)
const showTokenForm = ref(false)
const showRequestForm = ref(false)
const requestEmail = ref('')
const requestDeviceName = ref('')
const isRequesting = ref(false)
const requestSuccess = ref(false)
const requestError = ref<string | null>(null)
const uploadProgress = ref(0)
const uploadStage = ref<'encrypting' | 'uploading' | 'complete'>('encrypting')

function handleEncryptingProgress(progress: number) {
  if (uploadStage.value === 'encrypting') {
    uploadProgress.value = progress
  }
}

const expirationOptions = [
  { label: '1 Hour', value: 1 },
  { label: '6 Hours', value: 6 },
  { label: '24 Hours', value: 24 },
  { label: '7 Days', value: 168 },
]

const downloadLimitOptions = [
  { label: '1 Download', value: 1 },
  { label: '3 Downloads', value: 3 },
  { label: '5 Downloads', value: 5 },
  { label: 'Unlimited', value: 0 },
]

const selectedExpiration = ref(1)
const selectedDownloadLimit = ref(1)

const isOnline = computed(() => navigator.onLine)
const showOfflineWarning = ref(false)

onMounted(() => {
  const storedToken = localStorage.getItem(DEVICE_TOKEN_KEY)
  if (storedToken) {
    deviceToken.value = storedToken
  }
})

function saveToken() {
  const token = tokenInput.value.trim()
  if (!token) {
    tokenError.value = 'Please enter a device token'
    return
  }
  localStorage.setItem(DEVICE_TOKEN_KEY, token)
  deviceToken.value = token
  tokenInput.value = ''
  tokenError.value = null
  showTokenForm.value = false
}

function clearToken() {
  localStorage.removeItem(DEVICE_TOKEN_KEY)
  deviceToken.value = null
  showTokenForm.value = false
}

async function requestDeviceAccess() {
  if (!requestEmail.value.trim() || !requestDeviceName.value.trim()) {
    requestError.value = 'Please fill in all fields'
    return
  }

  isRequesting.value = true
  requestError.value = null

  try {
    const response = await fetch('/api/v1/devices/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_name: requestDeviceName.value.trim(),
        user_email: requestEmail.value.trim(),
      }),
    })

    const data = (await response.json()) as {
      success?: boolean
      message?: string
      error?: string
      code?: string
    }

    if (!response.ok) {
      throw new Error(data.message || data.error || data.code || 'Request failed')
    }

    requestSuccess.value = true
    requestEmail.value = ''
    requestDeviceName.value = ''
    showRequestForm.value = false

    setTimeout(() => {
      requestSuccess.value = false
    }, 3000)
  } catch (err) {
    requestError.value = err instanceof Error ? err.message : 'Request failed'
    setTimeout(() => {
      requestError.value = null
    }, 5000)
  } finally {
    isRequesting.value = false
  }
}

function handleUploadError(message: string) {
  uploadError.value = message
  uploadProgress.value = 0
  uploadStage.value = 'encrypting'
}

async function handleUpload(data: {
  encryptedFile: File
  key: string
  iv: string
  originalName: string
  fileSize: number
  mimeType: string
}) {
  if (!isOnline.value) {
    showOfflineWarning.value = true
    uploadError.value = 'Connection required. Please check your internet connection.'
    setTimeout(() => {
      showOfflineWarning.value = false
      uploadError.value = null
    }, 3000)
    return
  }

  if (!deviceToken.value) {
    uploadError.value = 'No device token found. Please register your device first.'
    setTimeout(() => {
      uploadError.value = null
    }, 5000)
    return
  }

  isUploading.value = true
  uploadError.value = null
  uploadProgress.value = 0
  uploadStage.value = 'encrypting'

  try {
    const formData = new FormData()
    formData.append('file', data.encryptedFile)
    formData.append('originalName', data.originalName)
    formData.append('fileSize', data.fileSize.toString())
    formData.append('mimeType', data.mimeType)
    formData.append('iv', data.iv)
    formData.append('expires_in_hours', selectedExpiration.value.toString())
    formData.append('max_downloads', selectedDownloadLimit.value.toString())

    uploadStage.value = 'uploading'
    uploadProgress.value = 0

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          uploadProgress.value = Math.round((event.loaded / event.total) * 100)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status === 0) {
          reject(new Error('Network error. Please check your connection and try again.'))
          return
        }

        if (xhr.status === 201) {
          const result = JSON.parse(xhr.responseText) as { file_id: string }
          uploadResult.value = {
            fileId: result.file_id,
            key: data.key,
            iv: data.iv,
          }
          uploadProgress.value = 100
          uploadStage.value = 'complete'
          resolve()
        } else {
          let errorMessage = 'Upload failed'
          try {
            const errorData = JSON.parse(xhr.responseText) as { error?: string }
            errorMessage = errorData.error || `Upload failed with status ${xhr.status}`
          } catch {
            errorMessage = `Upload failed with status ${xhr.status}`
          }
          reject(new Error(errorMessage))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Network error. Please check your connection and try again.'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled.'))
      })

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timeout. Please check your connection and try again.'))
      })

      xhr.timeout = 300000

      xhr.open('POST', '/api/v1/files/upload')
      xhr.setRequestHeader('X-Device-Token', deviceToken.value!)
      xhr.send(formData)
    })
  } catch (err) {
    handleUploadError(err instanceof Error ? err.message : 'Upload failed')
  } finally {
    isUploading.value = false
  }
}

function resetUpload() {
  uploadResult.value = null
  uploadError.value = null
}
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white p-8">
    <div class="max-w-2xl mx-auto space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold mb-2">
          VoidVault
        </h1>
        <p class="text-gray-400">
          Secure, encrypted file sharing
        </p>
      </div>

      <div
        v-if="showOfflineWarning"
        class="bg-red-900/30 border border-red-700 rounded-lg p-4"
      >
        <p class="text-red-400 flex items-center gap-2">
          <svg
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          Connection required. Please check your internet connection.
        </p>
      </div>

      <div
        v-if="uploadError"
        class="bg-red-900/30 border border-red-700 rounded-lg p-4"
      >
        <p class="text-red-400">
          {{ uploadError }}
        </p>
      </div>

      <div
        v-if="tokenError"
        class="bg-red-900/30 border border-red-700 rounded-lg p-4"
      >
        <p class="text-red-400">
          {{ tokenError }}
        </p>
      </div>

      <div
        v-if="isUploading"
        class="bg-gray-800 rounded-lg p-6 space-y-4"
      >
        <div class="text-center">
          <h2 class="text-xl font-semibold text-gray-200 mb-4">
            {{ uploadStage === 'encrypting' ? 'Encrypting File...' : 'Uploading...' }}
          </h2>
        </div>

        <div class="space-y-2">
          <div class="w-full bg-gray-700 rounded-full h-3">
            <div
              class="bg-blue-500 h-3 rounded-full transition-all duration-300"
              :style="{ width: `${uploadProgress}%` }"
            />
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-400">
              {{ uploadStage === 'encrypting' ? 'Encryption' : 'Upload' }} Progress
            </span>
            <span class="text-gray-300">{{ uploadProgress }}%</span>
          </div>
        </div>

        <div
          v-if="uploadStage === 'uploading'"
          class="text-center text-gray-400 text-sm"
        >
          <p>Uploading {{ uploadProgress < 100 ? 'to server' : 'complete' }}...</p>
          <p class="mt-1">
            Please don't close this page.
          </p>
        </div>
      </div>

      <div
        v-else-if="!deviceToken"
        class="bg-gray-800 rounded-lg p-6 space-y-4"
      >
        <div class="text-center">
          <h2 class="text-xl font-semibold text-gray-200 mb-2">
            Device Registration Required
          </h2>
          <p class="text-gray-400 text-sm">
            Request access or enter your device token below.
          </p>
        </div>

        <div
          v-if="requestSuccess"
          class="bg-green-900/30 border border-green-700 rounded-lg p-4"
        >
          <p class="text-green-400">
            Request submitted! An administrator will review and approve your device.
          </p>
          <button
            class="mt-2 text-green-300 hover:text-green-200 text-sm underline"
            @click="requestSuccess = false"
          >
            Submit another request
          </button>
        </div>

        <div
          v-else-if="requestError"
          class="bg-red-900/30 border border-red-700 rounded-lg p-4"
        >
          <p class="text-red-400">
            {{ requestError }}
          </p>
        </div>

        <div v-if="!showTokenForm && !showRequestForm && !requestSuccess">
          <div class="grid grid-cols-2 gap-3">
            <button
              class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              @click="showRequestForm = true"
            >
              Request Access
            </button>
            <button
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              @click="showTokenForm = true"
            >
              Enter Token
            </button>
          </div>
        </div>

        <div
          v-if="showRequestForm && !requestSuccess"
          class="space-y-4"
        >
          <div>
            <label class="block text-gray-400 text-sm mb-2"> Your Email </label>
            <input
              v-model="requestEmail"
              type="email"
              placeholder="your@email.com"
              class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300"
            >
          </div>
          <div>
            <label class="block text-gray-400 text-sm mb-2"> Device Name </label>
            <input
              v-model="requestDeviceName"
              type="text"
              placeholder="e.g., My Laptop, iPhone 15"
              class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300"
            >
          </div>
          <div class="flex gap-2">
            <button
              :disabled="isRequesting"
              class="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 rounded-lg transition-colors"
              @click="requestDeviceAccess"
            >
              {{ isRequesting ? 'Submitting...' : 'Submit Request' }}
            </button>
            <button
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              @click="
                showRequestForm = false
                requestError = null
              "
            >
              Cancel
            </button>
          </div>
        </div>

        <div
          v-if="showTokenForm"
          class="space-y-4"
        >
          <div>
            <label class="block text-gray-400 text-sm mb-2"> Device Token </label>
            <input
              v-model="tokenInput"
              type="text"
              placeholder="Paste your device token here..."
              class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 font-mono text-sm"
            >
          </div>
          <div class="flex gap-2">
            <button
              class="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              @click="saveToken"
            >
              Save Token
            </button>
            <button
              class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              @click="
                showTokenForm = false
                tokenError = null
              "
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div
        v-else-if="deviceToken"
        class="bg-gray-800/50 border border-gray-700 rounded-lg p-3 flex items-center justify-between"
      >
        <div class="flex items-center gap-2 text-sm">
          <svg
            class="h-4 w-4 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="text-gray-400">Device registered:</span>
          <code class="text-green-400 font-mono text-xs">{{ deviceToken.slice(0, 12) }}...</code>
        </div>
        <button
          class="text-gray-500 hover:text-red-400 text-sm transition-colors"
          @click="clearToken"
        >
          Remove
        </button>
      </div>

      <div v-if="!uploadResult">
        <div class="bg-gray-800 rounded-lg p-6 space-y-6">
          <FileUploader
            :max-file-size="100 * 1024 * 1024"
            @upload="handleUpload"
            @error="handleUploadError"
            @encrypting="handleEncryptingProgress"
          />

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-400 text-sm mb-2">Expiration Time</label>
              <select
                v-model="selectedExpiration"
                class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300"
              >
                <option
                  v-for="opt in expirationOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-gray-400 text-sm mb-2">Download Limit</label>
              <select
                v-model="selectedDownloadLimit"
                class="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300"
              >
                <option
                  v-for="opt in downloadLimitOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="mt-6 text-center">
          <router-link
            to="/login"
            class="text-blue-400 hover:text-blue-300 text-sm"
          >
            Admin Login
          </router-link>
        </div>
      </div>

      <div
        v-else
        class="space-y-4"
      >
        <ShareableLink
          :file-id="uploadResult.fileId"
          :encryption-key="uploadResult.key"
        />

        <button
          class="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          @click="resetUpload"
        >
          Upload Another File
        </button>
      </div>

      <div class="text-center text-gray-500 text-xs">
        <p>Files are encrypted client-side with AES-GCM.</p>
        <p>Encryption keys are never stored on our servers.</p>
      </div>
    </div>
  </div>
</template>
