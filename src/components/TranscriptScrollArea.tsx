import { Box, DOMElement, measureElement } from 'ink';
import { useEffect, useReducer, useRef } from 'react';

interface ScrollAreaState {
  innerHeight: number;
  height: number;
  scrollTop: number;
}

type ScrollAreaAction =
  | { type: 'SET_INNER_HEIGHT'; innerHeight: number }
  | { type: 'SET_HEIGHT'; height: number }
  | { type: 'SCROLL_TO'; position: number }
  | { type: 'ENSURE_VISIBLE'; index: number; itemHeight: number };

const reducer = (state: ScrollAreaState, action: ScrollAreaAction) => {
  switch (action.type) {
    case 'SET_INNER_HEIGHT':
      return {
        ...state,
        innerHeight: action.innerHeight,
      };
    case 'SET_HEIGHT':
      return {
        ...state,
        height: action.height,
      };
    case 'SCROLL_TO':
      return {
        ...state,
        scrollTop: Math.max(0, Math.min(
          state.innerHeight - state.height,
          action.position
        )),
      };
    case 'ENSURE_VISIBLE': {
      const itemTop = action.index * action.itemHeight;
      const itemBottom = itemTop + action.itemHeight;
      
      if (itemTop < state.scrollTop) {
        // Item is above visible area - scroll up
        return {
          ...state,
          scrollTop: itemTop,
        };
      } else if (itemBottom > state.scrollTop + state.height) {
        // Item is below visible area - scroll down
        return {
          ...state,
          scrollTop: itemBottom - state.height,
        };
      }
      return state;
    }
    default:
      return state;
  }
};

export interface TranscriptScrollAreaProps extends React.PropsWithChildren {
  height: number;
  currentIndex: number;
  itemHeight?: number;
}

export function TranscriptScrollArea({ height, currentIndex, itemHeight = 1, children }: TranscriptScrollAreaProps) {
  const [state, dispatch] = useReducer(reducer, {
    height,
    scrollTop: 0,
    innerHeight: 0,
  });

  const innerRef = useRef<DOMElement>(null);

  useEffect(() => {
    dispatch({ type: 'SET_HEIGHT', height });
  }, [height]);

  useEffect(() => {
    if (!innerRef.current) return;

    const dimensions = measureElement(innerRef.current);
    dispatch({
      type: 'SET_INNER_HEIGHT',
      innerHeight: dimensions.height,
    });
  }, [children]);

  // Keep current item visible
  useEffect(() => {
    dispatch({
      type: 'ENSURE_VISIBLE',
      index: currentIndex,
      itemHeight,
    });
  }, [currentIndex, itemHeight]);

  return (
    <Box height={height} flexDirection="column" flexGrow={1} overflow="hidden">
      <Box ref={innerRef} flexShrink={0} flexDirection="column" marginTop={-state.scrollTop}>
        {children}
      </Box>
    </Box>
  );
} 