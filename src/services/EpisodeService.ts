import type { Episode, EpisodeNote, PodcastStorage, Asset } from '../storage/interfaces.js';
import type { StorageProvider } from '../storage/StorageProvider.js';
import type { PocketCastsService } from './PocketCastsService.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises'; // Added mkdir import
import { pipeline } from 'stream/promises';

export interface EpisodeService {
  listEpisodes(): Promise<Episode[]>;
  loadShowNotes(episodeId: string): Promise<EpisodeNote>;
  updateEpisode(episodeId: string, update: Partial<Episode>): Promise<Episode>;
  getStorage(): PodcastStorage;
  syncEpisodes(): Promise<Episode[]>;
  downloadEpisode(episodeId: string, onProgress: (progress: number) => void): Promise<void>; // Updated return type
  transcribeEpisode(episodeId: string): Promise<void>;
}

export class EpisodeServiceImpl implements EpisodeService {
  constructor(
    private readonly storageProvider: StorageProvider,
    private readonly pocketCastsService: PocketCastsService
  ) {}

  getStorage(): PodcastStorage {
    return this.storageProvider.getStorage();
  }

  async listEpisodes(): Promise<Episode[]> {
    const storage = this.storageProvider.getStorage();
    const episodes = await storage.listEpisodes();

    // Sort episodes by publish date, newest first (consistent with 'list' command)
    episodes.sort((a, b) => b.publishDate.getTime() - a.publishDate.getTime());

    return episodes;
  }

  async syncEpisodes(): Promise<Episode[]> {
    const requestId = uuidv4();
    logger.debug('Starting episode sync', { requestId });

    try {
      // Get episodes from PocketCasts
      const [listenedEpisodes, starredEpisodes] = await Promise.all([
        this.pocketCastsService.getListenedEpisodes(),
        this.pocketCastsService.getStarredEpisodes()
      ]);

      // Convert to our Episode format
      const episodes = await Promise.all(
        [...listenedEpisodes, ...starredEpisodes]
          .map(ep => this.pocketCastsService.convertToEpisode(ep))
      );

      // Remove duplicates by id
      const uniqueEpisodes = episodes.filter((ep, index) => 
        index === episodes.findIndex(e => e.id === ep.id)
      );

      // Save all episodes
      const storage = this.storageProvider.getStorage();
      await Promise.all(
        uniqueEpisodes.map(episode => storage.saveEpisode(episode))
      );

      return uniqueEpisodes;
    } catch (error) {
      logger.error(`Error syncing episodes: ${error instanceof Error ? error.message : 'Unknown error'}`, { requestId });
      throw error;
    }
  }

  async loadShowNotes(episodeId: string): Promise<EpisodeNote> {
    const storage = this.storageProvider.getStorage();
    let existingNote: EpisodeNote | null = null;
    
    try {
      // Check if we already have valid notes
      existingNote = await storage.getEpisodeNote(episodeId);
      if (existingNote?.description) {
        return existingNote;
      }

      // Initialize or update note
      const note: EpisodeNote = {
        id: episodeId,
        retryCount: (existingNote?.retryCount || 0) + 1,
        loadedAt: new Date(),
        lastAttempt: new Date()
      };

      // Try to load from API
      const description = await this.pocketCastsService.getEpisodeNotes(episodeId);
      note.description = description;
      note.error = undefined;
      
      // Save successful note
      await storage.saveEpisodeNote(note);
      return note;
    } catch (error) {
      // Create error note
      const errorNote: EpisodeNote = {
        id: episodeId,
        error: error instanceof Error ? error.message : 'Failed to load show notes',
        loadedAt: new Date(),
        lastAttempt: new Date(),
        retryCount: (existingNote?.retryCount || 0) + 1
      };
      
      // Save error state
      await storage.saveEpisodeNote(errorNote);
      return errorNote;
    }
  }

  async updateEpisode(episodeId: string, update: Partial<Episode>): Promise<Episode> {
    const storage = this.storageProvider.getStorage();
    const episode = await storage.getEpisode(episodeId);
    if (!episode) {
      throw new Error(`Episode ${episodeId} not found`);
    }

    const updatedEpisode = { ...episode, ...update };
    await storage.saveEpisode(updatedEpisode);
    return updatedEpisode;
  }

  async downloadEpisode(episodeId: string, onProgress: (progress: number) => void): Promise<void> { // Return void, asset is saved directly
    const requestId = uuidv4();
    const storage = this.storageProvider.getStorage();
    logger.debug(`Processing download request for episode ${episodeId}`, { requestId, episodeId });

    // Get the episode from storage
    const episode = await storage.getEpisode(episodeId);
    if (!episode) {
      throw new Error(`Episode ${episodeId} not found`);
    }

    if (!episode.url) {
      throw new Error(`No download URL available for episode ${episodeId}`);
    }

    let response: Response | null = null;
    try {
      // Get the download response stream
      response = await this.pocketCastsService.downloadEpisode(episode);

      if (!response.body) {
        throw new Error('Response body is null, cannot download.');
      }

      // Determine asset path and ensure directory exists
      const assetName = 'audio.mp3'; // Or derive from URL/headers if possible
      const assetPath = storage.getAssetPath(episode.id, assetName);
      const assetDir = assetPath.substring(0, assetPath.lastIndexOf('/'));
      await mkdir(assetDir, { recursive: true }); // Ensure directory exists

      // Get total size for progress calculation
      const totalSize = Number(response.headers.get('Content-Length') || '0');
      let downloadedSize = 0;
      onProgress(0); // Initial progress

      // Create a write stream to the target file
      const fileStream = createWriteStream(assetPath);

      // Use pipeline to handle stream piping and error handling
      // Also, manually track progress
      const progressTrackingStream = new TransformStream({
        transform(chunk, controller) {
          downloadedSize += chunk.length;
          if (totalSize > 0) {
            const progress = Math.min(100, Math.round((downloadedSize / totalSize) * 100));
            onProgress(progress);
          }
          controller.enqueue(chunk);
        },
      });

      // Node.js ReadableStream from Fetch Response body
      const nodeReadableStream = response.body as unknown as NodeJS.ReadableStream;

      // Pipe response body -> progress tracker -> file stream
      await pipeline(
        nodeReadableStream,
        progressTrackingStream as unknown as NodeJS.WritableStream, // Cast needed for pipeline compatibility
        fileStream
      );

      logger.debug(`File stream finished for episode ${episodeId}`, { requestId, episodeId }); // Removed path from context
      onProgress(100); // Final progress

      // Update episode status in storage
      await this.updateEpisode(episodeId, { isDownloaded: true });
      logger.debug(`Updated episode ${episodeId} status to downloaded`, { requestId, episodeId });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Download failed during streaming/saving for episode ${episodeId}: ${errorMessage}`, { requestId, episodeId });
      // Clean up potentially partially downloaded file? (Optional)
      // if (response && existsSync(storage.getAssetPath(episode.id, 'audio.mp3'))) {
      //   await rm(storage.getAssetPath(episode.id, 'audio.mp3'));
      // }
      throw error; // Re-throw the error
    }
  }

  async transcribeEpisode(episodeId: string): Promise<void> {
    // For now, just mock the transcription process
    const storage = this.storageProvider.getStorage();
    const episode = await storage.getEpisode(episodeId);
    if (!episode) {
      throw new Error(`Episode ${episodeId} not found`);
    }

    // In a real implementation, this would:
    // 1. Get the audio file
    // 2. Send it to a transcription service
    // 3. Save the transcription as an asset
    // 4. Update the episode status

    // For now, just update the episode status after a delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.updateEpisode(episodeId, { hasTranscript: true });
  }
} 