import { describe, it, expect, beforeAll } from 'vitest'
import { PocketCastsServiceImpl } from '@/services/PocketCastsService.js'
import { OnePasswordService } from '@/services/OnePasswordService.js'
import { logger } from '@/utils/logger.js'

describe('PocketCasts API Integration', () => {
  let service: PocketCastsServiceImpl;

  beforeAll(async () => {
    try {
      const onePasswordService = new OnePasswordService();
      service = new PocketCastsServiceImpl(onePasswordService);
      
      logger.info('Attempting to login to PocketCasts...');
      await service.login();
      logger.info('Successfully logged in to PocketCasts');
    } catch (error: unknown) {
      logger.error('Failed to setup PocketCasts integration tests. Make sure your credentials are properly configured in 1Password.');
      if (error instanceof Error) {
        logger.error(error);
      } else {
        logger.error('Unknown error occurred during setup');
      }
      throw new Error('PocketCasts integration test setup failed. See above logs for details.');
    }
  });

  it.runIf(process.env.RUN_INTEGRATION_TESTS)('should fetch real show notes from PocketCasts API', async () => {
    // First get a real episode ID from listened episodes
    const episodes = await service.getListenedEpisodes();
    expect(episodes.length).toBeGreaterThan(0);
    
    const testEpisode = episodes[0];
    logger.info('Testing with episode:', {
      episodeId: testEpisode.uuid,
      source: 'integration-test'
    });

    // Now fetch show notes for this episode
    const notes = await service.getEpisodeNotes(testEpisode.uuid);
    logger.debug(`Received ${notes.length} characters of show notes`, {
      episodeId: testEpisode.uuid,
      source: 'integration-test'
    });
    
    expect(notes).toBeTruthy();
    expect(typeof notes).toBe('string');
    expect(notes.length).toBeGreaterThan(0);
  });

  it.runIf(process.env.RUN_INTEGRATION_TESTS)('should handle non-existent episode gracefully', async () => {
    await expect(service.getEpisodeNotes('non-existent-id'))
      .rejects
      .toThrow('Resource not found');
  });
}); 