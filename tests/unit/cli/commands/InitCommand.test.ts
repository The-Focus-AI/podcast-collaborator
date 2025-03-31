import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { InitCommand } from '@/cli/commands/InitCommand.js'
import { StorageProvider } from '@/storage/StorageProvider.js'
import { mkdir, rm, mkdtemp } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('InitCommand', () => {
  let testDir: string
  let storageProvider: StorageProvider
  let command: InitCommand

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'podcast-test-'))
    
    // Initialize storage provider with test directory
    storageProvider = new StorageProvider({ type: 'filesystem', path: testDir })
    command = new InitCommand(storageProvider)
  })

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true })
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error)
    }
  })

  it('should initialize a new project with default values', async () => {
    const result = await command.execute(['--email', 'test@example.com'])
    expect(result.success).toBe(true)
    expect(result.message).toContain('Successfully initialized')
    
    const storage = storageProvider.getStorage()
    const config = await storage.getProjectConfig()
    
    expect(config.name).toBe('My Podcast')
    expect(config.author).toBeDefined()
    expect(config.email).toBe('test@example.com')
    expect(config.created).toBeInstanceOf(Date)
    expect(config.updated).toBeInstanceOf(Date)
  })

  it('should initialize a project with custom name', async () => {
    const result = await command.execute(['--name', 'Test Podcast', '--email', 'test@example.com'])
    expect(result.success).toBe(true)
    expect(result.message).toContain('Test Podcast')
    
    const storage = storageProvider.getStorage()
    const config = await storage.getProjectConfig()
    
    expect(config.name).toBe('Test Podcast')
  })

  it('should initialize a project with all custom values', async () => {
    const result = await command.execute([
      '--name', 'Test Podcast',
      '--author', 'Test Author',
      '--email', 'test@example.com',
      '--description', 'A test podcast'
    ])
    expect(result.success).toBe(true)
    expect(result.message).toContain('Test Podcast')
    expect(result.message).toContain('Test Author')
    
    const storage = storageProvider.getStorage()
    const config = await storage.getProjectConfig()
    
    expect(config.name).toBe('Test Podcast')
    expect(config.author).toBe('Test Author')
    expect(config.email).toBe('test@example.com')
    expect(config.description).toBe('A test podcast')
  })

  it('should initialize a project in a custom path', async () => {
    const customPath = await mkdtemp(join(tmpdir(), 'podcast-custom-'))
    
    try {
      const result = await command.execute([
        '--path', customPath,
        '--name', 'Custom Path Podcast',
        '--email', 'test@example.com'
      ])
      expect(result.success).toBe(true)
      expect(result.message).toContain('Custom Path Podcast')
      expect(result.message).toContain(customPath)
      
      // Verify storage was configured with custom path
      const storage = storageProvider.getStorage()
      expect(await storage.isInitialized()).toBe(true)
      
      const config = await storage.getProjectConfig()
      expect(config.name).toBe('Custom Path Podcast')
    } finally {
      await rm(customPath, { recursive: true, force: true })
    }
  })

  it('should perform dry run without making changes', async () => {
    const result = await command.execute([
      '--dry-run',
      '--name', 'Dry Run Podcast',
      '--email', 'test@example.com'
    ])
    expect(result.success).toBe(true)
    expect(result.message).toContain('Would initialize')
    expect(result.message).toContain('Dry Run Podcast')
    expect(result.message).toContain('No changes were made')
    
    // Verify no changes were made
    const storage = storageProvider.getStorage()
    expect(await storage.isInitialized()).toBe(false)
  })

  it('should fail if project already exists', async () => {
    // Initialize first time
    await command.execute(['--email', 'test@example.com'])
    
    // Try to initialize again
    const result = await command.execute(['--email', 'test@example.com'])
    expect(result.success).toBe(false)
    expect(result.message).toContain('already initialized')
  })

  it('should fail with invalid email', async () => {
    const result = await command.execute(['--email', 'invalid-email'])
    expect(result.success).toBe(false)
    expect(result.message).toContain('Invalid')
  })

  it('should show help with --help flag', async () => {
    const result = await command.execute(['--help'])
    expect(result.success).toBe(true)
    expect(result.message).toContain('Usage:')
    expect(result.message).toContain('--name')
    expect(result.message).toContain('--author')
    expect(result.message).toContain('--email')
    expect(result.message).toContain('--description')
    expect(result.message).toContain('--path')
    expect(result.message).toContain('--dry-run')
  })

  it('should create project directory structure', async () => {
    const result = await command.execute(['--email', 'test@example.com'])
    expect(result.success).toBe(true)
    
    const storage = storageProvider.getStorage()
    expect(await storage.isInitialized()).toBe(true)
    
    // Should be able to create an episode
    await storage.createEpisode({
      id: '1',
      title: 'Test Episode',
      number: 1,
      status: 'draft',
      created: new Date(),
      updated: new Date()
    })
  })

  it('should handle errors gracefully', async () => {
    // Create a provider that will fail
    const badProvider = new StorageProvider({ 
      type: 'filesystem', 
      path: '/nonexistent/path/that/should/fail' 
    })
    const badCommand = new InitCommand(badProvider)
    
    const result = await badCommand.execute(['--email', 'test@example.com'])
    expect(result.success).toBe(false)
    expect(result.message).toContain('Failed to initialize project')
  })

  it('should handle missing option values', async () => {
    const result = await command.execute(['--name'])
    expect(result.success).toBe(false)
    expect(result.message).toContain('Missing value for option: --name')
  })

  it('should handle unknown options', async () => {
    const result = await command.execute(['--unknown', 'value'])
    expect(result.success).toBe(false)
    expect(result.message).toContain('Unknown option: --unknown')
  })
}) 