import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PocketCastsServiceImpl, PocketCastsEpisode } from '@/services/PocketCastsService.js'

describe('PocketCastsService', () => {
  let service: PocketCastsServiceImpl
  let mockFetch: ReturnType<typeof vi.fn>

  const mockEpisodes = [
    {
      uuid: '1',
      title: 'Episode 1',
      url: 'https://example.com/1',
      published: '2024-01-01T00:00:00Z',
      duration: 3600,
      fileSize: 1000000,
      podcastUuid: 'podcast-1',
      podcastTitle: 'Test Podcast',
      status: 'played' as const,
      playingStatus: 2,
      starred: true,
      playedUpTo: 3600
    },
    {
      uuid: '2',
      title: 'Episode 2',
      url: 'https://example.com/2',
      published: '2024-01-02T00:00:00Z',
      duration: 1800,
      fileSize: 500000,
      podcastUuid: 'podcast-1',
      podcastTitle: 'Test Podcast',
      status: 'played' as const,
      playingStatus: 2,
      starred: false,
      playedUpTo: 1800
    }
  ]

  beforeEach(() => {
    // Reset mocks before each test
    mockFetch = vi.fn()
    global.fetch = mockFetch
    service = new PocketCastsServiceImpl()
  })

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockResponse = {
        token: 'test-token',
        email: 'test@example.com'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify(mockResponse))
      })

      await service.login('test@example.com', 'password')

      expect(mockFetch).toHaveBeenCalledWith('https://api.pocketcasts.com/user/login', {
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }),
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password',
          scope: 'webplayer'
        })
      })
    })

    it('should throw error on invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve('{"error": "Invalid credentials"}')
      })

      await expect(service.login('test@example.com', 'wrong-password'))
        .rejects.toThrow('Invalid credentials or session expired')
    })
  })

  describe('getListenedEpisodes', () => {
    beforeEach(async () => {
      // Login first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify({ token: 'test-token', email: 'test@example.com' }))
      })
      await service.login('test@example.com', 'password')
    })

    it('should fetch and return listened episodes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify({ episodes: mockEpisodes }))
      })

      const result = await service.getListenedEpisodes()
      expect(result).toEqual(mockEpisodes)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pocketcasts.com/user/history',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      )
    })

    it('should return empty array when no episodes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify({ episodes: [] }))
      })

      const result = await service.getListenedEpisodes()
      expect(result).toEqual([])
    })

    it('should throw error when not logged in', async () => {
      service = new PocketCastsServiceImpl() // Reset service without login
      await expect(service.getListenedEpisodes()).rejects.toThrow('Not logged in')
    })

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve('{"error": "Invalid token"}')
      })

      await expect(service.getListenedEpisodes()).rejects.toThrow('Invalid credentials or session expired')
    })
  })

  describe('getStarredEpisodes', () => {
    beforeEach(async () => {
      // Login first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify({ token: 'test-token', email: 'test@example.com' }))
      })
      await service.login('test@example.com', 'password')
    })

    it('should fetch and return starred episodes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify({ episodes: [mockEpisodes[0]] })) // Only starred episode
      })

      const result = await service.getStarredEpisodes()
      expect(result).toEqual([mockEpisodes[0]])
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.pocketcasts.com/user/starred',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      )
    })

    it('should return empty array when no starred episodes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: () => Promise.resolve(JSON.stringify({ episodes: [] }))
      })

      const result = await service.getStarredEpisodes()
      expect(result).toEqual([])
    })

    it('should throw error when not logged in', async () => {
      service = new PocketCastsServiceImpl() // Reset service without login
      await expect(service.getStarredEpisodes()).rejects.toThrow('Not logged in')
    })
  })

  describe('convertToEpisode', () => {
    it('should convert PocketCasts episode to internal Episode format', () => {
      const pocketcastsEpisode = mockEpisodes[0]
      const result = PocketCastsServiceImpl.convertToEpisode(pocketcastsEpisode)

      expect(result).toEqual({
        id: pocketcastsEpisode.uuid,
        title: pocketcastsEpisode.title,
        number: 0,
        status: 'published',
        created: expect.any(Date),
        updated: expect.any(Date),
        description: '',
        publishDate: new Date(pocketcastsEpisode.published),
        metadata: {
          pocketcasts: {
            podcastUuid: pocketcastsEpisode.podcastUuid,
            podcastTitle: pocketcastsEpisode.podcastTitle,
            status: pocketcastsEpisode.status,
            playingStatus: pocketcastsEpisode.playingStatus,
            starred: pocketcastsEpisode.starred,
            playedUpTo: pocketcastsEpisode.playedUpTo,
            url: pocketcastsEpisode.url,
            duration: pocketcastsEpisode.duration,
            fileSize: pocketcastsEpisode.fileSize
          }
        }
      })
    })
  })
})
