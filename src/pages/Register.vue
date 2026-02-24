<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { register, checkAuth } = useAuth()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)
const hasUsers = ref(true)

onMounted(async () => {
  const isAuth = await checkAuth()
  if (isAuth) {
    router.push('/admin')
    return
  }

  try {
    const response = await fetch('/api/v1/auth/check-users')
    if (!response.ok) {
      throw new Error('Failed to check users')
    }
    const data = (await response.json()) as { hasUsers: boolean }
    hasUsers.value = data.hasUsers
  } catch (err) {
    console.error('Error checking users:', err)
    hasUsers.value = false
  }
})

async function handleSubmit() {
  error.value = ''

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }

  loading.value = true

  const result = await register({ email: email.value, password: password.value })

  loading.value = false

  if (result.ok) {
    router.push('/admin')
  } else {
    error.value = result.error || 'Registration failed'
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900 px-4">
    <div class="max-w-md w-full">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-white">
          VoidVault
        </h1>
        <p class="text-gray-400 mt-2">
          Create Admin Account
        </p>
      </div>

      <div
        v-if="hasUsers"
        class="bg-yellow-900/50 border border-yellow-500 text-yellow-200 px-4 py-3 rounded mb-6"
      >
        An admin account already exists. Please
        <router-link
          to="/login"
          class="underline"
        >
          login
        </router-link>
        instead.
      </div>

      <form
        v-else
        class="space-y-6"
        @submit.prevent="handleSubmit"
      >
        <div
          v-if="error"
          class="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded"
        >
          {{ error }}
        </div>

        <div>
          <label
            for="email"
            class="block text-sm font-medium text-gray-300 mb-2"
          >
            Email
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="admin@example.com"
          >
        </div>

        <div>
          <label
            for="password"
            class="block text-sm font-medium text-gray-300 mb-2"
          >
            Password
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            autocomplete="new-password"
            minlength="8"
            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="••••••••"
          >
          <p class="mt-1 text-xs text-gray-500">
            Minimum 8 characters
          </p>
        </div>

        <div>
          <label
            for="confirmPassword"
            class="block text-sm font-medium text-gray-300 mb-2"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            required
            autocomplete="new-password"
            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="••••••••"
          >
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {{ loading ? 'Creating Account...' : 'Create Admin Account' }}
        </button>
      </form>

      <p class="mt-6 text-center text-gray-400 text-sm">
        Already have an account?
        <router-link
          to="/login"
          class="text-blue-400 hover:text-blue-300"
        >
          Sign in
        </router-link>
      </p>
    </div>
  </div>
</template>
