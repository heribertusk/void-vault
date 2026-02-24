<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: 'home' },
  { path: '/admin/users', label: 'Users', icon: 'users' },
  { path: '/admin/devices', label: 'Devices', icon: 'device' },
]

async function handleLogout() {
  authStore.clearSession()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-900 flex">
    <aside class="w-64 bg-gray-800 border-r border-gray-700">
      <div class="p-6">
        <h1 class="text-xl font-bold text-white">
          VoidVault Admin
        </h1>
      </div>
      <nav class="mt-4">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          active-class="bg-gray-700 text-white border-l-4 border-blue-500"
        >
          {{ item.label }}
        </router-link>
      </nav>
      <div class="absolute bottom-0 w-64 p-6 border-t border-gray-700">
        <div class="text-sm text-gray-400 mb-2">
          {{ authStore.user?.email }}
        </div>
        <button
          class="text-sm text-red-400 hover:text-red-300"
          @click="handleLogout"
        >
          Logout
        </button>
      </div>
    </aside>
    <main class="flex-1 p-8 overflow-auto">
      <slot />
    </main>
  </div>
</template>
