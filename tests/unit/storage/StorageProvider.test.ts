import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { StorageProvider } from '@/storage/StorageProvider.js'
import { FileSystemStorage } from '@/storage/FileSystemStorage.js'
import { MockStorage } from '@/storage/MockStorage.js'
import { mkdir, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir, homedir } from 'os'

describe('StorageProvider', () => {
  let testDir: string
  let provider: StorageProvider

  beforeEach(async () => {
    testDir = join(tmpdir(), `podcast-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
    provider = new StorageProvider({ type: 'filesystem', path: testDir })
  })

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error)
    }
  })

  it('should create filesystem storage by default', () => {
    const storage = provider.getStorage()
    expect(storage).toBeInstanceOf(FileSystemStorage)
  })

  it('should create filesystem storage with custom path', () => {
    const customPath = join(testDir, 'custom')
    const provider = new StorageProvider({ type: 'filesystem', path: customPath })
    const storage = provider.getStorage()
    expect(storage).toBeInstanceOf(FileSystemStorage)
  })

  it('should create mock storage when specified', () => {
    const provider = new StorageProvider({ type: 'mock' })
    const storage = provider.getStorage()
    expect(storage).toBeInstanceOf(MockStorage)
  })

  it('should reuse the same storage instance', () => {
    const storage1 = provider.getStorage()
    const storage2 = provider.getStorage()
    expect(storage1).toBe(storage2)
  })

  it('should throw error for unknown storage type', () => {
    // @ts-expect-error Testing invalid type
    expect(() => new StorageProvider({ type: 'unknown' })).toThrow('Unknown storage type')
  })

  it('should use default path for filesystem storage', () => {
    const provider = new StorageProvider({ type: 'filesystem' })
    const storage = provider.getStorage()
    expect(storage).toBeInstanceOf(FileSystemStorage)
  })

  describe('Configuration', () => {
    it('should allow runtime configuration changes', async () => {
      const storage1 = provider.getStorage()
      expect(storage1).toBeInstanceOf(FileSystemStorage)

      // Change to mock storage
      provider.configure({ type: 'mock' })
      const storage2 = provider.getStorage()
      expect(storage2).toBeInstanceOf(MockStorage)
      expect(storage2).not.toBe(storage1)
    })

    it('should clear cached storage on configuration change', () => {
      const storage1 = provider.getStorage()
      provider.configure({ type: 'mock' })
      const storage2 = provider.getStorage()
      expect(storage2).not.toBe(storage1)
    })
  })
}) 