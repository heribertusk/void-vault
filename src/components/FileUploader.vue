<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEncryption } from '@/composables/useEncryption'

const props = defineProps<{
  maxFileSize?: number
}>()

const emit = defineEmits<{
  upload: [data: { encryptedFile: File; key: string; iv: string; originalName: string; fileSize: number }]
  error: [message: string]
  encrypting: [progress: number]
}>()

const { encryptFile } = useEncryption()

const file = ref<File | null>(null)
const isEncrypting = ref(false)
const progress = ref(0)
const dragOver = ref(false)

const maxFileSizeBytes = computed(() => props.maxFileSize ?? 100 * 1024 * 1024)

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    validateAndSetFile(target.files[0])
  }
}

function handleDrop(event: DragEvent) {
  dragOver.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    validateAndSetFile(event.dataTransfer.files[0])
  }
}

function validateAndSetFile(selectedFile: File) {
  if (selectedFile.size > maxFileSizeBytes.value) {
    emit('error', `File size exceeds ${formatFileSize(maxFileSizeBytes.value)} limit`)
    return
  }
  file.value = selectedFile
}

async function handleEncrypt() {
  if (!file.value) return

  isEncrypting.value = true
  progress.value = 0
  emit('encrypting', 0)

  try {
    emit('encrypting', 20)
    progress.value = 30
    const encrypted = await encryptFile(file.value)
    emit('encrypting', 60)
    progress.value = 70

    const encryptedBlob = new Blob([encrypted.encryptedData], { type: 'application/octet-stream' })
    const encryptedFile = new File([encryptedBlob], `${file.value.name}.encrypted`, {
      type: 'application/octet-stream',
    })

    emit('encrypting', 90)
    progress.value = 90

    emit('upload', {
      encryptedFile,
      key: encrypted.key,
      iv: encrypted.iv,
      originalName: file.value.name,
      fileSize: file.value.size,
    })

    emit('encrypting', 100)
    progress.value = 100
  } catch (err) {
    emit('error', err instanceof Error ? err.message : 'Encryption failed')
  } finally {
    isEncrypting.value = false
    progress.value = 0
  }
}

function clearFile() {
  file.value = null
}
</script>

<template>
  <div class="w-full">
    <div
      class="border-2 border-dashed rounded-lg p-8 text-center transition-colors"
      :class="dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600'"
      @dragover.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
      @drop.prevent="handleDrop"
    >
      <div
        v-if="!file"
        class="space-y-4"
      >
        <div class="text-gray-400">
          <svg
            class="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <p class="text-gray-300">
          Drop your file here or
        </p>
        <label class="cursor-pointer">
          <span class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg inline-block transition-colors">
            Browse Files
          </span>
          <input
            type="file"
            class="hidden"
            @change="handleFileSelect"
          >
        </label>
        <p class="text-gray-500 text-sm">
          Max size: {{ formatFileSize(maxFileSizeBytes) }}
        </p>
      </div>

      <div
        v-else
        class="space-y-4"
      >
        <div class="flex items-center justify-center gap-2">
          <svg
            class="h-8 w-8 text-green-500"
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
          <span class="text-gray-200">{{ file.name }}</span>
        </div>
        <p class="text-gray-400 text-sm">
          {{ formatFileSize(file.size) }}
        </p>
        <div class="flex gap-2 justify-center">
          <button
            class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            :disabled="isEncrypting"
            @click="clearFile"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
            :disabled="isEncrypting"
            @click="handleEncrypt"
          >
            {{ isEncrypting ? 'Encrypting...' : 'Encrypt & Upload' }}
          </button>
        </div>
      </div>

      <div
        v-if="isEncrypting"
        class="mt-4"
      >
        <div class="w-full bg-gray-700 rounded-full h-2">
          <div
            class="bg-blue-500 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${progress}%` }"
          />
        </div>
        <p class="text-gray-400 text-sm mt-2">
          {{ progress }}%
        </p>
      </div>
    </div>
  </div>
</template>
