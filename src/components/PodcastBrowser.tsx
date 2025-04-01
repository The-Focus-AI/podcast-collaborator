import React, { FC, useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Episode } from '../storage/interfaces.js';
import { SyncProgress } from './SyncProgress.js';
import { EpisodeService } from '../services/EpisodeService.js';
import chalk from 'chalk';

type FilterMode = 'all' | 'starred' | 'downloaded' | 'transcribed';
type SortMode = 'listened' | 'alpha' | 'shortest' | 'longest';
type SyncStage = 'login' | 'fetching' | 'saving' | 'complete' | 'error';

interface PodcastBrowserProps {
  episodes: Episode[];
  onEpisodesUpdated?: (episodes: Episode[]) => void;
  episodeService: EpisodeService;
}

export const PodcastBrowser: FC<PodcastBrowserProps> = ({ 
  episodes, 
  onEpisodesUpdated,
  episodeService
}) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('listened');
  const [nameFilter, setNameFilter] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStage, setSyncStage] = useState<SyncStage>('login');
  const [syncMessage, setSyncMessage] = useState('');
  const [syncProgress, setSyncProgress] = useState({ count: 0, total: 0 });
  const [showHelp, setShowHelp] = useState(false);
  const { exit } = useApp();

  // Reset selected index when episodes list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [episodes]);

  // Keep selected episode when episodes list updates
  useEffect(() => {
    if (episodes.length > 0) {
      // Try to find the previously selected episode in the new list
      const currentEpisode = sortedEpisodes[selectedIndex];
      if (currentEpisode) {
        const newIndex = episodes.findIndex(e => e.id === currentEpisode.id);
        if (newIndex !== -1) {
          setSelectedIndex(newIndex);
          return;
        }
      }
      // If not found, reset to 0
      setSelectedIndex(0);
    }
  }, [episodes]);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setSyncStage('fetching');
      setSyncMessage('Syncing episodes...');

      const updatedEpisodes = await episodeService.syncEpisodes();
      onEpisodesUpdated?.(updatedEpisodes);

      setSyncStage('complete');
      setSyncMessage(`Successfully synced ${updatedEpisodes.length} episodes`);

      // Auto-hide sync progress after 3 seconds
      setTimeout(() => {
        setIsSyncing(false);
      }, 3000);
    } catch (error) {
      setSyncStage('error');
      setSyncMessage(error instanceof Error ? error.message : 'Failed to sync episodes');
      
      // Auto-hide sync error after 5 seconds
      setTimeout(() => {
        setIsSyncing(false);
      }, 5000);
    }
  };

  // Filter episodes based on current mode and name filter
  const filteredEpisodes = episodes.filter(episode => {
    if (nameFilter && !episode.title.toLowerCase().includes(nameFilter.toLowerCase())) {
      return false;
    }

    switch (filterMode) {
      case 'starred':
        return episode.isStarred;
      case 'downloaded':
        return episode.isDownloaded;
      case 'transcribed':
        return episode.isDownloaded && episode.hasTranscript;
      default:
        return true;
    }
  });

  // Sort episodes based on current mode
  const sortedEpisodes = [...filteredEpisodes].sort((a, b) => {
    switch (sortMode) {
      case 'listened':
        // Preserve the original order from storage
        // Episodes are already ordered by listen history with starred appended
        return 0;
      case 'alpha':
        return a.title.localeCompare(b.title);
      case 'shortest':
        return (a.duration || 0) - (b.duration || 0);
      case 'longest':
        return (b.duration || 0) - (a.duration || 0);
      default:
        return 0;
    }
  });

  // Handle keyboard input
  useInput((input, key) => {
    if (showHelp) {
      setShowHelp(false);
      return;
    }

    if (isFiltering) {
      if (key.escape) {
        setIsFiltering(false);
        setNameFilter('');
      } else if (key.return) {
        setIsFiltering(false);
      } else if (key.backspace || key.delete) {
        setNameFilter(prev => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setNameFilter(prev => prev + input);
      }
      return;
    }

    if (input === 'q') {
      exit();
    } else if (input === '?') {
      setShowHelp(true);
    } else if (input === '/') {
      setIsFiltering(true);
      setNameFilter('');
    } else if (input === 'f') {
      setFilterMode(prev => {
        const modes: FilterMode[] = ['all', 'starred', 'downloaded', 'transcribed'];
        const currentIndex = modes.indexOf(prev);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        return nextMode;
      });
    } else if (input === 'o') {
      setSortMode(prev => {
        const modes: SortMode[] = ['listened', 'alpha', 'shortest', 'longest'];
        const currentIndex = modes.indexOf(prev);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        return nextMode;
      });
    } else if (input === 's' && !isSyncing) {
      handleSync();
    } else if (key.upArrow && sortedEpisodes.length > 0) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow && sortedEpisodes.length > 0) {
      setSelectedIndex(prev => Math.min(sortedEpisodes.length - 1, prev + 1));
    }
  });

  // Format duration in HH:MM:SS
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h${minutes}m`.padStart(6);
    }
    return `${minutes}m`.padStart(6);
  };

  // Format date in a readable format
  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'N/A';
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  function getStatusSymbols(episode: Episode): string {
    const starred = episode.isStarred ? chalk.yellow('★') : ' ';
    const listened = episode.isListened ? chalk.green('✓') : ' ';
    const transcribed = episode.hasTranscript ? chalk.blue('T') : ' ';
    return `${starred}${listened}${transcribed} `;
  }

  function getProgress(episode: Episode): string {
    if (episode.isListened) return '100%';
    if (episode.playedUpTo > 0) {
      const progress = Math.round((episode.playedUpTo / episode.duration) * 100);
      return `${progress}%`;
    }
    return '0%';
  }

  function truncate(str: string, length: number): string {
    if (str.length <= length) return str;
    return str.slice(0, length - 1) + '…';
  }

  function formatEpisode(episode: Episode): string {
    const date = chalk.blue(formatDate(episode.publishDate));
    const status = getStatusSymbols(episode);
    const duration = chalk.yellow(formatDuration(episode.duration));
    const podcastTitle = truncate(episode.podcastName, 35);
    const episodeTitle = truncate(episode.title, 45);
    const progress = chalk.cyan(getProgress(episode));

    return `${date} ${status}${duration} ${chalk.green(podcastTitle)} ${episodeTitle} ${progress}`;
  }

  const selectedEpisode = sortedEpisodes[selectedIndex];

  // Add this function to handle scrolling
  function getVisibleEpisodes(episodes: Episode[], selectedIndex: number, maxVisible: number) {
    const start = Math.max(0, Math.min(selectedIndex - Math.floor(maxVisible / 2), episodes.length - maxVisible));
    return episodes.slice(start, start + maxVisible);
  }

  return (
    <Box flexDirection="column" height={process.stdout.rows}>
      {/* Header - Single line */}
      <Box height={1}>
        <Text>
          {isFiltering ? (
            <Text>Search: {nameFilter}</Text>
          ) : (
            <Text>
              Filter: <Text color="green">{filterMode.toUpperCase()}</Text> | 
              Sort: <Text color="yellow">{sortMode.toUpperCase()}</Text>
            </Text>
          )}
        </Text>
      </Box>

      {/* Sync Progress */}
      {isSyncing && (
        <SyncProgress
          stage={syncStage}
          message={syncMessage}
          count={syncProgress.count}
          total={syncProgress.total}
        />
      )}

      {/* Main Content Area */}
      <Box flexGrow={1} flexDirection="row">
        {/* Episode List - Left Side */}
        <Box width="50%" borderStyle="single">
          {episodes.length === 0 ? (
            <Box>
              <Text dimColor>No episodes found. Press 's' to sync with PocketCasts.</Text>
            </Box>
          ) : sortedEpisodes.length === 0 ? (
            <Box>
              <Text dimColor>No episodes match the current filter.</Text>
            </Box>
          ) : (
            <Box flexDirection="column">
              {getVisibleEpisodes(sortedEpisodes, selectedIndex, process.stdout.rows - 4).map((episode, index) => {
                const isSelected = index + Math.max(0, selectedIndex - Math.floor((process.stdout.rows - 4) / 2)) === selectedIndex;
                // Calculate available width: panel width (50%) - date (12) - status symbols (4) - padding (4)
                const availableWidth = Math.floor(process.stdout.columns * 0.5) - 12 - 4 - 4;
                
                return (
                  <Box key={episode.id}>
                    <Text color={isSelected ? 'green' : undefined}>
                      {chalk.blue(formatDate(episode.publishDate).slice(0, 12).padEnd(12))}
                      {getStatusSymbols(episode)}
                      {truncate(episode.title, availableWidth)}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        {/* Episode Details - Right Side */}
        <Box width="50%" borderStyle="single" flexDirection="column">
          {selectedEpisode ? (
            <>
              <Box>
                <Text bold color="blue">{selectedEpisode.podcastName}</Text>
              </Box>
              <Box>
                <Text bold>{selectedEpisode.title}</Text>
              </Box>
              <Box>
                <Text>
                  Published: <Text color="yellow">{formatDate(selectedEpisode.publishDate)}</Text>{'\n'}
                  Duration: <Text color="yellow">{formatDuration(selectedEpisode.duration)}</Text>
                </Text>
              </Box>
              <Box>
                <Text>
                  {selectedEpisode.isStarred ? '★ Starred ' : ''}
                  {selectedEpisode.isListened ? '✓ Listened ' : ''}
                  {selectedEpisode.hasTranscript ? 'T Transcribed ' : ''}
                  {selectedEpisode.isDownloaded ? '📥 Downloaded ' : ''}
                  {selectedEpisode.progress > 0 ? `(${Math.round(selectedEpisode.progress * 100)}% complete)` : ''}
                </Text>
              </Box>
              {selectedEpisode.lastListenedAt && (
                <Box>
                  <Text>Last played: {formatDate(selectedEpisode.lastListenedAt)}</Text>
                </Box>
              )}
              {selectedEpisode.description && (
                <Box flexDirection="column">
                  <Text bold>Description:</Text>
                  <Text wrap="wrap" dimColor>{selectedEpisode.description}</Text>
                </Box>
              )}
              {selectedEpisode.notes && (
                <Box flexDirection="column">
                  <Text bold>Notes:</Text>
                  <Text wrap="wrap" color="cyan">{selectedEpisode.notes}</Text>
                </Box>
              )}
            </>
          ) : (
            <Text dimColor>No episode selected</Text>
          )}
        </Box>
      </Box>

      {/* Footer - Single line */}
      <Box height={1}>
        <Text>
          <Text color="green">q</Text>:quit |
          <Text color="green">f</Text>:filter |
          <Text color="green">o</Text>:sort |
          <Text color="green">/</Text>:search |
          <Text color="green">s</Text>:sync |
          <Text color="green">↑↓</Text>:navigate |
          <Text color="green">?</Text>:help
        </Text>
      </Box>
    </Box>
  );
}; 