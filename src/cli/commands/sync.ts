import { Command } from 'commander'
import { StorageProvider } from '../../storage/StorageProvider.js'
import { PocketCastsService, PocketCastsEpisode } from '../../services/PocketCastsService.js'
import { logger } from '../../utils/logger.js'
import { OnePasswordService } from '../../services/OnePasswordService.js'
import { Episode } from '../../storage/interfaces.js'

interface SyncOptions {
  email?: string
  password?: string
  starred?: boolean
  listened?: boolean
  onepassword?: boolean
}

function convertPocketCastsEpisode(episode: PocketCastsEpisode, isStarred: boolean, isListened: boolean): Episode {
  return {
    id: episode.uuid,
    title: episode.title,
    url: episode.url,
    podcastName: episode.podcastTitle,
    podcastAuthor: '', // PocketCasts API doesn't provide author info
    description: '', // PocketCasts API doesn't provide description in episode list
    publishDate: new Date(episode.published),
    duration: episode.duration,
    isStarred,
    isListened,
    progress: episode.playedUpTo / episode.duration,
    syncedAt: new Date()
  }
}

export function createSyncCommand(
  storageProvider: StorageProvider,
  pocketCastsService: PocketCastsService
): Command {
  const command = new Command('sync')
    .description('Sync episodes from PocketCasts')
    .option('--email <email>', 'Your PocketCasts email')
    .option('--password <password>', 'Your PocketCasts password')
    .option('--starred', 'Only sync starred episodes')
    .option('--listened', 'Only sync listened episodes')
    .option('--onepassword', 'Use 1Password to get credentials')
    .action(async (options: SyncOptions) => {
      try {
        const storage = storageProvider.getStorage()
        await storageProvider.initialize()

        let email = options.email
        let password = options.password

        // Get credentials from 1Password if requested
        if (options.onepassword) {
          try {
            const onePasswordService = new OnePasswordService()
            const credentials = await onePasswordService.getCredentials('PocketCasts')
            email = credentials.email
            password = credentials.password
          } catch (error) {
            logger.commandError('Failed to get credentials from 1Password:')
            logger.error(error instanceof Error ? error.message : error)
            throw new Error('Failed to get credentials from 1Password')
          }
        }

        // Validate credentials
        if (!email || !password) {
          logger.commandError('Email and password are required. Provide them as options or use --onepassword.')
          throw new Error('Missing credentials')
        }

        // Login to PocketCasts
        try {
          await pocketCastsService.login(email, password)
        } catch (error) {
          logger.commandError('Failed to login to PocketCasts:')
          logger.error(error instanceof Error ? error.message : error)
          throw new Error('Failed to login to PocketCasts')
        }

        // Get episodes based on filters
        try {
          if (options.starred) {
            const episodes = await pocketCastsService.getStarredEpisodes()
            logger.commandSuccess(`Found ${episodes.length} starred episodes`)
            // Save episodes to storage
            for (const episode of episodes) {
              await storage.saveEpisode(convertPocketCastsEpisode(episode, true, false))
            }
          } else if (options.listened) {
            const episodes = await pocketCastsService.getListenedEpisodes()
            logger.commandSuccess(`Found ${episodes.length} listened episodes`)
            // Save episodes to storage
            for (const episode of episodes) {
              await storage.saveEpisode(convertPocketCastsEpisode(episode, false, true))
            }
          } else {
            const starredEpisodes = await pocketCastsService.getStarredEpisodes()
            const listenedEpisodes = await pocketCastsService.getListenedEpisodes()
            logger.commandSuccess(`Found ${starredEpisodes.length} starred and ${listenedEpisodes.length} listened episodes`)
            // Save all episodes to storage
            for (const episode of starredEpisodes) {
              await storage.saveEpisode(convertPocketCastsEpisode(episode, true, false))
            }
            for (const episode of listenedEpisodes) {
              await storage.saveEpisode(convertPocketCastsEpisode(episode, false, true))
            }
          }
        } catch (error) {
          logger.commandError('Failed to sync episodes:')
          logger.error(error instanceof Error ? error.message : error)
          throw new Error('Failed to sync episodes')
        }

        logger.commandSuccess('Successfully synced episodes')
      } catch (error) {
        logger.commandError('Failed to sync episodes:')
        logger.error(error instanceof Error ? error.message : error)
        throw error
      }
    })

  return command
} 