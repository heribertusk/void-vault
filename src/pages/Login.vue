<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { login } = useAuth()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true

  const result = await login({ email: email.value, password: password.value })

  loading.value = false

  if (result.ok) {
    router.push('/admin')
  } else {
    error.value = result.error || 'Login failed'
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
          Admin Login
        </p>
      </div>

      <form
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
            autocomplete="current-password"
            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="••••••••"
          >
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <p class="mt-6 text-center text-gray-400 text-sm">
        No account?
        <router-link
          to="/register"
          class="text-blue-400 hover:text-blue-300"
        >
          Register first admin
        </router-link>
      </p>
    </div>
  </div>
</template>
