import { Command } from 'commander';
import type { EpisodeService } from '../../services/EpisodeService.js'; // Import type
import { logger } from '../../utils/logger.js';

// Removed placeholder service instantiations

// Factory function now accepts EpisodeService
export function createChatCommand(episodeService: EpisodeService): Command {
  const chatCommand = new Command('chat')
    .description('Chat with a transcribed episode')
    .argument('<partialEpisodeId>', 'The first part of the episode ID (e.g., 3dc1b2d6)')
    .argument('<message>', 'Your message or question for the episode')
    .action(async (partialEpisodeId: string, message: string) => {
      logger.info(`Attempting to find episode starting with ID: ${partialEpisodeId} to chat with message: "${message}"`);
      try {
        // Find the full episode using the partial ID
        const episode = await episodeService.findEpisodeByPartialId(partialEpisodeId);
        if (!episode) {
          logger.error(`Could not uniquely identify episode with partial ID "${partialEpisodeId}".`);
          process.exit(1);
        }
   
        logger.info(`Found episode: ${episode.title} (${episode.id})`);
        const response = await episodeService.chatWithEpisode(episode.id, message); // Use full ID now

        // Output the response from the chat service
        console.log(response);

        // Optionally use logger for structured output
        // logger.info(`Chat response: ${response}`, { episodeId });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to chat with episode starting with ID ${partialEpisodeId}: ${errorMsg}`);
        process.exit(1);
      }
    });

  return chatCommand;
}

// Export default for consistency if needed
// export default createChatCommand;