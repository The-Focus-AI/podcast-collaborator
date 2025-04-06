import { Command } from 'commander'
import { StorageProvider } from '@/storage/StorageProvider.js'
import chalk from 'chalk'
import type { RawPocketCastsEpisode, Episode } from '@/storage/interfaces.js';
import {
  formatDuration,
  formatDate,
  getProgress,
  truncate,
  isEpisodeListened
} from '../utils/formatters.js';

interface ListOptions {
  starred?: boolean
  listened?: boolean
  downloaded?: boolean
  transcribed?: boolean
  json?: boolean
}

// New function to get status symbols including transcription status
async function getEpisodeStatusSymbols(
  episode: RawPocketCastsEpisode, 
  storage: any
): Promise<string> {
  const starred = episode.starred ? chalk.yellow('★') : ' ';
  const listened = episode.playingStatus === 3 ? chalk.green('✓') : ' ';
  
  // Check transcription status
  let transcribed = ' ';
  try {
    const transcription = await storage.getTranscriptionByEpisodeId(episode.uuid);
    if (transcription?.status === 'completed') {
      transcribed = chalk.blue('T');
    } else if (transcription?.status === 'processing') {
      transcribed = chalk.yellow('P');
    }
  } catch (error) {
    // If there's an error checking transcription status, just leave it blank
    console.error(`Error checking transcription for ${episode.uuid}:`, error);
  }
  
  return `${starred}${listened}${transcribed}`;
}

async function formatEpisode(
  episode: RawPocketCastsEpisode,
  storage: any
): Promise<string> {
  const idWidth = 8;
  const id = chalk.dim(episode.uuid.substring(0, idWidth).padEnd(idWidth));
  const date = chalk.blue(formatDate(episode.published).padEnd(12));
  const status = await getEpisodeStatusSymbols(episode, storage);
  const duration = chalk.yellow(formatDuration(episode.duration).padEnd(7));
  const progress = chalk.cyan(getProgress(episode).padStart(4));

  const totalWidth = process.stdout.columns || 120;
  const usedWidth = idWidth + 1 + 12 + 4 + 7 + 4 + 4;
  const remainingWidth = Math.max(20, totalWidth - usedWidth);
  
  const podcastWidth = Math.floor(remainingWidth * 0.4);
  const episodeWidth = remainingWidth - podcastWidth - 1;

  const podcastTitle = truncate(episode.podcastTitle, podcastWidth);
  const episodeTitle = truncate(episode.title, episodeWidth);

  return `${id} ${date}${status.padEnd(4)}${duration} ${chalk.green(podcastTitle.padEnd(podcastWidth))} ${episodeTitle.padEnd(episodeWidth)}${progress}`;
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
        // Handle EPIPE errors gracefully
        process.stdout.on('error', (err) => {
          if (err.code === 'EPIPE') {
            process.exit(0); // Exit cleanly
          }
        });

        const storage = storageProvider.getStorage();

        // Get episodes
        const [starredEpisodes, listenedEpisodes] = await Promise.all([
          storage.getRawData('starred'),
          storage.getRawData('listened')
        ]);

        // Merge and deduplicate episodes
        const episodeMap = new Map<string, RawPocketCastsEpisode>();
        for (const episode of [...starredEpisodes, ...listenedEpisodes]) {
          episodeMap.set(episode.uuid, episode);
        }
        let episodes = Array.from(episodeMap.values());

        // Apply filters
        if (options.starred) {
          episodes = episodes.filter(e => e.starred);
        }
        if (options.listened) {
          episodes = episodes.filter(e => isEpisodeListened(e));
        }
        
        // Handle transcription filter
        if (options.transcribed) {
          const transcribedEpisodes = await Promise.all(
            episodes.map(async e => {
              const transcription = await storage.getTranscriptionByEpisodeId(e.uuid);
              return { episode: e, hasTranscription: transcription?.status === 'completed' };
            })
          );
          episodes = transcribedEpisodes
            .filter(e => e.hasTranscription)
            .map(e => e.episode);
        }

        if (episodes.length === 0) {
          console.log('No episodes found');
          return;
        }

        // Sort by publish date (newest first)
        episodes.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());

        // Print episodes without the footer when piping
        const isPiped = !process.stdout.isTTY;
        
        // Print header only if not JSON output
        if (!options.json) {
          console.log(chalk.dim('ID       Date       Status Dur    Podcast                  Episode                  Prog'));
          console.log(chalk.dim('─'.repeat(process.stdout.columns || 120)));
        }

        // Print episodes
        for (const episode of episodes) {
          console.log(await formatEpisode(episode, storage));
        }
        
        // Only print legend and summary if not piped
        if (!isPiped && !options.json) {
          // Print legend
          console.log('\nStatus symbols:');
          console.log(`${chalk.yellow('★')} Starred  ${chalk.green('✓')} Listened  ${chalk.blue('T')} Transcribed  ${chalk.yellow('P')} Processing`);
          
          // Print summary
          console.log(chalk.dim(`\nTotal: ${episodes.length} episodes`));
        }
      } catch (error) {
        if (error?.code !== 'EPIPE') {
          console.error('Error listing episodes:', error);
          process.exit(1);
        }
      }
    });
} 