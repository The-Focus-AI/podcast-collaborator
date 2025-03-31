#!/usr/bin/env node
import React from 'react';
import { Command } from 'commander';
import { StorageProvider } from './storage/StorageProvider.js';
import { PocketCastsServiceImpl } from './services/PocketCastsService.js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { createSyncCommand } from './cli/commands/sync.js';
import { createVersionCommand } from './cli/commands/version.js';
import { createBrowseCommand } from './cli/commands/browse.js';

async function getPackageVersion(): Promise<string> {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const packagePath = join(__dirname, '..', 'package.json');
  const packageJson = await readFile(packagePath, 'utf-8');
  return JSON.parse(packageJson).version;
}

async function main() {
  try {
    const program = new Command();
    const version = await getPackageVersion();
    const storageProvider = new StorageProvider();
    const pocketCastsService = new PocketCastsServiceImpl();

    program
      .name('podcast-cli')
      .description('A CLI tool for podcast collaboration and management')
      .version(version);

    // Add commands
    program.addCommand(createSyncCommand(storageProvider, pocketCastsService));
    program.addCommand(createVersionCommand());
    
    // Add browse command and set it as default
    const browseCommand = createBrowseCommand(storageProvider, pocketCastsService);
    program.addCommand(browseCommand);
    
    // Make browse the default command
    program.addHelpCommand(false); // Disable the default help command
    program.action(async () => {
      // If no command is specified, run the browse command
      await browseCommand.parseAsync(process.argv);
    });

    await program.parseAsync(process.argv);
  } catch (error) {
    console.error('Fatal error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 