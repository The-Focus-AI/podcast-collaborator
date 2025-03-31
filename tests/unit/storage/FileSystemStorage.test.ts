import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FileSystemStorage } from '@/storage/FileSystemStorage.js'
import { mkdir, rm, mkdtemp } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import type { Episode, Asset } from '@/storage/interfaces.js'

describe('FileSystemStorage', () => {
  let testDir: string
  let storage: FileSystemStorage
  const testConfig = {
    name: 'Test Podcast',
    author: 'Test Author',
    email: 'test@example.com',
    description: 'A test podcast',
    created: new Date('2024-01-01'),
    updated: new Date('2024-01-01')
  }

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'podcast-test-'))
    storage = new FileSystemStorage(testDir)
  })

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error)
    }
  })

  describe('Project Storage', () => {
    it('should initialize project structure', async () => {
      await storage.initializeProject(testConfig)
      const isInit = await storage.isInitialized()
      expect(isInit).toBe(true)
    })

    it('should get project config', async () => {
      await storage.initializeProject(testConfig)
      const config = await storage.getProjectConfig()
      expect(config).toEqual(testConfig)
    })

    it('should update project config', async () => {
      await storage.initializeProject(testConfig)
      const updatedConfig = { ...testConfig, name: 'Updated Name' }
      await storage.updateProjectConfig(updatedConfig)
      const config = await storage.getProjectConfig()
      expect(config.name).toBe('Updated Name')
    })

    it('should throw if not initialized', async () => {
      await expect(storage.getProjectConfig()).rejects.toThrow('Project not initialized')
    })
  })

  describe('Episode Storage', () => {
    const testEpisode: Episode = {
      id: 'test-episode-1',
      title: 'Test Episode',
      number: 1,
      status: 'draft',
      created: new Date('2024-01-01'),
      updated: new Date('2024-01-01')
    }

    beforeEach(async () => {
      await storage.initializeProject(testConfig)
      // Wait for initialization to complete
      const isInit = await storage.isInitialized()
      if (!isInit) {
        throw new Error('Failed to initialize project')
      }
    })

    it('should create and get episode', async () => {
      await storage.createEpisode(testEpisode)
      const episode = await storage.getEpisode(testEpisode.id)
      expect(episode).toEqual(testEpisode)
    })

    it('should list episodes', async () => {
      await storage.createEpisode(testEpisode)
      const episodes = await storage.listEpisodes()
      expect(episodes).toHaveLength(1)
      expect(episodes[0]).toEqual(testEpisode)
    })

    it('should update episode', async () => {
      await storage.createEpisode(testEpisode)
      const updatedEpisode = { ...testEpisode, title: 'Updated Title' }
      await storage.updateEpisode(testEpisode.id, { title: 'Updated Title' })
      const episode = await storage.getEpisode(testEpisode.id)
      expect(episode.title).toBe('Updated Title')
    })

    it('should delete episode', async () => {
      await storage.createEpisode(testEpisode)
      await storage.deleteEpisode(testEpisode.id)
      await expect(storage.getEpisode(testEpisode.id)).rejects.toThrow('Episode not found')
    })
  })

  describe('Asset Storage', () => {
    const testEpisode: Episode = {
      id: 'test-episode-1',
      title: 'Test Episode',
      number: 1,
      status: 'draft',
      created: new Date('2024-01-01'),
      updated: new Date('2024-01-01')
    }

    const testAsset: Asset = {
      id: 'test-asset-1',
      episodeId: testEpisode.id,
      type: 'audio',
      name: 'Test Audio',
      data: Buffer.from('test asset data'),
      created: new Date('2024-01-01'),
      updated: new Date('2024-01-01')
    }

    beforeEach(async () => {
      await storage.initializeProject(testConfig)
      // Wait for initialization to complete
      const isInit = await storage.isInitialized()
      if (!isInit) {
        throw new Error('Failed to initialize project')
      }
      await storage.createEpisode(testEpisode)
    })

    it('should save and get asset', async () => {
      await storage.saveAsset(testAsset)
      const asset = await storage.getAsset(testEpisode.id, testAsset.id)
      expect(asset).toEqual(testAsset)
    })

    it('should list assets', async () => {
      await storage.saveAsset(testAsset)
      const assets = await storage.listAssets(testEpisode.id)
      expect(assets).toHaveLength(1)
      expect(assets[0]).toEqual(testAsset)
    })

    it('should delete asset', async () => {
      await storage.saveAsset(testAsset)
      await storage.deleteAsset(testEpisode.id, testAsset.id)
      await expect(storage.getAsset(testEpisode.id, testAsset.id)).rejects.toThrow('Asset not found')
    })

    it('should handle binary asset data', async () => {
      const binaryAsset = {
        ...testAsset,
        data: Buffer.from([0x00, 0x01, 0x02, 0x03])
      }
      await storage.saveAsset(binaryAsset)
      const asset = await storage.getAsset(testEpisode.id, testAsset.id)
      expect(Buffer.compare(asset.data, binaryAsset.data)).toBe(0)
    })
  })
})