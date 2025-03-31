import { join } from 'path'
import { homedir } from 'os'
import type { PodcastStorage } from './interfaces.js'
import { FileSystemStorage } from './FileSystemStorage.js'
import { MockStorage } from './MockStorage.js'

export type StorageType = 'filesystem' | 'mock'

export interface StorageConfig {
  type?: StorageType
  path?: string
}

export class StorageProvider {
  private storage: PodcastStorage | null = null
  private config: StorageConfig

  constructor(config: StorageConfig = {}) {
    this.config = {
      type: config.type || 'filesystem',
      path: config.path || this.getDefaultPath()
    }
    this.validateConfig(this.config)
  }

  private getDefaultPath(): string {
    return join(homedir(), '.podcast-cli')
  }

  private validateConfig(config: StorageConfig): void {
    if (config.type && !['filesystem', 'mock'].includes(config.type)) {
      throw new Error(`Unknown storage type: ${config.type}`)
    }
  }

  configure(config: StorageConfig): void {
    this.validateConfig(config)
    this.config = {
      ...this.config,
      ...config
    }
    // Clear cached storage instance so it will be recreated with new config
    this.storage = null
  }

  async initialize(): Promise<void> {
    const storage = this.getStorage()
    if (!await storage.isInitialized()) {
      await storage.initializeProject({
        name: 'My Podcast Library',
        author: 'Podcast CLI',
        email: 'podcasts@example.com',
        description: 'A library of synced podcasts',
        created: new Date(),
        updated: new Date()
      })
    }
  }

  getStorage(): PodcastStorage {
    if (!this.storage) {
      this.storage = this.createStorage()
    }
    return this.storage
  }

  private createStorage(): PodcastStorage {
    switch (this.config.type) {
      case 'filesystem':
        return new FileSystemStorage(this.config.path!)
      case 'mock':
        return new MockStorage()
      default:
        // This should never happen due to validation
        throw new Error(`Unknown storage type: ${this.config.type}`)
    }
  }
} 