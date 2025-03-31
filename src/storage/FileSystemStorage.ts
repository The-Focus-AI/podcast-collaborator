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

  async createEpisode(episode: Episode): Promise<void> {
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
      episode.created = new Date(episode.created)
      episode.updated = new Date(episode.updated)
      if (episode.publishDate) {
        episode.publishDate = new Date(episode.publishDate)
      }
      
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
    const updatedEpisode = { ...episode, ...update, updated: new Date() }
    
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
  private getAssetPath(episodeId: string, assetId: string): string {
    return join(this.assetsPath, episodeId, `${assetId}.json`)
  }

  private getAssetDataPath(episodeId: string, assetId: string, extension: string): string {
    return join(this.assetsPath, episodeId, `${assetId}${extension}`)
  }

  async saveAsset(asset: Asset, data?: Buffer): Promise<void> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    // Validate asset
    AssetSchema.parse(asset)

    // Create episode assets directory if it doesn't exist
    const episodeAssetsDir = join(this.assetsPath, asset.episodeId)
    await mkdir(episodeAssetsDir, { recursive: true })

    // Save asset metadata
    const assetPath = this.getAssetPath(asset.episodeId, asset.id)
    await writeFile(assetPath, JSON.stringify(asset, null, 2))

    // Save asset data if provided
    if (data) {
      const extension = asset.path.split('.').pop() || ''
      const dataPath = this.getAssetDataPath(asset.episodeId, asset.id, `.${extension}`)
      await writeFile(dataPath, data)
    }
  }

  async getAsset(episodeId: string, assetId: string): Promise<Asset> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    try {
      const assetPath = this.getAssetPath(episodeId, assetId)
      const assetData = await readFile(assetPath, 'utf-8')
      const asset = JSON.parse(assetData)
      
      // Convert date strings back to Date objects
      asset.created = new Date(asset.created)
      
      return AssetSchema.parse(asset)
    } catch {
      throw new Error('Asset not found')
    }
  }

  async getAssetData(episodeId: string, assetId: string): Promise<Buffer> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    try {
      const asset = await this.getAsset(episodeId, assetId)
      const extension = asset.path.split('.').pop() || ''
      const dataPath = this.getAssetDataPath(episodeId, assetId, `.${extension}`)
      return readFile(dataPath)
    } catch {
      throw new Error('Asset data not found')
    }
  }

  async listAssets(episodeId: string): Promise<Asset[]> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    const assetsDir = join(this.assetsPath, episodeId)
    try {
      const files = await readdir(assetsDir)
      const assets: Asset[] = []

      for (const file of files) {
        if (!file.endsWith('.json')) continue
        const id = file.replace('.json', '')
        try {
          const asset = await this.getAsset(episodeId, id)
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

  async deleteAsset(episodeId: string, assetId: string): Promise<void> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    try {
      const asset = await this.getAsset(episodeId, assetId)
      const assetPath = this.getAssetPath(episodeId, assetId)
      await rm(assetPath)

      // Also delete asset data file if it exists
      const extension = asset.path.split('.').pop() || ''
      const dataPath = this.getAssetDataPath(episodeId, assetId, `.${extension}`)
      await rm(dataPath).catch(() => {}) // Ignore error if data file doesn't exist
    } catch {
      throw new Error('Asset not found')
    }
  }
} 