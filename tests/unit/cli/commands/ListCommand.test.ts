import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createListCommand } from '@/cli/commands/list.js'
import { StorageProvider } from '@/storage/StorageProvider.js'
import { Command } from 'commander'
import { FileSystemStorage } from '@/storage/FileSystemStorage.js'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import type { RawPocketCastsEpisode } from '@/storage/interfaces.js'

describe('list command', () => {
  let tempDir: string
  let storage: FileSystemStorage
  let storageProvider: StorageProvider
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

    // Create test episodes
    const testEpisodes: RawPocketCastsEpisode[] = [
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
        playedUpTo: 0,
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

    // Save test episodes
    await storage.saveRawData('starred', [testEpisodes[0]])
    await storage.saveRawData('listened', [testEpisodes[1]])

    // Create the command
    command = createListCommand(storageProvider)
  })

  afterEach(async () => {
    // Clean up temporary directory
    await rm(tempDir, { recursive: true, force: true })
  })

  it('should list all episodes by default', async () => {
    const consoleSpy = vi.spyOn(console, 'log')
    await command.parseAsync(['node', 'test'])
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test Episode 1'))
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test Episode 2'))
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Found 2 episodes'))
  })

  it('should filter starred episodes', async () => {
    const consoleSpy = vi.spyOn(console, 'log')
    await command.parseAsync(['node', 'test', '--starred'])
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test Episode 1'))
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Test Episode 2'))
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Found 1 episodes'))
  })

  it('should filter listened episodes', async () => {
    const consoleSpy = vi.spyOn(console, 'log')
    await command.parseAsync(['node', 'test', '--listened'])
    
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Test Episode 1'))
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test Episode 2'))
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Found 1 episodes'))
  })

  it('should show warning for downloaded filter', async () => {
    const consoleSpy = vi.spyOn(console, 'warn')
    await command.parseAsync(['node', 'test', '--downloaded'])
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Download filtering not yet implemented'))
  })

  it('should show warning for transcribed filter', async () => {
    const consoleSpy = vi.spyOn(console, 'warn')
    await command.parseAsync(['node', 'test', '--transcribed'])
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Transcription filtering not yet implemented'))
  })

  it('should output JSON when requested', async () => {
    const consoleSpy = vi.spyOn(console, 'log')
    await command.parseAsync(['node', 'test', '--json'])
    
    const output = consoleSpy.mock.calls.find(call => 
      typeof call[0] === 'string' && call[0].includes('Test Episode')
    )?.[0]
    
    expect(output).toBeDefined()
    const parsed = JSON.parse(output as string)
    
    expect(parsed).toHaveLength(2)
    // Episodes are sorted by publish date (newest first)
    expect(parsed[0].title).toBe('Test Episode 2') // Jan 2, 2024
    expect(parsed[1].title).toBe('Test Episode 1') // Jan 1, 2024
  })
})