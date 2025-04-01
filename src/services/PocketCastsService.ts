import { z } from 'zod'
import { Episode } from '@/storage/interfaces.js'
import { OnePasswordService } from './OnePasswordService.js'

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
  convertToEpisode(pocketcastsEpisode: PocketCastsEpisode): Episode
}

export class PocketCastsServiceImpl implements PocketCastsService {
  private token: string | null = null
  private readonly baseUrl = 'https://api.pocketcasts.com'
  private readonly defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'cache-control': 'no-cache'
  }

  constructor(private readonly onePasswordService: OnePasswordService) {}

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (!this.token && !endpoint.includes('/user/login')) {
      throw new Error('Not logged in')
    }

    const headers: HeadersInit = {
      ...this.defaultHeaders,
      ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
      ...(options?.headers || {})
    }

    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers
    })
    
    const rawText = await response.text()
    console.log('Raw API response:', rawText)
    
    let data: any
    const contentType = response.headers.get('content-type')
    
    try {
      // Only try to parse JSON if the content-type is application/json
      if (contentType && contentType.includes('application/json')) {
        data = JSON.parse(rawText)
      } else {
        // For non-JSON responses, use the status text
        data = { message: rawText }
      }
    } catch (error) {
      // If JSON parsing fails, use the response status text
      data = { message: response.statusText || 'Unknown error' }
    }

    if (!response.ok) {
      // Handle specific error cases
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
          throw new Error(data.message || `API error: ${response.statusText}`)
      }
    }

    return data as T
  }

  async login(): Promise<void> {
    try {
      const credentials = await this.onePasswordService.getCredentials();
      
      const requestBody = { 
        email: credentials.email, 
        password: credentials.password,
        scope: 'webplayer'  // Simplify to just webplayer scope
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
      console.log('Token received:', this.token)
      console.log('Successfully logged in to PocketCasts')
    } catch (error) {
      console.error('Login error details:', error)
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

  convertToEpisode(pocketcastsEpisode: PocketCastsEpisode): Episode {
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
      progress: pocketcastsEpisode.playedUpTo / pocketcastsEpisode.duration,
      lastListenedAt: pocketcastsEpisode.playedUpTo > 0 ? new Date() : undefined,
      syncedAt: new Date(),
      isDownloaded: false,
      hasTranscript: false
    };
  }
} 