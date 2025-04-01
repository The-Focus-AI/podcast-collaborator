import { Command } from 'commander';
import React from 'react';
import { render } from 'ink';
import { PodcastBrowser } from '../../components/PodcastBrowser.js';
import { StorageProvider } from '../../storage/StorageProvider.js';
import { PocketCastsService } from '../../services/PocketCastsService.js';
import { EpisodeService, EpisodeServiceImpl } from '../../services/EpisodeService.js';
import { logger } from '../../utils/logger.js';

export function createBrowseCommand(
  storageProvider: StorageProvider,
  pocketCastsService: PocketCastsService
): Command {
  const command = new Command('browse')
    .description('Browse podcast episodes')
    .action(async () => {
      try {
        // Initialize storage if needed
        await storageProvider.initialize();
        logger.commandSuccess('Storage initialized');

        // Create episode service
        const episodeService = new EpisodeServiceImpl(storageProvider, pocketCastsService);

        // Get episodes from storage
        const episodes = await episodeService.listEpisodes();

        // Create a single render instance
        const instance = render(
          React.createElement(PodcastBrowser, {
            episodes,
            onEpisodesUpdated: async (updatedEpisodes) => {
              // Just update the episodes prop
              instance.rerender(
                React.createElement(PodcastBrowser, {
                  episodes: updatedEpisodes,
                  onEpisodesUpdated: async (newEpisodes) => {
                    // This will be called for subsequent updates
                    instance.rerender(
                      React.createElement(PodcastBrowser, {
                        episodes: newEpisodes,
                        episodeService
                      })
                    );
                  },
                  episodeService
                })
              );
            },
            episodeService
          })
        );

        // Wait for the app to exit
        await instance.waitUntilExit();
      } catch (error) {
        logger.commandError('Failed to browse episodes:');
        if (error instanceof Error) {
          logger.error(error.message);
        } else {
          logger.error(String(error));
        }
        throw error;
      }
    });

  return command;
} 