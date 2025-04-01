import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EpisodeServiceImpl } from '../../../src/services/EpisodeService.js'
import { StorageProvider } from '../../../src/storage/StorageProvider.js'
import { PocketCastsService } from '../../../src/services/PocketCastsService.js'
import { Episode } from '../../../src/storage/interfaces.js'

describe('EpisodeService', () => {
  let episodeService: EpisodeServiceImpl
  let mockStorageProvider: StorageProvider
  let mockPocketCastsService: {
    login: ReturnType<typeof vi.fn>;
    getListenedEpisodes: ReturnType<typeof vi.fn>;
    getStarredEpisodes: ReturnType<typeof vi.fn>;
    convertToEpisode: ReturnType<typeof vi.fn>;
    getEpisodeNotes: ReturnType<typeof vi.fn>;
  }
  let mockStorage: any

  beforeEach(() => {
    mockStorage = {
      saveEpisode: vi.fn(),
      getEpisode: vi.fn(),
      getRawData: vi.fn()
    }

    mockStorageProvider = {
      getStorage: vi.fn().mockReturnValue(mockStorage)
    } as unknown as StorageProvider

    mockPocketCastsService = {
      login: vi.fn(),
      getListenedEpisodes: vi.fn(),
      getStarredEpisodes: vi.fn(),
      convertToEpisode: vi.fn(),
      getEpisodeNotes: vi.fn()
    }

    episodeService = new EpisodeServiceImpl(mockStorageProvider, mockPocketCastsService as unknown as PocketCastsService)
  })

  describe('loadShowNotes', () => {
    const mockEpisode: Episode = {
      id: 'test-id',
      title: 'Test Episode',
      url: 'https://example.com/episode',
      podcastName: 'Test Podcast',
      podcastAuthor: 'Test Author',
      publishDate: new Date(),
      duration: 1800,
      isStarred: false,
      isListened: false,
      progress: 0,
      playingStatus: 0,
      playedUpTo: 0,
      syncedAt: new Date(),
      isDownloaded: false,
      hasTranscript: false
    }

    it('should return episode from storage if it already has show notes', async () => {
      const episodeWithNotes = { ...mockEpisode, description: 'Existing show notes' }
      mockStorage.getEpisode.mockResolvedValue(episodeWithNotes)

      const result = await episodeService.loadShowNotes('test-id')
      
      expect(result).toEqual(episodeWithNotes)
      expect(mockPocketCastsService.getEpisodeNotes).not.toHaveBeenCalled()
      expect(mockStorage.saveEpisode).not.toHaveBeenCalled()
    })

    it('should fetch and cache show notes if not in storage', async () => {
      mockStorage.getEpisode.mockResolvedValue(mockEpisode)
      mockPocketCastsService.getEpisodeNotes.mockResolvedValue('New show notes')

      const result = await episodeService.loadShowNotes('test-id')
      
      expect(result.description).toBe('New show notes')
      expect(mockPocketCastsService.getEpisodeNotes).toHaveBeenCalledWith('test-id')
      expect(mockStorage.saveEpisode).toHaveBeenCalledWith({
        ...mockEpisode,
        description: 'New show notes'
      })
    })

    it('should throw error if episode not found', async () => {
      mockStorage.getEpisode.mockResolvedValue(null)

      await expect(episodeService.loadShowNotes('test-id'))
        .rejects
        .toThrow('Episode not found: test-id')
    })

    it('should return episode without notes if fetch fails', async () => {
      mockStorage.getEpisode.mockResolvedValue(mockEpisode)
      mockPocketCastsService.getEpisodeNotes.mockRejectedValue(new Error('Fetch failed'))

      const result = await episodeService.loadShowNotes('test-id')
      
      expect(result).toEqual(mockEpisode)
      expect(mockPocketCastsService.getEpisodeNotes).toHaveBeenCalledWith('test-id')
      expect(mockStorage.saveEpisode).not.toHaveBeenCalled()
    })
  })
}) 