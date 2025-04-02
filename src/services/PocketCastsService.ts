import { z } from 'zod'
import { Episode } from '@/storage/interfaces.js'
import { OnePasswordService } from './OnePasswordService.js'
import { logger } from '../utils/logger.js'
import { v4 as uuidv4 } from 'uuid'
import { promisify } from 'util'
import { exec } from 'child_process'
import { readFile, access } from 'fs/promises'
import { constants } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

// Raw API response types
export interface PocketCastsResponse {
  episodes: PocketCastsEpisode[]
}

export interface PocketCastsEpisode {
  uuid: string
  title: string
  url: string
  published: string
  duration: number
  fileSize?: number
  podcastUuid: string
  podcastTitle: string
  status?: 'unplayed' | 'played'
  playingStatus: number
  starred: boolean
  playedUpTo: number
  author?: string
}

// Zod schemas for runtime validation
export const PocketCastsEpisodeSchema = z.object({
  uuid: z.string(),
  title: z.string(),
  url: z.string().url(),
  published: z.string(),
  duration: z.number(),
  fileSize: z.number().optional(),
  podcastUuid: z.string(),
  podcastTitle: z.string(),
  status: z.enum(['unplayed', 'played']).optional(),
  playingStatus: z.number(),
  starred: z.boolean(),
  playedUpTo: z.number(),
  author: z.string().optional()
})

export const PocketCastsResponseSchema = z.object({
  episodes: z.array(PocketCastsEpisodeSchema)
})

export const PocketCastsAuthSchema = z.object({
  token: z.string(),
  email: z.string().email()
})

export interface PocketCastsService {
  login(): Promise<void>
  getListenedEpisodes(): Promise<PocketCastsEpisode[]>
  getStarredEpisodes(): Promise<PocketCastsEpisode[]>
  convertToEpisode(pocketcastsEpisode: PocketCastsEpisode): Promise<Episode>
  getEpisodeNotes(episodeId: string): Promise<string>
  downloadEpisode(episode: Episode, onProgress: (progress: number) => void): Promise<Buffer>
}

export class PocketCastsServiceImpl implements PocketCastsService {
  private token: string | null = null
  private baseUrl = 'https://api.pocketcasts.com'
  private defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'cache-control': 'no-cache'
  }

  constructor(private readonly onePasswordService: OnePasswordService) {}

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const requestId = uuidv4();
    const startTime = Date.now();

    if (!this.token && !endpoint.includes('/user/login')) {
      throw new Error('Not logged in')
    }

    const headers: HeadersInit = {
      ...this.defaultHeaders,
      ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
      ...(options?.headers || {})
    }

    const url = `${this.baseUrl}${endpoint}`
    const method = options?.method || 'GET'

    try {
      logger.debug(`Making API request to ${endpoint}`, { requestId, source: 'pocketcasts' });

      const response = await fetch(url, {
        ...options,
        headers
      })
    
      const duration = Date.now() - startTime;
      logger.api(method, endpoint, response.status, duration, { requestId, source: 'pocketcasts' });

      // Log rate limit information if available
      const rateLimit = {
        remaining: response.headers.get('X-RateLimit-Remaining'),
        limit: response.headers.get('X-RateLimit-Limit'),
        reset: response.headers.get('X-RateLimit-Reset')
      };

      if (rateLimit.remaining) {
        logger.debug(`Rate limit: ${rateLimit.remaining}/${rateLimit.limit} requests remaining`, { requestId });
      }
    
      const rawText = await response.text()
      let data: any
      const contentType = response.headers.get('content-type')
    
      try {
        if (contentType && contentType.includes('application/json')) {
          data = JSON.parse(rawText)
        } else {
          data = { message: rawText }
        }
      } catch (error) {
        data = { message: response.statusText || 'Unknown error' }
      }

      if (!response.ok) {
        const error = new Error(data.message || `API error: ${response.statusText}`);
        switch (response.status) {
          case 401:
            throw new Error('Invalid credentials or session expired')
          case 403:
            throw new Error('Access denied. Please check your account permissions.')
          case 404:
            throw new Error('Resource not found')
          case 429:
            throw new Error('Too many requests. Please try again later.')
          default:
            throw error;
        }
      }

      return data as T
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error(error, { requestId, source: 'pocketcasts' });
      } else {
        logger.error('Unknown error occurred', { requestId, source: 'pocketcasts' });
      }
      throw error;
    }
  }

  async login(): Promise<void> {
    try {
      const credentials = await this.onePasswordService.getCredentials();
      
      const requestBody = { 
        email: credentials.email, 
        password: credentials.password,
        scope: 'webplayer'
      }
      
      const response = await this.request<{ token: string; email: string }>('/user/login', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      // Validate response matches expected schema
      const validatedResponse = PocketCastsAuthSchema.parse(response)
      
      if (!validatedResponse.token) {
        throw new Error('No authentication token received')
      }

      this.token = validatedResponse.token
      logger.debug(`Token received: ${this.token.substring(0, 10)}...`, { source: 'pocketcasts' });
      logger.info('Successfully logged in to PocketCasts', { source: 'pocketcasts' });
    } catch (error) {
      logger.error('Login error details:', { source: 'pocketcasts' });
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Could not connect to PocketCasts. Please check your internet connection.')
      }
      throw error
    }
  }

  async getListenedEpisodes(): Promise<PocketCastsEpisode[]> {
    const data = await this.request<PocketCastsResponse>('/user/history', {
      method: 'POST',
      body: JSON.stringify({})
    })
    // Validate response
    const validated = PocketCastsResponseSchema.parse(data)
    return validated.episodes
  }

  async getStarredEpisodes(): Promise<PocketCastsEpisode[]> {
    const data = await this.request<PocketCastsResponse>('/user/starred', {
      method: 'POST',
      body: JSON.stringify({})
    })
    // Validate response
    const validated = PocketCastsResponseSchema.parse(data)
    return validated.episodes
  }

  async convertToEpisode(pocketcastsEpisode: PocketCastsEpisode): Promise<Episode> {
    const progress = pocketcastsEpisode.duration > 0 
      ? Math.min(1, pocketcastsEpisode.playedUpTo / pocketcastsEpisode.duration)
      : 0;

    // Check if audio file exists
    const audioPath = join(homedir(), '.podcast-cli', 'assets', 'episodes', pocketcastsEpisode.uuid, 'audio.mp3');
    let isDownloaded = false;
    try {
      await access(audioPath, constants.F_OK);
      isDownloaded = true;
    } catch {
      // File doesn't exist
    }

    return {
      id: pocketcastsEpisode.uuid,
      title: pocketcastsEpisode.title,
      url: pocketcastsEpisode.url,
      podcastName: pocketcastsEpisode.podcastTitle,
      podcastAuthor: pocketcastsEpisode.author || 'Unknown',
      publishDate: new Date(pocketcastsEpisode.published),
      duration: pocketcastsEpisode.duration,
      isStarred: pocketcastsEpisode.starred,
      isListened: pocketcastsEpisode.playingStatus === 3,
      playingStatus: pocketcastsEpisode.playingStatus,
      playedUpTo: pocketcastsEpisode.playedUpTo,
      progress,
      lastListenedAt: pocketcastsEpisode.playedUpTo > 0 ? new Date() : undefined,
      syncedAt: new Date(),
      isDownloaded,
      hasTranscript: false
    };
  }

  async getEpisodeNotes(episodeId: string): Promise<string> {
    const requestId = uuidv4();
    const startTime = Date.now();
    
    try {
      logger.debug(`Fetching show notes for episode ${episodeId}`, { requestId, episodeId });
      
      const response = await fetch(`https://cache.pocketcasts.com/episode/show_notes/${episodeId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      const duration = Date.now() - startTime;
      
      logger.api('GET', `/episode/show_notes/${episodeId}`, response.status, duration, { 
        requestId, 
        episodeId,
        source: 'pocketcasts-cache' 
      });

      if (!response.ok) {
        if (response.status === 404) {
          logger.warn(`Show notes not found for episode ${episodeId}`, { requestId, episodeId });
          throw new Error('Resource not found');
        }
        throw new Error(`Failed to fetch show notes: ${response.statusText}`);
      }

      const data = await response.json();
      return data.show_notes;
    } catch (error) {
      logger.error(`Failed to fetch show notes for episode ${episodeId}`, { 
        requestId, 
        episodeId,
        source: 'pocketcasts-cache'
      });
      throw error;
    }
  }

  async downloadEpisode(episode: Episode, onProgress: (progress: number) => void): Promise<Buffer> {
    const requestId = uuidv4();
    const assetPath = join(homedir(), '.podcast-cli', 'assets', 'episodes', episode.id, 'audio.mp3');
    
    logger.debug(`Starting download for episode ${episode.id}`, { requestId, episodeId: episode.id });

    // Use curl to download directly to assets folder
    const escapedUrl = episode.url.replace(/'/g, "'\\''");
    const curlCmd = `mkdir -p "${join(homedir(), '.podcast-cli', 'assets', 'episodes', episode.id)}" && curl -s -L -o '${assetPath}' '${escapedUrl}' &`;
    
    try {
      await promisify(exec)(curlCmd);
      logger.debug(`Download started in background for episode ${episode.id}`, { requestId, episodeId: episode.id });
      return Buffer.from([]);  // Return empty buffer since we don't need it
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Download failed for episode ${episode.id}: ${errorMessage}`, { requestId, episodeId: episode.id });
      throw error;
    }
  }
}