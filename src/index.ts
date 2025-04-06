#!/usr/bin/env node
import React from 'react';
import { Command } from 'commander';
import { StorageProvider } from './storage/StorageProvider.js';
import { PocketCastsServiceImpl } from './services/PocketCastsService.js';
import { OnePasswordService } from './services/OnePasswordService.js';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { sync } from './cli/commands/sync.js';
import { createVersionCommand } from './cli/commands/version.js';
import { createBrowseCommand } from './cli/commands/browse.js';
import { createListCommand } from './cli/commands/list.js';
import { createNotesCommand } from './cli/commands/notes.js';
import { createTranscribeCommand } from './cli/commands/transcribe.js';
import { createPlayCommand } from './cli/commands/play.js'; // Added
import { createChatCommand } from './cli/commands/chat.js'; // Added
import { EpisodeServiceImpl } from './services/EpisodeService.js'; // Added for instantiation

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
    const onePasswordService = new OnePasswordService();
    const pocketCastsService = new PocketCastsServiceImpl(onePasswordService);
    const episodeService = new EpisodeServiceImpl(storageProvider, pocketCastsService); // Instantiate EpisodeService

    program
      .name('podcast-cli')
      .description('A CLI tool for podcast collaboration and management')
      .version(version);

    // Add commands
    program.addCommand(sync);
    program.addCommand(createVersionCommand());
    program.addCommand(createListCommand(storageProvider));
    program.addCommand(createNotesCommand(storageProvider, pocketCastsService));
    program.addCommand(createTranscribeCommand(storageProvider, pocketCastsService, onePasswordService, episodeService)); // Pass episodeService
    program.addCommand(createPlayCommand(episodeService)); // Pass EpisodeService
    program.addCommand(createChatCommand(episodeService)); // Pass EpisodeService

    // Add browse command and set it as default
    const browseCommand = createBrowseCommand(storageProvider, pocketCastsService);
    program.addCommand(browseCommand);

    // If no arguments, run browse command
    if (process.argv.length === 2) {
      process.argv.push('browse');
    }

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