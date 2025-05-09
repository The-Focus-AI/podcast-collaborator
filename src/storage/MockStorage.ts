import type { PodcastStorage, ProjectConfig, Episode, Asset } from './interfaces.js'

export class MockStorage implements PodcastStorage {
  private projectConfig: ProjectConfig | null = null
  private episodes: Map<string, Episode> = new Map()
  private assets: Map<string, Asset> = new Map()

  // Project Storage Implementation
  async initializeProject(config: ProjectConfig): Promise<void> {
    this.projectConfig = config
  }

  async getProjectConfig(): Promise<ProjectConfig> {
    if (!this.projectConfig) {
      throw new Error('Project not initialized')
    }
    return this.projectConfig
  }

  async updateProjectConfig(config: Partial<ProjectConfig>): Promise<void> {
    if (!this.projectConfig) {
      throw new Error('Project not initialized')
    }
    this.projectConfig = { ...this.projectConfig, ...config }
  }

  async isInitialized(): Promise<boolean> {
    return this.projectConfig !== null
  }

  // Episode Storage Implementation
  async saveEpisode(episode: Episode): Promise<void> {
    if (!this.projectConfig) {
      throw new Error('Project not initialized')
    }
    this.episodes.set(episode.id, episode)
  }

  async getEpisode(id: string): Promise<Episode> {
    if (!this.projectConfig) {
      throw new Error('Project not initialized')
    }
    const episode = this.episodes.get(id)
    if (!episode) {
      throw new Error('Episode not found')
    }
    return episode
  }

  async listEpisodes(): Promise<Episode[]> {
    if (!this.projectConfig) {
      throw new Error('Project not initialized')
    }
    return Array.from(this.episodes.values())
  }

  async updateEpisode(id: string, episode: Partial<Episode>): Promise<void> {
    if (!this.projectConfig) {
      throw new Error('Project not initialized')
    }
    const existing = await this.getEpisode(id)
    this.episodes.set(id, { ...existing, ...episode })
  }

  async deleteEpisode(id: string): Promise<void> {
    if (!this.projectConfig) {
      throw new Error('Project not initialized')
    }
    if (!this.episodes.has(id)) {
      throw new Error('Episode not found')
    }
    this.episodes.delete(id)
  }

  // Asset Storage Implementation
  async saveAsset(episodeId: string, asset: Asset): Promise<void> {
    if (!this.projectConfig) {
      throw new Error('Project not initialized')
    }
    this.assets.set(`${episodeId}:${asset.name}`, asset)
  }

  async getAsset(episodeId: string, name: string): Promise<Asset> {
    if (!this.projectConfig) {
      throw new Error('Project not initialized')
    }
    const asset = this.assets.get(`${episodeId}:${name}`)
    if (!asset) {
      throw new Error('Asset not found')
    }
    return asset
  }

  async listAssets(episodeId: string): Promise<Asset[]> {
    if (!this.projectConfig) {
      throw new Error('Project not initialized')
    }
    return Array.from(this.assets.entries())
      .filter(([key]) => key.startsWith(`${episodeId}:`))
      .map(([, asset]) => asset)
  }

  async deleteAsset(episodeId: string, name: string): Promise<void> {
    if (!this.projectConfig) {
      throw new Error('Project not initialized')
    }
    const key = `${episodeId}:${name}`
    if (!this.assets.has(key)) {
      throw new Error('Asset not found')
    }
    this.assets.delete(key)
  }
} 