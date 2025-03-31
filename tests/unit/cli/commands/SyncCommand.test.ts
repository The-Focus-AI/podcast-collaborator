import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSyncCommand } from '@/cli/commands/sync.js'
import { StorageProvider } from '@/storage/StorageProvider.js'
import { PocketCastsService } from '@/services/PocketCastsService.js'
import { Command } from 'commander'
import { logger } from '@/utils/logger.js'
import { MockStorage } from '@/storage/MockStorage.js'

vi.mock('@/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    commandError: vi.fn(),
    commandSuccess: vi.fn()
  }
}))

vi.mock('@/services/OnePasswordService.js', () => ({
  OnePasswordService: vi.fn().mockImplementation(() => ({
    getCredentials: vi.fn().mockResolvedValue({
      email: 'test@example.com',
      password: 'test'
    })
  }))
}))

describe('sync command', () => {
  let storage: MockStorage
  let storageProvider: StorageProvider
  let pocketCastsService: PocketCastsService
  let command: Command
  let mockExit: any

  // Mock episode data
  const mockEpisodes = [
    {
      uuid: 'test-episode-1',
      title: 'Test Episode 1',
      url: 'https://example.com/episode1',
      published: '2024-01-01T00:00:00Z',
      duration: 3600,
      fileSize: 1000000,
      podcastUuid: 'test-podcast-1',
      podcastTitle: 'Test Podcast',
      podcastAuthor: 'Test Author',
      status: 'played' as const,
      playingStatus: 2,
      starred: true,
      playedUpTo: 3600
    },
    {
      uuid: 'test-episode-2',
      title: 'Test Episode 2',
      url: 'https://example.com/episode2',
      published: '2024-01-02T00:00:00Z',
      duration: 1800,
      fileSize: 500000,
      podcastUuid: 'test-podcast-1',
      podcastTitle: 'Test Podcast',
      podcastAuthor: 'Test Author',
      status: 'played' as const,
      playingStatus: 2,
      starred: false,
      playedUpTo: 1800
    }
  ]

  beforeEach(async () => {
    // Initialize mock storage
    storage = new MockStorage()
    await storage.initializeProject({
      name: 'Test Project',
      author: 'Test Author',
      email: 'test@example.com',
      description: 'Test Description',
      created: new Date(),
      updated: new Date()
    })
    
    // Create mock storage provider
    storageProvider = {
      getStorage: vi.fn().mockReturnValue(storage),
      initialize: vi.fn().mockResolvedValue(undefined)
    } as unknown as StorageProvider
    
    // Create mock PocketCasts service
    pocketCastsService = {
      login: vi.fn(),
      getListenedEpisodes: vi.fn().mockResolvedValue(mockEpisodes),
      getStarredEpisodes: vi.fn().mockResolvedValue([mockEpisodes[0]])
    } as unknown as PocketCastsService

    command = createSyncCommand(storageProvider, pocketCastsService)

    // Mock process.exit
    mockExit = vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null) => {
      throw new Error(`Process.exit(${code})`)
    })

    // Clear logger mocks
    vi.mocked(logger.info).mockClear()
    vi.mocked(logger.error).mockClear()
    vi.mocked(logger.debug).mockClear()
    vi.mocked(logger.commandError).mockClear()
    vi.mocked(logger.commandSuccess).mockClear()
  })

  afterEach(() => {
    mockExit.mockRestore()
  })

  it('should show help with --help flag', async () => {
    const helpText = command.helpInformation()
    expect(helpText).toContain('Usage:')
    expect(helpText).toContain('--email')
    expect(helpText).toContain('--password')
    expect(helpText).toContain('--starred')
    expect(helpText).toContain('--listened')
  })

  it('should login with provided credentials', async () => {
    await command.parseAsync(['node', 'test', '--email', 'test@example.com', '--password', 'test'])
    expect(pocketCastsService.login).toHaveBeenCalledWith('test@example.com', 'test')
  })

  it('should sync all episodes by default', async () => {
    await command.parseAsync(['node', 'test', '--email', 'test@example.com', '--password', 'test'])
    expect(pocketCastsService.getStarredEpisodes).toHaveBeenCalled()
    expect(pocketCastsService.getListenedEpisodes).toHaveBeenCalled()
    expect(logger.commandSuccess).toHaveBeenCalledWith(expect.stringContaining('Successfully synced episodes'))
  })

  it('should sync only starred episodes when --starred flag is used', async () => {
    await command.parseAsync(['node', 'test', '--email', 'test@example.com', '--password', 'test', '--starred'])
    expect(pocketCastsService.getStarredEpisodes).toHaveBeenCalled()
    expect(pocketCastsService.getListenedEpisodes).not.toHaveBeenCalled()
    expect(logger.commandSuccess).toHaveBeenCalledWith(expect.stringContaining('Found 1 starred episodes'))
  })

  it('should sync only listened episodes when --listened flag is used', async () => {
    await command.parseAsync(['node', 'test', '--email', 'test@example.com', '--password', 'test', '--listened'])
    expect(pocketCastsService.getListenedEpisodes).toHaveBeenCalled()
    expect(pocketCastsService.getStarredEpisodes).not.toHaveBeenCalled()
    expect(logger.commandSuccess).toHaveBeenCalledWith(expect.stringContaining('Found 2 listened episodes'))
  })

  it('should handle API errors gracefully', async () => {
    const error = new Error('API error')
    pocketCastsService.getListenedEpisodes = vi.fn().mockRejectedValue(error)
    
    await expect(command.parseAsync(['node', 'test', '--email', 'test@example.com', '--password', 'test', '--listened']))
      .rejects.toThrow('Failed to sync episodes')
    expect(logger.commandError).toHaveBeenCalledWith('Failed to sync episodes:')
  })

  it('should handle 1Password integration', async () => {
    await command.parseAsync(['node', 'test', '--onepassword'])
    expect(pocketCastsService.login).toHaveBeenCalledWith('test@example.com', 'test')
    expect(logger.commandSuccess).toHaveBeenCalledWith(expect.stringContaining('Successfully synced episodes'))
  })
}) 