import React, { FC, useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Episode } from '../storage/interfaces.js';
import { SyncProgress } from './SyncProgress.js';
import { EpisodeService } from '../services/EpisodeService.js';
import { EpisodeList, FilterMode, SortMode } from './EpisodeList.js';
import { EpisodeDetails } from './EpisodeDetails.js';

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

  // Handle keyboard input for global actions
  useInput((input) => {
    if (showHelp) {
      setShowHelp(false);
      return;
    }

    if (input === 'q') {
      exit();
    } else if (input === '?') {
      setShowHelp(true);
    } else if (input === 's' && !isSyncing) {
      handleSync();
    }
  });

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

  const handleEpisodeUpdate = (updatedEpisode: Episode) => {
    onEpisodesUpdated?.(episodes.map(ep => 
      ep.id === updatedEpisode.id ? updatedEpisode : ep
    ));
  };

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
        <EpisodeList
          episodes={episodes}
          selectedIndex={selectedIndex}
          onSelectedIndexChange={setSelectedIndex}
          formatDate={formatDate}
          isFiltering={isFiltering}
          nameFilter={nameFilter}
          onNameFilterChange={setNameFilter}
          onFilteringChange={setIsFiltering}
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
        />
        <EpisodeDetails
          episode={episodes[selectedIndex]}
          episodeService={episodeService}
          onEpisodeUpdate={handleEpisodeUpdate}
          formatDate={formatDate}
          formatDuration={formatDuration}
        />
      </Box>

      {/* Footer - Single line */}
      <Box height={1}>
        <Text>
          <Text color="green">q</Text>:quit |
          <Text color="green">f</Text>:filter |
          <Text color="green">o</Text>:sort |
          <Text color="green">/</Text>:search |
          <Text color="green">s</Text>:sync |
          <Text color="green">r</Text>:retry |
          <Text color="green">↑↓</Text>:navigate |
          <Text color="green">?</Text>:help
        </Text>
      </Box>
    </Box>
  );
}; 