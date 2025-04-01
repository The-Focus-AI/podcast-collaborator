import { describe, it, expect } from 'vitest'
import { StorageProvider } from '@/storage/StorageProvider.js'
import { PocketCastsServiceImpl } from '@/services/PocketCastsService.js'
import { OnePasswordService } from '@/services/OnePasswordService.js'
import { EpisodeServiceImpl } from '@/services/EpisodeService.js'

describe('BrowseCommand Integration', () => {
  it('should load and process real episodes', async () => {
    // Use real services
    const storageProvider = new StorageProvider()
    const onePasswordService = new OnePasswordService()
    const pocketCastsService = new PocketCastsServiceImpl(onePasswordService)
    
    // First sync some real data
    await storageProvider.initialize()
    await pocketCastsService.login()
    
    const starredEpisodes = await pocketCastsService.getStarredEpisodes()
    const listenedEpisodes = await pocketCastsService.getListenedEpisodes()
    
    const storage = storageProvider.getStorage()
    await storage.saveRawData('starred', starredEpisodes)
    await storage.saveRawData('listened', listenedEpisodes)

    // Create episode service (what browse command uses)
    const episodeService = new EpisodeServiceImpl(storageProvider, pocketCastsService)
    const episodes = await episodeService.listEpisodes()
    
    // Real assertions that matter
    expect(episodes.length).toBeGreaterThan(0)
    
    // Test episode format
    const episode = episodes[0]
    expect(episode).toHaveProperty('id')
    expect(episode).toHaveProperty('title')
    expect(episode).toHaveProperty('podcastName')
    expect(episode).toHaveProperty('duration')
    expect(episode).toHaveProperty('isStarred')
    expect(episode).toHaveProperty('isListened')
    
    // Test show notes loading - should work even if notes aren't available
    const withNotes = await episodeService.loadShowNotes(episode.id)
    expect(withNotes).toBeDefined()
    expect(withNotes.id).toBe(episode.id)
    
    // Description might not be available for all episodes
    if (withNotes.description) {
      expect(withNotes.description.length).toBeGreaterThan(0)
    }
  })
}) 