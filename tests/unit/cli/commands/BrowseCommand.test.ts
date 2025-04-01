import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createBrowseCommand } from '@/cli/commands/browse.js'
import { StorageProvider } from '@/storage/StorageProvider.js'
import { PocketCastsService } from '@/services/PocketCastsService.js'
import { Command } from 'commander'
import { FileSystemStorage } from '@/storage/FileSystemStorage.js'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import type { RawPocketCastsEpisode } from '@/storage/interfaces.js'
import type { ReactElement } from 'react'

// Mock Ink's render function
vi.mock('ink', () => ({
  render: vi.fn().mockReturnValue({ waitUntilExit: vi.fn().mockResolvedValue(undefined) })
}))

// Type for mocked render function
type MockRenderResult = {
  props: {
    episodes: any[];
    onEpisodesUpdated?: (episodes: any[]) => void;
    episodeService?: any;
  };
}

describe('browse command', () => {
  let tempDir: string
  let storage: FileSystemStorage
  let storageProvider: StorageProvider
  let pocketCastsService: PocketCastsService
  let command: Command

  // Mock episodes
  const mockEpisodes: RawPocketCastsEpisode[] = [
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

    // Mock PocketCasts service
    pocketCastsService = {
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
        lastListenedAt: episode.playingStatus > 1 ? new Date() : undefined
      }))
    } as unknown as PocketCastsService

    // Save test episodes
    await storage.saveRawData('starred', [mockEpisodes[0]])
    await storage.saveRawData('listened', [mockEpisodes[1]])

    // Create the command
    command = createBrowseCommand(storageProvider, pocketCastsService)
  })

  afterEach(async () => {
    // Clean up temporary directory
    await rm(tempDir, { recursive: true, force: true })
  })

  it('should initialize storage and render PodcastBrowser', async () => {
    const { render } = await import('ink')
    await command.parseAsync(['node', 'test'])
    
    expect(render).toHaveBeenCalled()
    const renderCall = vi.mocked(render).mock.calls[0]
    const element = renderCall[0] as ReactElement
    
    // Verify PodcastBrowser props
    const podcastBrowserProps = element.props as MockRenderResult['props']
    expect(podcastBrowserProps).toHaveProperty('episodes')
    expect(podcastBrowserProps).toHaveProperty('onEpisodesUpdated')
    expect(podcastBrowserProps).toHaveProperty('episodeService')
    
    // Verify episodes are passed correctly
    const episodes = podcastBrowserProps.episodes
    expect(episodes).toHaveLength(2)
    expect(episodes[0].id).toBe('episode-2') // Listened episode first
    expect(episodes[1].id).toBe('episode-1') // Starred episode second
  })

  it('should handle storage initialization failure', async () => {
    // Mock storage initialization failure
    vi.spyOn(storageProvider, 'initialize').mockRejectedValueOnce(new Error('Storage init failed'))
    
    await expect(command.parseAsync(['node', 'test'])).rejects.toThrow('Storage init failed')
  })

  it('should handle episode listing failure', async () => {
    // Mock storage.getRawData failure
    vi.spyOn(storage, 'getRawData').mockRejectedValueOnce(new Error('Failed to get episodes'))
    
    await expect(command.parseAsync(['node', 'test'])).rejects.toThrow('Failed to get episodes')
  })

  it('should update episodes when onEpisodesUpdated is called', async () => {
    const { render } = await import('ink')
    await command.parseAsync(['node', 'test'])
    
    // Get the onEpisodesUpdated callback
    const renderCall = vi.mocked(render).mock.calls[0]
    const element = renderCall[0] as ReactElement
    const { onEpisodesUpdated } = element.props as MockRenderResult['props']
    
    // Call onEpisodesUpdated with new episodes
    const updatedEpisodes = [mockEpisodes[0]].map(e => pocketCastsService.convertToEpisode(e))
    await onEpisodesUpdated?.(updatedEpisodes)
    
    // Verify render was called again with updated episodes
    const secondRenderCall = vi.mocked(render).mock.calls[1]
    const secondElement = secondRenderCall[0] as ReactElement
    const secondProps = secondElement.props as MockRenderResult['props']
    expect(secondProps.episodes).toEqual(updatedEpisodes)
  })
}) 