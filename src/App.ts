import { Command } from 'commander';
import { createSyncCommand } from './cli/commands/sync.js';
import { createVersionCommand } from './cli/commands/version.js';
import { StorageProvider } from './storage/StorageProvider.js';
import { PocketCastsServiceImpl } from './services/PocketCastsService.js';
import { logger } from './utils/logger.js';

export interface CommandResult {
  success: boolean;
  error?: string;
}

export class App {
  private program: Command;
  private storageProvider: StorageProvider;
  private pocketCastsService: PocketCastsServiceImpl;

  constructor(storageProvider: StorageProvider) {
    this.program = new Command();
    this.storageProvider = storageProvider;
    this.pocketCastsService = new PocketCastsServiceImpl();
    
    // Add commands
    this.program.addCommand(createSyncCommand(this.storageProvider, this.pocketCastsService));
    this.program.addCommand(createVersionCommand());

    // Add global options
    this.program
      .name('podcast-collaborator')
      .description('A tool for syncing podcasts from PocketCasts')
      .version('1.0.0');

    // Add error handler
    this.program.exitOverride((err) => {
      if (err.code === 'commander.help' || err.code === 'commander.version') {
        // Don't throw for help or version
        process.exitCode = 0;
        return;
      }
      throw err;
    });
  }

  async run(args: string[]): Promise<CommandResult> {
    try {
      await this.program.parseAsync(args);
      return { success: true };
    } catch (error) {
      if (error instanceof Error) {
        // Handle help and version commands
        if (error.message.includes('commander.help') || error.message.includes('commander.version')) {
          return { success: true };
        }

        // Handle known errors
        if (error.message.includes('unknown command')) {
          logger.commandError(`error: ${error.message}`);
          return {
            success: false,
            error: `error: ${error.message}`
          };
        }

        // Handle specific command errors
        const knownErrors = [
          'Failed to sync episodes',
          'Failed to read package.json',
          'Invalid credentials or session expired',
          'Failed to get credentials from 1Password',
          'Missing credentials'
        ];

        for (const knownError of knownErrors) {
          if (error.message.includes(knownError)) {
            logger.commandError(error.message);
            return {
              success: false,
              error: error.message
            };
          }
        }

        // Handle unknown errors
        logger.commandError('An unexpected error occurred');
        logger.error(error.message);
        return {
          success: false,
          error: error.message
        };
      }

      // Handle non-Error objects
      logger.commandError('An unknown error occurred');
      return {
        success: false,
        error: 'An unknown error occurred'
      };
    }
  }
} 