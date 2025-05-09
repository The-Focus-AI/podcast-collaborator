import React, { FC, ReactNode } from 'react';
import { Box, Text } from 'ink';

interface LayoutProps {
  header?: ReactNode;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  footer?: ReactNode;
  activePanel: 'left' | 'right';
}

export const Layout: FC<LayoutProps> = ({
  header,
  leftPanel,
  rightPanel,
  footer,
  activePanel
}) => {
  return (
    <Box flexDirection="column" height={process.stdout.rows}>
      {/* Header */}
      {header && (
        <Box height={1} flexShrink={0}>
          {header}
        </Box>
      )}

      {/* Main Content Area */}
      <Box flexGrow={1} flexDirection="row">
        {/* Left Panel */}
        <Box flexGrow={1} height="100%">
          {leftPanel}
        </Box>

        {/* Right Panel */}
        <Box flexGrow={1} height="100%">
          {rightPanel}
        </Box>
      </Box>

      {/* Footer */}
      {footer && (
        <Box height={1} flexShrink={0}>
          {footer}
        </Box>
      )}
    </Box>
  );
}; 