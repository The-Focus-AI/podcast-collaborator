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

  async loadShowNotes(episodeId: string): Promise<EpisodeNote> {
    const storage = this.storageProvider.getStorage();
    
    // Check if we already have notes
    let note = await storage.getEpisodeNote(episodeId);
    if (note?.description) {
      return note;
    }

    // Initialize or update note
    note = note || {
      id: episodeId,
      retryCount: 0,
      loadedAt: new Date()
    };

    try {
      note.lastAttempt = new Date();
      note.retryCount++;

      const description = await this.pocketCastsService.getEpisodeNotes(episodeId);
      
      note.description = description;
      note.error = undefined;
      note.loadedAt = new Date();
      
      await storage.saveEpisodeNote(note);
      return note;
    } catch (error) {
      note.error = error instanceof Error ? error.message : 'Failed to load show notes';
      await storage.saveEpisodeNote(note);
      throw error;
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