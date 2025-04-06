import { Command } from 'commander';
import type { EpisodeService } from '../../services/EpisodeService.js'; // Import type
import { logger } from '../../utils/logger.js';
import ora from 'ora'; // Import ora for spinner/progress
// import player from 'play-sound'; // Example playback library
import { exec } from 'child_process'; // For platform-specific command

// Removed placeholder service instantiations
// const audioPlayer = player({}); // Placeholder
// Factory function now accepts EpisodeService
export function createPlayCommand(episodeService: EpisodeService): Command {
  const playCommand = new Command('play')
    .description('Play the audio for a downloaded episode')
    .argument('<partialEpisodeId>', 'The first part of the episode ID (e.g., 3dc1b2d6)')
    .action(async (partialEpisodeId: string) => {
      logger.info(`Attempting to find and play episode starting with ID: ${partialEpisodeId}`);
      try {
        // Find the full episode using the partial ID
        const episode = await episodeService.findEpisodeByPartialId(partialEpisodeId);
        if (!episode) {
          // Error message handled by findEpisodeByPartialId or below
          logger.error(`Could not uniquely identify episode with partial ID "${partialEpisodeId}".`);
          process.exit(1);
        }
        
        logger.info(`Found episode: ${episode.title} (${episode.id})`);
   
        // Check if downloaded, if not, download it
        let audioPath = await episodeService.getEpisodeAudioPath(episode.id);
        if (!audioPath) {
          logger.warn(`Episode "${episode.title}" not downloaded. Starting download...`);
          const spinner = ora('Downloading 0%').start();
          try {
            await episodeService.downloadEpisode(episode.id, (progress) => {
              spinner.text = `Downloading ${progress}%`;
            });
            spinner.succeed(`Download complete for "${episode.title}"`);
            // Now get the path again
            audioPath = await episodeService.getEpisodeAudioPath(episode.id);
            if (!audioPath) {
              // This shouldn't happen if download succeeded, but check anyway
              throw new Error('Audio path still not found after successful download.');
            }
          } catch (downloadError) {
            spinner.fail('Download failed.');
            const message = downloadError instanceof Error ? downloadError.message : 'Unknown download error';
            logger.error(`Failed to download episode ${episode.id}: ${message}`);
            process.exit(1);
          }
        }
   
        // Proceed with playback logic
        logger.info(`Playing audio file: ${audioPath}`);
        // Removed extra brace and duplicate log line here

        // --- Actual Playback Logic ---
        // This part is platform-dependent and requires a playback library or command execution
        // Example using play-sound:
        /*
        audioPlayer.play(audioPath, (err) => {
          if (err) {
            logger.error(`Error playing audio for episode ${episodeId}: ${err.message}`);
            process.exit(1);
          } else {
            logger.success(`Finished playing episode ${episodeId}`);
            // Exit or resolve promise depending on how playback is handled
          }
        });
        // Need to keep node running while playing async
        await new Promise(resolve => setTimeout(resolve, 10000)); // Placeholder delay
        */

        // Use platform-specific command (macOS):
        logger.info(`Starting playback with afplay...`);
        const playProcess = exec(`afplay "${audioPath}"`, (error, stdout, stderr) => {
          if (error) {
             // Don't exit immediately, playback might be interrupted by user (Ctrl+C)
             // which also registers as an error.
             // Log error only if it's not a signal interruption? Needs refinement.
             // For now, just log non-interrupt errors.
             if (!error.signal) {
                logger.error(`Playback error: ${error.message}`);
             }
             // process.exit(1); // Avoid exiting here
          }
          if (stderr) {
             // afplay might output info/errors to stderr
             logger.warn(`Playback stderr: ${stderr}`);
          }
          // stdout might be empty for afplay
          // if (stdout) {
          //    logger.info(`Playback stdout: ${stdout}`);
          // }
          logger.success(`Finished playing episode: ${episode.title}`);
          // Playback finished naturally or was stopped.
          // We might not need to explicitly exit the process here,
          // let the command handler finish.
        });

        // Handle Ctrl+C gracefully during playback
        process.on('SIGINT', () => {
          logger.info('Playback interrupted by user (SIGINT). Stopping...');
          if (playProcess) {
            playProcess.kill('SIGINT'); // Send SIGINT to afplay
          }
          // Allow node to exit cleanly after handling SIGINT
          process.exit(0);
        });

        // Keep the process alive while afplay is running.
        // We need a way to wait for exec to finish or be interrupted.
        // The callback handles the finish/error cases.
        // The SIGINT handler handles interruption.
        // No explicit wait needed here as exec runs in background
        // and the callback/SIGINT handler will manage process lifecycle.

        // logger.warn('Audio playback not yet implemented.'); // Removed placeholder

      // This is the end of the main try block
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to play episode starting with ID ${partialEpisodeId}: ${message}`);
        process.exit(1);
      }
      // End of the .action handler's async function
    });

  return playCommand;
} // This brace closes the createPlayCommand function

// Export default for consistency if needed, though factory function is preferred
// export default createPlayCommand; // Default export might not be needed if only factory is used