import { mkdir, readFile, writeFile, readdir, rm, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import type { 
  PodcastStorage, 
  ProjectConfig, 
  Asset, 
  RawPocketCastsData, 
  RawPocketCastsEpisode, 
  Episode, 
  EpisodeStorage, 
  EpisodeNote,
  TranscriptionStatus,
  TranscriptionStorage,
  Transcription
} from './interfaces.js'
import { 
  ProjectConfigSchema, 
  AssetSchema, 
  RawPocketCastsDataSchema, 
  EpisodeSchema, 
  EpisodeNoteSchema,
  TranscriptionSchema,
  TranscriptionStatusSchema 
} from './interfaces.js'
import { extname } from 'path'
import { v4 as uuidv4 } from 'uuid'

export class FileSystemStorage implements PodcastStorage, EpisodeStorage, TranscriptionStorage {
  private readonly configPath: string
  private readonly assetsPath: string
  private readonly rawDataPath: string
  private readonly episodesPath: string
  private readonly notesPath: string
  private readonly transcriptionsPath: string

  constructor(private readonly rootPath: string) {
    this.configPath = join(rootPath, 'config.json')
    this.assetsPath = join(rootPath, 'assets')
    this.rawDataPath = join(rootPath, 'raw')
    this.episodesPath = join(rootPath, 'episodes')
    this.notesPath = join(rootPath, 'notes')
    this.transcriptionsPath = join(rootPath, 'transcriptions')
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
    await mkdir(this.assetsPath, { recursive: true })
    await mkdir(this.rawDataPath, { recursive: true })
    await mkdir(this.notesPath, { recursive: true })
    await mkdir(this.transcriptionsPath, { recursive: true })

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
      const [configExists, assetsDirExists, rawDirExists] = await Promise.all([
        stat(this.configPath).then(() => true).catch(() => false),
        stat(this.assetsPath).then(() => true).catch(() => false),
        stat(this.rawDataPath).then(() => true).catch(() => false)
      ])
      return configExists && assetsDirExists && rawDirExists
    } catch {
      return false
    }
  }

  // Asset Storage Implementation
  public getAssetPath(episodeId: string, name: string): string {
    // Use the provided name directly, assuming it includes the correct extension
    return join(this.assetsPath, episodeId, name)
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

    // Save the raw asset data (buffer) directly to the file
    const assetPath = this.getAssetPath(episodeId, asset.name)
    await writeFile(assetPath, asset.data)
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
        try {
          const filePath = join(episodeAssetsDir, file);
          const stats = await stat(filePath);
          if (!stats.isFile()) continue;

          // Determine MIME type based on extension
          const ext = extname(file).toLowerCase();
          let type = 'application/octet-stream';
          if (ext === '.mp3') type = 'audio/mpeg';
          else if (ext === '.wav') type = 'audio/wav';
          else if (ext === '.json') type = 'application/json';

          const data = await readFile(filePath);
          
          assets.push({
            id: uuidv4(),
            episodeId,
            type,
            name: file,
            data,
            createdAt: stats.birthtime,
            updatedAt: stats.mtime
          });
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

  // Raw Data Storage Implementation
  private getRawDataPath(type: 'starred' | 'listened'): string {
    return join(this.rawDataPath, `${type}_episodes.json`)
  }

  async saveRawData(type: 'starred' | 'listened', data: RawPocketCastsEpisode[]): Promise<void> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    // Ensure raw data directory exists
    await mkdir(this.rawDataPath, { recursive: true })

    const rawData: RawPocketCastsData = {
      type,
      episodes: data,
      syncedAt: new Date().toISOString()
    }

    // Validate raw data
    RawPocketCastsDataSchema.parse(rawData)

    // Save raw data
    const rawDataPath = this.getRawDataPath(type)
    await writeFile(rawDataPath, JSON.stringify(rawData, null, 2))
  }

  async getRawData(type: 'starred' | 'listened'): Promise<RawPocketCastsEpisode[]> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    try {
      const rawDataPath = this.getRawDataPath(type)
      const rawDataStr = await readFile(rawDataPath, 'utf-8')
      const rawData = JSON.parse(rawDataStr)
      
      // Validate and return episodes
      const validated = RawPocketCastsDataSchema.parse(rawData)
      return validated.episodes
    } catch {
      return [] // Return empty array if file doesn't exist or is invalid
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

    // Ensure episodes directory exists
    await mkdir(this.episodesPath, { recursive: true })

    // Validate episode
    EpisodeSchema.parse(episode)

    // Save episode
    const episodePath = this.getEpisodePath(episode.id)
    await writeFile(episodePath, JSON.stringify(episode, null, 2))
  }

  async getEpisode(id: string): Promise<Episode> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    try {
      const episodePath = this.getEpisodePath(id)
      const episodeStr = await readFile(episodePath, 'utf-8')
      const episode = JSON.parse(episodeStr)
      
      // Convert date strings back to Date objects
      episode.publishDate = new Date(episode.publishDate)
      episode.syncedAt = new Date(episode.syncedAt)
      if (episode.lastListenedAt) {
        episode.lastListenedAt = new Date(episode.lastListenedAt)
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
      // Ensure episodes directory exists
      await mkdir(this.episodesPath, { recursive: true })

      // List all episode files
      const files = await readdir(this.episodesPath)
      const episodes: Episode[] = []

      // Load each episode
      for (const file of files) {
        if (!file.endsWith('.json')) continue
        
        try {
          const episodeStr = await readFile(join(this.episodesPath, file), 'utf-8')
          const episode = JSON.parse(episodeStr)
          
          // Convert date strings back to Date objects
          episode.publishDate = new Date(episode.publishDate)
          episode.syncedAt = new Date(episode.syncedAt)
          if (episode.lastListenedAt) {
            episode.lastListenedAt = new Date(episode.lastListenedAt)
          }
          
          episodes.push(EpisodeSchema.parse(episode))
        } catch (error) {
          console.warn(`Failed to load episode from ${file}:`, error)
        }
      }

      return episodes
    } catch {
      return [] // Return empty array if directory doesn't exist or is empty
    }
  }

  async updateEpisode(id: string, updates: Partial<Episode>): Promise<void> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    // Get existing episode
    const episode = await this.getEpisode(id)

    // Apply updates
    const updatedEpisode = { ...episode, ...updates }

    // Validate and save
    await this.saveEpisode(updatedEpisode)
  }

  async deleteEpisode(id: string): Promise<void> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    try {
      const episodePath = this.getEpisodePath(id)
      await rm(episodePath)
    } catch {
      throw new Error('Episode not found')
    }
  }

  private getEpisodeNotePath(id: string): string {
    return join(this.notesPath, `${id}.json`)
  }

  async saveEpisodeNote(note: EpisodeNote): Promise<void> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    // Ensure notes directory exists
    await mkdir(this.notesPath, { recursive: true })

    // Validate the note as is - no need to convert dates since they're already Date objects
    const parsed = EpisodeNoteSchema.parse(note)
    const path = this.getEpisodeNotePath(note.id)
    await writeFile(path, JSON.stringify(parsed, null, 2))
  }

  async getEpisodeNote(id: string): Promise<EpisodeNote | null> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    const path = this.getEpisodeNotePath(id)
    if (!existsSync(path)) {
      return null
    }

    try {
      const data = await readFile(path, 'utf-8')
      const rawNote = JSON.parse(data)

      // Convert date strings to Date objects when reading from JSON
      const noteWithDates = {
        ...rawNote,
        loadedAt: new Date(rawNote.loadedAt),
        lastAttempt: rawNote.lastAttempt ? new Date(rawNote.lastAttempt) : undefined
      }

      return EpisodeNoteSchema.parse(noteWithDates)
    } catch (error) {
      console.warn(`Failed to load note from ${path}:`, error)
      return null
    }
  }

  async listEpisodeNotes(): Promise<EpisodeNote[]> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    try {
      // Ensure notes directory exists
      await mkdir(this.notesPath, { recursive: true })

      const files = await readdir(this.notesPath)
      const notes: EpisodeNote[] = []

      for (const file of files) {
        if (!file.endsWith('.json')) continue
        const id = file.replace('.json', '')
        try {
          const note = await this.getEpisodeNote(id)
          if (note) notes.push(note)
        } catch (error) {
          console.warn(`Failed to load note from ${file}:`, error)
        }
      }

      return notes
    } catch {
      return [] // Return empty array if directory doesn't exist or is empty
    }
  }

  // Transcription Storage Implementation
  private getTranscriptionPath(id: string): string {
    return join(this.transcriptionsPath, `${id}.json`)
  }

  async saveTranscription(transcription: TranscriptionStatus): Promise<void> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    // Validate transcription
    TranscriptionStatusSchema.parse(transcription)

    // Ensure transcriptions directory exists
    await mkdir(this.transcriptionsPath, { recursive: true })

    // Save transcription
    const transcriptionPath = this.getTranscriptionPath(transcription.id)
    await writeFile(transcriptionPath, JSON.stringify(transcription, null, 2))
  }

  async getTranscription(id: string): Promise<TranscriptionStatus | null> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    try {
      const transcriptionPath = this.getTranscriptionPath(id)
      const transcriptionData = await readFile(transcriptionPath, 'utf-8')
      const transcription = JSON.parse(transcriptionData)
      
      // Convert dates
      transcription.metadata.createdAt = new Date(transcription.metadata.createdAt)
      transcription.metadata.updatedAt = new Date(transcription.metadata.updatedAt)
      if (transcription.metadata.completedAt) {
        transcription.metadata.completedAt = new Date(transcription.metadata.completedAt)
      }
      
      return TranscriptionStatusSchema.parse(transcription)
    } catch {
      return null
    }
  }

  async getTranscriptionByEpisodeId(episodeId: string): Promise<TranscriptionStatus | null> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    try {
      const files = await readdir(this.transcriptionsPath)
      for (const file of files) {
        try {
          const transcriptionPath = join(this.transcriptionsPath, file)
          const transcriptionData = await readFile(transcriptionPath, 'utf-8')
          const transcription = JSON.parse(transcriptionData)
          
          if (transcription.episodeId === episodeId) {
            // Convert dates
            transcription.metadata.createdAt = new Date(transcription.metadata.createdAt)
            transcription.metadata.updatedAt = new Date(transcription.metadata.updatedAt)
            if (transcription.metadata.completedAt) {
              transcription.metadata.completedAt = new Date(transcription.metadata.completedAt)
            }
            
            return TranscriptionStatusSchema.parse(transcription)
          }
        } catch {
          continue
        }
      }
      return null
    } catch {
      return null
    }
  }

  async listTranscriptions(): Promise<TranscriptionStatus[]> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    try {
      const files = await readdir(this.transcriptionsPath)
      const transcriptions: TranscriptionStatus[] = []

      for (const file of files) {
        try {
          const transcriptionPath = join(this.transcriptionsPath, file)
          const transcriptionData = await readFile(transcriptionPath, 'utf-8')
          const transcription = JSON.parse(transcriptionData)
          
          // Convert dates
          transcription.metadata.createdAt = new Date(transcription.metadata.createdAt)
          transcription.metadata.updatedAt = new Date(transcription.metadata.updatedAt)
          if (transcription.metadata.completedAt) {
            transcription.metadata.completedAt = new Date(transcription.metadata.completedAt)
          }
          
          transcriptions.push(TranscriptionStatusSchema.parse(transcription))
        } catch {
          continue
        }
      }

      return transcriptions
    } catch {
      return []
    }
  }

  async deleteTranscription(id: string): Promise<void> {
    if (!await this.isInitialized()) {
      throw new Error('Project not initialized')
    }

    const transcriptionPath = this.getTranscriptionPath(id)
    try {
      await rm(transcriptionPath)
    } catch {
      throw new Error('Transcription not found')
    }
  }

  async updateTranscriptionStatus(
    id: string,
    status: TranscriptionStatus['status'],
    error?: string
  ): Promise<void> {
    const transcription = await this.getTranscription(id)
    if (!transcription) {
      throw new Error('Transcription not found')
    }

    transcription.status = status
    transcription.metadata.updatedAt = new Date()
    if (status === 'completed') {
      transcription.metadata.completedAt = new Date()
    } else if (status === 'failed' && error) {
      transcription.metadata.error = error
    }

    await this.saveTranscription(transcription)
  }

  
  async updateMetadata(
    id: string,
    metadata: Partial<TranscriptionStatus ['metadata']>
  ): Promise<void> {
    const transcription = await this.getTranscription(id)
    if (!transcription) {
      throw new Error('Transcription not found')
    }

    Object.assign(transcription.metadata, metadata)
    transcription.metadata.updatedAt = new Date()

    await this.saveTranscription(transcription)
  }
} 