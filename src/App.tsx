import React, { FC, useState, useEffect } from 'react';
import { Box } from 'ink';
import { PodcastBrowser } from './components/PodcastBrowser.js';
import { Episode } from './storage/interfaces.js';
import { StorageProvider } from './storage/StorageProvider.js';
import { PocketCastsService, PocketCastsServiceImpl } from './services/PocketCastsService.js';
import { OnePasswordService } from './services/OnePasswordService.js';
import { EpisodeService, EpisodeServiceImpl } from './services/EpisodeService.js';

interface AppProps {
  storageProvider: StorageProvider;
  pocketCastsService: PocketCastsService;
  onePasswordService: OnePasswordService;
}

export const App: FC<AppProps> = ({ 
  storageProvider, 
  pocketCastsService,
  onePasswordService 
}) => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  useEffect(() => {
    const loadEpisodes = async () => {
      const storage = storageProvider.getStorage();
      const loadedEpisodes = await storage.listEpisodes();
      setEpisodes(loadedEpisodes);
    };

    loadEpisodes();
  }, [storageProvider]);

  const episodeService = new EpisodeServiceImpl(
    storageProvider,
    pocketCastsService
  );

  return (
    <Box flexDirection="column">
      <PodcastBrowser 
        episodes={episodes} 
        onEpisodesUpdated={setEpisodes}
        episodeService={episodeService}
      />
    </Box>
  );
}; 