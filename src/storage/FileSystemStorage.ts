import { mkdir, readFile, writeFile, readdir, rm, stat } from 'fs/promises'
import { join } from 'path'
import type { PodcastStorage, ProjectConfig, Episode, Asset } from './interfaces.js'
import { ProjectConfigSchema, EpisodeSchema, AssetSchema } from './interfaces.js'

export class FileSystemStorage implements PodcastStorage {
  private readonly configPath: string
  private readonly episodesPath: string
  private readonly assetsPath: string

  constructor(private readonly rootPath: string) {
    this.configPath = join(rootPath, 'config.json')
    this.episodesPath = join(rootPath, 'episodes')
    this.assetsPath = join(rootPath, 'assets')
  }

  // Project Storage Implementation
  async initializeProject(config: ProjectConfig): Promise<void> {
    // Check if already initialized
    if (await this.isInitialized()) {
      throw new Error('Project is already initialized')
    }

    // Validate config
    ProjectConfigSchema.parse(config)

    // Create directory structure
    await mkdir(this.rootPath, { recursive: true })
    await mkdir(this.episodesPath, { recursive: true })
    await mkdir(this.assetsPath, { recursive: true })

    // Save config
    await writeFile(this.configPath, JSON.stringify(config, null, 2))
  }

  async getProjectConfig(): Promise<ProjectConfig> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    try {
      const configData = await readFile(this.configPath, 'utf-8')
      const rawConfig = JSON.parse(configData)
      
      // Convert date strings to Date objects before validation
      const config = {
        ...rawConfig,
        created: new Date(rawConfig.created),
        updated: new Date(rawConfig.updated)
      }
      
      return ProjectConfigSchema.parse(config)
    } catch (error) {
      throw new Error('Failed to read project configuration')
    }
  }

  async updateProjectConfig(config: Partial<ProjectConfig>): Promise<void> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    const currentConfig = await this.getProjectConfig()
    const updatedConfig = { ...currentConfig, ...config, updated: new Date() }
    
    // Validate updated config
    ProjectConfigSchema.parse(updatedConfig)
    
    await writeFile(this.configPath, JSON.stringify(updatedConfig, null, 2))
  }

  async isInitialized(): Promise<boolean> {
    try {
      const [configExists, episodesDirExists, assetsDirExists] = await Promise.all([
        stat(this.configPath).then(() => true).catch(() => false),
        stat(this.episodesPath).then(() => true).catch(() => false),
        stat(this.assetsPath).then(() => true).catch(() => false)
      ])
      return configExists && episodesDirExists && assetsDirExists
    } catch {
      return false
    }
  }

  // Episode Storage Implementation
  private getEpisodePath(id: string): string {
    return join(this.episodesPath, `${id}.json`)
  }

  async saveEpisode(episode: Episode): Promise<void> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    // Validate episode
    EpisodeSchema.parse(episode)

    // Ensure episodes directory exists
    await mkdir(this.episodesPath, { recursive: true })

    const episodePath = this.getEpisodePath(episode.id)
    await writeFile(episodePath, JSON.stringify(episode, null, 2))

    // Create episode asset directory
    await mkdir(join(this.assetsPath, episode.id), { recursive: true })
  }

  async getEpisode(id: string): Promise<Episode> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    try {
      const episodePath = this.getEpisodePath(id)
      const episodeData = await readFile(episodePath, 'utf-8')
      const episode = JSON.parse(episodeData)
      
      // Convert date strings back to Date objects
      if (episode.publishDate) {
        episode.publishDate = new Date(episode.publishDate)
      }
      episode.syncedAt = new Date(episode.syncedAt)
      
      return EpisodeSchema.parse(episode)
    } catch {
      throw new Error('Episode not found')
    }
  }

  async listEpisodes(): Promise<Episode[]> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    try {
      const files = await readdir(this.episodesPath)
      const episodes: Episode[] = []

      for (const file of files) {
        if (!file.endsWith('.json')) continue
        const id = file.replace('.json', '')
        try {
          const episode = await this.getEpisode(id)
          episodes.push(episode)
        } catch {
          // Skip invalid episodes
          continue
        }
      }

      return episodes
    } catch {
      return [] // Return empty array if directory doesn't exist
    }
  }

  async updateEpisode(id: string, update: Partial<Episode>): Promise<void> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    const episode = await this.getEpisode(id)
    const updatedEpisode = { ...episode, ...update }
    
    // Validate updated episode
    EpisodeSchema.parse(updatedEpisode)
    
    await writeFile(this.getEpisodePath(id), JSON.stringify(updatedEpisode, null, 2))
  }

  async deleteEpisode(id: string): Promise<void> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    const episodePath = this.getEpisodePath(id)
    try {
      await rm(episodePath)
      // Also delete episode assets directory
      await rm(join(this.assetsPath, id), { recursive: true, force: true })
    } catch {
      throw new Error('Episode not found')
    }
  }

  // Asset Storage Implementation
  private getAssetPath(episodeId: string, name: string): string {
    return join(this.assetsPath, episodeId, `${name}.json`)
  }

  async saveAsset(episodeId: string, asset: Asset): Promise<void> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    // Validate asset
    AssetSchema.parse(asset)

    // Create episode assets directory if it doesn't exist
    const episodeAssetsDir = join(this.assetsPath, episodeId)
    await mkdir(episodeAssetsDir, { recursive: true })

    // Save asset metadata and data
    const assetPath = this.getAssetPath(episodeId, asset.name)
    await writeFile(assetPath, JSON.stringify(asset, null, 2))
  }

  async getAsset(episodeId: string, name: string): Promise<Asset> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    try {
      const assetPath = this.getAssetPath(episodeId, name)
      const assetData = await readFile(assetPath, 'utf-8')
      const asset = JSON.parse(assetData)
      
      // Convert date strings back to Date objects
      asset.downloadedAt = new Date(asset.downloadedAt)
      
      // Convert data back to Buffer
      asset.data = Buffer.from(asset.data)
      
      return AssetSchema.parse(asset)
    } catch {
      throw new Error('Asset not found')
    }
  }

  async listAssets(episodeId: string): Promise<Asset[]> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    try {
      const episodeAssetsDir = join(this.assetsPath, episodeId)
      const files = await readdir(episodeAssetsDir)
      const assets: Asset[] = []

      for (const file of files) {
        if (!file.endsWith('.json')) continue
        const name = file.replace('.json', '')
        try {
          const asset = await this.getAsset(episodeId, name)
          assets.push(asset)
        } catch {
          // Skip invalid assets
          continue
        }
      }

      return assets
    } catch {
      return [] // Return empty array if directory doesn't exist
    }
  }

  async deleteAsset(episodeId: string, name: string): Promise<void> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    const assetPath = this.getAssetPath(episodeId, name)
    try {
      await rm(assetPath)
    } catch {
      throw new Error('Asset not found')
    }
  }
} 