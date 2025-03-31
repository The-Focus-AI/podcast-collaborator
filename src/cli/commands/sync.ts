import { Command } from 'commander'
import { StorageProvider } from '../../storage/StorageProvider.js'
import { PocketCastsService, PocketCastsServiceImpl } from '../../services/PocketCastsService.js'
import { logger } from '../../utils/logger.js'
import { OnePasswordService } from '../../services/OnePasswordService.js'

interface SyncOptions {
  starred?: boolean
  listened?: boolean
}

export function createSyncCommand(
  storageProvider: StorageProvider,
  pocketCastsService: PocketCastsService
): Command {
  const command = new Command('sync')
    .description('Sync episodes from PocketCasts')
    .option('--starred', 'Only sync starred episodes')
    .option('--listened', 'Only sync listened episodes')
    .action(async (options: SyncOptions) => {
      try {
        const storage = storageProvider.getStorage()
        await storageProvider.initialize()

        // Always get credentials from 1Password
        let email: string
        let password: string
        try {
          const onePasswordService = new OnePasswordService()
          const credentials = await onePasswordService.getCredentials()
          email = credentials.email
          password = credentials.password
        } catch (error) {
          logger.commandError('Failed to get credentials from 1Password:')
          logger.error(error instanceof Error ? error.message : error)
          throw new Error('Failed to get credentials from 1Password')
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
              await storage.saveEpisode(PocketCastsServiceImpl.convertToEpisode(episode))
            }
          } else if (options.listened) {
            const episodes = await pocketCastsService.getListenedEpisodes()
            logger.commandSuccess(`Found ${episodes.length} listened episodes`)
            // Save episodes to storage
            for (const episode of episodes) {
              await storage.saveEpisode(PocketCastsServiceImpl.convertToEpisode(episode))
            }
          } else {
            const starredEpisodes = await pocketCastsService.getStarredEpisodes()
            const listenedEpisodes = await pocketCastsService.getListenedEpisodes()
            logger.commandSuccess(`Found ${starredEpisodes.length} starred and ${listenedEpisodes.length} listened episodes`)
            // Save all episodes to storage
            for (const episode of starredEpisodes) {
              await storage.saveEpisode(PocketCastsServiceImpl.convertToEpisode(episode))
            }
            for (const episode of listenedEpisodes) {
              await storage.saveEpisode(PocketCastsServiceImpl.convertToEpisode(episode))
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