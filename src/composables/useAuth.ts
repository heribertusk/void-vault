import { useAuthStore } from '@/stores/auth'
import type { LoginRequest, RegisterRequest } from '@/types/auth'

const API_BASE = '/api/v1'

interface ApiResponse<T> {
  ok: boolean
  data?: T
  error?: string
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const authStore = useAuthStore()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (authStore.token) {
    headers['Authorization'] = `Bearer ${authStore.token}`
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })

    const data = (await response.json()) as T & { error?: string }

    if (!response.ok) {
      const errorMsg = typeof data.error === 'object' && data.error !== null
        ? (data.error as { message?: string }).message || 'Request failed'
        : String(data.error) || 'Request failed'
      return { ok: false, error: errorMsg }
    }

    return { ok: true, data }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

export function useAuth() {
  const authStore = useAuthStore()

  async function checkAuth(): Promise<boolean> {
    if (!authStore.token) return false

    const response = await apiRequest<{ user: typeof authStore.user }>('/auth/me')
    if (response.ok && response.data?.user) {
      authStore.updateUser(response.data.user)
      return true
    }

    authStore.clearSession()
    return false
  }

  async function login(credentials: LoginRequest): Promise<{ ok: boolean; error?: string }> {
    const response = await apiRequest<{ token: string; user: typeof authStore.user }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      }
    )

    if (response.ok && response.data) {
      authStore.setSession(response.data.token, response.data.user!)
      return { ok: true }
    }

    return { ok: false, error: response.error }
  }

  async function register(credentials: RegisterRequest): Promise<{ ok: boolean; error?: string }> {
    const response = await apiRequest<{ token: string; user: typeof authStore.user }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      }
    )

    if (response.ok && response.data) {
      authStore.setSession(response.data.token, response.data.user!)
      return { ok: true }
    }

    return { ok: false, error: response.error }
  }

  async function logout(): Promise<void> {
    await apiRequest('/auth/logout', { method: 'POST' })
    authStore.clearSession()
  }

  return {
    isAuthenticated: authStore.isAuthenticated,
    isAdmin: authStore.isAdmin,
    user: authStore.user,
    token: authStore.token,
    checkAuth,
    login,
    register,
    logout,
  }
}
