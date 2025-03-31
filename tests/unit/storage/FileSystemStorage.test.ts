import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FileSystemStorage } from '@/storage/FileSystemStorage.js'
import { mkdir, rm, mkdtemp } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import type { Episode, Asset, ProjectConfig } from '@/storage/interfaces.js'

describe('FileSystemStorage', () => {
  let testDir: string
  let storage: FileSystemStorage
  let testConfig: ProjectConfig

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'podcast-collaborator-test-'))
    storage = new FileSystemStorage(testDir)
    testConfig = {
      name: 'Test Project',
      author: 'Test Author',
      email: 'test@example.com',
      description: 'Test Description',
      created: new Date(),
      updated: new Date()
    }
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
    let testEpisode: Episode

    beforeEach(async () => {
      await storage.initializeProject(testConfig)
      // Wait for initialization to complete
      const isInit = await storage.isInitialized()
      if (!isInit) {
        throw new Error('Failed to initialize project')
      }
      testEpisode = {
        id: 'test-episode-1',
        title: 'Test Episode',
        url: 'https://example.com/episode1',
        podcastName: 'Test Podcast',
        podcastAuthor: 'Test Author',
        description: 'Test description',
        publishDate: new Date(),
        duration: 3600,
        isStarred: false,
        isListened: false,
        progress: 0,
        notes: '',
        syncedAt: new Date(),
        isDownloaded: false,
        hasTranscript: false,
        lastListenedAt: undefined
      }
    })

    it('should create and get episode', async () => {
      await storage.saveEpisode(testEpisode)
      const episode = await storage.getEpisode(testEpisode.id)
      expect(episode).toEqual(testEpisode)
    })

    it('should list episodes', async () => {
      await storage.saveEpisode(testEpisode)
      const episodes = await storage.listEpisodes()
      expect(episodes).toHaveLength(1)
      expect(episodes[0]).toEqual(testEpisode)
    })

    it('should update episode', async () => {
      await storage.saveEpisode(testEpisode)
      const updatedEpisode = { ...testEpisode, title: 'Updated Title' }
      await storage.updateEpisode(testEpisode.id, { title: 'Updated Title' })
      const episode = await storage.getEpisode(testEpisode.id)
      expect(episode.title).toBe('Updated Title')
    })

    it('should delete episode', async () => {
      await storage.saveEpisode(testEpisode)
      await storage.deleteEpisode(testEpisode.id)
      await expect(storage.getEpisode(testEpisode.id)).rejects.toThrow('Episode not found')
    })
  })

  describe('Asset Storage', () => {
    let testEpisode: Episode
    const testAsset = {
      name: 'test-asset',
      type: 'audio/mp3',
      data: Buffer.from('test data'),
      downloadedAt: new Date()
    }

    beforeEach(async () => {
      await storage.initializeProject(testConfig)
      // Wait for initialization to complete
      const isInit = await storage.isInitialized()
      if (!isInit) {
        throw new Error('Failed to initialize project')
      }
      testEpisode = {
        id: 'test-episode-1',
        title: 'Test Episode',
        url: 'https://example.com/episode1',
        podcastName: 'Test Podcast',
        podcastAuthor: 'Test Author',
        description: 'Test description',
        publishDate: new Date(),
        duration: 3600,
        isStarred: false,
        isListened: false,
        progress: 0,
        notes: '',
        syncedAt: new Date(),
        isDownloaded: false,
        hasTranscript: false,
        lastListenedAt: undefined
      }
      await storage.saveEpisode(testEpisode)
    })

    it('should save and get asset', async () => {
      await storage.saveAsset(testEpisode.id, testAsset)
      const asset = await storage.getAsset(testEpisode.id, testAsset.name)
      expect(asset).toEqual(testAsset)
    })

    it('should list assets', async () => {
      await storage.saveAsset(testEpisode.id, testAsset)
      const assets = await storage.listAssets(testEpisode.id)
      expect(assets).toHaveLength(1)
      expect(assets[0]).toEqual(testAsset)
    })

    it('should delete asset', async () => {
      await storage.saveAsset(testEpisode.id, testAsset)
      await storage.deleteAsset(testEpisode.id, testAsset.name)
      await expect(storage.getAsset(testEpisode.id, testAsset.name)).rejects.toThrow('Asset not found')
    })

    it('should handle binary asset data', async () => {
      const binaryAsset = {
        ...testAsset,
        data: Buffer.from([0x00, 0x01, 0x02, 0x03])
      }
      await storage.saveAsset(testEpisode.id, binaryAsset)
      const asset = await storage.getAsset(testEpisode.id, binaryAsset.name)
      expect(asset.data).toEqual(binaryAsset.data)
    })

    it('should save and get asset for episode', async () => {
      await storage.saveAsset(testEpisode.id, testAsset)
      const asset = await storage.getAsset(testEpisode.id, testAsset.name)
      expect(asset).toEqual(testAsset)
    })
  })
})