<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = defineProps<{
  fileId: string
  encryptionKey: string
}>()

const copied = ref(false)
const baseUrl = ref('')

onMounted(() => {
  baseUrl.value = window.location.origin
})

const shareableUrl = computed(() => {
  return `${baseUrl.value}/d/${props.fileId}#${props.encryptionKey}`
})

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(shareableUrl.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}
</script>

<template>
  <div class="bg-gray-800 rounded-lg p-6 space-y-4">
    <h3 class="text-lg font-semibold text-green-400 flex items-center gap-2">
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
          d="M5 13l4 4L19 7"
        />
      </svg>
      Upload Successful!
    </h3>

    <div class="space-y-2">
      <label class="text-gray-400 text-sm">Shareable Link</label>
      <div class="flex gap-2">
        <input
          type="text"
          :value="shareableUrl"
          readonly
          class="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono truncate"
        >
        <button
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
          @click="copyToClipboard"
        >
          <svg
            v-if="!copied"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <svg
            v-else
            class="h-4 w-4 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
      </div>
    </div>

    <div class="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
      <p class="text-yellow-400 text-sm">
        <strong>Important:</strong> The encryption key is embedded in the URL fragment. Share this link securely - anyone with this link can decrypt and download the file.
      </p>
    </div>

    <div class="text-gray-500 text-xs">
      <p>The encryption key never leaves your browser and is not stored on our servers.</p>
    </div>
  </div>
</template>
