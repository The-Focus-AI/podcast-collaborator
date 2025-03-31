import { describe, it, expect, beforeEach } from 'vitest'
import { MockStorage } from '@/storage/MockStorage.js'
import type { ProjectConfig, Episode, Asset } from '@/storage/interfaces.js'

describe('MockStorage', () => {
  let storage: MockStorage
  let testConfig: ProjectConfig
  let testEpisode: Episode
  let testAsset: Asset

  beforeEach(() => {
    storage = new MockStorage()
    testConfig = {
      name: 'Test Podcast',
      author: 'Test Author',
      email: 'test@example.com',
      description: 'A test podcast',
      created: new Date('2024-01-01'),
      updated: new Date('2024-01-01')
    }
  })

  describe('Project Storage', () => {
    const testConfig: ProjectConfig = {
      name: 'Test Podcast',
      author: 'Test Author',
      email: 'test@example.com',
      created: new Date(),
      updated: new Date()
    }

    it('should initialize project', async () => {
      await expect(storage.isInitialized()).resolves.toBe(false)
      await storage.initializeProject(testConfig)
      await expect(storage.isInitialized()).resolves.toBe(true)
    })

    it('should get project config', async () => {
      await storage.initializeProject(testConfig)
      await expect(storage.getProjectConfig()).resolves.toEqual(testConfig)
    })

    it('should update project config', async () => {
      await storage.initializeProject(testConfig)
      const update = { name: 'Updated Name' }
      await storage.updateProjectConfig(update)
      const config = await storage.getProjectConfig()
      expect(config.name).toBe(update.name)
      expect(config.author).toBe(testConfig.author)
    })

    it('should throw if not initialized', async () => {
      await expect(storage.getProjectConfig()).rejects.toThrow('Project not initialized')
    })
  })

  describe('Episode Storage', () => {
    beforeEach(async () => {
      await storage.initializeProject(testConfig)
      testEpisode = {
        id: 'test-episode-1',
        title: 'Test Episode',
        url: 'https://example.com/episode1',
        podcastName: 'Test Podcast',
        podcastAuthor: 'Test Author',
        isStarred: false,
        isListened: false,
        syncedAt: new Date()
      }
    })

    it('should create and get episode', async () => {
      await storage.saveEpisode(testEpisode)
      await expect(storage.getEpisode(testEpisode.id)).resolves.toEqual(testEpisode)
    })

    it('should list episodes', async () => {
      await storage.saveEpisode(testEpisode)
      const episodes = await storage.listEpisodes()
      expect(episodes).toHaveLength(1)
      expect(episodes[0]).toEqual(testEpisode)
    })

    it('should update episode', async () => {
      await storage.saveEpisode(testEpisode)
      const update = { title: 'Updated Title' }
      await storage.updateEpisode(testEpisode.id, update)
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
    beforeEach(async () => {
      await storage.initializeProject(testConfig)
      testAsset = {
        type: 'audio',
        name: 'test-asset',
        data: Buffer.from('test data'),
        downloadedAt: new Date()
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
  })
}) 