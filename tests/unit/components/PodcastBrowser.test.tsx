import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PodcastBrowser } from '../../../src/components/PodcastBrowser.js';
import type { Episode } from '../../../src/storage/interfaces.js';
import type { EpisodeService } from '../../../src/services/EpisodeService.js';

describe('PodcastBrowser', () => {
  let mockEpisodeService: EpisodeService;
  
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
      lastListenedAt: new Date('2024-03-15'),
      playingStatus: 3,
      playedUpTo: 1800
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
      progress: 0,
      notes: '',
      syncedAt: new Date(),
      isDownloaded: true,
      hasTranscript: false,
      playingStatus: 1,
      playedUpTo: 0
    },
    {
      id: '3',
      title: 'Test Episode 3',
      url: 'https://example.com/3',
      podcastName: 'Another Podcast',
      podcastAuthor: 'Another Author',
      description: 'Test description 3',
      publishDate: new Date('2024-03-03'),
      duration: 2700, // 45 minutes
      isStarred: true,
      isListened: true,
      progress: 1.0,
      notes: '',
      syncedAt: new Date(),
      isDownloaded: false,
      hasTranscript: false,
      lastListenedAt: new Date('2024-03-16'),
      playingStatus: 3,
      playedUpTo: 2700
    }
  ];

  beforeEach(() => {
    mockEpisodeService = {
      syncEpisodes: vi.fn().mockResolvedValue(mockEpisodes),
      listEpisodes: vi.fn().mockResolvedValue(mockEpisodes)
    };
  });

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
    const { lastFrame } = render(<PodcastBrowser episodes={mockEpisodes} episodeService={mockEpisodeService} />);
    const frame = lastFrame();
    if (!frame) throw new Error('Frame is undefined');
    
    // Check header
    expect(frame).toContain('Filter: ALL');
    expect(frame).toContain('Sort: LISTENED');
    
    // Check episode list
    expect(frame).toContain('Test Episode 1');
    expect(frame).toContain('Test Episode 2');
    expect(frame).toContain('Test Episode 3');
    
    // Check episode details
    expect(frame).toContain('Test Podcast');
    expect(frame).toContain('01:00:00'); // Duration for first episode
    expect(frame).toContain('Test description 1');
  });

  it('filters starred episodes', async () => {
    const { lastFrame, stdin } = render(<PodcastBrowser episodes={mockEpisodes} episodeService={mockEpisodeService} />);
    
    // Press 'f' to change filter to starred
    stdin.write('f');
    
    // Wait for the filter to change
    const filterChanged = await waitForContent(() => lastFrame(), 'Filter: STARRED');
    expect(filterChanged).toBe(true);
    
    // Check that only starred episodes are shown
    const frame = lastFrame();
    if (!frame) throw new Error('Frame is undefined');
    expect(frame).toContain('Test Episode 1');
    expect(frame).not.toContain('Test Episode 2');
    expect(frame).toContain('Test Episode 3');
  });

  it('maintains listened episode order', async () => {
    const listenedEpisodes = mockEpisodes.filter(e => e.isListened);
    const { lastFrame } = render(<PodcastBrowser episodes={listenedEpisodes} episodeService={mockEpisodeService} />);
    
    // Check that episodes are in the correct order (by lastListenedAt)
    const frame = lastFrame();
    if (!frame) throw new Error('Frame is undefined');
    const episode1Index = frame.indexOf('Test Episode 1');
    const episode3Index = frame.indexOf('Test Episode 3');
    
    // Episode 3 should appear before Episode 1 (more recently listened)
    expect(episode3Index).toBeLessThan(episode1Index);
  });

  it('updates episodes when sync is triggered', async () => {
    const onEpisodesUpdated = vi.fn();
    const { stdin } = render(
      <PodcastBrowser 
        episodes={mockEpisodes} 
        episodeService={mockEpisodeService}
        onEpisodesUpdated={onEpisodesUpdated}
      />
    );
    
    // Press 's' to trigger sync
    stdin.write('s');
    await waitForStateUpdate();
    
    // Verify sync was called
    expect(mockEpisodeService.syncEpisodes).toHaveBeenCalled();
    
    // Verify episodes were updated
    expect(onEpisodesUpdated).toHaveBeenCalledWith(mockEpisodes);
  });

  it('handles sync errors gracefully', async () => {
    // Mock sync failure
    mockEpisodeService.syncEpisodes = vi.fn().mockRejectedValue(new Error('Sync failed'));
    
    const { stdin, lastFrame } = render(
      <PodcastBrowser episodes={mockEpisodes} episodeService={mockEpisodeService} />
    );
    
    // Press 's' to trigger sync
    stdin.write('s');
    
    // Wait for error message
    const errorShown = await waitForContent(() => lastFrame(), 'Sync failed');
    expect(errorShown).toBe(true);
  });

  it('filters downloaded episodes', async () => {
    const { lastFrame, stdin } = render(<PodcastBrowser episodes={mockEpisodes} episodeService={mockEpisodeService} />);
    
    // Press 'f' twice to change filter to downloaded
    stdin.write('f');
    await waitForStateUpdate();
    stdin.write('f');
    
    // Wait for the filter to change
    const filterChanged = await waitForContent(() => lastFrame(), 'Filter: DOWNLOADED');
    expect(filterChanged).toBe(true);
    
    // Check that only downloaded episodes are shown
    const frame = lastFrame();
    if (!frame) throw new Error('Frame is undefined');
    expect(frame).toContain('Test Episode 1');
    expect(frame).toContain('Test Episode 2');
    expect(frame).not.toContain('Test Episode 3');
  });

  it('filters transcribed episodes', async () => {
    const { lastFrame, stdin } = render(<PodcastBrowser episodes={mockEpisodes} episodeService={mockEpisodeService} />);
    
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
    if (!frame) throw new Error('Frame is undefined');
    expect(frame).toContain('Test Episode 1');
    expect(frame).not.toContain('Test Episode 2');
    expect(frame).not.toContain('Test Episode 3');
  });

  it('allows searching episodes', async () => {
    const { lastFrame, stdin } = render(<PodcastBrowser episodes={mockEpisodes} episodeService={mockEpisodeService} />);
    
    // Start search
    stdin.write('/');
    
    // Wait for search mode
    const searchStarted = await waitForContent(() => lastFrame(), 'Search:');
    expect(searchStarted).toBe(true);
    
    // Type search query
    stdin.write('Another Podcast');
    await waitForStateUpdate();
    
    // Check that only matching episode is shown
    const frame = lastFrame();
    if (!frame) throw new Error('Frame is undefined');
    expect(frame).not.toContain('Test Episode 1');
    expect(frame).not.toContain('Test Episode 2');
    expect(frame).toContain('Test Episode 3');
  });

  it('changes sort order', async () => {
    const { lastFrame, stdin } = render(<PodcastBrowser episodes={mockEpisodes} episodeService={mockEpisodeService} />);
    
    // Press 'o' to change sort to alphabetical
    stdin.write('o');
    
    // Wait for sort mode to change
    const sortChanged = await waitForContent(() => lastFrame(), 'Sort: ALPHA');
    expect(sortChanged).toBe(true);
    
    // Verify alphabetical order
    const frame = lastFrame();
    if (!frame) throw new Error('Frame is undefined');
    const episode1Index = frame.indexOf('Test Episode 1');
    const episode2Index = frame.indexOf('Test Episode 2');
    const episode3Index = frame.indexOf('Test Episode 3');
    
    expect(episode1Index).toBeLessThan(episode2Index);
    expect(episode2Index).toBeLessThan(episode3Index);
    
    // Press 'o' again to change sort to shortest
    stdin.write('o');
    const sortChangedToShortest = await waitForContent(() => lastFrame(), 'Sort: SHORTEST');
    expect(sortChangedToShortest).toBe(true);
    
    // Verify duration order (shortest first)
    const shortestFrame = lastFrame();
    if (!shortestFrame) throw new Error('Frame is undefined');
    expect(shortestFrame.indexOf('Test Episode 2')).toBeLessThan(shortestFrame.indexOf('Test Episode 3'));
    expect(shortestFrame.indexOf('Test Episode 3')).toBeLessThan(shortestFrame.indexOf('Test Episode 1'));
  });

  it('shows and hides help screen', async () => {
    const { lastFrame, stdin } = render(<PodcastBrowser episodes={mockEpisodes} episodeService={mockEpisodeService} />);
    
    // Press '?' to show help
    stdin.write('?');
    
    // Wait for help screen to appear
    const helpShown = await waitForContent(() => lastFrame(), 'Podcast Browser Help');
    expect(helpShown).toBe(true);
    
    // Verify help content
    const helpFrame = lastFrame();
    if (!helpFrame) throw new Error('Frame is undefined');
    expect(helpFrame).toContain('Current Configuration:');
    expect(helpFrame).toContain('Filter Mode: ALL');
    expect(helpFrame).toContain('Sort Mode: LISTENED');
    expect(helpFrame).toContain('Total Episodes: 3');
    expect(helpFrame).toContain('Available Commands:');
    
    // Press any key to hide help
    stdin.write('x');
    
    // Wait for help screen to disappear
    const helpHidden = await waitForContent(() => lastFrame(), 'Filter: ALL');
    expect(helpHidden).toBe(true);
    
    // Verify we're back to main screen
    const mainFrame = lastFrame();
    if (!mainFrame) throw new Error('Frame is undefined');
    expect(mainFrame).toContain('Test Episode 1');
    expect(mainFrame).toContain('Test Episode 2');
    expect(mainFrame).toContain('Test Episode 3');
  });
}); 