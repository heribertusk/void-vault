<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAdmin } from '@/composables/useAdmin'

const { fetchDashboardStats, loading, error } = useAdmin()

const stats = ref({
  totalUsers: 0,
  totalDevices: 0,
  pendingDevices: 0,
  totalFiles: 0,
})

onMounted(async () => {
  stats.value = await fetchDashboardStats()
})
</script>

<template>
  <AdminLayout>
    <div>
      <h1 class="text-3xl font-bold mb-8">
        Dashboard
      </h1>

      <div
        v-if="error"
        class="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded mb-6"
      >
        {{ error }}
      </div>

      <div
        v-if="loading"
        class="text-gray-400"
      >
        Loading...
      </div>

      <div
        v-else
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="text-gray-400 text-sm mb-2">
            Total Users
          </div>
          <div class="text-3xl font-bold">
            {{ stats.totalUsers }}
          </div>
        </div>
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="text-gray-400 text-sm mb-2">
            Active Devices
          </div>
          <div class="text-3xl font-bold">
            {{ stats.totalDevices }}
          </div>
        </div>
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="text-gray-400 text-sm mb-2">
            Pending Devices
          </div>
          <div class="text-3xl font-bold text-yellow-400">
            {{ stats.pendingDevices }}
          </div>
        </div>
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="text-gray-400 text-sm mb-2">
            Total Files
          </div>
          <div class="text-3xl font-bold">
            {{ stats.totalFiles }}
          </div>
        </div>
      </div>

      <div class="mt-8">
        <h2 class="text-xl font-semibold mb-4">
          Quick Actions
        </h2>
        <div class="flex gap-4">
          <router-link
            to="/admin/users"
            class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
          >
            Manage Users
          </router-link>
          <router-link
            to="/admin/devices"
            class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded transition-colors"
          >
            Manage Devices
          </router-link>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
