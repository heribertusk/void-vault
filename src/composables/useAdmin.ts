import { ref, type Ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { PendingDevice, TrustedDevice } from '@/types/device'

export interface User {
  id: string
  email: string
  is_admin: boolean
  unlimited_upload: boolean
  created_at: string
}

interface ApiResponse<T> {
  ok: boolean
  data?: T
  error?: string
}

interface UsersResponse {
  users: User[]
}

interface PendingDevicesResponse {
  devices: PendingDevice[]
}

interface TrustedDevicesResponse {
  devices: TrustedDevice[]
}

interface DashboardStats {
  totalUsers: number
  totalDevices: number
  pendingDevices: number
  totalFiles: number
}

const API_BASE = '/api/v1'

async function fetchApi<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const authStore = useAuthStore()
  const token = authStore.token
  console.log('[useAdmin] Fetching:', url, 'Token exists:', !!token, 'Token length:', token?.length)
  console.log('[useAdmin] Token first 10 chars:', token?.substring(0, 10))
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...options?.headers,
    },
  })
  const data = (await response.json()) as T
  console.log('[useAdmin] Response status:', response.status, 'ok:', response.ok)
  return { ok: response.ok, data, error: response.ok ? undefined : (data as { error?: string }).error }
}

export function useAdmin() {
  const loading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)

  async function fetchUsers(): Promise<User[]> {
    loading.value = true
    error.value = null
    const result = await fetchApi<UsersResponse>(`${API_BASE}/users`)
    loading.value = false
    if (!result.ok || !result.data) {
      error.value = result.error || 'Failed to fetch users'
      return []
    }
    return result.data.users
  }

  async function createUser(email: string, password: string): Promise<User | null> {
    loading.value = true
    error.value = null
    const result = await fetchApi<User>(`${API_BASE}/users`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    loading.value = false
    if (!result.ok) {
      error.value = result.error || 'Failed to create user'
      return null
    }
    return result.data ?? null
  }

  async function updateUser(userId: string, data: { unlimitedUpload?: boolean }): Promise<User | null> {
    loading.value = true
    error.value = null
    const result = await fetchApi<User>(`${API_BASE}/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    loading.value = false
    if (!result.ok) {
      error.value = result.error || 'Failed to update user'
      return null
    }
    return result.data ?? null
  }

  async function fetchPendingDevices(): Promise<PendingDevice[]> {
    loading.value = true
    error.value = null
    const result = await fetchApi<PendingDevicesResponse>(`${API_BASE}/devices/pending`)
    loading.value = false
    if (!result.ok || !result.data) {
      error.value = result.error || 'Failed to fetch pending devices'
      return []
    }
    return result.data.devices
  }

  async function fetchTrustedDevices(): Promise<TrustedDevice[]> {
    loading.value = true
    error.value = null
    const result = await fetchApi<TrustedDevicesResponse>(`${API_BASE}/devices`)
    loading.value = false
    if (!result.ok || !result.data) {
      error.value = result.error || 'Failed to fetch devices'
      return []
    }
    return result.data.devices
  }

  async function approveDevice(deviceId: string): Promise<{ success: boolean; deviceToken?: string; deviceName?: string }> {
    loading.value = true
    error.value = null
    const result = await fetchApi<{ device_token?: string; device_name?: string }>(`${API_BASE}/devices/${deviceId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved: true }),
    })
    loading.value = false
    if (!result.ok) {
      error.value = result.error || 'Failed to approve device'
      return { success: false }
    }
    return { success: true, deviceToken: result.data?.device_token, deviceName: result.data?.device_name }
  }

  async function rejectDevice(deviceId: string): Promise<boolean> {
    loading.value = true
    error.value = null
    const result = await fetchApi<void>(`${API_BASE}/devices/${deviceId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved: false }),
    })
    loading.value = false
    if (!result.ok) {
      error.value = result.error || 'Failed to reject device'
      return false
    }
    return true
  }

  async function revokeDevice(deviceId: string): Promise<boolean> {
    loading.value = true
    error.value = null
    const result = await fetchApi<void>(`${API_BASE}/devices?device_id=${deviceId}`, {
      method: 'DELETE',
    })
    loading.value = false
    if (!result.ok) {
      error.value = result.error || 'Failed to revoke device'
      return false
    }
    return true
  }

  async function fetchDashboardStats(): Promise<DashboardStats> {
    loading.value = true
    error.value = null
    const [usersRes, devicesRes, pendingRes] = await Promise.all([
      fetchApi<UsersResponse>(`${API_BASE}/users`),
      fetchApi<TrustedDevicesResponse>(`${API_BASE}/devices`),
      fetchApi<PendingDevicesResponse>(`${API_BASE}/devices/pending`),
    ])
    loading.value = false

    const stats: DashboardStats = {
      totalUsers: usersRes.data?.users?.length ?? 0,
      totalDevices: devicesRes.data?.devices?.length ?? 0,
      pendingDevices: pendingRes.data?.devices?.length ?? 0,
      totalFiles: 0,
    }

    return stats
  }

  return {
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    fetchPendingDevices,
    fetchTrustedDevices,
    approveDevice,
    rejectDevice,
    revokeDevice,
    fetchDashboardStats,
  }
}
