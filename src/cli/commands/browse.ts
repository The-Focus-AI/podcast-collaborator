import { Command } from 'commander';
import React from 'react';
import { render } from 'ink';
import { PodcastBrowser } from '../../components/PodcastBrowser.js';
import { StorageProvider } from '../../storage/StorageProvider.js';
import { PocketCastsService } from '../../services/PocketCastsService.js';
import { OnePasswordService } from '../../services/OnePasswordService.js';
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

        // Get storage instance
        const storage = await storageProvider.getStorage();
        
        // Get initial episodes
        const episodes = await storage.listEpisodes();

        // Create OnePassword service
        const onePasswordService = new OnePasswordService();

        // Create a single render instance
        const { waitUntilExit } = render(
          React.createElement(PodcastBrowser, {
            episodes,
            onEpisodesUpdated: async (updatedEpisodes) => {
              // Just update the episodes prop
              render(
                React.createElement(PodcastBrowser, {
                  episodes: updatedEpisodes,
                  onEpisodesUpdated: async (newEpisodes) => {
                    // This will be called for subsequent updates
                    render(
                      React.createElement(PodcastBrowser, {
                        episodes: newEpisodes,
                        storageProvider,
                        pocketCastsService,
                        onePasswordService
                      })
                    );
                  },
                  storageProvider,
                  pocketCastsService,
                  onePasswordService
                })
              );
            },
            storageProvider,
            pocketCastsService,
            onePasswordService
          })
        );

        // Wait for the app to exit
        await waitUntilExit();
      } catch (error) {
        logger.commandError('Failed to browse episodes:');
        logger.error(error instanceof Error ? error.message : error);
        throw error;
      }
    });

  return command;
} 