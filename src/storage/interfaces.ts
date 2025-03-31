import { z } from 'zod'

// Define our schema types using Zod for runtime validation
export const ProjectConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  author: z.string(),
  email: z.string().email(),
  defaultTemplate: z.string().optional(),
  created: z.date(),
  updated: z.date()
})

export const EpisodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  number: z.number(),
  status: z.enum(['draft', 'in-progress', 'ready', 'published']),
  publishDate: z.date().optional(),
  created: z.date(),
  updated: z.date(),
  notes: z.string().optional(),
  transcript: z.string().optional()
})

export const AssetSchema = z.object({
  id: z.string(),
  episodeId: z.string(),
  type: z.enum(['audio', 'image', 'document', 'other']),
  name: z.string(),
  path: z.string(),
  mimeType: z.string(),
  size: z.number(),
  created: z.date(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

// Infer TypeScript types from Zod schemas
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>
export type Episode = z.infer<typeof EpisodeSchema>
export type Asset = z.infer<typeof AssetSchema>

// Storage interfaces
export interface ProjectStorage {
  initializeProject(config: ProjectConfig): Promise<void>
  getProjectConfig(): Promise<ProjectConfig>
  updateProjectConfig(config: Partial<ProjectConfig>): Promise<void>
  isInitialized(): Promise<boolean>
}

export interface EpisodeStorage {
  createEpisode(episode: Episode): Promise<void>
  getEpisode(id: string): Promise<Episode>
  listEpisodes(): Promise<Episode[]>
  updateEpisode(id: string, episode: Partial<Episode>): Promise<void>
  deleteEpisode(id: string): Promise<void>
}

export interface AssetStorage {
  saveAsset(asset: Asset): Promise<void>
  getAsset(episodeId: string, assetId: string): Promise<Asset>
  listAssets(episodeId: string): Promise<Asset[]>
  deleteAsset(episodeId: string, assetId: string): Promise<void>
}

// Combined interface
export interface PodcastStorage extends ProjectStorage, EpisodeStorage, AssetStorage {
  // Additional methods can be added here if needed
} 