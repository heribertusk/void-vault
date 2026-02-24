import { describe, it, expect, vi } from 'vitest'
import { checkRateLimit, recordUpload, cleanupOldUploadLogs } from '@/utils/rate-limiter'
import type { TrustedDevice } from '@/types/device'

vi.mock('@/utils/rate-limiter', async () => {
  const actual = await vi.importActual('@/utils/rate-limiter')
  return {
    ...actual,
    checkRateLimit: vi.fn(),
    recordUpload: vi.fn(),
    cleanupOldUploadLogs: vi.fn(),
  }
})

describe('rate-limiter utilities', () => {
  const mockDevice: TrustedDevice = {
    id: 'device-123',
    userId: 'user-123',
    deviceName: 'Test Device',
    tokenHash: 'hash123',
    deviceFingerprint: 'fingerprint123',
    status: 'active',
    lastUsed: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }

  describe('checkRateLimit', () => {
    it('should allow upload for unlimited users', async () => {
      const mockEnv = { DB: {} as D1Database }
      const result = await checkRateLimit(mockEnv, mockDevice, true)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(-1)
    })

    it('should check rate limit for regular users', async () => {
      const mockEnv = { DB: {} as D1Database }
      const result = await checkRateLimit(mockEnv, mockDevice, false)
      expect(typeof result.allowed).toBe('boolean')
      expect(typeof result.remaining).toBe('number')
      expect(typeof result.resetAt).toBe('string')
    })
  })

  describe('recordUpload', () => {
    it('should be callable with valid parameters', async () => {
      const mockEnv = { DB: {} as D1Database }
      await expect(recordUpload(mockEnv, 'device-123')).resolves.not.toThrow()
    })
  })

  describe('cleanupOldUploadLogs', () => {
    it('should be callable', async () => {
      const mockEnv = { DB: {} as D1Database }
      await expect(cleanupOldUploadLogs(mockEnv)).resolves.not.toThrow()
    })
  })
})
