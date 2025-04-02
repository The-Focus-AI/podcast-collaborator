import React, { FC, useEffect, useState, useRef } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import type { Episode, EpisodeNote } from '../storage/interfaces.js';
import type { EpisodeService } from '../services/EpisodeService.js';
import TurndownService from 'turndown';
import { ScrollArea } from './ScrollArea.js';

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
      <Box 
        borderStyle="single" 
        flexGrow={1}
        height="100%"
      >
        <Text dimColor>No episode selected</Text>
      </Box>
    );
  }

  let noteBox =      (<Box>
  <Text dimColor>No show notes available</Text>
</Box>)

  if( isLoadingNotes) {
    noteBox = (
      <Box flexGrow={1}>
        <Text color="yellow">Loading show notes...</Text>
      </Box>
    )
  } else if(episodeNote?.error) {
    noteBox = (
      <Box flexGrow={1}>
        <Text color="red">Error loading show notes: {episodeNote.error}</Text>
      </Box>
    )
  } else if(episodeNote?.description) {
    noteBox = (
      <ScrollArea height={windowHeight - 10} isFocused={isFocused}>
        <Text>{episodeNote.description}</Text>
      </ScrollArea>
    )
  }


  return (
    <Box 
      borderStyle="single" 
      flexDirection="column"
      borderColor={isFocused ? 'blue' : undefined}
      flexGrow={1}
      height="100%"
    >
      <Box flexDirection="column" flexGrow={1}>
          <Text bold color="blue">{episode.podcastName}</Text>
          <Text bold>{episode.title}</Text>
          <Text>Published: <Text color="yellow">{formatDate(episode.publishDate)}</Text></Text>
          <Text>Duration: <Text color="yellow">{formatDuration(episode.duration)}</Text></Text>
          <Text>ID: <Text color="gray">{episode.id}</Text></Text>
          <Text>
            {episode.isStarred ? '★ Starred ' : ''}
            {episode.isListened ? '✓ Listened ' : ''}
            {episode.hasTranscript ? 'T Transcribed ' : ''}
            {episode.isDownloaded ? '📥 Downloaded ' : ''}
          </Text>
      </Box>

      {noteBox}

      <Box flexDirection="column" flexGrow={1}>
        <Text bold>Description:</Text>
      </Box>
    </Box>
  )
}