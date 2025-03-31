import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { PodcastBrowser } from '../../../src/components/PodcastBrowser.js';
import type { Episode } from '../../../src/storage/interfaces.js';

describe('PodcastBrowser', () => {
  const mockEpisodes: Episode[] = [
    {
      id: '1',
      title: 'Test Episode 1',
      url: 'https://example.com/1',
      podcastName: 'Test Podcast',
      podcastAuthor: 'Test Author',
      description: 'Test description 1',
      publishDate: new Date('2024-03-01'),
      duration: 3600, // 1 hour
      isStarred: true,
      isListened: true,
      progress: 0.5,
      notes: 'Test notes',
      syncedAt: new Date(),
      isDownloaded: true,
      hasTranscript: true,
      lastListenedAt: new Date('2024-03-15')
    },
    {
      id: '2',
      title: 'Test Episode 2',
      url: 'https://example.com/2',
      podcastName: 'Test Podcast',
      podcastAuthor: 'Test Author',
      description: 'Test description 2',
      publishDate: new Date('2024-03-02'),
      duration: 1800, // 30 minutes
      isStarred: false,
      isListened: false,
      syncedAt: new Date(),
      isDownloaded: true,
      hasTranscript: false
    }
  ];

  // Helper function to wait for state updates with a longer timeout
  const waitForStateUpdate = () => new Promise(resolve => setTimeout(resolve, 100));

  // Helper function to wait for specific content to appear
  const waitForContent = async (getFrame: () => string | undefined, content: string, maxAttempts = 10) => {
    for (let i = 0; i < maxAttempts; i++) {
      if (getFrame()?.includes(content)) {
        return true;
      }
      await waitForStateUpdate();
    }
    return false;
  };

  it('renders episode list and details', () => {
    const { lastFrame } = render(<PodcastBrowser episodes={mockEpisodes} />);
    
    // Check header
    expect(lastFrame()).toContain('Filter: ALL');
    expect(lastFrame()).toContain('Sort: LISTENED');
    
    // Check episode list
    expect(lastFrame()).toContain('Test Episode 1');
    expect(lastFrame()).toContain('Test Episode 2');
    
    // Check episode details
    expect(lastFrame()).toContain('Test Podcast');
    expect(lastFrame()).toContain('01:00:00'); // Duration for first episode
    expect(lastFrame()).toContain('Test description 1');
  });

  it('filters starred episodes', async () => {
    const { lastFrame, stdin } = render(<PodcastBrowser episodes={mockEpisodes} />);
    
    // Press 'f' to change filter to starred
    stdin.write('f');
    
    // Wait for the filter to change
    const filterChanged = await waitForContent(() => lastFrame(), 'Filter: STARRED');
    expect(filterChanged).toBe(true);
    
    // Check that only starred episode is shown
    const frame = lastFrame();
    expect(frame).toContain('Test Episode 1');
    expect(frame).not.toContain('Test Episode 2');
  });

  it('filters downloaded episodes', async () => {
    const { lastFrame, stdin } = render(<PodcastBrowser episodes={mockEpisodes} />);
    
    // Press 'f' twice to change filter to downloaded
    stdin.write('f');
    await waitForStateUpdate();
    stdin.write('f');
    
    // Wait for the filter to change
    const filterChanged = await waitForContent(() => lastFrame(), 'Filter: DOWNLOADED');
    expect(filterChanged).toBe(true);
    
    // Check that only downloaded episodes are shown
    const frame = lastFrame();
    expect(frame).toContain('Test Episode 1');
    expect(frame).toContain('Test Episode 2');
  });

  it('filters transcribed episodes', async () => {
    const { lastFrame, stdin } = render(<PodcastBrowser episodes={mockEpisodes} />);
    
    // Press 'f' three times to change filter to transcribed
    stdin.write('f');
    await waitForStateUpdate();
    stdin.write('f');
    await waitForStateUpdate();
    stdin.write('f');
    
    // Wait for the filter to change
    const filterChanged = await waitForContent(() => lastFrame(), 'Filter: TRANSCRIBED');
    expect(filterChanged).toBe(true);
    
    // Check that only transcribed episode is shown
    const frame = lastFrame();
    expect(frame).toContain('Test Episode 1');
    expect(frame).not.toContain('Test Episode 2');
  });

  it('allows searching episodes', async () => {
    const { lastFrame, stdin } = render(<PodcastBrowser episodes={mockEpisodes} />);
    
    // Start search
    stdin.write('/');
    
    // Wait for search mode
    const searchStarted = await waitForContent(() => lastFrame(), 'Search:');
    expect(searchStarted).toBe(true);
    
    // Type search query
    stdin.write('Episode 1');
    await waitForStateUpdate();
    
    // Check that only matching episode is shown
    const frame = lastFrame();
    expect(frame).toContain('Test Episode 1');
    expect(frame).not.toContain('Test Episode 2');
  });

  it('changes sort order', async () => {
    const { lastFrame, stdin } = render(<PodcastBrowser episodes={mockEpisodes} />);
    
    // Press 'o' to change sort to alphabetical
    stdin.write('o');
    
    // Wait for sort mode to change
    const sortChanged = await waitForContent(() => lastFrame(), 'Sort: ALPHA');
    expect(sortChanged).toBe(true);
    
    // Press 'o' again to change sort to shortest
    stdin.write('o');
    const sortChangedToShortest = await waitForContent(() => lastFrame(), 'Sort: SHORTEST');
    expect(sortChangedToShortest).toBe(true);
    
    // Press 'o' again to change sort to longest
    stdin.write('o');
    const sortChangedToLongest = await waitForContent(() => lastFrame(), 'Sort: LONGEST');
    expect(sortChangedToLongest).toBe(true);
  });

  it('shows and hides help screen', async () => {
    const { lastFrame, stdin } = render(<PodcastBrowser episodes={mockEpisodes} />);
    
    // Press '?' to show help
    stdin.write('?');
    
    // Wait for help screen to appear
    const helpShown = await waitForContent(() => lastFrame(), 'Podcast Browser Help');
    expect(helpShown).toBe(true);
    
    // Verify help content
    const helpFrame = lastFrame();
    expect(helpFrame).toContain('Current Configuration:');
    expect(helpFrame).toContain('Filter Mode: ALL');
    expect(helpFrame).toContain('Sort Mode: LISTENED');
    expect(helpFrame).toContain('Total Episodes: 2');
    expect(helpFrame).toContain('Available Commands:');
    
    // Press any key to hide help
    stdin.write('x');
    
    // Wait for help screen to disappear
    const helpHidden = await waitForContent(() => lastFrame(), 'Filter: ALL');
    expect(helpHidden).toBe(true);
    
    // Verify we're back to main screen
    const mainFrame = lastFrame();
    expect(mainFrame).toContain('Test Episode 1');
    expect(mainFrame).toContain('Test Episode 2');
  });
}); 