<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAdmin } from '@/composables/useAdmin'
import type { User } from '@/types/auth'

const {
  fetchUsers,
  createUser,
  updateUser,
  loading,
  error,
} = useAdmin()

const users = ref<User[]>([])
const showCreateModal = ref(false)
const newEmail = ref('')
const newPassword = ref('')

onMounted(async () => {
  users.value = await fetchUsers()
})

async function handleCreateUser() {
  if (!newEmail.value || !newPassword.value) return
  
  const user = await createUser(newEmail.value, newPassword.value)
  if (user) {
    users.value.push(user)
    showCreateModal.value = false
    newEmail.value = ''
    newPassword.value = ''
  }
}

async function toggleUnlimitedUpload(user: User) {
  const updated = await updateUser(user.id, { unlimitedUpload: !user.unlimited_upload })
  if (updated) {
    const index = users.value.findIndex(u => u.id === user.id)
    if (index !== -1) {
      users.value[index] = updated
    }
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString()
}
</script>

<template>
  <AdminLayout>
    <div>
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">
          User Management
        </h1>
        <button
          class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
          @click="showCreateModal = true"
        >
          Create User
        </button>
      </div>

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
        class="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden"
      >
        <table class="w-full">
          <thead class="bg-gray-700">
            <tr>
              <th class="text-left px-6 py-3 text-sm font-medium text-gray-300">
                Email
              </th>
              <th class="text-left px-6 py-3 text-sm font-medium text-gray-300">
                Role
              </th>
              <th class="text-left px-6 py-3 text-sm font-medium text-gray-300">
                Unlimited Upload
              </th>
              <th class="text-left px-6 py-3 text-sm font-medium text-gray-300">
                Created
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr
              v-for="user in users"
              :key="user.id"
              class="hover:bg-gray-700/50"
            >
              <td class="px-6 py-4">
                {{ user.email }}
              </td>
              <td class="px-6 py-4">
                <span
                  :class="user.is_admin ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-600 text-gray-300'"
                  class="px-2 py-1 rounded text-sm"
                >
                  {{ user.is_admin ? 'Admin' : 'User' }}
                </span>
              </td>
              <td class="px-6 py-4">
                <button
                  :disabled="user.is_admin"
                  :class="[
                    'px-3 py-1 rounded text-sm transition-colors',
                    user.unlimited_upload
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-gray-600 text-gray-300',
                    user.is_admin ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80',
                  ]"
                  @click="toggleUnlimitedUpload(user)"
                >
                  {{ user.unlimited_upload ? 'Yes' : 'No' }}
                </button>
              </td>
              <td class="px-6 py-4 text-gray-400">
                {{ formatDate(user.created_at) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="showCreateModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="showCreateModal = false"
      >
        <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
          <h2 class="text-xl font-bold mb-4">
            Create New User
          </h2>
          <form @submit.prevent="handleCreateUser">
            <div class="mb-4">
              <label class="block text-sm text-gray-400 mb-2">Email</label>
              <input
                v-model="newEmail"
                type="email"
                required
                class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 focus:outline-none focus:border-blue-500"
              >
            </div>
            <div class="mb-6">
              <label class="block text-sm text-gray-400 mb-2">Password</label>
              <input
                v-model="newPassword"
                type="password"
                required
                class="w-full bg-gray-700 border border-gray-600 rounded px-4 py-2 focus:outline-none focus:border-blue-500"
              >
            </div>
            <div class="flex gap-3">
              <button
                type="submit"
                :disabled="loading"
                class="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors disabled:opacity-50"
              >
                Create
              </button>
              <button
                type="button"
                class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                @click="showCreateModal = false"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
