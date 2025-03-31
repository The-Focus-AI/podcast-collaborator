import { z } from 'zod'

// Project Configuration
export interface ProjectConfig {
  name: string
  author: string
  email: string
  description?: string
  created: Date
  updated: Date
}

export const ProjectConfigSchema = z.object({
  name: z.string().min(1),
  author: z.string().min(1),
  email: z.string().email(),
  description: z.string().optional(),
  created: z.date(),
  updated: z.date()
})

// Episode
export interface Episode {
  // Core fields from PocketCasts
  id: string                // maps from uuid
  title: string
  url: string
  podcastName: string      // maps from podcastTitle
  publishDate: Date        // maps from published
  duration: number
  
  // Status fields from PocketCasts
  isStarred: boolean       // maps from starred
  isListened: boolean      // maps from status === 'played'
  progress: number         // maps from playedUpTo / duration
  lastListenedAt?: Date    // derived from playedUpTo > 0
  
  // Our additional fields
  description?: string     // not provided by PocketCasts API
  notes?: string          // our own notes
  syncedAt: Date          // when we last synced
  isDownloaded: boolean   // our download status
  hasTranscript: boolean  // our transcript status
}

export const EpisodeSchema = z.object({
  // Core fields from PocketCasts
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  podcastName: z.string().min(1),
  publishDate: z.date(),
  duration: z.number().min(0),
  
  // Status fields from PocketCasts
  isStarred: z.boolean(),
  isListened: z.boolean(),
  progress: z.number().min(0).max(1),
  lastListenedAt: z.date().optional(),
  
  // Our additional fields
  description: z.string().optional(),
  notes: z.string().optional(),
  syncedAt: z.date(),
  isDownloaded: z.boolean(),
  hasTranscript: z.boolean()
})

// Asset (for downloaded content)
export interface Asset {
  type: string // 'audio', 'image', etc.
  name: string
  data: Buffer
  downloadedAt: Date
}

export const AssetSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  data: z.instanceof(Buffer),
  downloadedAt: z.date()
})

// Project Storage Interface
export interface ProjectStorage {
  initializeProject(config: ProjectConfig): Promise<void>
  getProjectConfig(): Promise<ProjectConfig>
  updateProjectConfig(config: Partial<ProjectConfig>): Promise<void>
  isInitialized(): Promise<boolean>
}

// Episode Storage Interface
export interface EpisodeStorage {
  saveEpisode(episode: Episode): Promise<void>
  getEpisode(id: string): Promise<Episode>
  listEpisodes(): Promise<Episode[]>
  updateEpisode(id: string, episode: Partial<Episode>): Promise<void>
  deleteEpisode(id: string): Promise<void>
}

// Asset Storage Interface
export interface AssetStorage {
  saveAsset(episodeId: string, asset: Asset): Promise<void>
  getAsset(episodeId: string, name: string): Promise<Asset>
  listAssets(episodeId: string): Promise<Asset[]>
  deleteAsset(episodeId: string, name: string): Promise<void>
}

// Combined interface
export interface PodcastStorage extends EpisodeStorage, AssetStorage {
  // Additional methods can be added here if needed
  initializeProject(config: ProjectConfig): Promise<void>
  getProjectConfig(): Promise<ProjectConfig>
  updateProjectConfig(config: Partial<ProjectConfig>): Promise<void>
  isInitialized(): Promise<boolean>
} 