import { Command } from '../Command.js'
import type { CommandResult } from '../Command.js'
import type { StorageProvider } from '@/storage/StorageProvider.js'
import { ProjectConfigSchema } from '@/storage/interfaces.js'
import { z } from 'zod'
import os from 'os'
import { join } from 'path'

interface InitOptions {
  name?: string
  author?: string
  email?: string
  description?: string
  path?: string
  help?: boolean
  dryRun?: boolean
}

const HELP_TEXT = `
Usage: podcast-cli init [options]

Initialize a new podcast project in the current directory.

Options:
  --name         The name of your podcast (default: "My Podcast")
  --author       Your name as the podcast author (default: system user)
  --email        Your email address (required for some services)
  --description  A brief description of your podcast
  --path         Custom path for project storage (default: current directory)
  --dry-run      Show what would be done without making changes
  --help         Show this help message

Example:
  podcast-cli init --name "My Tech Show" --author "Jane Smith" --email "jane@example.com"
  podcast-cli init --path ~/podcasts/my-show --name "My Show"
`.trim()

export class InitCommand implements Command {
  name = 'init'
  description = 'Initialize a new podcast project'

  constructor(private readonly storageProvider: StorageProvider) {}

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
      try {
        ProjectConfigSchema.parse(config)
      } catch (error) {
        if (error instanceof z.ZodError) {
          const issues = error.issues.map(issue => `- ${issue.path.join('.')}: ${issue.message}`).join('\n')
          return {
            success: false,
            message: `Invalid configuration:\n${issues}`
          }
        }
        throw error
      }

      // Configure storage with custom path if provided
      if (options.path) {
        this.storageProvider.configure({ type: 'filesystem', path: options.path })
      }

      // Get storage and check if already initialized
      const storage = this.storageProvider.getStorage()
      
      // Check if project is already initialized
      if (await storage.isInitialized()) {
        return {
          success: false,
          message: 'Project is already initialized in this directory.'
        }
      }

      // If dry run, just show what would be done
      if (options.dryRun) {
        const storagePath = options.path || process.cwd()
        return {
          success: true,
          message: `Would initialize podcast project "${config.name}" with:\n` +
            `- Storage: ${storage.constructor.name}\n` +
            `- Path: ${storagePath}\n` +
            `- Author: ${config.author}\n` +
            `- Email: ${config.email}\n` +
            (config.description ? `- Description: ${config.description}\n` : '') +
            '\nNo changes were made (dry run).'
        }
      }

      // Initialize project
      await storage.initializeProject(config)

      // Get the actual storage path
      const storagePath = options.path || process.cwd()

      return {
        success: true,
        message: `Successfully initialized podcast project "${config.name}":\n` +
          `- Storage: ${storage.constructor.name}\n` +
          `- Path: ${storagePath}\n` +
          `- Author: ${config.author}\n` +
          `- Email: ${config.email}\n` +
          (config.description ? `- Description: ${config.description}\n` : '') +
          '\nReady to start creating episodes!'
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to initialize project: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private parseArgs(args: string[]): InitOptions {
    const options: InitOptions = {}
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      const nextArg = args[i + 1]

      if (!nextArg && arg !== '--help' && arg !== '--dry-run') {
        throw new Error(`Missing value for option: ${arg}`)
      }

      switch (arg) {
        case '--help':
          options.help = true
          break
        case '--dry-run':
          options.dryRun = true
          break
        case '--name':
          options.name = nextArg
          i++
          break
        case '--author':
          options.author = nextArg
          i++
          break
        case '--email':
          options.email = nextArg
          i++
          break
        case '--description':
          options.description = nextArg
          i++
          break
        case '--path':
          options.path = nextArg
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