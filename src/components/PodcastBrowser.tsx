import React, { FC, useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Episode } from '../storage/interfaces.js';
import { SyncProgress } from './SyncProgress.js';
import { StorageProvider } from '../storage/StorageProvider.js';
import { PocketCastsService, PocketCastsServiceImpl } from '../services/PocketCastsService.js';
import { OnePasswordService } from '../services/OnePasswordService.js';

type FilterMode = 'all' | 'starred' | 'downloaded' | 'transcribed';
type SortMode = 'listened' | 'alpha' | 'shortest' | 'longest';
type SyncStage = 'login' | 'fetching' | 'saving' | 'complete' | 'error';

interface PodcastBrowserProps {
  episodes: Episode[];
  onEpisodesUpdated?: (episodes: Episode[]) => void;
  storageProvider: StorageProvider;
  pocketCastsService: PocketCastsService;
  onePasswordService: OnePasswordService;
}

export const PodcastBrowser: FC<PodcastBrowserProps> = ({ 
  episodes, 
  onEpisodesUpdated,
  storageProvider,
  pocketCastsService,
  onePasswordService
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
      setSyncStage('login');
      setSyncMessage('Connecting to PocketCasts...');

      const storage = storageProvider.getStorage();

      // Get credentials from 1Password
      setSyncMessage('Retrieving credentials from 1Password...');
      const credentials = await onePasswordService.getCredentials();
      
      // Login
      await pocketCastsService.login(credentials.email, credentials.password);
      
      // Fetch episodes
      setSyncStage('fetching');
      setSyncMessage('Fetching starred episodes...');
      const starredEpisodes = await pocketCastsService.getStarredEpisodes();
      
      setSyncMessage('Fetching listened episodes...');
      const listenedEpisodes = await pocketCastsService.getListenedEpisodes();
      
      // Combine and deduplicate episodes
      const allEpisodes = [...starredEpisodes, ...listenedEpisodes];
      const uniqueEpisodes = Array.from(new Map(allEpisodes.map(e => [e.uuid, e])).values());
      
      // Save episodes
      setSyncStage('saving');
      setSyncProgress({ count: 0, total: uniqueEpisodes.length });

      for (const episode of uniqueEpisodes) {
        setSyncMessage(`Saving episode: ${episode.title}`);
        await storage.saveEpisode(PocketCastsServiceImpl.convertToEpisode(episode));
        setSyncProgress(prev => ({ ...prev, count: prev.count + 1 }));
      }

      // Update episodes list
      const updatedEpisodes = await storage.listEpisodes();
      onEpisodesUpdated?.(updatedEpisodes);

      setSyncStage('complete');
      setSyncMessage(`Successfully synced ${uniqueEpisodes.length} episodes`);

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
        return (b.lastListenedAt?.getTime() || 0) - (a.lastListenedAt?.getTime() || 0);
      case 'alpha':
        return a.title.localeCompare(b.title);
      case 'shortest':
        return (a.duration || 0) - (b.duration || 0);
      case 'longest':
        return (b.duration || 0) - (a.duration || 0);
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
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format date in a readable format
  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const selectedEpisode = sortedEpisodes[selectedIndex];

  return (
    <Box flexDirection="column" height={process.stdout.rows}>
      {showHelp ? (
        <Box flexDirection="column" padding={1}>
          <Box marginBottom={1}>
            <Text bold>Podcast Browser Help</Text>
          </Box>
          
          <Box marginBottom={1}>
            <Text>Storage Configuration:</Text>
          </Box>
          
          <Box marginBottom={1} paddingLeft={2}>
            <Text>
              Storage Type: <Text color="blue">{storageProvider.getConfig().type}</Text>{'\n'}
              Storage Path: <Text color="blue">{storageProvider.getConfig().path}</Text>
            </Text>
          </Box>
          
          <Box marginBottom={1}>
            <Text>Current Configuration:</Text>
          </Box>
          
          <Box marginBottom={1} paddingLeft={2}>
            <Text>
              Filter Mode: <Text color="green">{filterMode.toUpperCase()}</Text>{'\n'}
              Sort Mode: <Text color="yellow">{sortMode.toUpperCase()}</Text>{'\n'}
              Total Episodes: <Text color="blue">{episodes.length}</Text>{'\n'}
              Filtered Episodes: <Text color="blue">{filteredEpisodes.length}</Text>
            </Text>
          </Box>
          
          <Box marginBottom={1}>
            <Text>Available Commands:</Text>
          </Box>
          
          <Box marginBottom={1} paddingLeft={2}>
            <Text>
              <Text color="green">q</Text>: Quit{'\n'}
              <Text color="green">f</Text>: Cycle filter (all → starred → downloaded → transcribed){'\n'}
              <Text color="green">o</Text>: Cycle sort (listened → alpha → shortest → longest){'\n'}
              <Text color="green">/</Text>: Search episodes{'\n'}
              <Text color="green">s</Text>: Sync with PocketCasts{'\n'}
              <Text color="green">↑↓</Text>: Navigate episodes{'\n'}
              <Text color="green">?</Text>: Show/hide this help screen
            </Text>
          </Box>
          
          <Box marginTop={1}>
            <Text dimColor>Press any key to close help</Text>
          </Box>
        </Box>
      ) : (
        <>
          {/* Header - Filter and Sort Info */}
          <Box padding={1}>
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
          <Box flexGrow={1}>
            {/* Episode List - Left Side */}
            <Box width="40%" borderStyle="single">
              {episodes.length === 0 ? (
                <Box padding={1}>
                  <Text dimColor>No episodes found. Use 'sync' command to fetch episodes.</Text>
                </Box>
              ) : sortedEpisodes.length === 0 ? (
                <Box padding={1}>
                  <Text dimColor>No episodes match the current filter.</Text>
                </Box>
              ) : (
                sortedEpisodes.map((episode, index) => (
                  <Box key={episode.id} padding={1}>
                    <Text color={index === selectedIndex ? 'green' : undefined}>
                      {episode.isStarred ? '⭐ ' : '  '}
                      {episode.title.substring(0, 35)}
                      {episode.title.length > 35 ? '...' : ''}
                    </Text>
                  </Box>
                ))
              )}
            </Box>

            {/* Episode Details - Right Side */}
            <Box width="60%" borderStyle="single" flexDirection="column" padding={1}>
              {selectedEpisode ? (
                <>
                  <Box marginBottom={1}>
                    <Text bold color="blue">{selectedEpisode.podcastName}</Text>
                  </Box>
                  <Box marginBottom={1}>
                    <Text bold>{selectedEpisode.title}</Text>
                  </Box>
                  <Box marginBottom={1}>
                    <Text>
                      Duration: <Text color="yellow">{formatDuration(selectedEpisode.duration || 0)}</Text> | 
                      Published: <Text color="yellow">{formatDate(selectedEpisode.publishDate)}</Text>
                    </Text>
                  </Box>
                  <Box marginBottom={1}>
                    <Text>
                      {selectedEpisode.isDownloaded ? '📥 Downloaded ' : ''}
                      {selectedEpisode.isStarred ? '⭐ Starred ' : ''}
                      {selectedEpisode.hasTranscript ? '📝 Transcribed ' : ''}
                      {selectedEpisode.isListened ? '👂 Listened ' : ''}
                      {selectedEpisode.progress ? `(${Math.round(selectedEpisode.progress * 100)}% complete)` : ''}
                    </Text>
                  </Box>
                  <Box marginBottom={1}>
                    <Text>Last played: {formatDate(selectedEpisode.lastListenedAt)}</Text>
                  </Box>
                  <Box flexDirection="column">
                    <Text bold>Description:</Text>
                    <Text wrap="wrap" dimColor>
                      {selectedEpisode.description || 'No description available'}
                    </Text>
                  </Box>
                  {selectedEpisode.notes && (
                    <Box flexDirection="column" marginTop={1}>
                      <Text bold>Notes:</Text>
                      <Text wrap="wrap" color="cyan">
                        {selectedEpisode.notes}
                      </Text>
                    </Box>
                  )}
                </>
              ) : episodes.length === 0 ? (
                <Text dimColor>No episodes available. Use 'sync' command to fetch episodes.</Text>
              ) : (
                <Text dimColor>No episode selected</Text>
              )}
            </Box>
          </Box>

          {/* Footer - Command Info */}
          <Box padding={1}>
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
        </>
      )}
    </Box>
  );
}; 