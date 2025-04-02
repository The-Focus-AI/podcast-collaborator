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
  podcastAuthor: string    // maps from author
  publishDate: Date        // maps from published
  duration: number
  
  // Status fields from PocketCasts
  isStarred: boolean       // maps from starred
  isListened: boolean      // maps from status === 'played'
  progress: number         // maps from playedUpTo / duration
  lastListenedAt?: Date    // derived from playedUpTo > 0
  
  // Raw PocketCasts fields to preserve history
  playingStatus: number    // raw playingStatus from PocketCasts
  playedUpTo: number      // raw playedUpTo from PocketCasts
  
  // Our additional fields
  notes?: string          // our own notes
  syncedAt: Date          // when we last synced
  isDownloaded: boolean   // our download status
  hasTranscript: boolean  // our transcript status
}

// Episode Notes
export interface EpisodeNote {
  id: string              // same as episode id
  description?: string    // show notes content
  error?: string         // error message if loading failed
  loadedAt: Date         // when the notes were loaded
  lastAttempt?: Date     // when we last tried to load notes
  retryCount: number     // number of times we've tried to load
}

export const EpisodeNoteSchema = z.object({
  id: z.string().min(1),
  description: z.string().optional(),
  error: z.string().optional(),
  loadedAt: z.date(),
  lastAttempt: z.date().optional(),
  retryCount: z.number().min(0)
})

export const EpisodeSchema = z.object({
  // Core fields from PocketCasts
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  podcastName: z.string().min(1),
  podcastAuthor: z.string().min(1),
  publishDate: z.date(),
  duration: z.number().min(0),
  
  // Status fields from PocketCasts
  isStarred: z.boolean(),
  isListened: z.boolean(),
  progress: z.number().min(0).max(1),
  lastListenedAt: z.date().optional(),
  
  // Raw PocketCasts fields to preserve history
  playingStatus: z.number().min(0),
  playedUpTo: z.number().min(0),
  
  // Our additional fields
  description: z.string().optional(),
  showNotesError: z.string().optional(),
  notes: z.string().optional(),
  syncedAt: z.date(),
  isDownloaded: z.boolean(),
  hasTranscript: z.boolean()
})

// Raw PocketCasts Episode exactly as it comes from the API
export interface RawPocketCastsEpisode {
  uuid: string
  title: string
  url: string
  published: string // ISO date string
  duration: number
  fileType?: string
  size?: string | number
  podcastUuid: string
  podcastTitle: string
  playingStatus: number // 2 = in progress, 3 = completed
  starred: boolean
  playedUpTo: number
  episodeType?: string
  episodeSeason?: number
  episodeNumber?: number
  isDeleted?: boolean
  author?: string
  bookmarks?: unknown[]
}

export const RawPocketCastsEpisodeSchema = z.object({
  uuid: z.string(),
  title: z.string(),
  url: z.string(),
  published: z.string(), // Keep as string, no need to parse
  duration: z.number(),
  fileType: z.string().optional(),
  size: z.union([z.string(), z.number()]).optional(),
  podcastUuid: z.string(),
  podcastTitle: z.string(),
  playingStatus: z.number(),
  starred: z.boolean(),
  playedUpTo: z.number(),
  episodeType: z.string().optional(),
  episodeSeason: z.number().optional(),
  episodeNumber: z.number().optional(),
  isDeleted: z.boolean().optional(),
  author: z.string().optional(),
  bookmarks: z.array(z.unknown()).optional()
})

// Raw PocketCasts data storage
export interface RawPocketCastsData {
  type: 'starred' | 'listened'
  episodes: RawPocketCastsEpisode[]
  syncedAt: string // ISO date string
}

export const RawPocketCastsDataSchema = z.object({
  type: z.enum(['starred', 'listened']),
  episodes: z.array(RawPocketCastsEpisodeSchema),
  syncedAt: z.string() // Keep as string, no need to parse
})

// Raw data storage interface
export interface RawDataStorage {
  saveRawData(type: 'starred' | 'listened', data: RawPocketCastsEpisode[]): Promise<void>
  getRawData(type: 'starred' | 'listened'): Promise<RawPocketCastsEpisode[]>
}

// Raw storage interface
export interface RawEpisodeStorage {
  saveRawEpisode(episode: RawPocketCastsEpisode): Promise<void>
  getRawEpisode(id: string): Promise<RawPocketCastsEpisode>
  listRawEpisodes(): Promise<RawPocketCastsEpisode[]>
}

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
  getEpisode(id: string): Promise<Episode | null>
  listEpisodes(): Promise<Episode[]>
  updateEpisode(id: string, episode: Partial<Episode>): Promise<void>
  deleteEpisode(id: string): Promise<void>
  getRawData(type: 'starred' | 'listened'): Promise<RawPocketCastsEpisode[]>
}

// Asset interface for downloaded files
export interface Asset {
  id: string;
  episodeId: string;
  type: string;
  name: string;
  data: Buffer;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export const AssetSchema = z.object({
  id: z.string().min(1),
  episodeId: z.string().min(1),
  type: z.string().min(1),
  name: z.string().min(1),
  data: z.instanceof(Buffer),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.unknown()).optional()
});

// Asset Storage Interface
export interface AssetStorage {
  saveAsset(episodeId: string, asset: Asset): Promise<void>
  getAsset(episodeId: string, name: string): Promise<Asset>
  listAssets(episodeId: string): Promise<Asset[]>
  deleteAsset(episodeId: string, name: string): Promise<void>
}

// Combined interface
export interface PodcastStorage extends AssetStorage, RawDataStorage, EpisodeStorage {
  initializeProject(config: ProjectConfig): Promise<void>
  getProjectConfig(): Promise<ProjectConfig>
  updateProjectConfig(config: Partial<ProjectConfig>): Promise<void>
  isInitialized(): Promise<boolean>
  
  // Episode note operations
  saveEpisodeNote(note: EpisodeNote): Promise<void>
  getEpisodeNote(id: string): Promise<EpisodeNote | null>
  listEpisodeNotes(): Promise<EpisodeNote[]>
} 