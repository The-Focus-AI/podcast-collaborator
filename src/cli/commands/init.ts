import { Command } from 'commander'
import { StorageProvider } from '@/storage/StorageProvider.js'
import { ProjectConfigSchema } from '@/storage/interfaces.js'
import { logger } from '@/utils/logger.js'
import os from 'os'

interface InitOptions {
  name?: string
  author?: string
  email?: string
  description?: string
  path?: string
  dryRun?: boolean
}

export function createInitCommand(storageProvider: StorageProvider): Command {
  const command = new Command('init')
    .description('Initialize a new podcast project')
    .option('--name <n>', 'The name of your podcast')
    .option('--author <author>', 'Your name as the podcast author')
    .option('--email <email>', 'Your email address')
    .option('--description <description>', 'A brief description of your podcast')
    .option('--path <path>', 'Custom path for project storage')
    .option('--dry-run', 'Show what would be done without making changes')
    .action(async (options: InitOptions) => {
      try {
        // Get system username for default author
        const username = os.userInfo().username

        // Create project config
        const config = {
          name: options.name || 'My Podcast',
          author: options.author || username,
          email: options.email || `${username}@${os.hostname()}`,
          description: options.description,
          created: new Date(),
          updated: new Date()
        }

        // Validate config
        ProjectConfigSchema.parse(config)

        // Configure storage with custom path if provided
        if (options.path) {
          storageProvider.configure({ type: 'filesystem', path: options.path })
        }

        const storage = storageProvider.getStorage()

        // Check if project is already initialized
        if (await storage.isInitialized()) {
          logger.commandError('Project is already initialized in this directory.')
          throw new Error('Project is already initialized')
        }

        // If dry run, just show what would be done
        if (options.dryRun) {
          const storagePath = options.path || process.cwd()
          const message = {
            name: config.name,
            storage: storage.constructor.name,
            path: storagePath,
            author: config.author,
            email: config.email,
            description: config.description,
            dryRun: true
          }
          logger.commandOutput('Would initialize podcast project:', { json: true })
          logger.info(message, { json: true })
          return
        }

        // Initialize project
        await storage.initializeProject(config)

        // Get the actual storage path
        const storagePath = options.path || process.cwd()
        const message = {
          name: config.name,
          storage: storage.constructor.name,
          path: storagePath,
          author: config.author,
          email: config.email,
          description: config.description
        }
        logger.commandSuccess('Successfully initialized podcast project:', { json: true })
        logger.info(message, { json: true })
      } catch (error) {
        logger.commandError('Failed to initialize project:', { json: true })
        logger.error(error instanceof Error ? error.message : error)
        throw new Error('Failed to initialize project')
      }
    })

  return command
} 