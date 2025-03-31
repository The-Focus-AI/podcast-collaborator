import { z } from 'zod'
import { Episode } from '@/storage/interfaces.js'

// Types
export interface PocketCastsEpisodeMetadata {
  podcastUuid: string
  podcastTitle: string
  status: 'unplayed' | 'played' | 'in_progress'
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
  status: 'unplayed' | 'played' | 'in_progress'
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
  status: z.enum(['unplayed', 'in_progress', 'played']),
  playingStatus: z.number(),
  starred: z.boolean(),
  playedUpTo: z.number()
})

export interface PocketCastsService {
  login(email: string, password: string): Promise<void>
  getListenedEpisodes(): Promise<PocketCastsEpisode[]>
  getStarredEpisodes(): Promise<PocketCastsEpisode[]>
  getInProgressEpisodes(): Promise<PocketCastsEpisode[]>
}

export class PocketCastsServiceImpl implements PocketCastsService {
  private token: string | null = null
  private readonly baseUrl = 'https://api.pocketcasts.com/user'

  async login(email: string, password: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    })

    if (!response.ok) {
      throw new Error(`Failed to login: ${response.statusText}`)
    }

    const data = await response.json()
    this.token = data.token
  }

  private async fetchEpisodes(endpoint: string): Promise<PocketCastsEpisode[]> {
    if (!this.token) {
      throw new Error('Not logged in')
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch episodes: ${response.statusText}`)
    }

    const data = await response.json()
    return data.episodes
  }

  async getListenedEpisodes(): Promise<PocketCastsEpisode[]> {
    return this.fetchEpisodes('/episodes/listened')
  }

  async getStarredEpisodes(): Promise<PocketCastsEpisode[]> {
    return this.fetchEpisodes('/episodes/starred')
  }

  async getInProgressEpisodes(): Promise<PocketCastsEpisode[]> {
    return this.fetchEpisodes('/episodes/in_progress')
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