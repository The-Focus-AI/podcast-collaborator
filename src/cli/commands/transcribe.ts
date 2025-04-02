import { Command } from "commander";
import { StorageProvider } from "../../storage/StorageProvider.js";
import { PocketCastsService } from "../../services/PocketCastsService.js";
import { EpisodeServiceImpl } from "../../services/EpisodeService.js";
import { TranscriptionService } from "../../services/TranscriptionService.js";
import chalk from "chalk";
import { logger } from "../../utils/logger.js";
import { v4 as uuidv4 } from "uuid";
import ora from "ora";
import { OnePasswordService } from "../../services/OnePasswordService.js";
import { TranscriptionStatus } from "@/storage/interfaces.js";

export function createTranscribeCommand(
  storageProvider: StorageProvider,
  pocketCastsService: PocketCastsService,
  onePasswordService: OnePasswordService
): Command {
  return new Command("transcribe")
    .description("Transcribe an episode's audio")
    .argument("<episodeId>", "ID of the episode to transcribe")
    .option("-f, --force", "Force re-transcription even if it already exists")
    .action(async (episodeId: string, options) => {
      const spinner = ora();
      const storage = storageProvider.getStorage();
      const episodeService = new EpisodeServiceImpl(
        storageProvider,
        pocketCastsService
      );

      try {
        // Check if episode exists
        const episode = await storage.getEpisode(episodeId);
        if (!episode) {
          throw new Error(`Episode ${episodeId} not found`);
        }

        // Check if transcription exists and handle force flag
        const existingTranscription = await storage.getTranscription(episodeId);
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

        // Check if episode is downloaded
        const assets = await storage.listAssets(episodeId);
        const audioAsset = assets.find((a) => a.name === "audio.mp3");
        if (!audioAsset) {
          spinner.start("Downloading episode audio...");
          await episodeService.downloadEpisode(episodeId, (progress) => {
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

        // Get absolute path to audio file
        const audioPath = storage.getAssetPath(episodeId, "audio.mp3");

        const status: TranscriptionStatus = {
          id: uuidv4(),
          episodeId,
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
        spinner.start("Transcribing audio...");
        // try {
          const transcription =
            await transcriptionService.transcribeFile(audioPath);

          status.status = "completed";
          status.transcription = transcription;
          status.metadata.updatedAt = new Date();
          status.metadata.completedAt = new Date();
        // } catch (error) {
        //   spinner.fail(
        //     `Transcription failed: ${error instanceof Error ? error.message : String(error)}`
        //   );
        //   status.status = "failed";
        //   status.metadata.error =
        //     error instanceof Error ? error.message : String(error);
        // }

        // Save transcription
        await storage.saveTranscription(status);

        spinner.succeed("Transcription completed");

        // Display summary
        logger.info(chalk.green("\nTranscription completed successfully:"));
        logger.info(`Total segments: ${transcription.segments.length}`);
        logger.info(
          `Word count: ${transcription.segments.reduce(
            (count, segment) => count + segment.spoken_text.split(/\s+/).length,
            0
          )}`
        );
        logger.info(`Duration: ${episode.duration} seconds`);
      } catch (error) {
        spinner.fail(
          `Transcription failed: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }
    });
}
