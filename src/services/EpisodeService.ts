import type { Episode, EpisodeNote, PodcastStorage, Asset, Transcription } from '../storage/interfaces.js'; // Added Transcription
import type { StorageProvider } from '../storage/StorageProvider.js';
import type { PocketCastsService } from './PocketCastsService.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { createWriteStream } from 'fs';
import { mkdir, readFile } from 'fs/promises'; // Added mkdir, readFile import
import { pipeline } from 'stream/promises';
import { CoreMessage, streamText, StreamTextResult, ToolSet } from "ai"; // Added AI SDK imports
import { createGoogleGenerativeAI } from "@ai-sdk/google"; // Correct import for Google AI
import { OnePasswordService } from "./OnePasswordService.js"; // Added 1Password service

export interface EpisodeService {
  listEpisodes(): Promise<Episode[]>;
  getEpisode(episodeId: string): Promise<Episode | null>; // Added
  findEpisodeByPartialId(partialId: string): Promise<Episode | null>; // Added for CLI convenience
  loadShowNotes(episodeId: string): Promise<EpisodeNote>;
  updateEpisode(episodeId: string, update: Partial<Episode>): Promise<Episode>;
  getStorage(): PodcastStorage;
  syncEpisodes(): Promise<Episode[]>;
  downloadEpisode(episodeId: string, onProgress: (progress: number) => void): Promise<void>; // Updated return type
  getEpisodeAudioPath(episodeId: string): Promise<string | null>; // Added
  transcribeEpisode(episodeId: string): Promise<void>;
  getEpisodeTranscriptPath(episodeId: string): Promise<string | null>; // Added
  // Update return type to match implementation
  chatWithEpisode(episodeId: string, message: string): Promise<StreamTextResult<ToolSet, unknown>>;
}

export class EpisodeServiceImpl implements EpisodeService {
  // Simple in-memory store for conversation history per episode
  private chatHistories: Map<string, CoreMessage[]> = new Map();
  private googleAI: ReturnType<typeof createGoogleGenerativeAI> | null = null;
  private onePasswordService: OnePasswordService; // Add for API key retrieval

  constructor(
    private readonly storageProvider: StorageProvider,
    private readonly pocketCastsService: PocketCastsService
  ) {
    // Instantiate 1Password service here or inject if preferred
    this.onePasswordService = new OnePasswordService();
  }

  // Helper to initialize Google AI client
  private async getGoogleAI() {
    if (!this.googleAI) {
      const apiKey = await this.onePasswordService.getGoogleApiKey();
      if (!apiKey) {
        throw new Error("Google API key not found in 1Password.");
      }
      this.googleAI = createGoogleGenerativeAI({ apiKey });
    }
    return this.googleAI;
  }

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

  async getEpisode(episodeId: string): Promise<Episode | null> {
    const storage = this.storageProvider.getStorage();
    try {
      const episode = await storage.getEpisode(episodeId);
      return episode;
    } catch (error) {
      // Assuming storage throws if not found, or returns null/undefined
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Episode ${episodeId} not found in storage: ${errorMessage}`, { episodeId });
      return null;
    }
  }
 
  async findEpisodeByPartialId(partialId: string): Promise<Episode | null> {
    const storage = this.storageProvider.getStorage();
    const allEpisodes = await storage.listEpisodes(); // Fetch all episodes
    
    const matchingEpisodes = allEpisodes.filter(ep => ep.id.startsWith(partialId));
 
    if (matchingEpisodes.length === 1) {
      return matchingEpisodes[0]; // Unique match found
    } else if (matchingEpisodes.length > 1) {
      logger.warn(`Multiple episodes found starting with ID "${partialId}". Please provide a more specific ID.`);
      return null;
    } else {
      logger.warn(`No episode found starting with ID "${partialId}".`);
      return null;
    }
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

  async getEpisodeAudioPath(episodeId: string): Promise<string | null> {
    const storage = this.storageProvider.getStorage();
    const episode = await storage.getEpisode(episodeId);
    if (!episode || !episode.isDownloaded) {
      logger.warn(`Audio path requested for episode ${episodeId}, but it's not downloaded or doesn't exist.`);
      return null;
    }
    // Assuming asset name is consistent
    const assetName = 'audio.mp3';
    try {
      // Check if the asset actually exists on disk (optional but good practice)
      const assetPath = storage.getAssetPath(episode.id, assetName);
      // You might want to add an fs.promises.access check here in a real scenario
      // await fs.promises.access(assetPath);
      return assetPath;
    } catch (error) {
      logger.error(`Error accessing audio asset path for episode ${episodeId}`, { episodeId });
      // Log the actual error object separately if needed for more detail,
      // but don't pass it in the context object.
      // console.error(error);
      return null;
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

  // Modified to just check the flag, not return a real path
  async getEpisodeTranscriptPath(episodeId: string): Promise<string | null> {
    const episode = await this.getEpisode(episodeId);
    if (!episode || !episode.hasTranscript) {
       logger.warn(`Transcript check failed for episode ${episodeId}: Episode not found or hasTranscript flag is false.`);
      return null;
    }
    // Return a non-null string to indicate availability, even if path isn't used directly by chat
    logger.debug(`Transcript check successful for episode ${episodeId} based on hasTranscript flag.`);
    return "available";
  }

  // Updated to return a stream
  async chatWithEpisode(episodeId: string, message: string): Promise<ReturnType<typeof streamText>> {
    logger.info(`Chat initiated for episode ${episodeId} with message: "${message}"`);
    const storage = this.storageProvider.getStorage();

    // 1. Get Episode and Transcript
    const episode = await this.getEpisode(episodeId);
    if (!episode) {
      throw new Error("Episode not found.");
    }
    const transcriptionData = await storage.getTranscriptionByEpisodeId(episodeId); // Use correct method
    if (!transcriptionData || transcriptionData.status !== 'completed' || !transcriptionData.transcription) {
      throw new Error("Episode transcript not found or not completed.");
    }
    
    // Format transcript segments as JSON to preserve structure
    const transcriptContext = JSON.stringify(transcriptionData.transcription.segments, null, 2);

    // 2. Manage History
    if (!this.chatHistories.has(episodeId)) {
      this.chatHistories.set(episodeId, []);
    }
    const history = this.chatHistories.get(episodeId)!;

    // Add user message to history
    history.push({ role: 'user', content: message });

    // 3. Construct Prompt/Messages
    const systemPrompt = `You are a helpful assistant knowledgeable about the podcast episode titled "${episode.title}". Use the provided transcript context (formatted as a JSON array of segments, including 'timestamp', 'speaker', 'spoken_text', and 'topics') to answer questions accurately. Refer to timestamps when relevant. Transcript Context:\n\n${transcriptContext}`;
    
    const messages: CoreMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history // Include previous messages
    ];

    // 4. Call LLM via streamText
    try {
      const google = await this.getGoogleAI();
      // Define model - consider a cheaper/faster one for chat if appropriate
      const model = google('models/gemini-1.5-flash-latest');

      const streamResult = await streamText({
        model: model,
        messages: messages,
        // Optional: Add temperature, maxTokens etc.
      });

      // We need to consume the stream slightly to capture the assistant's response for history
      // This is a bit tricky; ideally, the caller handles the stream AND updates history.
      // For now, let's create a pass-through stream to capture the full response.
      
      let fullResponse = '';
      const responseStream = new ReadableStream({
         async start(controller) {
            const reader = streamResult.textStream.getReader();
            try {
               while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  fullResponse += value; // Capture response text
                  controller.enqueue(value); // Pass chunk along
               }
               controller.close();
            } catch (error) {
               controller.error(error);
            } finally {
               reader.releaseLock();
               // Add assistant response to history AFTER stream is done
               if (fullResponse) {
                  history.push({ role: 'assistant', content: fullResponse });
               }
            }
         }
      });

      // Return a new object containing the stream and other potential info
      return {
         ...streamResult, // Include original stream properties if needed
         textStream: responseStream // Return the pass-through stream
      };

    } catch (error) {
      // Remove the user message from history if the API call failed
      history.pop();
      logger.error(`LLM chat API call failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}