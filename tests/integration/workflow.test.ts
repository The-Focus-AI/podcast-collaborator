import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { StorageProvider } from '@/storage/StorageProvider.js'
import { PocketCastsService, PocketCastsServiceImpl } from '@/services/PocketCastsService.js'
import { EpisodeServiceImpl } from '@/services/EpisodeService.js'
import { FileSystemStorage } from '@/storage/FileSystemStorage.js'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import type { RawPocketCastsEpisode } from '@/storage/interfaces.js'
import { sync } from '@/cli/commands/sync.js'
import { createBrowseCommand } from '@/cli/commands/browse.js'
import { OnePasswordService } from '@/services/OnePasswordService.js'

// Mock console to avoid noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

// Mock Ink's render function
vi.mock('ink', () => ({
  render: vi.fn().mockReturnValue({ waitUntilExit: vi.fn().mockResolvedValue(undefined) })
}))

// Mock process.exit to prevent test termination
vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

// Mock OnePasswordService
vi.mock('@/services/OnePasswordService.js', () => ({
  OnePasswordService: vi.fn().mockImplementation(() => ({
    getCredentials: vi.fn().mockResolvedValue({
      email: 'test@example.com',
      password: 'test-password'
    })
  }))
}))

// Mock PocketCastsServiceImpl constructor
vi.mock('@/services/PocketCastsService.js', () => ({
  PocketCastsServiceImpl: vi.fn().mockImplementation((onePasswordService: OnePasswordService) => {
    const mockService = {
      login: vi.fn().mockResolvedValue(undefined),
      getListenedEpisodes: vi.fn().mockResolvedValue([]),
      getStarredEpisodes: vi.fn().mockResolvedValue([]),
      convertToEpisode: vi.fn().mockImplementation((episode: RawPocketCastsEpisode) => ({
        id: episode.uuid,
        title: episode.title,
        url: episode.url,
        podcastName: episode.podcastTitle,
        podcastAuthor: episode.author,
        publishDate: new Date(episode.published),
        duration: episode.duration,
        isStarred: episode.starred,
        isListened: episode.playingStatus === 3,
        progress: episode.playedUpTo / episode.duration,
        notes: '',
        syncedAt: new Date(),
        isDownloaded: false,
        hasTranscript: false,
        lastListenedAt: episode.playingStatus > 1 ? new Date() : undefined,
        playingStatus: episode.playingStatus,
        playedUpTo: episode.playedUpTo
      }))
    }
    return Object.assign(mockService, {
      token: null,
      baseUrl: 'https://api.pocketcasts.com/user/v1',
      defaultHeaders: {},
      onePasswordService,
      request: vi.fn()
    })
  })
}))

describe('Sync to Browse Workflow', () => {
  let tempDir: string
  let storage: FileSystemStorage
  let storageProvider: StorageProvider
  let pocketCastsService: PocketCastsService
  let episodeService: EpisodeServiceImpl
  let onePasswordService: OnePasswordService

  // Mock episodes from PocketCasts
  const mockPocketCastsEpisodes: RawPocketCastsEpisode[] = [
    {
      uuid: 'episode-1',
      title: 'Test Episode 1',
      url: 'https://example.com/1',
      podcastTitle: 'Test Podcast',
      podcastUuid: 'podcast-1',
      published: '2024-01-01T00:00:00.000Z',
      duration: 3600,
      fileType: 'audio/mp3',
      size: 1000000,
      playingStatus: 2,
      playedUpTo: 1800,
      starred: true,
      episodeType: 'full',
      episodeSeason: 1,
      episodeNumber: 1,
      isDeleted: false,
      author: 'Test Author',
      bookmarks: []
    },
    {
      uuid: 'episode-2',
      title: 'Test Episode 2',
      url: 'https://example.com/2',
      podcastTitle: 'Another Podcast',
      podcastUuid: 'podcast-2',
      published: '2024-01-02T00:00:00.000Z',
      duration: 1800,
      fileType: 'audio/mp3',
      size: 500000,
      playingStatus: 3,
      playedUpTo: 1800,
      starred: false,
      episodeType: 'full',
      episodeSeason: 1,
      episodeNumber: 2,
      isDeleted: false,
      author: 'Another Author',
      bookmarks: []
    }
  ]

  beforeEach(async () => {
    // Create temporary directory
    tempDir = await mkdtemp(join(tmpdir(), 'podcast-collaborator-test-'))
    
    // Initialize real storage
    storage = new FileSystemStorage(tempDir)
    await storage.initializeProject({
      name: 'Test Project',
      author: 'Test Author',
      email: 'test@example.com',
      description: 'Test Description',
      created: new Date(),
      updated: new Date()
    })
    
    // Create storage provider with config
    storageProvider = new StorageProvider({
      type: 'filesystem',
      path: tempDir
    })
    await storageProvider.initialize()

    // Create and mock OnePasswordService
    onePasswordService = new OnePasswordService()

    // Create and mock PocketCasts service
    pocketCastsService = {
      login: vi.fn().mockResolvedValue(undefined),
      getListenedEpisodes: vi.fn().mockResolvedValue([mockPocketCastsEpisodes[1]]),
      getStarredEpisodes: vi.fn().mockResolvedValue([mockPocketCastsEpisodes[0]]),
      convertToEpisode: vi.fn().mockImplementation((episode: RawPocketCastsEpisode) => ({
        id: episode.uuid,
        title: episode.title,
        url: episode.url,
        podcastName: episode.podcastTitle,
        podcastAuthor: episode.author,
        publishDate: new Date(episode.published),
        duration: episode.duration,
        isStarred: episode.starred,
        isListened: episode.playingStatus === 3,
        progress: episode.playedUpTo / episode.duration,
        notes: '',
        syncedAt: new Date(),
        isDownloaded: false,
        hasTranscript: false,
        lastListenedAt: episode.playingStatus > 1 ? new Date() : undefined,
        playingStatus: episode.playingStatus,
        playedUpTo: episode.playedUpTo
      }))
    }

    // Create episode service
    episodeService = new EpisodeServiceImpl(storageProvider, pocketCastsService)

    // Mock service constructors for sync command
    vi.mocked(PocketCastsServiceImpl).mockImplementation(() => {
      const mockImpl = Object.create(PocketCastsServiceImpl.prototype)
      Object.assign(mockImpl, pocketCastsService)
      return mockImpl
    })
    vi.mocked(OnePasswordService).mockImplementation(() => onePasswordService)
    vi.mocked(StorageProvider).mockImplementation(() => storageProvider)
  })

  afterEach(async () => {
    // Clean up temporary directory
    await rm(tempDir, { recursive: true, force: true })
    
    // Clear all mocks
    vi.clearAllMocks()
  })

  it('should sync episodes and display them in browse view', async () => {
    // Run sync command
    await sync.parseAsync(['node', 'test'])

    // Verify episodes were synced
    const [starredData, listenedData] = await Promise.all([
      storage.getRawData('starred'),
      storage.getRawData('listened')
    ])

    expect(starredData).toEqual([mockPocketCastsEpisodes[0]])
    expect(listenedData).toEqual([mockPocketCastsEpisodes[1]])

    // Run browse command
    const browseCommand = createBrowseCommand(storageProvider, pocketCastsService)
    const { render } = await import('ink')
    await browseCommand.parseAsync(['node', 'test'])

    // Verify browse view was rendered
    expect(render).toHaveBeenCalled()
    const renderCall = vi.mocked(render).mock.calls[0]
    const element = renderCall[0] as React.ReactElement
    const props = element.props as { episodes: any[] }

    // Verify episodes are passed correctly
    expect(props.episodes).toHaveLength(2)
    expect(props.episodes[0].id).toBe('episode-2') // Listened episode first
    expect(props.episodes[1].id).toBe('episode-1') // Starred episode second
  })

  it('should handle sync failure gracefully', async () => {
    // Mock sync failure
    vi.mocked(pocketCastsService.getListenedEpisodes).mockRejectedValueOnce(new Error('API Error'))

    // Run sync command and expect error
    await sync.parseAsync(['node', 'test'])

    // Verify error was logged
    expect(console.error).toHaveBeenCalledWith('Error syncing episodes:', expect.any(Error))
    expect(process.exit).toHaveBeenCalledWith(1)

    // Verify no episodes were synced
    const [starredData, listenedData] = await Promise.all([
      storage.getRawData('starred'),
      storage.getRawData('listened')
    ])

    expect(starredData).toEqual([])
    expect(listenedData).toEqual([])
  })

  it('should maintain episode order after multiple syncs', async () => {
    // First sync
    await sync.parseAsync(['node', 'test'])

    // Mock new episodes for second sync
    const newEpisodes = [
      { ...mockPocketCastsEpisodes[1], uuid: 'episode-3', title: 'Test Episode 3' },
      ...mockPocketCastsEpisodes
    ]
    vi.mocked(pocketCastsService.getListenedEpisodes).mockResolvedValueOnce([
      newEpisodes[0],
      newEpisodes[2]
    ])

    // Second sync
    await sync.parseAsync(['node', 'test'])

    // Get episodes through service to verify order
    const episodes = await episodeService.listEpisodes()

    // Verify order is maintained (most recently listened first)
    expect(episodes).toHaveLength(3)
    expect(episodes[0].id).toBe('episode-3')
    expect(episodes[1].id).toBe('episode-2')
    expect(episodes[2].id).toBe('episode-1')
  })

  it('should handle data consistency between commands', async () => {
    // First sync
    await sync.parseAsync(['node', 'test'])

    // Mock episode update
    const updatedEpisode = {
      ...mockPocketCastsEpisodes[0],
      playingStatus: 3,
      playedUpTo: 3600
    }
    vi.mocked(pocketCastsService.getListenedEpisodes).mockResolvedValueOnce([
      updatedEpisode,
      mockPocketCastsEpisodes[1]
    ])

    // Second sync
    await sync.parseAsync(['node', 'test'])

    // Run browse command
    const browseCommand = createBrowseCommand(storageProvider, pocketCastsService)
    const { render } = await import('ink')
    await browseCommand.parseAsync(['node', 'test'])

    // Verify browse view shows updated data
    const renderCall = vi.mocked(render).mock.calls[0]
    const element = renderCall[0] as React.ReactElement
    const props = element.props as { episodes: any[] }

    // Verify episodes reflect updates
    const episode1 = props.episodes.find(e => e.id === 'episode-1')
    expect(episode1.isListened).toBe(true)
    expect(episode1.progress).toBe(1)
  })
}); 