import React, { FC, useEffect, useState, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Episode, EpisodeNote } from '../storage/interfaces.js';
import type { EpisodeService } from '../services/EpisodeService.js';

interface EpisodeDetailsProps {
  episode: Episode | undefined;
  episodeService: EpisodeService;
  onEpisodeUpdate: (updatedEpisode: Episode) => void;
  formatDate: (date: Date | undefined) => string;
  formatDuration: (seconds: number) => string;
}

export const EpisodeDetails: FC<EpisodeDetailsProps> = ({
  episode,
  episodeService,
  onEpisodeUpdate,
  formatDate,
  formatDuration,
}) => {
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [episodeNote, setEpisodeNote] = useState<EpisodeNote | null>(null);
  const isLoadingRef = useRef(false);

  // Load show notes when episode changes
  useEffect(() => {
    let isCancelled = false;

    const loadNotes = async () => {
      if (!episode || isLoadingRef.current) {
        return;
      }

      // Reset note state when episode changes
      if (episodeNote?.id !== episode.id) {
        setEpisodeNote(null);
      }

      isLoadingRef.current = true;
      setIsLoadingNotes(true);

      try {
        const note = await episodeService.loadShowNotes(episode.id);
        if (!isCancelled) {
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

  // Handle retry keyboard input
  useInput((input) => {
    if (input === 'r' && episodeNote?.error) {
      setEpisodeNote(null); // Clear the note to trigger a reload
      isLoadingRef.current = false; // Reset loading state to allow retry
    }
  });

  if (!episode) {
    return (
      <Box width="50%" borderStyle="single">
        <Text dimColor>No episode selected</Text>
      </Box>
    );
  }

  return (
    <Box width="50%" borderStyle="single" flexDirection="column">
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
          {episode.progress > 0 ? `(${Math.round(episode.progress * 100)}% complete)` : ''}
        </Text>
      </Box>
      {episode.lastListenedAt && (
        <Box>
          <Text>Last played: {formatDate(episode.lastListenedAt)}</Text>
        </Box>
      )}
      {/* Show Notes Section */}
      {isLoadingNotes ? (
        <Box>
          <Text color="yellow">Loading show notes...</Text>
        </Box>
      ) : episodeNote?.description ? (
        <Box flexDirection="column">
          <Text bold>Description:</Text>
          <Text wrap="wrap" dimColor>{episodeNote.description}</Text>
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
      {episode.notes && (
        <Box flexDirection="column">
          <Text bold>Notes:</Text>
          <Text wrap="wrap" color="cyan">{episode.notes}</Text>
        </Box>
      )}
    </Box>
  );
}; 