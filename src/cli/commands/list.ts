import { Command } from 'commander'
import { StorageProvider } from '@/storage/StorageProvider.js'
import chalk from 'chalk'
import type { RawPocketCastsEpisode } from '@/storage/interfaces.js'

interface ListOptions {
  starred?: boolean
  listened?: boolean
  downloaded?: boolean
  transcribed?: boolean
  json?: boolean
}

function formatDuration(duration: number): string {
  const hours = Math.floor(duration / 3600)
  const minutes = Math.floor((duration % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h${minutes}m`.padStart(6)
  }
  return `${minutes}m`.padStart(6)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate().toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${month} ${day}, ${year}`
}

function getStatusSymbols(episode: RawPocketCastsEpisode): string {
  const starred = episode.starred ? chalk.yellow('★') : ' '
  const listened = episode.playingStatus === 3 ? chalk.green('✓') : ' '
  const transcribed = false ? chalk.blue('T') : ' ' // TODO: Add actual transcription check
  return `${starred}${listened}${transcribed} `
}

function getProgress(episode: RawPocketCastsEpisode): string {
  if (episode.playingStatus === 3) return '100%';
  if (episode.playedUpTo > 0) {
    const progress = Math.min(100, Math.round((episode.playedUpTo / episode.duration) * 100));
    return `${progress}%`;
  }
  return '0%';
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str.padEnd(maxLength);
  return str.slice(0, maxLength - 1) + '…';
}

function isEpisodeListened(episode: RawPocketCastsEpisode): boolean {
  return episode.playingStatus === 3 || episode.playedUpTo >= episode.duration
}

function formatEpisode(episode: RawPocketCastsEpisode): string {
  const date = chalk.blue(formatDate(episode.published).padEnd(12));  // 12 chars
  const status = getStatusSymbols(episode).padEnd(4);                // 4 chars
  const duration = chalk.yellow(formatDuration(episode.duration).padEnd(7)); // 7 chars
  const progress = chalk.cyan(getProgress(episode).padStart(4));     // 4 chars

  // Calculate remaining space for titles
  const totalWidth = process.stdout.columns || 120;
  const usedWidth = 12 + 4 + 7 + 4 + 4; // date + status + duration + progress + padding
  const remainingWidth = totalWidth - usedWidth;
  
  // Split remaining width between podcast and episode titles (40/60 split)
  const podcastWidth = Math.floor(remainingWidth * 0.4);
  const episodeWidth = remainingWidth - podcastWidth - 1; // -1 for space between titles

  const podcastTitle = truncate(episode.podcastTitle, podcastWidth);
  const episodeTitle = truncate(episode.title, episodeWidth);

  // Ensure consistent spacing and handle special cases
  return `${date}${status}${duration} ${chalk.green(podcastTitle.padEnd(podcastWidth))} ${episodeTitle.padEnd(episodeWidth)}${progress}`;
}

export function createListCommand(storageProvider: StorageProvider): Command {
  return new Command('list')
    .description('List episodes')
    .option('--starred', 'Show only starred episodes')
    .option('--listened', 'Show only listened episodes')
    .option('--downloaded', 'Show only downloaded episodes')
    .option('--transcribed', 'Show only transcribed episodes')
    .option('--json', 'Output in JSON format')
    .action(async (options: ListOptions) => {
      try {
        const storage = storageProvider.getStorage()

        // Get both starred and listened episodes
        const [starredEpisodes, listenedEpisodes] = await Promise.all([
          storage.getRawData('starred'),
          storage.getRawData('listened')
        ])

        // Merge episodes and deduplicate by UUID
        const episodeMap = new Map<string, RawPocketCastsEpisode>()
        for (const episode of [...starredEpisodes, ...listenedEpisodes]) {
          episodeMap.set(episode.uuid, episode)
        }
        let episodes = Array.from(episodeMap.values())

        // Apply filters
        if (options.starred) {
          episodes = episodes.filter(e => e.starred)
        }
        if (options.listened) {
          episodes = episodes.filter(e => isEpisodeListened(e))
        }
        if (options.downloaded) {
          console.warn(chalk.yellow('Download filtering not yet implemented'))
        }
        if (options.transcribed) {
          console.warn(chalk.yellow('Transcription filtering not yet implemented'))
        }

        if (episodes.length === 0) {
          console.log('No episodes found')
          return
        }

        // Sort by publish date (newest first)
        episodes.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())

        // Output
        if (options.json) {
          console.log(JSON.stringify(episodes, null, 2))
          return
        }

        // Print episodes
        for (const episode of episodes) {
          console.log(formatEpisode(episode))
        }
      } catch (error) {
        console.error('Error listing episodes:', error)
        process.exit(1)
      }
    })
} 