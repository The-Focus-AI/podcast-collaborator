import React, { FC, useEffect, useState, forwardRef, ForwardedRef } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Episode, Asset, TranscriptionStatus } from '../storage/interfaces.js';
import type { EpisodeService } from '../services/EpisodeService.js';
import { TranscriptionService } from '../services/TranscriptionService.js';
import { v4 as uuidv4 } from 'uuid';
import { OnePasswordService } from '../services/OnePasswordService.js';
import { TranscriptScrollArea } from './TranscriptScrollArea.js';
import { ScrollArea } from './ScrollArea.js';
import { logger } from '../utils/logger.js'; // Added logger import
interface EpisodePlayerProps {
  episode: Episode;
  episodeService: EpisodeService;
  isFocused?: boolean;
  formatDuration: (seconds: number) => string;
  onStateChange?: (state: {
    playerState: PlayerState;
    transcriptionStatus: TranscriptionStatus['status'];
    isTranscribing: boolean;
    showTranscript: boolean;
    currentSegmentIndex: number;
    playbackProgress: number;
  }) => void;
}

type PlayerState = 'checking' | 'downloading' | 'ready' | 'playing' | 'paused' | 'error';

export interface EpisodePlayerHandle {
  toggleTranscript: () => void;
  navigateTranscript: (direction: 'up' | 'down') => void;
  togglePlayback: () => void;
  seek: (direction: 'forward' | 'backward', seconds?: number) => void;
}

export const EpisodePlayer = forwardRef<EpisodePlayerHandle, EpisodePlayerProps>(({
  episode,
  episodeService,
  isFocused = false,
  formatDuration,
  onStateChange,
}, ref) => {
  const [playerState, setPlayerState] = useState<PlayerState>('checking');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(episode.playedUpTo);
  const [error, setError] = useState<string | null>(null);
  const [audioAsset, setAudioAsset] = useState<Asset | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionStatus['status']>('pending');
  const [transcription, setTranscription] = useState<TranscriptionStatus | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isChatting, setIsChatting] = useState(false); // Added for chat input mode
  const [chatInput, setChatInput] = useState(''); // Added for chat message
  const [chatResponse, setChatResponse] = useState<string | null>(null); // Added for chat response display

  // Notify parent of state changes
  useEffect(() => {
    const state = {
      playerState,
      transcriptionStatus,
      isTranscribing,
      showTranscript,
      currentSegmentIndex,
      playbackProgress,
    };
    
    // Only notify if something meaningful changed
    onStateChange?.(state);
  }, [playerState, transcriptionStatus]); // Only watch major state changes

  // Start transcription process
  const startTranscription = async () => {
    try {
      setIsTranscribing(true);
      setTranscriptionStatus('processing');

      const storage = episodeService.getStorage();

      // Check if transcription exists
      const existingTranscription = await storage.getTranscriptionByEpisodeId(episode.id);
      if (existingTranscription?.status === 'completed') {
        setTranscription(existingTranscription);
        setTranscriptionStatus('completed');
        setIsTranscribing(false);
        return;
      }

      // Get API key from 1Password
      const onePasswordService = new OnePasswordService();
      const apiKey = await onePasswordService.getGoogleApiKey();
      if (!apiKey) {
        throw new Error('Failed to retrieve Google API key from 1Password');
      }

      // Initialize transcription service
      const transcriptionService = new TranscriptionService({
        apiKey,
      });

      // Get audio file path
      const audioPath = storage.getAssetPath(episode.id, 'audio.mp3');

      // Create initial transcription status
      const status: TranscriptionStatus = {
        id: uuidv4(),
        episodeId: episode.id,
        status: 'processing',
        model: transcriptionService.model,
        metadata: {
          duration: episode.duration,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      // Save initial status
      await storage.saveTranscription(status);

      // Start transcription
      const transcription = await transcriptionService.transcribeFile(audioPath);

      // Update status with completed transcription
      status.status = 'completed';
      status.transcription = transcription;
      status.metadata.updatedAt = new Date();
      status.metadata.completedAt = new Date();

      // Save completed transcription
      await storage.saveTranscription(status);

      // Update component state
      setTranscription(status);
      setTranscriptionStatus('completed');

    } catch (err) {
      console.error('Transcription failed:', err);
      setTranscriptionStatus('failed');
      setError(err instanceof Error ? err.message : 'Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Check if audio file exists and download if needed
  useEffect(() => {
    const checkAudio = async () => {
      try {
        const storage = episodeService.getStorage();
        const assets = await storage.listAssets(episode.id);
        const audio = assets.find(a => a.name === 'audio.mp3');

        if (audio) {
          setAudioAsset(audio);
          setPlayerState('ready');
          // Check for transcription
          const transcriptionData = await storage.getTranscriptionByEpisodeId(episode.id);
          if (transcriptionData?.status === 'completed') {
            setTranscription(transcriptionData);
            setTranscriptionStatus('completed');
          } else if (transcriptionData?.status === 'processing') {
            setTranscriptionStatus('processing');
          } else {
            setTranscriptionStatus('pending');
          }
        } else {
          setPlayerState('downloading');
          // Start download
          const onProgress = (progress: number) => {
            setDownloadProgress(progress);
          };
          
          await episodeService.downloadEpisode(episode.id, onProgress);
          setPlayerState('ready');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check audio status');
        setPlayerState('error');
      }
    };

    checkAudio();
  }, [episode.id, episodeService]);

  // Update playback progress and current segment
  useEffect(() => {
    if (playerState !== 'playing') return;

    const interval = setInterval(() => {
      setPlaybackProgress(prev => {
        const newProgress = Math.min(prev + 1, episode.duration);
        if (newProgress === episode.duration) {
          setPlayerState('ready');
          return prev;
        }
        return newProgress;
      });

      // Update current segment based on playback position
      if (showTranscript && transcription?.transcription?.segments) {
        const segments = transcription.transcription.segments;
        const currentTime = playbackProgress;
        
        for (let i = 0; i < segments.length; i++) {
          const timestamp = segments[i].timestamp;
          const [minutes, seconds] = timestamp.split(':').map(Number);
          const segmentTime = minutes * 60 + seconds;
          if (segmentTime > currentTime) {
            setCurrentSegmentIndex(Math.max(0, i - 1));
            break;
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [playerState, episode.duration, showTranscript]);

  // Load transcription only once when episode changes
  useEffect(() => {
    const loadTranscription = async () => {
      try {
        const storage = episodeService.getStorage();
        const transcription = await storage.getTranscriptionByEpisodeId(episode.id);
        
        if (transcription) {
          setTranscription(transcription);
          setTranscriptionStatus(transcription.status);
          // Show transcript by default if it's completed
          if (transcription.status === 'completed') {
            setShowTranscript(true);
          }
        } else {
          setTranscriptionStatus('pending');
        }
      } catch (err) {
        console.error('Failed to load transcription:', err);
        setTranscriptionStatus('failed');
        setError(err instanceof Error ? err.message : 'Failed to load transcription');
      }
    };

    loadTranscription();
  }, [episode.id]);

  // --- Internal Action Handlers ---
 
  const toggleTranscriptHandler = () => {
    if (transcriptionStatus === 'completed') {
      setShowTranscript(!showTranscript);
    } else if (transcriptionStatus === 'pending' && !isTranscribing) {
      startTranscription();
    }
  };
 
  const navigateTranscriptHandler = (direction: 'up' | 'down') => {
    if (showTranscript && transcriptionStatus === 'completed' && transcription?.transcription?.segments) {
      // Navigate transcript segments
      let newIndex = currentSegmentIndex;
      if (direction === 'up' && currentSegmentIndex > 0) {
        newIndex = currentSegmentIndex - 1;
      } else if (direction === 'down' && currentSegmentIndex < transcription.transcription.segments.length - 1) {
        newIndex = currentSegmentIndex + 1;
      }
      
      if (newIndex !== currentSegmentIndex) {
        setCurrentSegmentIndex(newIndex);
        // Jump to segment timestamp
        const segment = transcription.transcription.segments[newIndex];
        const [minutes, seconds] = segment.timestamp.split(':').map(Number);
        setPlaybackProgress(minutes * 60 + seconds);
      }
    } else {
      // No transcript shown/available - adjust playback position (seek large)
      setPlaybackProgress(prev => {
        const newProgress = direction === 'up'
          ? Math.min(prev + 60, episode.duration) // Seek forward 60s
          : Math.max(0, prev - 60); // Seek backward 60s
        return newProgress;
      });
    }
  };
 
  const togglePlaybackHandler = () => {
    if (playerState === 'ready' || playerState === 'paused' || playerState === 'playing') {
       setPlayerState(state => state === 'playing' ? 'paused' : 'playing');
    }
  };
 
  const seekHandler = (direction: 'forward' | 'backward', seconds?: number) => {
    setPlaybackProgress(prev => {
      const newProgress = direction === 'forward'
        ? Math.min(prev + (seconds || 15), episode.duration) // Default seek 15s
        : Math.max(0, prev - (seconds || 15)); // Default seek 15s
      return newProgress;
    });
  };
 
  // Public methods exposed via ref
  React.useImperativeHandle(ref, () => ({
    toggleTranscript: toggleTranscriptHandler,
    navigateTranscript: navigateTranscriptHandler,
    togglePlayback: togglePlaybackHandler,
    seek: seekHandler,
  }));

  // Update status display text based on transcription status
  const getTranscriptionStatusText = () => {
    switch (transcriptionStatus) {
      case 'pending':
        return <Text dimColor>Not started</Text>;
      case 'processing':
        return (
          <Text color="yellow">
            {isTranscribing ? 'Processing...' : 'Waiting for completion...'}
          </Text>
        );
      case 'completed':
        return <Text color="green">Available</Text>;
      case 'failed':
        return <Text color="red">Failed</Text>;
    }
  };

  // Handle chat submission
  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return; // Don't submit empty messages

    setIsChatting(false); // Exit chat mode immediately
    setChatResponse('Thinking...'); // Indicate processing

    try {
      const response = await episodeService.chatWithEpisode(episode.id, chatInput);
      setChatResponse(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get chat response';
      setChatResponse(`Error: ${message}`);
      logger.error(`Chat failed for episode ${episode.id}: ${message}`);
    } finally {
      setChatInput(''); // Clear input after submission attempt
    }
  };

  useInput((input, key) => {
    if (!isFocused) return;

    if (isChatting) {
      if (key.return) {
        handleChatSubmit();
      } else if (key.escape) {
        setIsChatting(false);
        setChatInput('');
        setChatResponse(null); // Clear any previous response/error
      } else if (key.backspace || key.delete) {
        setChatInput(prev => prev.slice(0, -1));
      } else if (input) {
        // Append typed character if it's printable
        // This is a basic check; more robust handling might be needed
        if (input.length === 1 && !key.ctrl && !key.meta) {
           setChatInput(prev => prev + input);
        }
      }
    } else {
      // Not chatting - handle other commands
      if (input === 't') {
        toggleTranscriptHandler(); // Call directly
      } else if (input === 'c' && transcriptionStatus === 'completed') {
        setIsChatting(true);
        setChatInput(''); // Clear previous input
        setChatResponse(null); // Clear previous response
      } else if (input === ' ') {
        togglePlaybackHandler(); // Call directly
      } else if (key.leftArrow) {
        seekHandler('backward'); // Call directly
      } else if (key.rightArrow) {
        seekHandler('forward'); // Call directly
      } else if (key.upArrow) {
        navigateTranscriptHandler('up'); // Call directly
      } else if (key.downArrow) {
        navigateTranscriptHandler('down'); // Call directly
      }
      // Note: 'q', 's', '?' are handled globally in PodcastBrowser
    }
  });


  return (
    <Box 
      borderStyle="single" 
      flexDirection="column"
      borderColor={isFocused ? 'blue' : undefined}
      padding={1}
      height="100%"
    >
      {/* Header */}
      <Box>
        <Text bold>Player</Text>
      </Box>

      {/* Status */}
      <Box>
        <Text>Status: </Text>
        {playerState === 'checking' && <Text color="yellow">Checking audio file...</Text>}
        {playerState === 'downloading' && <Text color="yellow">Downloading...</Text>}
        {playerState === 'ready' && <Text color="green">Ready to play</Text>}
        {playerState === 'playing' && <Text color="green">Playing</Text>}
        {playerState === 'paused' && <Text color="yellow">Paused</Text>}
        {playerState === 'error' && <Text color="red">Error: {error}</Text>}
      </Box>

      {/* Progress */}
      {(playerState === 'downloading' || playerState === 'ready' || playerState === 'playing' || playerState === 'paused') && (
        <Box>
          <Box>
            <Text>{formatDuration(playbackProgress)} / {formatDuration(episode.duration)}</Text>
          </Box>
          <Box>
            <Text>[</Text>
            <Text color="green">
              {'='.repeat(Math.floor((playbackProgress / episode.duration) * 40))}
            </Text>
            <Text>
              {' '.repeat(Math.max(0, 40 - Math.floor((playbackProgress / episode.duration) * 40)))}
            </Text>
            <Text>] {Math.round((playbackProgress / episode.duration) * 100)}%</Text>
          </Box>
        </Box>
      )}

      {/* Transcript */}
      {showTranscript && transcriptionStatus === 'completed' && transcription?.transcription?.segments && (
        <Box flexDirection="column" flexGrow={1}>
          <Text bold>Transcript:</Text>
          <ScrollArea height={10} isFocused={isFocused}>
            {transcription.transcription.segments.map((segment, i) => {
              const isCurrentSegment = i === currentSegmentIndex;
              return (
                <Box key={i}>
                  <Text color={isCurrentSegment ? 'green' : undefined}>
                    [{segment.timestamp}] {segment.speaker}: {segment.spoken_text}
                    {segment.topics.length > 0 && (
                      <Text color="blue"> (Topics: {segment.topics.join(', ')})</Text>
                    )}
                    {segment.guest_interview && <Text color="cyan"> [Guest]</Text>}
                  </Text>
                </Box>
              );
            })}
          </ScrollArea>
        </Box>
      )}

      {/* Chat Input/Output */}
      {isChatting && (
        <Box marginTop={1}>
          <Text color="cyan">&gt; Chat: {chatInput}</Text>
          {/* TODO: Add a blinking cursor simulation? */}
        </Box>
      )}
      {chatResponse && !isChatting && (
         <Box marginTop={1} flexDirection="column">
           <Text bold color="cyan">Chat Response:</Text>
           <Text wrap="wrap">{chatResponse}</Text>
         </Box>
      )}

      {/* Footer */}
      <Box marginTop={isChatting || (chatResponse && !isChatting) ? 1 : 0}>
        <Text>Transcription: </Text>
        {getTranscriptionStatusText()}
      </Box>
    </Box>
  );
});