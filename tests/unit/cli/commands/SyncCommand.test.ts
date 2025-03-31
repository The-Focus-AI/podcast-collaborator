import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SyncCommand } from '@/cli/commands/SyncCommand.js'
import { StorageProvider } from '@/storage/StorageProvider.js'
import { PocketCastsService, PocketCastsEpisodeMetadata } from '@/services/PocketCastsService.js'
import { mkdir, rm, mkdtemp } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('SyncCommand', () => {
  let testDir: string
  let storageProvider: StorageProvider
  let pocketCastsService: PocketCastsService
  let command: SyncCommand

  // Mock episode data
  const mockEpisodes = [
    {
      uuid: '1',
      title: 'Episode 1',
      url: 'https://example.com/1',
      published: '2025-01-01T00:00:00Z',
      duration: 3600,
      fileSize: 1000000,
      podcastUuid: 'podcast-1',
      podcastTitle: 'Test Podcast',
      status: 'played',
      playingStatus: 2,
      starred: true,
      playedUpTo: 3600
    },
    {
      uuid: '2',
      title: 'Episode 2',
      url: 'https://example.com/2',
      published: '2025-01-02T00:00:00Z',
      duration: 1800,
      fileSize: 500000,
      podcastUuid: 'podcast-1',
      podcastTitle: 'Test Podcast',
      status: 'in_progress',
      playingStatus: 1,
      starred: false,
      playedUpTo: 900
    }
  ]

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'podcast-test-'))
    
    // Initialize storage provider with test directory
    storageProvider = new StorageProvider({ type: 'filesystem', path: testDir })
    
    // Create mock PocketCasts service
    pocketCastsService = {
      login: vi.fn(),
      getListenedEpisodes: vi.fn().mockResolvedValue(mockEpisodes),
      getStarredEpisodes: vi.fn().mockResolvedValue([mockEpisodes[0]]),
      getInProgressEpisodes: vi.fn().mockResolvedValue([mockEpisodes[1]])
    } as unknown as PocketCastsService

    command = new SyncCommand(storageProvider, pocketCastsService)

    // Initialize project
    const storage = storageProvider.getStorage()
    await storage.initializeProject({
      name: 'Test Project',
      author: 'Test Author',
      email: 'test@example.com',
      created: new Date(),
      updated: new Date()
    })
  })

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error)
    }
  })

  it('should show help with --help flag', async () => {
    const result = await command.execute(['--help'])
    expect(result.success).toBe(true)
    expect(result.message).toContain('Usage:')
    expect(result.message).toContain('--email')
    expect(result.message).toContain('--password')
    expect(result.message).toContain('--starred')
    expect(result.message).toContain('--listened')
    expect(result.message).toContain('--in-progress')
  })

  it('should fail if project is not initialized', async () => {
    // Create new command with uninitialized directory
    const uninitializedDir = await mkdtemp(join(tmpdir(), 'podcast-uninitialized-'))
    try {
      const uninitializedProvider = new StorageProvider({ type: 'filesystem', path: uninitializedDir })
      const uninitializedCommand = new SyncCommand(uninitializedProvider, pocketCastsService)
      
      const result = await uninitializedCommand.execute(['--email', 'test@example.com', '--password', 'secret'])
      expect(result.success).toBe(false)
      expect(result.message).toContain('Project not initialized')
    } finally {
      await rm(uninitializedDir, { recursive: true, force: true })
    }
  })

  it('should login with provided credentials', async () => {
    await command.execute(['--email', 'test@example.com', '--password', 'secret'])
    expect(pocketCastsService.login).toHaveBeenCalledWith('test@example.com', 'secret')
  })

  it('should sync all episodes by default', async () => {
    const result = await command.execute([])
    expect(result.success).toBe(true)
    expect(result.message).toContain('Successfully synced')
    expect(result.message).toContain('starred episodes')
    expect(result.message).toContain('listened episodes')
    expect(result.message).toContain('in_progress episodes')

    const storage = storageProvider.getStorage()
    const episodes = await storage.listEpisodes()
    expect(episodes).toHaveLength(2)
  })

  it('should sync only starred episodes when --starred flag is used', async () => {
    const result = await command.execute(['--starred'])
    expect(result.success).toBe(true)
    expect(result.message).toContain('Successfully synced')
    expect(result.message).toContain('starred episodes')

    const storage = storageProvider.getStorage()
    const episodes = await storage.listEpisodes()
    expect(episodes).toHaveLength(1)
    expect((episodes[0].metadata?.pocketcasts as PocketCastsEpisodeMetadata).starred).toBe(true)
  })

  it('should sync only listened episodes when --listened flag is used', async () => {
    const result = await command.execute(['--listened'])
    expect(result.success).toBe(true)
    expect(result.message).toContain('Successfully synced')
    expect(result.message).toContain('listened episodes')

    const storage = storageProvider.getStorage()
    const episodes = await storage.listEpisodes()
    expect(episodes).toHaveLength(2)
  })

  it('should sync only in-progress episodes when --in-progress flag is used', async () => {
    const result = await command.execute(['--in-progress'])
    expect(result.success).toBe(true)
    expect(result.message).toContain('Successfully synced')
    expect(result.message).toContain('in_progress episodes')

    const storage = storageProvider.getStorage()
    const episodes = await storage.listEpisodes()
    expect(episodes).toHaveLength(1)
    expect((episodes[0].metadata?.pocketcasts as PocketCastsEpisodeMetadata).playingStatus).toBe(1)
  })

  it('should handle API errors gracefully', async () => {
    const error = new Error('API error')
    pocketCastsService.getListenedEpisodes = vi.fn().mockRejectedValue(error)
    
    const result = await command.execute(['--listened'])
    expect(result.success).toBe(false)
    expect(result.message).toContain('Failed to sync episodes')
    expect(result.message).toContain('API error')
  })

  it('should handle missing option values', async () => {
    const result = await command.execute(['--email'])
    expect(result.success).toBe(false)
    expect(result.message).toContain('Missing value for option: --email')
  })

  it('should handle unknown options', async () => {
    const result = await command.execute(['--unknown', 'value'])
    expect(result.success).toBe(false)
    expect(result.message).toContain('Unknown option: --unknown')
  })
}) 