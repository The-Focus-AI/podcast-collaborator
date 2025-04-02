import React, { FC } from 'react';
import { Box, Text } from 'ink';

interface HelpOverlayProps {
  onClose: () => void;
}

export const HelpOverlay: FC<HelpOverlayProps> = ({ onClose }) => {
  return (
    <Box 
      flexDirection="column" 
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
    >
      <Box 
        flexDirection="column" 
        borderStyle="single" 
        borderColor="yellow"
        padding={1}
        width={60}
        height={15}
      >
        <Box marginBottom={1}>
          <Text bold>Keyboard Controls</Text>
        </Box>

        <Box flexDirection="column">
          <Text>
            <Text color="yellow">↑/↓</Text> Navigate episodes
          </Text>
          <Text>
            <Text color="yellow">←/→</Text> Switch panels
          </Text>
          <Text>
            <Text color="yellow">enter</Text> Play episode
          </Text>
          <Text>
            <Text color="yellow">space</Text> Toggle playback
          </Text>
          <Text>
            <Text color="yellow">/</Text> Search episodes
          </Text>
          <Text>
            <Text color="yellow">f</Text> Change filter mode
          </Text>
          <Text>
            <Text color="yellow">o</Text> Change sort mode
          </Text>
          <Text>
            <Text color="yellow">s</Text> Sync with PocketCasts
          </Text>
          <Text>
            <Text color="yellow">q</Text> Quit
          </Text>
          <Text>
            <Text color="yellow">?</Text> Show/hide help
          </Text>
        </Box>
      </Box>
    </Box>
  );
}; 