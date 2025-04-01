import React, { FC, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Episode } from '../storage/interfaces.js';
import chalk from 'chalk';

type FilterMode = 'all' | 'starred' | 'downloaded' | 'transcribed';
type SortMode = 'listened' | 'alpha' | 'shortest' | 'longest';

interface EpisodeListProps {
  episodes: Episode[];
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  formatDate: (date: Date | undefined) => string;
  isFiltering: boolean;
  nameFilter: string;
  onNameFilterChange: (filter: string) => void;
  onFilteringChange: (isFiltering: boolean) => void;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
}

export const EpisodeList: FC<EpisodeListProps> = ({
  episodes,
  selectedIndex,
  onSelectedIndexChange,
  formatDate,
  isFiltering,
  nameFilter,
  onNameFilterChange,
  onFilteringChange,
  filterMode,
  onFilterModeChange,
  sortMode,
  onSortModeChange,
}) => {
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

  // Update selected index when episode list changes
  useEffect(() => {
    if (sortedEpisodes.length === 0) {
      onSelectedIndexChange(0);
      return;
    }

    // Keep selection in bounds
    if (selectedIndex >= sortedEpisodes.length) {
      onSelectedIndexChange(sortedEpisodes.length - 1);
    }
  }, [sortedEpisodes.length, selectedIndex, onSelectedIndexChange]);

  // Handle keyboard input for filtering and navigation
  useInput((input, key) => {
    if (isFiltering) {
      if (key.escape) {
        onFilteringChange(false);
        onNameFilterChange('');
      } else if (key.return) {
        onFilteringChange(false);
      } else if (key.backspace || key.delete) {
        onNameFilterChange(nameFilter.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        onNameFilterChange(nameFilter + input);
      }
      return;
    }

    if (input === '/') {
      onFilteringChange(true);
      onNameFilterChange('');
    } else if (input === 'f') {
      const modes: FilterMode[] = ['all', 'starred', 'downloaded', 'transcribed'];
      const currentIndex = modes.indexOf(filterMode);
      onFilterModeChange(modes[(currentIndex + 1) % modes.length]);
    } else if (input === 'o') {
      const modes: SortMode[] = ['listened', 'alpha', 'shortest', 'longest'];
      const currentIndex = modes.indexOf(sortMode);
      onSortModeChange(modes[(currentIndex + 1) % modes.length]);
    } else if (key.upArrow && sortedEpisodes.length > 0) {
      onSelectedIndexChange(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow && sortedEpisodes.length > 0) {
      onSelectedIndexChange(Math.min(sortedEpisodes.length - 1, selectedIndex + 1));
    }
  });

  function getStatusSymbols(episode: Episode): string {
    const starred = episode.isStarred ? chalk.yellow('★') : ' ';
    const listened = episode.isListened ? chalk.green('✓') : ' ';
    const transcribed = episode.hasTranscript ? chalk.blue('T') : ' ';
    return `${starred}${listened}${transcribed} `;
  }

  function truncate(str: string, length: number): string {
    if (str.length <= length) return str;
    return str.slice(0, length - 1) + '…';
  }

  // Add this function to handle scrolling
  function getVisibleEpisodes(episodes: Episode[], selectedIndex: number, maxVisible: number) {
    const start = Math.max(0, Math.min(selectedIndex - Math.floor(maxVisible / 2), episodes.length - maxVisible));
    return episodes.slice(start, start + maxVisible);
  }

  return (
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
          {getVisibleEpisodes(sortedEpisodes, selectedIndex, process.stdout.rows - 4).map((episode, visibleIndex) => {
            const absoluteIndex = sortedEpisodes.indexOf(episode);
            const isSelected = absoluteIndex === selectedIndex;
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
  );
};

// Export these types for the parent component
export type { FilterMode, SortMode }; 