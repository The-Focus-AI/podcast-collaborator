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
  id: string
  title: string
  number: number
  status: 'draft' | 'in-progress' | 'ready' | 'published'
  created: Date
  updated: Date
  description?: string
  publishDate?: Date
  notes?: string
  transcript?: string
  metadata?: Record<string, unknown>
}

export const EpisodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  number: z.number().int().min(0),
  status: z.enum(['draft', 'in-progress', 'ready', 'published']),
  created: z.date(),
  updated: z.date(),
  description: z.string().optional(),
  publishDate: z.date().optional(),
  notes: z.string().optional(),
  transcript: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

// Asset
export interface Asset {
  id: string
  episodeId: string
  type: string
  name: string
  data: Buffer
  created: Date
  updated: Date
  metadata?: Record<string, unknown>
}

export const AssetSchema = z.object({
  id: z.string().min(1),
  episodeId: z.string().min(1),
  type: z.string().min(1),
  name: z.string().min(1),
  data: z.instanceof(Buffer),
  created: z.date(),
  updated: z.date(),
  metadata: z.record(z.string(), z.unknown()).optional()
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
  createEpisode(episode: Episode): Promise<void>
  getEpisode(id: string): Promise<Episode>
  listEpisodes(): Promise<Episode[]>
  updateEpisode(id: string, episode: Partial<Episode>): Promise<void>
  deleteEpisode(id: string): Promise<void>
}

// Asset Storage Interface
export interface AssetStorage {
  saveAsset(asset: Asset): Promise<void>
  getAsset(episodeId: string, id: string): Promise<Asset>
  listAssets(episodeId: string): Promise<Asset[]>
  deleteAsset(episodeId: string, id: string): Promise<void>
}

// Combined interface
export interface PodcastStorage extends ProjectStorage, EpisodeStorage, AssetStorage {
  // Additional methods can be added here if needed
} 