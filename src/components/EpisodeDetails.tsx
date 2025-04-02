import React, { FC, useEffect, useState, useRef } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import type { Episode, EpisodeNote } from '../storage/interfaces.js';
import type { EpisodeService } from '../services/EpisodeService.js';
import TurndownService from 'turndown';

interface EpisodeDetailsProps {
  episode: Episode | undefined;
  episodeService: EpisodeService;
  onEpisodeUpdate: (updatedEpisode: Episode) => void;
  formatDate: (date: Date | undefined) => string;
  formatDuration: (seconds: number) => string;
  isFocused?: boolean;
}

// Initialize turndown service
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

export const EpisodeDetails: FC<EpisodeDetailsProps> = ({
  episode,
  episodeService,
  onEpisodeUpdate,
  formatDate,
  formatDuration,
  isFocused = false,
}) => {
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [episodeNote, setEpisodeNote] = useState<EpisodeNote | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const isLoadingRef = useRef(false);
  const { stdout } = useStdout();
  const [windowHeight, setWindowHeight] = useState(stdout.rows);
  const [windowWidth, setWindowWidth] = useState(stdout.columns);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(stdout.rows);
      setWindowWidth(stdout.columns);
    };

    stdout.on('resize', handleResize);
    return () => {
      stdout.off('resize', handleResize);
    };
  }, [stdout]);

  // Load show notes when episode changes
  useEffect(() => {
    let isCancelled = false;

    const loadNotes = async () => {
      if (!episode || isLoadingRef.current) {
        return;
      }

      // Reset note state and scroll when episode changes
      if (episodeNote?.id !== episode.id) {
        setEpisodeNote(null);
        setScrollOffset(0);
      }

      isLoadingRef.current = true;
      setIsLoadingNotes(true);

      try {
        const note = await episodeService.loadShowNotes(episode.id);
        if (!isCancelled) {
          // Convert HTML to Markdown if description exists
          if (note.description) {
            note.description = turndownService.turndown(note.description);
          }
          setEpisodeNote(note);
        }
      } finally {
        if (!isCancelled) {
          isLoadingRef.current = false;
          setIsLoadingNotes(false);
        }
      }
    };

    loadNotes();

    return () => {
      isCancelled = true;
      isLoadingRef.current = false;
      setIsLoadingNotes(false);
    };
  }, [episode?.id, episodeService]);

  // Handle keyboard input
  useInput((input, key) => {
    if (!isFocused || !episodeNote?.description) return;

    if (key.upArrow) {
      setScrollOffset(Math.max(0, scrollOffset - 1));
    } else if (key.downArrow) {
      // Calculate max scroll based on content and window height
      const lines = episodeNote.description.split('\n');
      const maxScroll = Math.max(0, lines.length - (windowHeight - 15)); // Increase offset for metadata
      setScrollOffset(Math.min(maxScroll, scrollOffset + 1));
    }
  });

  // Handle retry keyboard input
  useInput((input) => {
    if (input === 'r' && episodeNote?.error) {
      setEpisodeNote(null);
      isLoadingRef.current = false;
      setScrollOffset(0);
    }
  });

  if (!episode) {
    return (
      <Box width="50%" borderStyle="single">
        <Text dimColor>No episode selected</Text>
      </Box>
    );
  }

  // Calculate dimensions
  const boxWidth = Math.floor(windowWidth * 0.5);
  const contentWidth = boxWidth - 4; // Account for borders and padding

  // Calculate metadata height dynamically
  let metadataHeight = 6; // Base height: podcast name, title, publish/duration/id, status icons
  if (episode.lastListenedAt) {
    metadataHeight += 1; // Add line for last played date
  }
  if (episode.progress > 0) {
    metadataHeight += 1; // Add line for progress
  }
  metadataHeight += 2; // Add padding and description header

  // Calculate available height for notes
  const availableHeight = windowHeight - metadataHeight - 2; // -2 for borders

  return (
    <Box 
      width={boxWidth} 
      borderStyle="single" 
      flexDirection="column"
      borderColor={isFocused ? 'blue' : undefined}
    >
      {/* Metadata section */}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold color="blue">{episode.podcastName}</Text>
        </Box>
        <Box>
          <Text bold>{episode.title}</Text>
        </Box>
        <Box>
          <Text>
            Published: <Text color="yellow">{formatDate(episode.publishDate)}</Text>{'\n'}
            Duration: <Text color="yellow">{formatDuration(episode.duration)}</Text>{'\n'}
            ID: <Text color="gray">{episode.id}</Text>
          </Text>
        </Box>
        <Box>
          <Text>
            {episode.isStarred ? '★ Starred ' : ''}
            {episode.isListened ? '✓ Listened ' : ''}
            {episode.hasTranscript ? 'T Transcribed ' : ''}
            {episode.isDownloaded ? '📥 Downloaded ' : ''}
          </Text>
        </Box>
        {episode.progress > 0 && (
          <Box>
            <Text>Progress: <Text color="green">{Math.round(episode.progress * 100)}%</Text></Text>
          </Box>
        )}
        {episode.lastListenedAt && (
          <Box>
            <Text>Last played: {formatDate(episode.lastListenedAt)}</Text>
          </Box>
        )}
      </Box>

      {/* Show Notes Section */}
      <Box flexDirection="column" flexGrow={1}>
        {isLoadingNotes ? (
          <Box>
            <Text color="yellow">Loading show notes...</Text>
          </Box>
        ) : episodeNote?.description ? (
          <Box flexDirection="column">
            <Text bold>Description:</Text>
            <Box flexDirection="column" height={availableHeight}>
              {episodeNote.description
                .split('\n')
                .slice(scrollOffset, scrollOffset + availableHeight)
                .map((line, i) => (
                  <Box key={i}>
                    <Text wrap="wrap">{line}</Text>
                  </Box>
                ))}
            </Box>
            {episodeNote.description.split('\n').length > availableHeight && (
              <Box>
                <Text dimColor>
                  {scrollOffset > 0 ? '↑ ' : ''}
                  Line {scrollOffset + 1} of {episodeNote.description.split('\n').length}
                  {scrollOffset < episodeNote.description.split('\n').length - availableHeight ? ' ↓' : ''}
                </Text>
              </Box>
            )}
          </Box>
        ) : episodeNote?.error ? (
          <Box flexDirection="column">
            <Box>
              <Text color="red">⚠️ {episodeNote.error}</Text>
            </Box>
            <Box marginTop={1}>
              <Text>Press <Text color="yellow">r</Text> to retry</Text>
            </Box>
          </Box>
        ) : (
          <Box>
            <Text dimColor>No show notes available</Text>
          </Box>
        )}
      </Box>

      {/* User Notes Section */}
      {episode.notes && (
        <Box flexDirection="column">
          <Text bold>Notes:</Text>
          <Text wrap="wrap" color="cyan">{episode.notes}</Text>
        </Box>
      )}
    </Box>
  );
}; 