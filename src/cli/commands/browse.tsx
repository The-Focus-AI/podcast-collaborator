import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { App } from '@/App.js';
import { PocketCastsServiceImpl } from '@/services/PocketCastsService.js';
import { OnePasswordService } from '@/services/OnePasswordService.js';
import { StorageProvider } from '@/storage/StorageProvider.js';
import { logger } from '@/utils/logger.js';

export const browse = new Command('browse')
  .description('Browse and manage podcast episodes')
  .action(async () => {
    try {
      const onePasswordService = new OnePasswordService();
      const storageProvider = new StorageProvider();
      await storageProvider.initialize();
      
      const pocketCastsService = new PocketCastsServiceImpl(
        onePasswordService,
        storageProvider.getStorage()
      );

      const { waitUntilExit } = render(
        <App
          storageProvider={storageProvider}
          pocketCastsService={pocketCastsService}
          onePasswordService={onePasswordService}
        />
      );

      await waitUntilExit();
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error(error, { source: 'browse' });
      } else {
        logger.error('Unknown error in browse command', { source: 'browse' });
      }
      process.exit(1);
    }
  }); 