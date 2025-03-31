import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createSyncCommand } from '@/cli/commands/sync.js'
import { StorageProvider } from '@/storage/StorageProvider.js'
import { PocketCastsServiceImpl } from '@/services/PocketCastsService.js'
import { Command } from 'commander'
import { FileSystemStorage } from '@/storage/FileSystemStorage.js'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('sync command', () => {
  let tempDir: string
  let storage: FileSystemStorage
  let storageProvider: StorageProvider
  let pocketCastsService: PocketCastsServiceImpl
  let command: Command

  beforeEach(async () => {
    // Create a temporary directory for testing
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
    
    // Create real storage provider with config
    storageProvider = new StorageProvider({
      type: 'filesystem',
      path: tempDir
    })
    await storageProvider.initialize()
    
    // Create real PocketCasts service
    pocketCastsService = new PocketCastsServiceImpl()

    // Create the command
    command = createSyncCommand(storageProvider, pocketCastsService)
  })

  afterEach(async () => {
    // Clean up temporary directory
    await rm(tempDir, { recursive: true, force: true })
  })

  it('should sync episodes from PocketCasts', async () => {
    // Run the sync command with 1Password integration
    await command.parseAsync(['node', 'test', '--onepassword'])

    // Get the episodes from storage
    const episodes = await storage.listEpisodes()

    // Verify we got some episodes
    expect(episodes.length).toBeGreaterThan(0)

    // Verify episode structure
    const firstEpisode = episodes[0]
    expect(firstEpisode).toHaveProperty('id')
    expect(firstEpisode).toHaveProperty('title')
    expect(firstEpisode).toHaveProperty('url')
    expect(firstEpisode).toHaveProperty('podcastName')
    expect(firstEpisode).toHaveProperty('publishDate')
    expect(firstEpisode).toHaveProperty('duration')
    expect(firstEpisode).toHaveProperty('isStarred')
    expect(firstEpisode).toHaveProperty('isListened')
    expect(firstEpisode).toHaveProperty('progress')
    expect(firstEpisode).toHaveProperty('syncedAt')

    // Verify episode data types
    expect(typeof firstEpisode.id).toBe('string')
    expect(typeof firstEpisode.title).toBe('string')
    expect(typeof firstEpisode.url).toBe('string')
    expect(typeof firstEpisode.podcastName).toBe('string')
    expect(firstEpisode.publishDate).toBeInstanceOf(Date)
    expect(typeof firstEpisode.duration).toBe('number')
    expect(typeof firstEpisode.isStarred).toBe('boolean')
    expect(typeof firstEpisode.isListened).toBe('boolean')
    expect(typeof firstEpisode.progress).toBe('number')
    expect(firstEpisode.syncedAt).toBeInstanceOf(Date)
  }, 30000) // Increase timeout to 30 seconds for real API call
}) 