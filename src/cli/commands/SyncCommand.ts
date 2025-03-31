import { Command } from '../Command.js'
import type { CommandResult } from '../Command.js'
import type { StorageProvider } from '@/storage/StorageProvider.js'
import { PocketCastsService } from '@/services/PocketCastsService.js'
import { z } from 'zod'

interface SyncOptions {
  email?: string
  password?: string
  help?: boolean
  starred?: boolean
  listened?: boolean
  inProgress?: boolean
}

const HELP_TEXT = `
Usage: podcast-cli sync [options]

Sync episodes from your PocketCasts account.

Options:
  --email        Your PocketCasts email address
  --password     Your PocketCasts password
  --starred      Sync starred episodes only
  --listened     Sync listened episodes only
  --in-progress  Sync in-progress episodes only
  --help         Show this help message

If no filter options are provided, all episodes will be synced.

Example:
  podcast-cli sync --email "user@example.com" --password "secret"
  podcast-cli sync --starred  # Sync only starred episodes
`.trim()

export class SyncCommand implements Command {
  name = 'sync'
  description = 'Sync episodes from PocketCasts'

  constructor(
    private readonly storageProvider: StorageProvider,
    private readonly pocketCastsService: PocketCastsService
  ) {}

  async execute(args: string[] = []): Promise<CommandResult> {
    try {
      // Parse options
      const options = this.parseArgs(args)

      // Show help if requested
      if (options.help) {
        return {
          success: true,
          message: HELP_TEXT
        }
      }

      // Get storage and check if initialized
      const storage = this.storageProvider.getStorage()
      if (!await storage.isInitialized()) {
        return {
          success: false,
          message: 'Project not initialized. Run "podcast-cli init" first.'
        }
      }

      // Login if credentials provided
      if (options.email && options.password) {
        await this.pocketCastsService.login(options.email, options.password)
      }

      // Determine which episodes to sync
      const episodes: { type: string; items: any[] }[] = []

      if (!options.starred && !options.listened && !options.inProgress) {
        // Sync all types if no filters specified
        episodes.push(
          { type: 'starred', items: await this.pocketCastsService.getStarredEpisodes() },
          { type: 'listened', items: await this.pocketCastsService.getListenedEpisodes() },
          { type: 'in_progress', items: await this.pocketCastsService.getInProgressEpisodes() }
        )
      } else {
        // Sync only specified types
        if (options.starred) {
          episodes.push({ type: 'starred', items: await this.pocketCastsService.getStarredEpisodes() })
        }
        if (options.listened) {
          episodes.push({ type: 'listened', items: await this.pocketCastsService.getListenedEpisodes() })
        }
        if (options.inProgress) {
          episodes.push({ type: 'in_progress', items: await this.pocketCastsService.getInProgressEpisodes() })
        }
      }

      // Convert and store episodes
      let totalSynced = 0
      const results: string[] = []

      for (const { type, items } of episodes) {
        const count = items.length
        totalSynced += count
        results.push(`${count} ${type} episodes`)

        for (const item of items) {
          await storage.createEpisode({
            id: item.uuid,
            title: item.title,
            number: 0, // Not available from PocketCasts
            status: 'draft',
            created: new Date(item.published),
            updated: new Date(),
            metadata: {
              pocketcasts: {
                podcastUuid: item.podcastUuid,
                podcastTitle: item.podcastTitle,
                url: item.url,
                duration: item.duration,
                fileSize: item.fileSize,
                playingStatus: item.playingStatus,
                starred: item.starred,
                playedUpTo: item.playedUpTo
              }
            }
          })
        }
      }

      return {
        success: true,
        message: `Successfully synced ${totalSynced} episodes:\n` +
          results.map(r => `- ${r}`).join('\n')
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to sync episodes: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private parseArgs(args: string[]): SyncOptions {
    const options: SyncOptions = {}
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      const nextArg = args[i + 1]

      if (!nextArg && !['--help', '--starred', '--listened', '--in-progress'].includes(arg)) {
        throw new Error(`Missing value for option: ${arg}`)
      }

      switch (arg) {
        case '--help':
          options.help = true
          break
        case '--starred':
          options.starred = true
          break
        case '--listened':
          options.listened = true
          break
        case '--in-progress':
          options.inProgress = true
          break
        case '--email':
          options.email = nextArg
          i++
          break
        case '--password':
          options.password = nextArg
          i++
          break
        default:
          if (arg.startsWith('--')) {
            throw new Error(`Unknown option: ${arg}`)
          }
      }
    }

    return options
  }
} 