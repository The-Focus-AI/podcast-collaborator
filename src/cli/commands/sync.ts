import { Command } from 'commander'
import { PocketCastsServiceImpl } from '@/services/PocketCastsService.js'
import { OnePasswordService } from '@/services/OnePasswordService.js'
import { StorageProvider } from '@/storage/StorageProvider.js'
import type { RawPocketCastsEpisode } from '@/storage/interfaces.js'

export const sync = new Command('sync')
  .description('Sync episodes from PocketCasts')
  .action(async () => {
    try {
      const service = new PocketCastsServiceImpl()
      const onePasswordService = new OnePasswordService()
      const storageProvider = new StorageProvider()
      
      // Initialize storage
      await storageProvider.initialize()
      const storage = storageProvider.getStorage()
      
      // Login first
      const credentials = await onePasswordService.getCredentials()
      await service.login(credentials.email, credentials.password)

      // Get starred episodes
      console.log('Fetching starred episodes...')
      const starredEpisodes = await service.getStarredEpisodes() as RawPocketCastsEpisode[]
      await storage.saveRawData('starred', starredEpisodes)
      console.log(`Found ${starredEpisodes.length} starred episodes`)

      // Get listened episodes
      console.log('Fetching listened episodes...')
      const listenedEpisodes = await service.getListenedEpisodes() as RawPocketCastsEpisode[]
      await storage.saveRawData('listened', listenedEpisodes)
      console.log(`Found ${listenedEpisodes.length} listened episodes`)

      console.log('Raw episode data has been saved')
    } catch (error) {
      console.error('Error syncing episodes:', error)
      process.exit(1)
    }
  }) 