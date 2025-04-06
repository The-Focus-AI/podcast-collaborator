import { Command } from 'commander';
import type { EpisodeService } from '../../services/EpisodeService.js'; // Import type
import { logger } from '../../utils/logger.js';
import readline from 'readline/promises'; // Import readline for interactive mode
import { stdin as input, stdout as output } from 'process'; // Import streams for readline

// Removed placeholder service instantiations

// Factory function now accepts EpisodeService
export function createChatCommand(episodeService: EpisodeService): Command {
  const chatCommand = new Command('chat')
       .description('Chat with a transcribed episode (interactively or with a single message)')
       .argument('<partialEpisodeId>', 'The first part of the episode ID (e.g., 3dc1b2d6)')
       .argument('[message...]', 'Optional message/question to send directly. If omitted, starts interactive mode.') // Make message optional and accept multiple words
       .action(async (partialEpisodeId: string, messageParts: string[]) => {
         const message = messageParts.join(' '); // Join parts if provided
   
         logger.debug(`Attempting to find episode starting with ID: ${partialEpisodeId}`);
         try {
           // Find the full episode using the partial ID
           const episode = await episodeService.findEpisodeByPartialId(partialEpisodeId);
           if (!episode) {
             logger.error(`Could not uniquely identify episode with partial ID "${partialEpisodeId}".`);
             process.exit(1);
           }
   
           logger.info(`Found episode: ${episode.title} (${episode.id})`);
   
           // Check if transcription exists (needed for chat)
           const transcriptPath = await episodeService.getEpisodeTranscriptPath(episode.id);
           if (!transcriptPath) {
                logger.error(`Episode "${episode.title}" has not been transcribed yet. Please run 'transcribe ${partialEpisodeId}' first.`);
                process.exit(1);
           }
   
           // Single message mode
           if (message) {
             logger.info(`Sending message: "${message}"`);
             const response = await episodeService.chatWithEpisode(episode.id, message);
             console.log(response); // Output response
             process.exit(0); // Exit after single response
           }
   
           // Interactive mode
           logger.info("Starting interactive chat mode. Type '/quit' or '/exit' to end.");
           const rl = readline.createInterface({ input, output });
   
           while (true) {
             const userInput = await rl.question('> ');
             if (userInput.toLowerCase() === '/quit' || userInput.toLowerCase() === '/exit') {
               break; // Exit loop
             }
             if (!userInput.trim()) {
               continue; // Skip empty input
             }
   
             // Get the stream result
             const streamResult = await episodeService.chatWithEpisode(episode.id, userInput);
             
             // Process the stream and print chunks
             process.stdout.write("AI: "); // Indicate AI response start
             for await (const chunk of streamResult.textStream) {
                process.stdout.write(chunk); // Write chunk directly to stdout
             }
             process.stdout.write("\n"); // Add newline after full response
           }
   
           rl.close(); // Close readline interface
           logger.info("Exiting chat mode.");
   
         } catch (error) {
           const errorMsg = error instanceof Error ? error.message : 'Unknown error';
           logger.error(`Chat failed for episode starting with ID ${partialEpisodeId}: ${errorMsg}`);
           process.exit(1);
      }
    });

  return chatCommand;
}

// Export default for consistency if needed
// export default createChatCommand;