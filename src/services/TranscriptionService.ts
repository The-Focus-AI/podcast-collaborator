import { CoreMessage, generateObject } from "ai";
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

      const response = await generateObject({
        model: googleModel,
        schema: TranscriptionSchema,
        messages,
      });

      console.log(JSON.stringify(response, null, 2));

      // Save raw response for debugging
      await this.saveDebugInfo(transcriptionId, response, "raw_response");

      return response.object;
    });
  }
}
