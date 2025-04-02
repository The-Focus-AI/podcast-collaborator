import React, { FC, useState, useEffect } from 'react';
import { Text, useInput, useApp } from 'ink';
import { Episode } from '../storage/interfaces.js';
import { SyncProgress } from './SyncProgress.js';
import { EpisodeService } from '../services/EpisodeService.js';
import { EpisodeList, FilterMode, SortMode } from './EpisodeList.js';
import { EpisodeDetails } from './EpisodeDetails.js';
import { EpisodePlayer } from './EpisodePlayer.js';
import type { EpisodePlayerHandle } from './EpisodePlayer.js';
import { HelpOverlay } from './HelpOverlay.js';
import { Layout } from './Layout.js';

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
  const playerRef = React.useRef<EpisodePlayerHandle>(null);
  const [playerState, setPlayerState] = useState<{
    state: 'checking' | 'downloading' | 'ready' | 'playing' | 'paused' | 'error';
    showTranscript: boolean;
    transcriptionStatus: 'pending' | 'processing' | 'completed' | 'failed';
  }>({
    state: 'checking',
    showTranscript: false,
    transcriptionStatus: 'pending'
  });
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

      setTimeout(() => setIsSyncing(false), 3000);
    } catch (error) {
      setSyncStage('error');
      setSyncMessage(error instanceof Error ? error.message : 'Failed to sync episodes');
      setTimeout(() => setIsSyncing(false), 5000);
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
    let filteredEpisodes = [...episodes];

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

    if (sortMode !== 'listened') {
      switch (sortMode) {
        case 'alpha':
          filteredEpisodes.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'shortest':
          filteredEpisodes.sort((a, b) => a.duration - b.duration);
          break;
        case 'longest':
          filteredEpisodes.sort((a, b) => b.duration - a.duration);
          break;
      }
    }

    return filteredEpisodes;
  };

  if (showHelp) {
    return <HelpOverlay onClose={() => setShowHelp(false)} />;
  }

  const filteredEpisodes = getFilteredAndSortedEpisodes();
  const selectedEpisode = filteredEpisodes[selectedIndex];

  const episodeList = (
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
  );

  const episodeDetails = (
    <EpisodeDetails
      episode={selectedEpisode}
      episodeService={episodeService}
      onEpisodeUpdate={handleEpisodeUpdate}
      formatDate={formatDate}
      formatDuration={formatDuration}
      isFocused={activePanel === 'details'}
    />
  );

  const episodePlayer = (
    <EpisodePlayer
      ref={playerRef}
      episode={selectedEpisode}
      episodeService={episodeService}
      formatDuration={formatDuration}
      isFocused={activePanel === 'player'}
      onStateChange={state => {
        setPlayerState({
          state: state.playerState,
          showTranscript: state.showTranscript,
          transcriptionStatus: state.transcriptionStatus
        });
      }}
    />
  );

  // Determine left and right panels based on active panel
  const { leftPanel, rightPanel } = (() => {
    switch (activePanel) {
      case 'list':
        return {
          leftPanel: episodeList,
          rightPanel: episodeDetails
        };
      case 'details':
        return {
          leftPanel: episodeDetails,
          rightPanel: episodePlayer
        };
      case 'player':
        return {
          leftPanel: episodeDetails,
          rightPanel: episodePlayer
        };
      default:
        return {
          leftPanel: episodeList,
          rightPanel: episodeDetails
        };
    }
  })();

  return (
    <Layout
      header={
        <>
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
          {isSyncing && (
            <SyncProgress 
              stage={syncStage} 
              message={syncMessage} 
              count={syncProgress.count}
              total={syncProgress.total}
            />
          )}
        </>
      }
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      footer={
        <Text dimColor>
          Press <Text color="yellow">?</Text> for help | 
          <Text color="yellow">←/→</Text> switch panels |
          {activePanel === 'list' && (
            <>
              <Text color="yellow">↑/↓</Text> navigate | 
              <Text color="yellow">enter</Text> play |
              <Text color="yellow">s</Text> sync
            </>
          )}
          {activePanel === 'details' && (
            <>
              <Text color="yellow">↑/↓</Text> scroll | 
              <Text color="yellow">enter</Text> play
            </>
          )}
          {activePanel === 'player' && (
            <>
              <Text color="yellow">space</Text> play/pause | 
              <Text color="yellow">←/→</Text> seek |
              {playerState.transcriptionStatus === 'completed' ? (
                <>
                  <Text color="yellow">t</Text> {playerState.showTranscript ? 'hide' : 'show'} transcript
                  {playerState.showTranscript && ' | ↑/↓ navigate segments'}
                </>
              ) : playerState.transcriptionStatus === 'pending' && (
                <>
                  <Text color="yellow">t</Text> start transcription
                </>
              )}
            </>
          )} |
          <Text color="yellow">q</Text> quit
        </Text>
      }
      activePanel={activePanel === 'list' ? 'left' : 'right'}
    />
  );
}; 