import React, { FC } from 'react';
import { Box, Text } from 'ink';

interface SyncProgressProps {
  stage: 'login' | 'fetching' | 'saving' | 'complete' | 'error';
  message: string;
  count?: number;
  total?: number;
}

export const SyncProgress: FC<SyncProgressProps> = ({ stage, message, count, total }) => {
  const getStageIcon = () => {
    switch (stage) {
      case 'login':
        return '🔑';
      case 'fetching':
        return '📡';
      case 'saving':
        return '💾';
      case 'complete':
        return '✅';
      case 'error':
        return '❌';
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text>
          {getStageIcon()} <Text color="blue">{stage.toUpperCase()}</Text>: {message}
        </Text>
      </Box>
      {count !== undefined && total !== undefined && (
        <Box marginTop={1}>
          <Text>
            Progress: <Text color="yellow">{count}</Text>/<Text color="yellow">{total}</Text> episodes
          </Text>
        </Box>
      )}
    </Box>
  );
}; 