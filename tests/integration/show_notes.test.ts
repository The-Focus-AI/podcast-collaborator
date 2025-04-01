import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { PocketCastsServiceImpl } from '@/services/PocketCastsService.js';
import { OnePasswordService } from '@/services/OnePasswordService.js';
import { StorageProvider } from '@/storage/StorageProvider.js';
import { EpisodeServiceImpl } from '@/services/EpisodeService.js';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { logger } from '@/utils/logger.js';

describe('Show Notes Integration Test', () => {
  let tempDir: string;
  let storageProvider: StorageProvider;
  let pocketCastsService: PocketCastsServiceImpl;
  let episodeService: EpisodeServiceImpl;

  beforeAll(async () => {
    // Create temporary directory
    tempDir = await mkdtemp(join(tmpdir(), 'podcast-collaborator-test-'));
    
    // Initialize services
    const onePasswordService = new OnePasswordService();
    pocketCastsService = new PocketCastsServiceImpl(onePasswordService);
    storageProvider = new StorageProvider({ type: 'filesystem', path: tempDir });
    await storageProvider.initialize();
    episodeService = new EpisodeServiceImpl(storageProvider, pocketCastsService);

    // Login to PocketCasts
    await pocketCastsService.login();
  });

  afterAll(async () => {
    // Clean up temporary directory
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should load show notes for "The Shopify Arms Race"', async () => {
    // Get all episodes
    const starredEpisodes = await pocketCastsService.getStarredEpisodes();
    const listenedEpisodes = await pocketCastsService.getListenedEpisodes();
    
    // Save raw data
    const storage = storageProvider.getStorage();
    await storage.saveRawData('starred', starredEpisodes);
    await storage.saveRawData('listened', listenedEpisodes);

    // Find the target episode
    const allEpisodes = [...starredEpisodes, ...listenedEpisodes];
    const targetEpisode = allEpisodes.find(ep => ep.title.includes('The Shopify Arms Race'));
    expect(targetEpisode).toBeDefined();
    
    if (!targetEpisode) {
      throw new Error('Target episode not found');
    }

    // Convert to our Episode format
    const episode = pocketCastsService.convertToEpisode(targetEpisode);
    await storage.saveEpisode(episode);

    // Load show notes
    const withNotes = await episodeService.loadShowNotes(episode.id);
    
    // Verify show notes were loaded
    expect(withNotes).toBeDefined();
    expect(withNotes.id).toBe(episode.id);
    expect(withNotes.description).toBeDefined();
    expect(typeof withNotes.description).toBe('string');
    expect(withNotes.description?.length).toBeGreaterThan(0);

    logger.info('Successfully loaded show notes', {
      episodeId: episode.id,
      source: 'integration-test'
    });
  });
}); 