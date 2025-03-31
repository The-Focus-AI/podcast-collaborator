import { Command } from 'commander';
import { StorageProvider } from '../../storage/StorageProvider.js';
import { logger } from '../../utils/logger.js';

export function createInitCommand(storageProvider: StorageProvider): Command {
  const command = new Command('init')
    .description('Initialize the podcast project')
    .option('--name <name>', 'Project name', 'My Podcast Library')
    .option('--author <author>', 'Author name')
    .option('--email <email>', 'Author email')
    .option('--description <description>', 'Project description', 'A library of synced podcasts')
    .action(async (options) => {
      try {
        const storage = storageProvider.getStorage();
        
        // Check if already initialized
        if (await storage.isInitialized()) {
          logger.commandWarning('Project is already initialized');
          return;
        }

        // Initialize with provided or default options
        await storage.initializeProject({
          name: options.name,
          author: options.author || process.env.USER || 'Unknown',
          email: options.email || `${process.env.USER}@${process.env.HOSTNAME || 'localhost'}`,
          description: options.description,
          created: new Date(),
          updated: new Date()
        });

        logger.commandSuccess('Project initialized successfully');
      } catch (error) {
        logger.commandError('Failed to initialize project:');
        logger.error(error instanceof Error ? error.message : error);
        throw error;
      }
    });

  return command;
} 