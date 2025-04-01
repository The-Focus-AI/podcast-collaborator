import { Episode, EpisodeStorage } from '../storage/interfaces.js';
import { PocketCastsService } from './PocketCastsService.js';
import { StorageProvider } from '../storage/StorageProvider.js';

export interface EpisodeService {
  syncEpisodes(): Promise<Episode[]>;
  listEpisodes(): Promise<Episode[]>;
}

export class EpisodeServiceImpl implements EpisodeService {
  constructor(
    private readonly storageProvider: StorageProvider,
    private readonly pocketCastsService: PocketCastsService
  ) {}

  async syncEpisodes(): Promise<Episode[]> {
    const storage = this.storageProvider.getStorage() as unknown as EpisodeStorage;

    // Login to PocketCasts
    await this.pocketCastsService.login();

    // Get listened episodes first to preserve order
    const listenedEpisodes = await this.pocketCastsService.getListenedEpisodes();
    const starredEpisodes = await this.pocketCastsService.getStarredEpisodes();

    // Convert listened episodes first (maintaining order)
    const convertedListenedEpisodes = listenedEpisodes.map(e => 
      this.pocketCastsService.convertToEpisode(e)
    );

    // Convert starred episodes
    const convertedStarredEpisodes = starredEpisodes.map(e => 
      this.pocketCastsService.convertToEpisode(e)
    );

    // Create a map of listened episodes by ID for quick lookup
    const listenedMap = new Map(convertedListenedEpisodes.map(e => [e.id, e]));

    // Update listened episodes with starred status
    convertedListenedEpisodes.forEach(episode => {
      const starredVersion = convertedStarredEpisodes.find(e => e.id === episode.id);
      if (starredVersion) {
        episode.isStarred = true;
      }
    });

    // Add any starred episodes that weren't in the listened list
    const additionalStarredEpisodes = convertedStarredEpisodes.filter(
      episode => !listenedMap.has(episode.id)
    );

    // Combine episodes, maintaining listened order and appending additional starred
    const uniqueEpisodes = [...convertedListenedEpisodes, ...additionalStarredEpisodes];

    // Save all episodes
    for (const episode of uniqueEpisodes) {
      await storage.saveEpisode(episode);
    }

    return uniqueEpisodes;
  }

  async listEpisodes(): Promise<Episode[]> {
    const storage = this.storageProvider.getStorage();

    // Get both starred and listened episodes
    const [starredEpisodes, listenedEpisodes] = await Promise.all([
      storage.getRawData('starred'),
      storage.getRawData('listened')
    ]);

    // Convert listened episodes first (maintaining order)
    const convertedListenedEpisodes = listenedEpisodes.map(e => 
      this.pocketCastsService.convertToEpisode(e)
    );

    // Convert starred episodes
    const convertedStarredEpisodes = starredEpisodes.map(e => 
      this.pocketCastsService.convertToEpisode(e)
    );

    // Create a map of listened episodes by ID for quick lookup
    const listenedMap = new Map(convertedListenedEpisodes.map(e => [e.id, e]));

    // Update listened episodes with starred status
    convertedListenedEpisodes.forEach(episode => {
      const starredVersion = convertedStarredEpisodes.find(e => e.id === episode.id);
      if (starredVersion) {
        episode.isStarred = true;
      }
    });

    // Add any starred episodes that weren't in the listened list
    const additionalStarredEpisodes = convertedStarredEpisodes.filter(
      episode => !listenedMap.has(episode.id)
    );

    // Combine episodes, maintaining listened order and appending additional starred
    return [...convertedListenedEpisodes, ...additionalStarredEpisodes];
  }
} 