#!/usr/bin/env node
import { Command } from 'commander'
import { StorageProvider } from './storage/StorageProvider.js'
import { PocketCastsServiceImpl } from './services/PocketCastsService.js'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { join } from 'path'
import { createInitCommand } from './cli/commands/init.js'
import { createSyncCommand } from './cli/commands/sync.js'
import { createVersionCommand } from './cli/commands/version.js'

async function getPackageVersion(): Promise<string> {
  const __dirname = fileURLToPath(new URL('.', import.meta.url))
  const packagePath = join(__dirname, '..', 'package.json')
  const packageJson = await readFile(packagePath, 'utf-8')
  return JSON.parse(packageJson).version
}

async function main() {
  const program = new Command()
  const version = await getPackageVersion()
  const storageProvider = new StorageProvider()
  const pocketCastsService = new PocketCastsServiceImpl()

  program
    .name('podcast-cli')
    .description('A CLI tool for podcast collaboration and management')
    .version(version)

  // Add commands
  program.addCommand(createInitCommand(storageProvider))
  program.addCommand(createSyncCommand(storageProvider, pocketCastsService))
  program.addCommand(createVersionCommand())

  await program.parseAsync(process.argv)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
}) 