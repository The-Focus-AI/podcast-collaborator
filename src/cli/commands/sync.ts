import { Command } from 'commander'
import { StorageProvider } from '../../storage/StorageProvider.js'
import { PocketCastsService } from '../../services/PocketCastsService.js'
import { logger } from '../../utils/logger.js'
import { OnePasswordService } from '../../services/OnePasswordService.js'

interface SyncOptions {
  email?: string
  password?: string
  starred?: boolean
  listened?: boolean
  onepassword?: boolean
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

        // Check if project is initialized
        if (!(await storage.isInitialized())) {
          logger.commandError('Project not initialized. Run "podcast-cli init" first.')
          throw new Error('Project not initialized')
        }

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
            // TODO: Save episodes to storage
          } else if (options.listened) {
            const episodes = await pocketCastsService.getListenedEpisodes()
            logger.commandSuccess(`Found ${episodes.length} listened episodes`)
            // TODO: Save episodes to storage
          } else {
            const starredEpisodes = await pocketCastsService.getStarredEpisodes()
            const listenedEpisodes = await pocketCastsService.getListenedEpisodes()
            logger.commandSuccess(`Found ${starredEpisodes.length} starred and ${listenedEpisodes.length} listened episodes`)
            // TODO: Save episodes to storage
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