import { Command } from '../Command.js'
import type { CommandResult } from '../Command.js'
import type { StorageProvider } from '../../storage/StorageProvider.js'
import { ProjectConfigSchema } from '../../storage/interfaces.js'
import { z } from 'zod'
import os from 'os'

interface InitOptions {
  name?: string
  author?: string
  email?: string
  description?: string
  help?: boolean
}

const HELP_TEXT = `
Usage: podcast-cli init [options]

Initialize a new podcast project in the current directory.

Options:
  --name         The name of your podcast (default: "My Podcast")
  --author       Your name as the podcast author (default: system user)
  --email        Your email address (required for some services)
  --description  A brief description of your podcast
  --help        Show this help message

Example:
  podcast-cli init --name "My Tech Show" --author "Jane Smith" --email "jane@example.com"
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

      // Get storage and check if already initialized
      const storage = this.storageProvider.getStorage()
      if (await storage.isInitialized()) {
        return {
          success: false,
          message: 'Project is already initialized in this directory.'
        }
      }

      // Initialize project
      await storage.initializeProject(config)

      return {
        success: true,
        message: `Initialized podcast project "${config.name}" in ${storage.constructor.name}`
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

      if (!nextArg && arg !== '--help') {
        throw new Error(`Missing value for option: ${arg}`)
      }

      switch (arg) {
        case '--help':
          options.help = true
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
        default:
          if (arg.startsWith('--')) {
            throw new Error(`Unknown option: ${arg}`)
          }
      }
    }

    return options
  }
} 