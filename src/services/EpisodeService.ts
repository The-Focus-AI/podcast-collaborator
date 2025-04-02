import type { Episode, EpisodeNote, PodcastStorage } from '../storage/interfaces.js';
import type { StorageProvider } from '../storage/StorageProvider.js';
import type { PocketCastsService } from './PocketCastsService.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export interface EpisodeService {
  listEpisodes(): Promise<Episode[]>;
  loadShowNotes(episodeId: string): Promise<EpisodeNote>;
  updateEpisode(episodeId: string, update: Partial<Episode>): Promise<Episode>;
  getStorage(): PodcastStorage;
  syncEpisodes(): Promise<Episode[]>;
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
    return storage.listEpisodes();
  }

  async syncEpisodes(): Promise<Episode[]> {
    const storage = this.storageProvider.getStorage();
    
    // Get episodes from PocketCasts
    await this.pocketCastsService.login();
    const [listenedEpisodes, starredEpisodes] = await Promise.all([
      this.pocketCastsService.getListenedEpisodes(),
      this.pocketCastsService.getStarredEpisodes()
    ]);

    // Convert to our Episode format
    const episodes = [...listenedEpisodes, ...starredEpisodes].map(
      ep => this.pocketCastsService.convertToEpisode(ep)
    );

    // Save all episodes
    await Promise.all(
      episodes.map(episode => storage.saveEpisode(episode))
    );

    return episodes;
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
} 