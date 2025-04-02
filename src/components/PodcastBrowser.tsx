import React, { FC, useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Episode } from '../storage/interfaces.js';
import { SyncProgress } from './SyncProgress.js';
import { EpisodeService } from '../services/EpisodeService.js';
import { EpisodeList, FilterMode, SortMode } from './EpisodeList.js';
import { EpisodeDetails } from './EpisodeDetails.js';
import { EpisodePlayer } from './EpisodePlayer.js';
import { HelpOverlay } from './HelpOverlay.js';

type SyncStage = 'login' | 'fetching' | 'saving' | 'complete' | 'error';
type ActivePanel = 'list' | 'details' | 'player';

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
  const [activePanel, setActivePanel] = useState<ActivePanel>('list');
  const { exit } = useApp();

  // Handle keyboard input for global actions
  useInput((input, key) => {
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
    } else if (key.return) {
      // Enter key starts playback
      if (activePanel === 'list' || activePanel === 'details') {
        setActivePanel('player');
      }
    } else if (key.leftArrow) {
      // Navigate panels left
      if (activePanel === 'player') {
        setActivePanel('details');
      } else if (activePanel === 'details') {
        setActivePanel('list');
      }
    } else if (key.rightArrow) {
      // Navigate panels right
      if (activePanel === 'list') {
        setActivePanel('details');
      } else if (activePanel === 'details') {
        setActivePanel('player');
      }
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
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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

  const getFilteredAndSortedEpisodes = () => {
    let filteredEpisodes = episodes;

    if (isFiltering) {
      filteredEpisodes = filteredEpisodes.filter(ep => 
        ep.title.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    switch (filterMode) {
      case 'starred':
        filteredEpisodes = filteredEpisodes.filter(ep => ep.isStarred);
        break;
      case 'downloaded':
        filteredEpisodes = filteredEpisodes.filter(ep => ep.isDownloaded);
        break;
      case 'transcribed':
        filteredEpisodes = filteredEpisodes.filter(ep => ep.hasTranscript);
        break;
    }

    switch (sortMode) {
      case 'listened':
        filteredEpisodes = filteredEpisodes.sort((a, b) => b.isListened ? -1 : 1);
        break;
      case 'alpha':
        filteredEpisodes = filteredEpisodes.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'shortest':
        filteredEpisodes = filteredEpisodes.sort((a, b) => a.duration - b.duration);
        break;
      case 'longest':
        filteredEpisodes = filteredEpisodes.sort((a, b) => b.duration - a.duration);
        break;
    }

    return filteredEpisodes;
  };

  return (
    <Box flexDirection="column" height={process.stdout.rows}>
      {/* Header - Single line */}
      <Box height={1} flexShrink={0}>
        <Text>
          {isFiltering ? (
            <Text>Search: {nameFilter}</Text>
          ) : (
            <Text>
              Filter: <Text color="green">{filterMode.toUpperCase()}</Text> | 
              Sort: <Text color="yellow">{sortMode.toUpperCase()}</Text> |
              Panel: <Text color="blue">{activePanel.toUpperCase()}</Text>
            </Text>
          )}
        </Text>
      </Box>

      {/* Help Overlay */}
      {showHelp && (
        <HelpOverlay onClose={() => setShowHelp(false)} />
      )}

      {/* Sync Progress */}
      {isSyncing && (
        <Box height={1} flexShrink={0}>
          <SyncProgress 
            stage={syncStage} 
            message={syncMessage} 
            count={syncProgress.count}
            total={syncProgress.total}
          />
        </Box>
      )}

      {/* Main Content Area */}
      <Box flexGrow={1} flexDirection="row">
        {/* Left Panel */}
        <Box width="50%" flexShrink={0}>
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
            isFocused={activePanel === 'list'}
          />
        </Box>

        {/* Right Panel */}
        <Box width="50%" flexShrink={0}>
          {activePanel === 'player' ? (
            <EpisodePlayer
              episode={getFilteredAndSortedEpisodes()[selectedIndex]}
              episodeService={episodeService}
              formatDuration={formatDuration}
              isFocused={true}
            />
          ) : (
            <EpisodeDetails
              episode={getFilteredAndSortedEpisodes()[selectedIndex]}
              episodeService={episodeService}
              onEpisodeUpdate={handleEpisodeUpdate}
              formatDate={formatDate}
              formatDuration={formatDuration}
              isFocused={activePanel === 'details'}
            />
          )}
        </Box>
      </Box>

      {/* Footer - Single line */}
      <Box height={1} flexShrink={0}>
        <Text dimColor>
          Press <Text color="yellow">?</Text> for help | 
          <Text color="yellow">←/→</Text> switch panels |
          <Text color="yellow">↑/↓</Text> navigate | 
          <Text color="yellow">enter</Text> play |
          <Text color="yellow">s</Text> sync | 
          <Text color="yellow">q</Text> quit
        </Text>
      </Box>
    </Box>
  );
}; 