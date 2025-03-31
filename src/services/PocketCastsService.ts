import { z } from 'zod'
import { Episode } from '@/storage/interfaces.js'

// Types
export interface PocketCastsEpisodeMetadata {
  podcastUuid: string
  podcastTitle: string
  status: 'unplayed' | 'played'
  playingStatus: number
  starred: boolean
  playedUpTo: number
  url: string
  duration: number
  fileSize: number
}

export interface PocketCastsEpisode {
  uuid: string
  title: string
  url: string
  published: string
  duration: number
  fileSize: number
  podcastUuid: string
  podcastTitle: string
  status: 'unplayed' | 'played'
  playingStatus: number
  starred: boolean
  playedUpTo: number
}

const PocketCastsAuthSchema = z.object({
  token: z.string(),
  email: z.string().email()
})

const PocketCastsEpisodeSchema = z.object({
  uuid: z.string(),
  title: z.string(),
  url: z.string().url(),
  published: z.string(),
  duration: z.number(),
  fileSize: z.number(),
  podcastUuid: z.string(),
  podcastTitle: z.string(),
  status: z.enum(['unplayed', 'played']),
  playingStatus: z.number(),
  starred: z.boolean(),
  playedUpTo: z.number()
})

export interface PocketCastsService {
  login(email: string, password: string): Promise<void>
  getListenedEpisodes(): Promise<PocketCastsEpisode[]>
  getStarredEpisodes(): Promise<PocketCastsEpisode[]>
}

export class PocketCastsServiceImpl implements PocketCastsService {
  private token: string | null = null
  private readonly baseUrl = 'https://api.pocketcasts.com'
  private readonly defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'cache-control': 'no-cache'
  }

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
    
    let data: any
    const contentType = response.headers.get('content-type')
    const rawText = await response.text()
    
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

  async login(email: string, password: string): Promise<void> {
    try {
      const requestBody = { 
        email, 
        password,
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
    const data = await this.request<{ episodes: PocketCastsEpisode[] }>('/user/history', {
      method: 'POST',
      body: JSON.stringify({})
    })
    return data.episodes || []
  }

  async getStarredEpisodes(): Promise<PocketCastsEpisode[]> {
    const data = await this.request<{ episodes: PocketCastsEpisode[] }>('/user/starred', {
      method: 'POST',
      body: JSON.stringify({})
    })
    return data.episodes || []
  }

  static convertToEpisode(pocketcastsEpisode: PocketCastsEpisode): Episode {
    return {
      id: pocketcastsEpisode.uuid,
      title: pocketcastsEpisode.title,
      number: 0, // We don't have episode numbers from PocketCasts
      status: 'published', // All episodes from PocketCasts are published
      created: new Date(),
      updated: new Date(),
      description: '', // PocketCasts API doesn't provide description in episode list
      publishDate: new Date(pocketcastsEpisode.published),
      metadata: {
        pocketcasts: {
          podcastUuid: pocketcastsEpisode.podcastUuid,
          podcastTitle: pocketcastsEpisode.podcastTitle,
          status: pocketcastsEpisode.status,
          playingStatus: pocketcastsEpisode.playingStatus,
          starred: pocketcastsEpisode.starred,
          playedUpTo: pocketcastsEpisode.playedUpTo,
          url: pocketcastsEpisode.url,
          duration: pocketcastsEpisode.duration,
          fileSize: pocketcastsEpisode.fileSize
        } as PocketCastsEpisodeMetadata
      }
    }
  }
} 