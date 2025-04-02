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
  getAssetPath(episodeId: string, name: string): string // Added for direct path access
}

// Transcription schemas
export const TranscriptionSchema = z.object({
  segments: z.array(
    z.object({
      timestamp: z.string().describe("Timestamp in MM:SS format indicating when this segment occurs in the audio"),

      speaker: z.string().min(1).describe("Name or identifier of the person speaking in this segment"),

      advertisement: z.boolean().describe("Indicates if this segment is part of an advertisement or sponsored content"),

      guest_interview: z.boolean().describe("Indicates if this segment is part of a guest interview"),

      topics: z.array(z.string().min(1)).min(1).describe("List of topics or themes discussed in this segment"),

      spoken_text: z.string().min(1).describe("The actual transcribed text of what was spoken in this segment"),
    }).describe("A segment of transcribed audio with metadata")
  ),
});

export const TranscriptionStatusSchema = z.object({
  id: z.string()
    .min(1)
    .describe("Unique identifier for this transcription"),
  
  episodeId: z.string()
    .min(1)
    .describe("Reference to the podcast episode this transcription belongs to"),
  
  status: z.enum(['pending', 'processing', 'completed', 'failed'])
    .describe("Current status of the transcription process"),
  
  model: z.string()
    .min(1)
    .describe("The AI model used for transcription"),

  transcription: TranscriptionSchema.optional(),
  metadata: z.object({
    duration: z.number()
      .optional()
      .describe("Total duration of the audio in seconds"),
    
    wordCount: z.number()
    .optional()
      .describe("Total number of words in the transcription"),
    
    createdAt: z.date()
      .describe("When the transcription was first created"),
    
    updatedAt: z.date()
      .describe("When the transcription was last modified"),
    
    completedAt: z.date()
      .optional()
      .describe("When the transcription process finished successfully"),
    
    error: z.string()
      .optional()
      .describe("Error message if the transcription failed")
  }).describe("Metadata about the transcription process and result"),
  
  summary: z.string()
    .optional()
    .describe("AI-generated summary of the transcribed content"),
  
  keywords: z.array(z.string())
    .optional()
    .describe("AI-extracted keywords or key phrases from the content")
}).describe("Complete transcription record including segments and metadata");

// Extract types from Zod schemas
export type Transcription = z.infer<typeof TranscriptionSchema>;
export type TranscriptionStatus = z.infer<typeof TranscriptionStatusSchema>;

// Storage interface for transcriptions
export interface TranscriptionStorage {
  // Core operations
  saveTranscription(transcription: TranscriptionStatus): Promise<void>;
  getTranscription(id: string): Promise<TranscriptionStatus | null>;
  getTranscriptionByEpisodeId(episodeId: string): Promise<TranscriptionStatus | null>;
  listTranscriptions(): Promise<TranscriptionStatus[]>;
  deleteTranscription(id: string): Promise<void>;
  
  // Status updates
  updateTranscriptionStatus(
    id: string, 
    status: TranscriptionStatus['status'], 
    error?: string
  ): Promise<void>;
  
  
  // Metadata updates
  updateMetadata(
    id: string, 
    metadata: Partial<TranscriptionStatus['metadata']>
  ): Promise<void>;
  

}

// Combined interface
export interface PodcastStorage extends 
  AssetStorage, 
  RawDataStorage, 
  EpisodeStorage,
  TranscriptionStorage {
  initializeProject(config: ProjectConfig): Promise<void>
  getProjectConfig(): Promise<ProjectConfig>
  updateProjectConfig(config: Partial<ProjectConfig>): Promise<void>
  isInitialized(): Promise<boolean>
  
  // Episode note operations
  saveEpisodeNote(note: EpisodeNote): Promise<void>
  getEpisodeNote(id: string): Promise<EpisodeNote | null>
  listEpisodeNotes(): Promise<EpisodeNote[]>
} 