import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types/auth'

const AUTH_TOKEN_KEY = 'void_vault_token'
const AUTH_USER_KEY = 'void_vault_user'

export const useAuthStore = defineStore('auth', () => {
  const storedToken = localStorage.getItem(AUTH_TOKEN_KEY)
  console.log('[authStore] Initializing. Token from localStorage:', storedToken ? 'exists' : 'null')
  console.log('[authStore] Token length:', storedToken?.length || 0)
  console.log('[authStore] Token first 10 chars:', storedToken?.substring(0, 10))
  
  const token = ref<string | null>(storedToken)
  const user = ref<User | null>(null)

  const storedUser = localStorage.getItem(AUTH_USER_KEY)
  if (storedUser) {
    try {
      user.value = JSON.parse(storedUser)
      console.log('[authStore] User loaded from localStorage:', user.value?.email)
    } catch {
      localStorage.removeItem(AUTH_USER_KEY)
    }
  }

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.is_admin ?? false)

  function setSession(newToken: string, newUser: User) {
    console.log('[authStore] setSession called with token length:', newToken.length)
    console.log('[authStore] Token first 10 chars:', newToken.substring(0, 10))
    console.log('[authStore] User email:', newUser.email)
    token.value = newToken
    user.value = newUser
    localStorage.setItem(AUTH_TOKEN_KEY, newToken)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser))
    console.log('[authStore] Session saved. Token in ref:', token.value?.substring(0, 10))
  }

  function clearSession() {
    token.value = null
    user.value = null
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
  }

  function updateUser(updatedUser: Partial<User>) {
    if (user.value) {
      user.value = { ...user.value, ...updatedUser }
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user.value))
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    setSession,
    clearSession,
    updateUser,
  }
})
