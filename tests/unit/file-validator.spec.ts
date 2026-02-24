import { describe, it, expect } from 'vitest'
import {
  validateFileSize,
  validateFileExtension,
  validateExpiration,
  validateDownloadLimit,
  calculateExpiresAt,
} from '@/utils/file-validator'

describe('file-validator utilities', () => {
  describe('validateFileSize', () => {
    it('should reject empty files', () => {
      const result = validateFileSize(0)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('File is empty')
    })

    it('should reject negative file sizes', () => {
      const result = validateFileSize(-100)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('File is empty')
    })

    it('should accept files under the limit', () => {
      const result = validateFileSize(104857600) // 100MB
      expect(result.valid).toBe(true)
    })

    it('should reject files over the limit', () => {
      const result = validateFileSize(104857601) // 100MB + 1 byte
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds')
    })

    it('should accept small files', () => {
      const result = validateFileSize(1024) // 1KB
      expect(result.valid).toBe(true)
    })

    it('should use custom max size', () => {
      const result = validateFileSize(2048, 1024)
      expect(result.valid).toBe(false)
    })
  })

  describe('validateFileExtension', () => {
    const allowedExtensions = new Set(['.pdf', '.doc', '.docx', '.jpg', '.png', '.apk'])

    it('should accept allowed extensions', () => {
      const result = validateFileExtension('document.pdf', allowedExtensions)
      expect(result.valid).toBe(true)
    })

    it('should reject files without extension', () => {
      const result = validateFileExtension('document', allowedExtensions)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('File must have an extension')
    })

    it('should reject disallowed extensions', () => {
      const result = validateFileExtension('virus.exe', allowedExtensions)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not allowed')
    })

    it('should be case-insensitive', () => {
      const result = validateFileExtension('PHOTO.JPG', allowedExtensions)
      expect(result.valid).toBe(true)
    })

    it('should handle multiple dots in filename', () => {
      const result = validateFileExtension('my.document.final.pdf', allowedExtensions)
      expect(result.valid).toBe(true)
    })
  })

  describe('validateExpiration', () => {
    it('should accept 1 hour', () => {
      const result = validateExpiration(1)
      expect(result.valid).toBe(true)
    })

    it('should accept 6 hours', () => {
      const result = validateExpiration(6)
      expect(result.valid).toBe(true)
    })

    it('should accept 24 hours', () => {
      const result = validateExpiration(24)
      expect(result.valid).toBe(true)
    })

    it('should accept 168 hours (7 days)', () => {
      const result = validateExpiration(168)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid values', () => {
      const result = validateExpiration(12)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid expiration time')
    })

    it('should reject zero', () => {
      const result = validateExpiration(0)
      expect(result.valid).toBe(false)
    })

    it('should reject negative values', () => {
      const result = validateExpiration(-1)
      expect(result.valid).toBe(false)
    })
  })

  describe('validateDownloadLimit', () => {
    it('should accept 0 (unlimited)', () => {
      const result = validateDownloadLimit(0)
      expect(result.valid).toBe(true)
    })

    it('should accept 1', () => {
      const result = validateDownloadLimit(1)
      expect(result.valid).toBe(true)
    })

    it('should accept 3', () => {
      const result = validateDownloadLimit(3)
      expect(result.valid).toBe(true)
    })

    it('should accept 5', () => {
      const result = validateDownloadLimit(5)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid values', () => {
      const result = validateDownloadLimit(2)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid download limit')
    })

    it('should reject negative values', () => {
      const result = validateDownloadLimit(-1)
      expect(result.valid).toBe(false)
    })
  })

  describe('calculateExpiresAt', () => {
    it('should return a valid ISO date string', () => {
      const result = calculateExpiresAt(1)
      expect(typeof result).toBe('string')
      expect(new Date(result).toISOString()).toBe(result)
    })

    it('should add hours correctly', () => {
      const hours = 24
      const result = calculateExpiresAt(hours)
      const expiresAt = new Date(result)
      const now = new Date()
      const diffHours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)
      expect(Math.round(diffHours)).toBe(hours)
    })
  })
})
