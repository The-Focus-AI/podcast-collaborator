import { Command } from 'commander';
import { StorageProvider } from '../../storage/StorageProvider.js';
import { PocketCastsService } from '../../services/PocketCastsService.js';
import { EpisodeServiceImpl } from '../../services/EpisodeService.js';
import chalk from 'chalk';
import { logger } from '../../utils/logger.js';

export function createNotesCommand(
  storageProvider: StorageProvider,
  pocketCastsService: PocketCastsService
): Command {
  return new Command('notes')
    .description('Show notes for a specific episode')
    .argument('<episodeId>', 'ID of the episode to show notes for')
    .action(async (episodeId: string) => {
      try {
        // Initialize storage if needed
        await storageProvider.initialize();
        logger.commandSuccess('Storage initialized');

        const episodeService = new EpisodeServiceImpl(storageProvider, pocketCastsService);
        const storage = storageProvider.getStorage();
        const episode = await storage.getEpisode(episodeId);
        
        if (!episode) {
          logger.commandError(`Episode ${episodeId} not found`);
          process.exit(1);
        }

        // Print episode header
        console.log(chalk.blue.bold(episode.podcastName));
        console.log(chalk.bold(episode.title));
        console.log();

        if (!episode.description) {
          console.log(chalk.yellow('Loading show notes...'));
          try {
            const updatedEpisode = await episodeService.loadShowNotes(episodeId);
            if (updatedEpisode.description) {
              console.log(chalk.white(updatedEpisode.description));
            } else {
              console.log(chalk.gray('No show notes available'));
            }
          } catch (error) {
            logger.commandError('Failed to load show notes:');
            if (error instanceof Error) {
              logger.error(error.message);
            } else {
              logger.error(String(error));
            }
            process.exit(1);
          }
        } else {
          console.log(chalk.white(episode.description));
        }

        if (episode.notes) {
          console.log();
          console.log(chalk.cyan.bold('User Notes:'));
          console.log(chalk.cyan(episode.notes));
        }
      } catch (error) {
        logger.commandError('Failed to show notes:');
        if (error instanceof Error) {
          logger.error(error.message);
        } else {
          logger.error(String(error));
        }
        process.exit(1);
      }
    });
} 