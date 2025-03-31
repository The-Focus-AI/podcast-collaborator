import { Command } from 'commander';
import { createSyncCommand } from './commands/sync.js';
import { createBrowseCommand } from './commands/browse.js';
import { StorageProvider } from '../storage/StorageProvider.js';
import { PocketCastsServiceImpl } from '../services/PocketCastsService.js';

const program = new Command();

// Initialize services
const storageProvider = new StorageProvider();
const pocketCastsService = new PocketCastsServiceImpl();

// Add commands
program
  .name('podcast-collaborator')
  .description('CLI tool for managing podcast episodes')
  .version('0.1.0');

// Add sync command
program.addCommand(createSyncCommand(storageProvider, pocketCastsService));

// Add browse command and set it as default
const browseCommand = createBrowseCommand(storageProvider);
program.addCommand(browseCommand);
program.action(async () => {
  await browseCommand.parseAsync(process.argv);
});

export default program; 