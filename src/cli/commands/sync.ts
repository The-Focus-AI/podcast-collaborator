import { Command } from 'commander'
import { PocketCastsServiceImpl } from '@/services/PocketCastsService.js'
import { OnePasswordService } from '@/services/OnePasswordService.js'
import { StorageProvider } from '@/storage/StorageProvider.js'
import type { RawPocketCastsEpisode } from '@/storage/interfaces.js'
import { logger } from '@/utils/logger.js'
import { EpisodeServiceImpl } from '@/services/EpisodeService.js'

export const sync = new Command('sync')
  .description('Sync episodes from PocketCasts')
  .action(async () => {
    try {
      const onePasswordService = new OnePasswordService()
      const service = new PocketCastsServiceImpl(onePasswordService)
      const storageProvider = new StorageProvider()
      
      // Initialize storage
      await storageProvider.initialize()
      const storage = storageProvider.getStorage()
      
      // Login first
      logger.info('Logging in to PocketCasts...')
      await service.login()

      // Get starred episodes
      logger.info('Fetching starred episodes...')
      const starredEpisodes = await service.getStarredEpisodes() as RawPocketCastsEpisode[]
      await storage.saveRawData('starred', starredEpisodes)
      logger.info(`Found ${starredEpisodes.length} starred episodes`)

      // Get listened episodes
      logger.info('Fetching listened episodes...')
      const listenedEpisodes = await service.getListenedEpisodes() as RawPocketCastsEpisode[]
      await storage.saveRawData('listened', listenedEpisodes)
      logger.info(`Found ${listenedEpisodes.length} listened episodes`)

      logger.info('Raw episode data has been saved')

      // Convert and save episodes in proper format
      logger.info('Converting episodes to proper format...')
      const episodeService = new EpisodeServiceImpl(storageProvider, service)
      const episodes = await episodeService.syncEpisodes()
      logger.info(`Converted and saved ${episodes.length} episodes`)

    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error(error, { source: 'sync' });
      } else {
        logger.error('Unknown error during sync', { source: 'sync' });
      }
      process.exit(1)
    }
  }) 