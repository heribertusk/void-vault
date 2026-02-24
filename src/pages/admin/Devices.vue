<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAdmin } from '@/composables/useAdmin'
import type { PendingDevice, TrustedDevice } from '@/types/device'

const {
  fetchPendingDevices,
  fetchTrustedDevices,
  approveDevice,
  rejectDevice,
  revokeDevice,
  loading,
  error,
} = useAdmin()

const pendingDevices = ref<PendingDevice[]>([])
const trustedDevices = ref<TrustedDevice[]>([])
const activeTab = ref<'pending' | 'active'>('pending')
const approvedDevice = ref<{ token: string; name: string } | null>(null)
const copySuccess = ref(false)

onMounted(async () => {
  pendingDevices.value = await fetchPendingDevices()
  trustedDevices.value = await fetchTrustedDevices()
})

async function handleApprove(deviceId: string) {
  const result = await approveDevice(deviceId)
  if (result.success) {
    pendingDevices.value = pendingDevices.value.filter(d => d.id !== deviceId)
    trustedDevices.value = await fetchTrustedDevices()
    if (result.deviceToken) {
      approvedDevice.value = { token: result.deviceToken, name: result.deviceName || 'Device' }
    }
  }
}

async function handleReject(deviceId: string) {
  const success = await rejectDevice(deviceId)
  if (success) {
    pendingDevices.value = pendingDevices.value.filter(d => d.id !== deviceId)
  }
}

async function handleRevoke(deviceId: string) {
  if (!confirm('Are you sure you want to revoke this device?')) return
  const success = await revokeDevice(deviceId)
  if (success) {
    trustedDevices.value = trustedDevices.value.filter(d => d.id !== deviceId)
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}

function copyToken() {
  if (approvedDevice.value) {
    navigator.clipboard.writeText(approvedDevice.value.token)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  }
}

function closeApprovedModal() {
  approvedDevice.value = null
}
</script>

<template>
  <AdminLayout>
    <div>
      <h1 class="text-3xl font-bold mb-8">
        Device Management
      </h1>

      <div
        v-if="error"
        class="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded mb-6"
      >
        {{ error }}
      </div>

      <div class="flex gap-4 mb-6">
        <button
          :class="[
            'px-4 py-2 rounded transition-colors',
            activeTab === 'pending'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
          ]"
          @click="activeTab = 'pending'"
        >
          Pending ({{ pendingDevices.length }})
        </button>
        <button
          :class="[
            'px-4 py-2 rounded transition-colors',
            activeTab === 'active'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600',
          ]"
          @click="activeTab = 'active'"
        >
          Active ({{ trustedDevices.length }})
        </button>
      </div>

      <div
        v-if="loading"
        class="text-gray-400"
      >
        Loading...
      </div>

      <div
        v-else-if="activeTab === 'pending'"
        class="space-y-4"
      >
        <div
          v-for="device in pendingDevices"
          :key="device.id"
          class="bg-gray-800 rounded-lg p-6 border border-gray-700"
        >
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-semibold text-lg">
                {{ device.device_name }}
              </h3>
              <p class="text-gray-400 text-sm mt-1">
                Fingerprint: {{ device.device_fingerprint.slice(0, 16) }}...
              </p>
              <p class="text-gray-400 text-sm">
                Requested: {{ formatDate(device.created_at) }}
              </p>
            </div>
            <div class="flex gap-2">
              <button
                class="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors"
                @click="handleApprove(device.id)"
              >
                Approve
              </button>
              <button
                class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition-colors"
                @click="handleReject(device.id)"
              >
                Reject
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="pendingDevices.length === 0"
          class="text-gray-400 text-center py-8"
        >
          No pending device requests
        </div>
      </div>

      <div
        v-else
        class="space-y-4"
      >
        <div
          v-for="device in trustedDevices"
          :key="device.id"
          class="bg-gray-800 rounded-lg p-6 border border-gray-700"
        >
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-semibold text-lg">
                {{ device.device_name }}
              </h3>
              <p class="text-gray-400 text-sm mt-1">
                Fingerprint: {{ device.device_fingerprint.slice(0, 16) }}...
              </p>
              <div class="flex gap-4 mt-2">
                <span
                  :class="device.status === 'active' ? 'text-green-400' : 'text-red-400'"
                  class="text-sm"
                >
                  {{ device.status }}
                </span>
                <span class="text-gray-400 text-sm">
                  Last used: {{ formatDate(device.last_used) }}
                </span>
              </div>
            </div>
            <button
              v-if="device.status === 'active'"
              class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition-colors"
              @click="handleRevoke(device.id)"
            >
              Revoke
            </button>
            <span
              v-else
              class="text-gray-500 text-sm"
            >Revoked</span>
          </div>
        </div>

        <div
          v-if="trustedDevices.length === 0"
          class="text-gray-400 text-center py-8"
        >
          No active devices
        </div>
      </div>
    </div>

    <div
      v-if="approvedDevice"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="closeApprovedModal"
    >
      <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
        <h2 class="text-xl font-bold mb-4 text-green-400">
          Device Approved
        </h2>
        <p class="text-gray-300 mb-2">
          <strong>{{ approvedDevice.name }}</strong> has been approved.
        </p>
        <p class="text-gray-400 text-sm mb-4">
          Share this token with the user (shown only once):
        </p>
        <div class="bg-gray-900 p-3 rounded font-mono text-sm break-all mb-4">
          {{ approvedDevice.token }}
        </div>
        <div class="flex gap-2">
          <button
            :class="[
              'flex-1 px-4 py-2 rounded transition-colors',
              copySuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
            ]"
            @click="copyToken"
          >
            {{ copySuccess ? 'Copied!' : 'Copy Token' }}
          </button>
          <button
            class="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition-colors"
            @click="closeApprovedModal"
          >
            Close
          </button>
        </div>
        <div
          v-if="copySuccess"
          class="mt-3 text-green-400 text-sm text-center"
        >
          Token copied to clipboard
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
