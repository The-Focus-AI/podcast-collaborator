import React, { FC, useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import type { Episode, Asset } from '../storage/interfaces.js';
import type { EpisodeService } from '../services/EpisodeService.js';

interface EpisodePlayerProps {
  episode: Episode;
  episodeService: EpisodeService;
  isFocused?: boolean;
  formatDuration: (seconds: number) => string;
}

type PlayerState = 'checking' | 'downloading' | 'ready' | 'playing' | 'paused' | 'error';

export const EpisodePlayer: FC<EpisodePlayerProps> = ({
  episode,
  episodeService,
  isFocused = false,
  formatDuration,
}) => {
  const [playerState, setPlayerState] = useState<PlayerState>('checking');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(episode.playedUpTo);
  const [error, setError] = useState<string | null>(null);
  const [audioAsset, setAudioAsset] = useState<Asset | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<'none' | 'processing' | 'ready' | 'error'>('none');

  // Check if audio file exists and download if needed
  useEffect(() => {
    const checkAudio = async () => {
      try {
        const storage = episodeService.getStorage();
        const assets = await storage.listAssets(episode.id);
        const audio = assets.find(a => a.type === 'audio/mpeg');

        if (audio) {
          setAudioAsset(audio);
          setPlayerState('ready');
          // Check for transcription
          if (episode.hasTranscript) {
            setTranscriptionStatus('ready');
          }
        } else {
          setPlayerState('downloading');
          // Start download
          const onProgress = (progress: number) => {
            setDownloadProgress(progress);
          };
          
          const audioFile = await episodeService.downloadEpisode(episode.id, onProgress);
          setAudioAsset(audioFile);
          setPlayerState('ready');

          // Start transcription process
          try {
            await episodeService.transcribeEpisode(episode.id);
            setTranscriptionStatus('processing');
          } catch (err) {
            console.error('Failed to start transcription:', err);
            setTranscriptionStatus('error');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check audio status');
        setPlayerState('error');
      }
    };

    checkAudio();
  }, [episode.id, episodeService]);

  // Update playback progress
  useEffect(() => {
    if (playerState === 'playing') {
      const interval = setInterval(() => {
        setPlaybackProgress(prev => {
          const newProgress = Math.min(prev + 1, episode.duration);
          if (newProgress === episode.duration) {
            setPlayerState('ready');
          }
          return newProgress;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [playerState, episode.duration]);

  // Render progress bar
  const renderProgressBar = (progress: number, total: number) => {
    const percentage = Math.round((progress / total) * 100);
    const availableWidth = process.stdout.columns * 0.5 - 10; // Account for border and padding
    const filledWidth = Math.floor(availableWidth * (progress / total));
    const emptyWidth = availableWidth - filledWidth;

    return (
      <Box width="100%">
        <Text>
          [
          <Text color="green">{'='.repeat(filledWidth)}</Text>
          <Text>{' '.repeat(emptyWidth)}</Text>
          ] {percentage}%
        </Text>
      </Box>
    );
  };

  return (
    <Box 
      borderStyle="single" 
      flexDirection="column"
      borderColor={isFocused ? 'blue' : undefined}
      width="100%"
    >
      <Box width="100%">
        <Text bold>Player</Text>
      </Box>

      {/* Status and Controls */}
      <Box marginTop={1} width="100%">
        <Text>Status: </Text>
        {playerState === 'checking' && <Text color="yellow">Checking audio file...</Text>}
        {playerState === 'downloading' && <Text color="yellow">Downloading...</Text>}
        {playerState === 'ready' && <Text color="green">Ready to play</Text>}
        {playerState === 'playing' && <Text color="green">Playing</Text>}
        {playerState === 'paused' && <Text color="yellow">Paused</Text>}
        {playerState === 'error' && <Text color="red">Error: {error}</Text>}
      </Box>

      {/* Download Progress */}
      {playerState === 'downloading' && (
        <Box marginTop={1} flexDirection="column" width="100%">
          <Text>Downloading episode...</Text>
          {renderProgressBar(downloadProgress, 100)}
        </Box>
      )}

      {/* Playback Progress */}
      {(playerState === 'ready' || playerState === 'playing' || playerState === 'paused') && (
        <Box marginTop={1} flexDirection="column" width="100%">
          <Box>
            <Text>
              {formatDuration(playbackProgress)} / {formatDuration(episode.duration)}
            </Text>
          </Box>
          {renderProgressBar(playbackProgress, episode.duration)}
        </Box>
      )}

      {/* Transcription Status */}
      <Box marginTop={1} width="100%">
        <Text>Transcription: </Text>
        {transcriptionStatus === 'none' && <Text dimColor>Not started</Text>}
        {transcriptionStatus === 'processing' && <Text color="yellow">Processing...</Text>}
        {transcriptionStatus === 'ready' && <Text color="green">Available</Text>}
        {transcriptionStatus === 'error' && <Text color="red">Failed</Text>}
      </Box>

      {/* Controls Help */}
      {(playerState === 'ready' || playerState === 'playing' || playerState === 'paused') && (
        <Box marginTop={1} width="100%">
          <Text dimColor>
            Press <Text color="yellow">space</Text> to play/pause | 
            <Text color="yellow">←/→</Text> seek | 
            <Text color="yellow">t</Text> view transcript
          </Text>
        </Box>
      )}
    </Box>
  );
}; 