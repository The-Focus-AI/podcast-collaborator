import { describe, it, expect, beforeEach } from 'vitest'
import { MockStorage } from '@/storage/MockStorage.js'
import type { ProjectConfig, Episode, Asset } from '@/storage/interfaces.js'

describe('MockStorage', () => {
  let storage: MockStorage

  beforeEach(() => {
    storage = new MockStorage()
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
    const testEpisode: Episode = {
      id: '123',
      title: 'Test Episode',
      number: 1,
      status: 'draft',
      created: new Date(),
      updated: new Date()
    }

    beforeEach(async () => {
      await storage.initializeProject({
        name: 'Test',
        author: 'Test',
        email: 'test@example.com',
        created: new Date(),
        updated: new Date()
      })
    })

    it('should create and get episode', async () => {
      await storage.createEpisode(testEpisode)
      await expect(storage.getEpisode(testEpisode.id)).resolves.toEqual(testEpisode)
    })

    it('should list episodes', async () => {
      await storage.createEpisode(testEpisode)
      const episodes = await storage.listEpisodes()
      expect(episodes).toHaveLength(1)
      expect(episodes[0]).toEqual(testEpisode)
    })

    it('should update episode', async () => {
      await storage.createEpisode(testEpisode)
      const update = { title: 'Updated Title' }
      await storage.updateEpisode(testEpisode.id, update)
      const episode = await storage.getEpisode(testEpisode.id)
      expect(episode.title).toBe(update.title)
      expect(episode.number).toBe(testEpisode.number)
    })

    it('should delete episode', async () => {
      await storage.createEpisode(testEpisode)
      await storage.deleteEpisode(testEpisode.id)
      await expect(storage.getEpisode(testEpisode.id)).rejects.toThrow('Episode not found')
    })
  })

  describe('Asset Storage', () => {
    const testAsset: Asset = {
      id: '123',
      episodeId: '456',
      type: 'audio',
      name: 'test.mp3',
      path: '/path/to/test.mp3',
      mimeType: 'audio/mpeg',
      size: 1024,
      created: new Date()
    }

    beforeEach(async () => {
      await storage.initializeProject({
        name: 'Test',
        author: 'Test',
        email: 'test@example.com',
        created: new Date(),
        updated: new Date()
      })
    })

    it('should save and get asset', async () => {
      await storage.saveAsset(testAsset)
      await expect(storage.getAsset(testAsset.episodeId, testAsset.id)).resolves.toEqual(testAsset)
    })

    it('should list assets', async () => {
      await storage.saveAsset(testAsset)
      const assets = await storage.listAssets(testAsset.episodeId)
      expect(assets).toHaveLength(1)
      expect(assets[0]).toEqual(testAsset)
    })

    it('should delete asset', async () => {
      await storage.saveAsset(testAsset)
      await storage.deleteAsset(testAsset.episodeId, testAsset.id)
      await expect(storage.getAsset(testAsset.episodeId, testAsset.id)).rejects.toThrow('Asset not found')
    })
  })
}) 