import { describe, it, expect } from 'vitest'
import {
  generateId,
  generateSalt,
  generateToken,
  hashPassword,
  verifyPassword,
  hashToken,
  generateDeviceToken,
} from '@/utils/crypto'

describe('crypto utilities', () => {
  describe('generateId', () => {
    it('should generate a 32-character hex string', async () => {
      const id = await generateId()
      expect(id).toHaveLength(32)
      expect(/^[0-9a-f]+$/.test(id)).toBe(true)
    })

    it('should generate unique IDs', async () => {
      const id1 = await generateId()
      const id2 = await generateId()
      expect(id1).not.toBe(id2)
    })
  })

  describe('generateSalt', () => {
    it('should generate a 32-character hex string', async () => {
      const salt = await generateSalt()
      expect(salt).toHaveLength(32)
      expect(/^[0-9a-f]+$/.test(salt)).toBe(true)
    })

    it('should generate unique salts', async () => {
      const salt1 = await generateSalt()
      const salt2 = await generateSalt()
      expect(salt1).not.toBe(salt2)
    })
  })

  describe('generateToken', () => {
    it('should generate a token with default length of 32 bytes (64 hex chars)', async () => {
      const token = await generateToken()
      expect(token).toHaveLength(64)
      expect(/^[0-9a-f]+$/.test(token)).toBe(true)
    })

    it('should generate a token with custom length', async () => {
      const token = await generateToken(16)
      expect(token).toHaveLength(32)
    })

    it('should generate unique tokens', async () => {
      const token1 = await generateToken()
      const token2 = await generateToken()
      expect(token1).not.toBe(token2)
    })
  })

  describe('hashPassword', () => {
    it('should generate a 64-character hash', async () => {
      const salt = await generateSalt()
      const hash = await hashPassword('password123', salt)
      expect(hash).toHaveLength(64)
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true)
    })

    it('should generate the same hash for same password and salt', async () => {
      const salt = await generateSalt()
      const hash1 = await hashPassword('password123', salt)
      const hash2 = await hashPassword('password123', salt)
      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different passwords', async () => {
      const salt = await generateSalt()
      const hash1 = await hashPassword('password123', salt)
      const hash2 = await hashPassword('password456', salt)
      expect(hash1).not.toBe(hash2)
    })

    it('should generate different hashes for different salts', async () => {
      const salt1 = await generateSalt()
      const salt2 = await generateSalt()
      const hash1 = await hashPassword('password123', salt1)
      const hash2 = await hashPassword('password123', salt2)
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const salt = await generateSalt()
      const hash = await hashPassword('password123', salt)
      const result = await verifyPassword('password123', salt, hash)
      expect(result).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      const salt = await generateSalt()
      const hash = await hashPassword('password123', salt)
      const result = await verifyPassword('wrongpassword', salt, hash)
      expect(result).toBe(false)
    })
  })

  describe('hashToken', () => {
    it('should generate a 64-character SHA-256 hash', async () => {
      const hash = await hashToken('sometoken')
      expect(hash).toHaveLength(64)
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true)
    })

    it('should generate the same hash for same token', async () => {
      const hash1 = await hashToken('sometoken')
      const hash2 = await hashToken('sometoken')
      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different tokens', async () => {
      const hash1 = await hashToken('token1')
      const hash2 = await hashToken('token2')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('generateDeviceToken', () => {
    it('should generate token and its hash', async () => {
      const result = await generateDeviceToken()
      expect(result.token).toBeDefined()
      expect(result.tokenHash).toBeDefined()
      expect(result.token).toHaveLength(64)
      expect(result.tokenHash).toHaveLength(64)
    })

    it('should generate hash that matches the token', async () => {
      const result = await generateDeviceToken()
      const expectedHash = await hashToken(result.token)
      expect(result.tokenHash).toBe(expectedHash)
    })
  })
})
