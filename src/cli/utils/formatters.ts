import chalk from 'chalk';
import type { RawPocketCastsEpisode } from '@/storage/interfaces.js';

export function formatDuration(duration: number): string {
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);

  if (hours > 0) {
    return `${hours}h${minutes}m`.padStart(6);
  }
  return `${minutes}m`.padStart(6);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

export function getStatusSymbols(episode: RawPocketCastsEpisode): string {
  const starred = episode.starred ? chalk.yellow('★') : ' ';
  const listened = episode.playingStatus === 3 ? chalk.green('✓') : ' ';
  const transcribed = false ? chalk.blue('T') : ' '; // TODO: Add actual transcription check
  return `${starred}${listened}${transcribed} `;
}

export function getProgress(episode: RawPocketCastsEpisode): string {
  if (episode.playingStatus === 3) return '100%';
  if (episode.playedUpTo > 0) {
    const progress = Math.min(100, Math.round((episode.playedUpTo / episode.duration) * 100));
    return `${progress}%`;
  }
  return '0%';
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str.padEnd(maxLength);
  return str.slice(0, maxLength - 1) + '…';
}

export function isEpisodeListened(episode: RawPocketCastsEpisode): boolean {
  return episode.playingStatus === 3 || episode.playedUpTo >= episode.duration;
}