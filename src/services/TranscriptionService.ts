import { CoreMessage, streamObject } from "ai"; // Import streamObject
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { Transcription, TranscriptionSchema } from "../storage/interfaces.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { logger } from "@/utils/logger.js";

interface TranscriptionConfig {
  apiKey: string;
  model?: string;
  maxOutputTokens?: number;
  retryAttempts?: number;
  retryDelay?: number; // in ms
}

const MIME_TYPES: Record<string, string> = {
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
};

export class TranscriptionService {
   model: string;
  private maxOutputTokens: number;
  private retryAttempts: number;
  private retryDelay: number;
  private debugDir: string;
  private apiKey: string;

  constructor(config: TranscriptionConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || "gemini-2.5-pro-exp-03-25";
    this.maxOutputTokens = config.maxOutputTokens || 2048;
    this.retryAttempts = config.retryAttempts || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.debugDir = join(homedir(), ".podcast-cli", "debug", "transcriptions");
  }

  private async saveDebugInfo(
    id: string,
    data: any,
    type: string
  ): Promise<void> {
    try {
      await mkdir(this.debugDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = join(this.debugDir, `${id}_${type}_${timestamp}.json`);
      await writeFile(filename, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn("Failed to save debug info:", error);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.retryAttempts) {
        throw error;
      }
      await this.sleep(this.retryDelay * attempt);
      return this.retryOperation(operation, attempt + 1);
    }
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext];
    if (!mimeType) {
      throw new Error(`Unsupported audio file type: ${ext}`);
    }
    return mimeType;
  }

  async transcribeFile(filePath: string): Promise<Transcription> {
    const transcriptionId = uuidv4();
    return await this.retryOperation(async () => {
      const mimeType = this.getMimeType(filePath);

      logger.debug(`Transcribing file: ${filePath}`);
      // Read the file into a buffer
      const fileData = await readFile(filePath);

      // Create a base64 representation of the audio file
      const base64Audio = fileData.toString("base64");

      // Save debug info about the file
      await this.saveDebugInfo(
        transcriptionId,
        {
          filePath,
          mimeType,
          sizeBytes: fileData.length,
        },
        "file_info"
      );

      const google = createGoogleGenerativeAI({
        apiKey: this.apiKey,
      });
      const googleModel = google(this.model);

      const messages = [
        {
          role: "user",
          content: [{ type: "file", data: base64Audio, mimeType }],
        },
        { role: "user", content: [{ type: "text", text: "transcript" }] },
      ] as CoreMessage[];
logger.info(`Sending ${filePath} (${(fileData.length / (1024*1024)).toFixed(2)} MB) to model ${this.model} for transcription stream...`);

const stream = await streamObject({
  model: googleModel,
  schema: TranscriptionSchema,
  messages,
});

logger.info(`Receiving transcription stream from model...`);
// Stop spinner from transcribe command *before* processing stream
// Note: This assumes the spinner was passed or accessible, which it isn't directly.
// We'll rely on the console logs for now. The spinner in transcribe.ts will stop on completion/error.

let finalTranscription: Transcription | null = null;
let streamReceivedData = false; // Flag to check if we got anything

logger.debug("Starting to process transcription stream...");
try {
  // Process the stream
  for await (const partial of stream.partialObjectStream) {
    streamReceivedData = true; // Mark that we received something
    // Log raw partial chunk confirmation
    console.log("\n--- Received Stream Chunk ---"); // Add newline to separate from spinner
    console.log(JSON.stringify(partial, null, 2)); // Uncomment to log the raw partial object structure
    // Keep track of the latest object (simple approach)
    if (partial) {
        finalTranscription = partial as Transcription;
    }
  }
} catch (streamError) {
  const errorMsg = streamError instanceof Error ? streamError.message : String(streamError);
  logger.error(`Error occurred during transcription stream processing: ${errorMsg}`);
  // We might want to throw here or handle differently depending on desired behavior
  throw streamError;
} finally {
  logger.debug("Finished processing transcription stream loop."); // Log after loop/error/finally
}

if (!streamReceivedData) {
   logger.warn("Transcription stream finished but yielded no partial objects.");
}

if (!finalTranscription) {
  throw new Error("Transcription stream finished without producing a final object.");
}

logger.info(`Transcription stream finished.`);

// Save the final reconstructed object for debugging
await this.saveDebugInfo(transcriptionId, finalTranscription, "final_streamed_object");

return finalTranscription;
    });
  }
}
