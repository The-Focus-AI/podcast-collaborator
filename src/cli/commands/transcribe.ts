import { Command } from "commander";
import { StorageProvider } from "../../storage/StorageProvider.js";
import type { PocketCastsService } from "../../services/PocketCastsService.js"; // Use type import
import { EpisodeServiceImpl, EpisodeService } from "../../services/EpisodeService.js"; // Import type EpisodeService
import { TranscriptionService } from "../../services/TranscriptionService.js";
import chalk from "chalk";
import { logger } from "../../utils/logger.js";
import { v4 as uuidv4 } from "uuid";
import ora from "ora";
import { OnePasswordService } from "../../services/OnePasswordService.js";
import { TranscriptionStatus } from "@/storage/interfaces.js";

export function createTranscribeCommand(
  storageProvider: StorageProvider,
  pocketCastsService: PocketCastsService, // Keep this as it's passed in
  onePasswordService: OnePasswordService,
  episodeService: EpisodeService // Add EpisodeService dependency
): Command {
  return new Command("transcribe")
    .description("Transcribe an episode's audio")
    .argument("<partialEpisodeId>", "The first part of the episode ID (e.g., 3dc1b2d6)")
    .option("-f, --force", "Force re-transcription even if it already exists")
    .action(async (partialEpisodeId: string, options) => {
      const spinner = ora();
      const storage = storageProvider.getStorage();
      // Use the injected episodeService, remove local instantiation

      try {
        // Find episode by partial ID
        spinner.start(`Finding episode starting with ID: ${partialEpisodeId}...`);
        const episode = await episodeService.findEpisodeByPartialId(partialEpisodeId);
        if (!episode) {
          spinner.fail(`Could not uniquely identify episode with partial ID "${partialEpisodeId}".`);
          process.exit(1);
        }
        spinner.succeed(`Found episode: ${episode.title} (${episode.id})`);

        // Check if transcription exists and handle force flag (use full episode.id)
        const existingTranscription = await storage.getTranscription(episode.id);
        if (existingTranscription && !options.force) {
          if (existingTranscription.status === "completed") {
            spinner.info(
              "Transcription already exists. Use --force to re-transcribe."
            );
            return;
          } else if (existingTranscription.status === "processing") {
            spinner.info("Transcription is already in progress.");
            return;
          }
        }

        // Check if episode is downloaded (use full episode.id)
        const assets = await storage.listAssets(episode.id);
        const audioAsset = assets.find((a) => a.name === "audio.mp3");
        if (!audioAsset) {
          spinner.start("Downloading episode audio...");
          await episodeService.downloadEpisode(episode.id, (progress: number) => { // Use full episode.id, add type for progress
            spinner.text = `Downloading episode audio... ${Math.round(progress * 100)}%`;
          });
          spinner.succeed("Episode downloaded");
        }

        // Get the API key from 1Password
        spinner.start("Retrieving API key...");
        const apiKey = await onePasswordService.getGoogleApiKey();
        if (!apiKey) {
          throw new Error("Failed to retrieve Google API key from 1Password");
        }
        spinner.succeed("API key retrieved");

        // Initialize transcription service
        const transcriptionService = new TranscriptionService({
          apiKey,
        });

        // Get absolute path to audio file (use full episode.id)
        const audioPath = storage.getAssetPath(episode.id, "audio.mp3");

        const status: TranscriptionStatus = {
          id: uuidv4(),
          episodeId: episode.id, // Use full episode.id
          status: "processing",
          model: transcriptionService.model,
          metadata: {
            duration: episode.duration,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };

        await storage.saveTranscription(status);

        // Start transcription
        spinner.start("Starting transcription...");
        try {
          const transcription = await transcriptionService.transcribeFile(
            audioPath,
            (progress) => {
              // Clear the spinner temporarily
              spinner.clear();
              
              // Show new segments
              if (progress.newSegments.length > 0) {
                console.log(chalk.cyan(`\nNew transcription segments (${progress.segmentCount} total):`));
                progress.newSegments.forEach(text => {
                  console.log(chalk.gray(`"${text.trim()}"`));
                });
              }
              
              // Update spinner text and restart
              spinner.text = chalk.yellow(`Transcribing audio... (${progress.segmentCount} segments)`);
              spinner.render();
            }
          );

          status.status = "completed";
          status.transcription = transcription;
          status.metadata.updatedAt = new Date();
          status.metadata.completedAt = new Date();

          // Save transcription
          await storage.saveTranscription(status);
          
          // Update episode record
          await episodeService.updateEpisode(episode.id, { hasTranscript: true });

          spinner.succeed("Transcription completed");

          // Display summary
          console.log(chalk.green("\nTranscription completed successfully:"));
          console.log(`Total segments: ${transcription.segments.length}`);
          console.log(
            `Word count: ${transcription.segments.reduce(
              (count, segment) => count + segment.spoken_text.split(/\s+/).length,
              0
            )}`
          );
          console.log(`Duration: ${episode.duration} seconds`);
        } catch (error) {
          spinner.fail(
            `Transcription failed: ${error instanceof Error ? error.message : String(error)}`
          );
          throw error;
        }
      } catch (error) {
        spinner.fail(
          `Transcription failed: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }
    });
}
