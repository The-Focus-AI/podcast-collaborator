# PocketCast CLI Project Specification (TypeScript)

This document outlines the architecture, patterns, and best practices for building a command-line application with rich terminal UI using TypeScript, Ink, and Vitest, with future plans for web interface integration.

## 1. Project Architecture

### 1.1 Core Architecture Patterns

The project follows a clean, modular architecture with clear separation of concerns, designed for reusability across CLI and web interfaces:

```
src/
├── commands/         # CLI command entry points
├── components/       # UI components (Ink for CLI, reusable logic for web)
├── models/           # Data models and interfaces 
├── services/         # Business logic (platform-agnostic)
├── utils/            # Utility functions
└── types/            # TypeScript type definitions
```

#### 1.1.1 Service-Oriented Design

- Core business logic in platform-agnostic service classes
- Each service has a single, focused responsibility
- Services communicate through well-defined interfaces
- Stateless design where possible, with immutable data patterns

#### 1.1.2 Dependency Injection

- Services receive dependencies through constructors
- Use of interfaces for loose coupling
- Dependency containers for managing service lifecycles
- Configuration passed as explicit parameters

#### 1.1.3 Command Pattern

- CLI commands act as thin entry points to the application
- Commands coordinate service calls and UI rendering
- Clear separation between business logic and presentation

### 1.2 File Organization

```
project_root/
├── src/                      # Source code
│   ├── index.ts              # Main entry point
│   ├── commands/             # CLI commands
│   ├── components/           # Ink UI components
│   ├── models/               # Data models/interfaces
│   ├── services/             # Business logic
│   ├── utils/                # Utility functions 
│   └── types/                # TypeScript types
├── tests/                    # Test files
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── fixtures/             # Test fixtures
├── dist/                     # Compiled output
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vitest.config.ts          # Vitest configuration
└── README.md                 # Documentation
```

## 2. Dependencies and Tooling

### 2.1 Core Dependencies

#### 2.1.1 CLI Framework

- **Commander.js** - Command-line interface framework
    - Defining commands, arguments, and options
    - Help text generation and command dispatching

#### 2.1.2 Terminal UI

- **Ink** - React for CLI applications
    - React-based terminal UI rendering
    - Component-based architecture
    - Support for hooks and state management
- **Ink UI components**
    - `ink-text-input` - Text input fields
    - `ink-select-input` - Selection components
    - `ink-spinner` - Loading indicators
    - `ink-progress-bar` - Progress visualization

#### 2.1.3 Networking

- **Fetch API** - Native HTTP client for API interactions
    - Promise-based standard web API
    - Built into Node.js and browsers
    - Lightweight with no additional dependencies
    - Consistent behavior across platforms

#### 2.1.4 Data Handling

- **zod** - Schema validation and parsing
- **date-fns** - Date manipulation utilities
- **fp-ts** - Functional programming utilities

#### 2.1.5 External Tools Integration

- **execa** - Process execution for external tools
    - Promise-based API
    - Streaming stdout/stderr
    - Proper error handling
- **Vercel AI SDK** - For AI model integration
    - Streaming responses
    - Type-safe interfaces
    - Cross-platform compatibility
    - Optimized for both CLI and web environments

### 2.2 Development Tooling

#### 2.2.1 TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "declaration": true,
    "sourceMap": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 2.2.2 Testing Framework

- **Vitest** - Fast Vite-based testing framework
    - Compatibility with Jest's API
    - ESM support
    - TypeScript integration
    - Watch mode and UI

#### 2.2.3 Package Scripts and Dependencies

```json
{
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write src",
    "prepack": "npm run build"
  },
  "dependencies": {
    "@ai-sdk/gemini": "^1.0.0",
    "ai": "^2.2.0",
    "commander": "^11.0.0",
    "date-fns": "^2.30.0",
    "execa": "^7.2.0",
    "fp-ts": "^2.16.0",
    "ink": "^4.4.1", 
    "ink-progress-bar": "^3.0.0",
    "ink-select-input": "^5.0.0",
    "ink-spinner": "^5.0.0",
    "ink-text-input": "^5.0.1",
    "react": "^18.2.0",
    "zod": "^3.22.2"
  },
  "devDependencies": {
    "@types/node": "^20.8.2",
    "@types/react": "^18.2.25",
    "@typescript-eslint/eslint-plugin": "^6.7.4",
    "@typescript-eslint/parser": "^6.7.4",
    "eslint": "^8.51.0",
    "eslint-plugin-react": "^7.33.2",
    "ink-testing-library": "^3.0.0",
    "prettier": "^3.0.3",
    "tsx": "^3.13.0",
    "typescript": "^5.2.2",
    "vitest": "^0.34.6"
  }
}
```

## 3. Functionality Components

### 3.1 Terminal UI with Ink

#### 3.1.1 Design Principles

- Component-based UI architecture
- React patterns for state management
- Pure functional components where possible
- Custom hooks for shared logic
- Consistent styling and layout

#### 3.1.2 Component Structure

```tsx
// Example Ink component
import React, { FC, useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import { Episode } from '@/models/episode';

interface EpisodeListProps {
  episodes: Episode[];
  onSelect: (episode: Episode) => void;
}

export const EpisodeList: FC<EpisodeListProps> = ({ episodes, onSelect }) => {
  const items = episodes.map(episode => ({
    label: episode.title,
    value: episode.uuid,
  }));

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Episodes</Text>
      </Box>
      <SelectInput items={items} onSelect={item => {
        const episode = episodes.find(e => e.uuid === item.value);
        if (episode) onSelect(episode);
      }} />
    </Box>
  );
};
```

#### 3.1.3 UI Components

- App container with routing between views
- Navigation and selection components
- Progress indicators
- Status bar with context info
- Search and filter interfaces
- Player controls

### 3.2 Media Handling

#### 3.2.1 External Processes

- Use execa for process execution and management

```typescript
import { execa } from 'execa';

export class AudioPlayerService {
  private process?: execa.ExecaChildProcess;
  
  async play(filePath: string, position = 0): Promise<void> {
    // Stop any existing playback
    await this.stop();
    
    // Start FFmpeg with proper options
    this.process = execa('ffplay', [
      '-nodisp',          // No video display
      '-autoexit',        // Exit when file ends
      '-ss', String(position), // Start position
      filePath
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Handle process events
    this.process.on('exit', this.handleExit);
    
    return Promise.resolve();
  }
  
  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = undefined;
    }
    return Promise.resolve();
  }
  
  private handleExit = (code: number): void => {
    this.process = undefined;
    // Handle playback completion or errors
  };
}
```

#### 3.2.2 Media Service Interfaces

```typescript
export interface AudioPlayer {
  play(filePath: string, position?: number): Promise<void>;
  stop(): Promise<void>;
  isPlaying(): boolean;
  getCurrentPosition(): number;
  seek(position: number): Promise<void>;
}

export interface TranscriptionService {
  transcribe(audioFilePath: string): Promise<TranscriptionJob>;
  getTranscript(jobId: string): Promise<Transcript | null>;
  isTranscribing(jobId: string): boolean;
}
```

### 3.3 API Integration

#### 3.3.1 Service Abstraction

```typescript
// API client with interfaces for testing and multiple implementations
export interface ApiClient {
  get<T>(url: string, options?: RequestInit): Promise<T>;
  post<T, D>(url: string, data: D, options?: RequestInit): Promise<T>;
  setAuthToken(token: string): void;
}

// Base implementation with native fetch
export class FetchApiClient implements ApiClient {
  private baseURL: string;
  private defaultHeaders: HeadersInit;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }
  
  async get<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'GET',
      headers: this.defaultHeaders,
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<T>;
  }
  
  async post<T, D>(url: string, data: D, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'POST',
      headers: this.defaultHeaders,
      body: JSON.stringify(data),
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json() as Promise<T>;
  }
  
  setAuthToken(token: string): void {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      'Authorization': `Bearer ${token}`
    };
  }
}
```

#### 3.3.2 Authentication Service

```typescript
export interface AuthService {
  login(email: string, password: string): Promise<AuthResult>;
  getToken(): string | null;
  isAuthenticated(): boolean;
  logout(): void;
}

export class PocketcastAuthService implements AuthService {
  private apiClient: ApiClient;
  private tokenStorage: TokenStorage;
  
  constructor(
    apiClient: ApiClient,
    tokenStorage: TokenStorage
  ) {
    this.apiClient = apiClient;
    this.tokenStorage = tokenStorage;
  }
  
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const result = await this.apiClient.post<AuthResponse, AuthRequest>(
        '/user/login',
        { email, password, scope: 'webplayer' }
      );
      
      // Store token
      this.tokenStorage.saveToken(result.token);
      
      // Update API client
      this.apiClient.setAuthToken(result.token);
      
      return { success: true, email: result.email };
    } catch (error) {
      return { success: false, error: this.handleError(error) };
    }
  }
  
  // Additional methods...
}
```

### 3.4 AI Integration

#### 3.4.1 Transcription Service

```typescript
import { 
  StreamingTextResponse, 
  Message,
  experimental_streamText
} from 'ai';
import { gemini } from '@ai-sdk/gemini';

export class TranscriptionService implements ITranscriptionService {
  private jobs: Map<string, TranscriptionJobState>;
  private aiModel: ReturnType<typeof gemini>;
  private fileSystem: FileSystem;
  
  constructor(fileSystem: FileSystem) {
    this.jobs = new Map();
    this.fileSystem = fileSystem;
    this.aiModel = gemini({
      apiKey: process.env.GEMINI_API_KEY || '',
      model: 'gemini-2.5-pro-exp-03-25'
    });
  }
  
  async transcribe(audioFilePath: string): Promise<TranscriptionJob> {
    const jobId = createUuid();
    const outputPath = this.generateOutputPath(jobId);
    
    // Create job tracking entry
    this.jobs.set(jobId, {
      id: jobId,
      status: 'pending',
      progress: 0,
      filePath: audioFilePath,
      outputPath,
      startTime: Date.now()
    });
    
    // Start transcription in the background
    this.startTranscriptionProcess(jobId);
    
    return {
      id: jobId,
      status: 'pending'
    };
  }
  
  private async startTranscriptionProcess(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    
    try {
      this.jobs.set(jobId, { ...job, status: 'processing' });
      
      // Read audio file as base64
      const audioFile = await this.fileSystem.readFile(job.filePath);
      const base64Audio = audioFile.toString('base64');
      
      // Create a writable stream for the output
      const outputStream = this.fileSystem.createWriteStream(job.outputPath);
      
      // Set up messages for the AI model
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Please transcribe this audio file, generating timestamps in mm:ss format, the spoken text, and identifying speakers if possible. Format the output as JSON with fields: timestamp, text, and speaker.' },
            { type: 'audio', data: base64Audio }
          ]
        }
      ];
      
      // Use the Vercel AI SDK to stream the response
      const { text, completion } = await experimental_streamText({
        model: this.aiModel,
        messages,
        onCompletion: (completion) => {
          // Parse the completed transcription
          try {
            // Try to parse as JSON
            const parsedTranscript = JSON.parse(completion);
            // Write the formatted JSON to the output file
            outputStream.write(JSON.stringify(parsedTranscript, null, 2));
          } catch (e) {
            // If not valid JSON, write the raw text
            outputStream.write(completion);
          } finally {
            outputStream.end();
          }
        }
      });
      
      // Set up progress tracking
      let processedChunks = 0;
      const textStream = text.pipeThrough(
        new TransformStream({
          transform: (chunk, controller) => {
            // Update progress (estimating based on chunks)
            processedChunks++;
            const estimatedProgress = Math.min(processedChunks * 5, 95);
            
            const currentJob = this.jobs.get(jobId);
            if (currentJob) {
              this.jobs.set(jobId, { 
                ...currentJob, 
                progress: estimatedProgress
              });
            }
            
            controller.enqueue(chunk);
          }
        })
      );
      
      // Wait for completion
      await completion;
      
      // Update job status to completed
      const currentJob = this.jobs.get(jobId);
      if (currentJob) {
        this.jobs.set(jobId, { 
          ...currentJob, 
          status: 'completed',
          progress: 100,
          completionTime: Date.now()
        });
      }
    } catch (error) {
      // Handle errors
      const currentJob = this.jobs.get(jobId);
      if (currentJob) {
        this.jobs.set(jobId, { 
          ...currentJob, 
          status: 'failed',
          error: String(error)
        });
      }
    }
  }
  
  // Additional methods...
}
```

## 4. Testing with Vitest

### 4.1 Test Setup

#### 4.1.1 Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

#### 4.1.2 Service Testing Example

```typescript
// tests/unit/services/episode-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EpisodeService } from '@/services/episode-service';
import { ApiClient } from '@/services/api-client';

describe('EpisodeService', () => {
  let mockApiClient: ApiClient;
  let episodeService: EpisodeService;
  
  beforeEach(() => {
    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      setAuthToken: vi.fn()
    };
    
    episodeService = new EpisodeService(mockApiClient);
  });
  
  it('should fetch episodes from API', async () => {
    // Arrange
    const mockResponse = {
      episodes: [
        { uuid: '1', title: 'Episode 1' },
        { uuid: '2', title: 'Episode 2' }
      ]
    };
    
    vi.mocked(mockApiClient.post).mockResolvedValue(mockResponse);
    
    // Act
    const episodes = await episodeService.getRecentEpisodes();
    
    // Assert
    expect(mockApiClient.post).toHaveBeenCalledWith('/user/history', { limit: 100 });
    expect(episodes).toHaveLength(2);
    expect(episodes[0].title).toBe('Episode 1');
  });
  
  // More tests...
});
```

#### 4.1.3 Component Testing

```typescript
// tests/unit/components/episode-list.test.tsx
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { EpisodeList } from '@/components/episode-list';

describe('EpisodeList component', () => {
  it('should render episodes', () => {
    // Arrange
    const episodes = [
      { uuid: '1', title: 'Episode 1', duration: 3600 },
      { uuid: '2', title: 'Episode 2', duration: 1800 }
    ];
    const onSelect = vi.fn();
    
    // Act
    const { lastFrame } = render(
      <EpisodeList episodes={episodes} onSelect={onSelect} />
    );
    
    // Assert
    expect(lastFrame()).toContain('Episode 1');
    expect(lastFrame()).toContain('Episode 2');
  });
  
  // More tests...
});
```

### 4.2 Mocking External Dependencies

#### 4.2.1 Process Execution Mocking

```typescript
// tests/unit/services/audio-player.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AudioPlayerService } from '@/services/audio-player';
import { execa } from 'execa';

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(() => ({
    on: vi.fn(),
    kill: vi.fn(),
    stdout: { pipe: vi.fn() },
    stderr: { pipe: vi.fn() }
  }))
}));

describe('AudioPlayerService', () => {
  let audioPlayer: AudioPlayerService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    audioPlayer = new AudioPlayerService();
  });
  
  it('should start playback process', async () => {
    // Act
    await audioPlayer.play('test.mp3');
    
    // Assert
    expect(execa).toHaveBeenCalledWith(
      'ffplay',
      ['-nodisp', '-autoexit', '-ss', '0', 'test.mp3'],
      expect.anything()
    );
  });
  
  // More tests...
});
```

## 5. Web Integration Preparation

### 5.1 Service Adaptability

#### 5.1.1 Platform-Agnostic Services

- Services should not depend on CLI-specific functionality
- Use dependency injection for platform-specific features
- Define clear interfaces for all dependencies
- Separate state management from UI rendering

#### 5.1.2 Service Factory Pattern

```typescript
// Service factory for different platforms
export type Platform = 'cli' | 'web';

export class ServiceFactory {
  static createApiClient(platform: Platform, baseURL: string): ApiClient {
    return new AxiosApiClient(baseURL);
  }
  
  static createAuthService(platform: Platform): AuthService {
    const apiClient = this.createApiClient(platform, API_BASE_URL);
    
    // Create platform-specific token storage
    const tokenStorage = platform === 'cli' 
      ? new FileTokenStorage() 
      : new BrowserTokenStorage();
    
    return new PocketcastAuthService(apiClient, tokenStorage);
  }
  
  static createEpisodeService(platform: Platform): EpisodeService {
    const apiClient = this.createApiClient(platform, API_BASE_URL);
    
    // Create platform-specific cache
    const cacheProvider = platform === 'cli'
      ? new FileCacheProvider()
      : new BrowserCacheProvider();
    
    return new EpisodeService(apiClient, cacheProvider);
  }
  
  // More factory methods...
}
```

### 5.2 Data Flow Architecture

#### 5.2.1 Repository Pattern

```typescript
// Abstract repository interface
export interface EpisodeRepository {
  getAll(): Promise<Episode[]>;
  findById(id: string): Promise<Episode | null>;
  findByQuery(query: EpisodeQuery): Promise<Episode[]>;
  save(episode: Episode): Promise<Episode>;
}

// Implementation for CLI
export class FileEpisodeRepository implements EpisodeRepository {
  private filePath: string;
  
  constructor(filePath: string) {
    this.filePath = filePath;
  }
  
  // Implementation methods...
}

// Implementation for Web
export class ApiEpisodeRepository implements EpisodeRepository {
  private apiClient: ApiClient;
  
  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }
  
  // Implementation methods...
}
```

#### 5.2.2 State Management

```typescript
// Platform-agnostic state management
export interface Store<T> {
  getState(): T;
  setState(updater: (state: T) => T): void;
  subscribe(listener: (state: T) => void): () => void;
}

// CLI implementation using Node.js EventEmitter
export class NodeStore<T> implements Store<T> {
  private state: T;
  private emitter: EventEmitter;
  
  constructor(initialState: T) {
    this.state = initialState;
    this.emitter = new EventEmitter();
  }
  
  // Implementation methods...
}

// Web implementation using similar pattern
// (can be adapted to work with React or other frameworks)
export class BrowserStore<T> implements Store<T> {
  private state: T;
  private listeners: ((state: T) => void)[];
  
  constructor(initialState: T) {
    this.state = initialState;
    this.listeners = [];
  }
  
  // Implementation methods...
}
```

### 5.3 Platform-Specific Adapters

#### 5.3.1 File System Adapter

```typescript
// Abstract file system interface
export interface FileSystem {
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, data: Buffer | string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
}

// Node.js implementation for CLI
export class NodeFileSystem implements FileSystem {
  async readFile(path: string): Promise<Buffer> {
    return fs.promises.readFile(path);
  }
  
  // Other implementation methods...
}

// Web implementation (using IndexedDB or similar)
export class BrowserFileSystem implements FileSystem {
  private db: IDBDatabase;
  
  constructor(db: IDBDatabase) {
    this.db = db;
  }
  
  // Implementation methods...
}
```

#### 5.3.2 UI State Translation

```typescript
// UI state adapter for multi-platform compatibility
export interface UiStateAdapter<T, U> {
  fromDomain(domainState: T): U;
  toDomain(uiState: U): T;
}

// Example for episode list
export class EpisodeListAdapter implements UiStateAdapter<Episode[], EpisodeListUiState> {
  fromDomain(episodes: Episode[]): EpisodeListUiState {
    return {
      items: episodes.map(episode => ({
        id: episode.uuid,
        title: episode.title,
        duration: formatDuration(episode.duration),
        isPlayed: episode.isPlayed,
        isDownloaded: episode.isDownloaded,
        publishDate: formatDate(episode.publishedAt)
      }))
    };
  }
  
  toDomain(uiState: EpisodeListUiState): Episode[] {
    // Implementation...
    return [];
  }
}
```

## 6. Implementation Guidelines

### 6.1 Error Handling

#### 6.1.1 Result Pattern

```typescript
// Result type for operations that might fail
export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

// Using the Result type
export class AuthService {
  async login(credentials: Credentials): Promise<Result<User, AuthError>> {
    try {
      // Authentication logic
      const user = await this.apiClient.post<User>('/login', credentials);
      return { success: true, value: user };
    } catch (error) {
      return { 
        success: false, 
        error: this.mapError(error)
      };
    }
  }
  
  private mapError(error: unknown): AuthError {
    // Error mapping logic
    return new AuthError('Authentication failed');
  }
}
```

#### 6.1.2 Error Boundaries (CLI)

```tsx
// Error boundary for Ink components
import React, { FC, ReactNode, useState } from 'react';
import { Box, Text } from 'ink';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: FC<{ error: Error }>;
}

export const ErrorBoundary: FC<ErrorBoundaryProps> = ({ 
  children, 
  fallback: Fallback 
}) => {
  const [error, setError] = useState<Error | null>(null);
  
  if (error) {
    if (Fallback) {
      return <Fallback error={error} />;
    }
    
    return (
      <Box borderStyle="round" borderColor="red" padding={1}>
        <Text color="red">Error: {error.message}</Text>
      </Box>
    );
  }
  
  // Use React's error boundary pattern with hooks
  try {
    return <>{children}</>;
  } catch (e) {
    setError(e instanceof Error ? e : new Error(String(e)));
    return null;
  }
};
```

### 6.2 Resource Management

#### 6.2.1 Disposable Pattern

```typescript
// Interface for resources that need cleanup
export interface Disposable {
  dispose(): Promise<void>;
}

// Resource management class
export class ResourceManager {
  private resources: Disposable[] = [];
  
  register(resource: Disposable): void {
    this.resources.push(resource);
  }
  
  async disposeAll(): Promise<void> {
    for (const resource of this.resources) {
      await resource.dispose();
    }
    this.resources = [];
  }
}

// Usage with audio player
export class AudioPlayerService implements Disposable {
  // Implementation...
  
  async dispose(): Promise<void> {
    await this.stop();
    // Cleanup resources
  }
}
```

#### 6.2.2 File System Operations

```typescript
// Safe file operations with proper error handling
export class FileService {
  private fs: FileSystem;
  
  constructor(fs: FileSystem) {
    this.fs = fs;
  }
  
  async readJsonFile<T>(path: string, defaultValue: T): Promise<T> {
    try {
      const exists = await this.fs.exists(path);
      if (!exists) return defaultValue;
      
      const data = await this.fs.readFile(path);
      return JSON.parse(data.toString()) as T;
    } catch (error) {
      console.error(`Error reading ${path}:`, error);
      return defaultValue;
    }
  }
  
  async writeJsonFile<T>(path: string, data: T): Promise<boolean> {
    try {
      const dirPath = dirname(path);
      const dirExists = await this.fs.exists(dirPath);
      
      if (!dirExists) {
        await this.fs.mkdir(dirPath);
      }
      
      await this.fs.writeFile(path, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error writing ${path}:`, error);
      return false;
    }
  }
}
```

## 7. CLI Implementation with Ink

### 7.1 Command Structure

```typescript
// src/index.ts - Main entry point
#!/usr/bin/env node
import { Command } from 'commander';
import React from 'react';
import { render } from 'ink';
import { App } from './components/app';
import { version } from '../package.json';

const program = new Command();

program
  .name('pocketcast-cli')
  .description('A terminal UI for Pocketcasts')
  .version(version);

program
  .command('sync')
  .description('Sync episodes from Pocketcast')
  .action(() => {
    render(<App initialView="sync" />);
  });

program
  .command('browse')
  .description('Browse and select episodes')
  .action(() => {
    render(<App initialView="browse" />);
  });

program
  .command('play <episodeId>')
  .description('Play an episode')
  .action((episodeId) => {
    render(<App initialView="play" episodeId={episodeId} />);
  });

program
  .command('transcribe <episodeId>')
  .description('Transcribe an episode')
  .action((episodeId) => {
    render(<App initialView="transcribe" episodeId={episodeId} />);
  });

program.parse();
```

### 7.2 App Component

```tsx
// src/components/app.tsx
import React, { FC, useState } from 'react';
import { Box } from 'ink';
import { SyncView } from './views/sync-view';
import { BrowseView } from './views/browse-view';
import { PlayerView } from './views/player-view';
import { TranscribeView } from './views/transcribe-view';
import { ServiceFactory } from '../services/service-factory';
import { ErrorBoundary } from './error-boundary';

// Initialize services
const authService = ServiceFactory.createAuthService('cli');
const episodeService = ServiceFactory.createEpisodeService('cli');
const playerService = ServiceFactory.createAudioPlayerService('cli');
const transcriptionService = ServiceFactory.createTranscriptionService('cli');

// Views type
type View = 'sync' | 'browse' | 'play' | 'transcribe' | 'chat';

interface AppProps {
  initialView: View;
  episodeId?: string;
}

export const App: FC<AppProps> = ({ initialView, episodeId }) => {
  const [currentView, setCurrentView] = useState<View>(initialView);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | undefined>(episodeId);
  
  // Navigation handler
  const navigate = (view: View, episodeId?: string) => {
    setCurrentView(view);
    if (episodeId) {
      setSelectedEpisodeId(episodeId);
    }
  };
  
  // Render current view
  const renderView = () => {
    switch (currentView) {
      case 'sync':
        return <SyncView episodeService={episodeService} onNavigate={navigate} />;
      case 'browse':
        return <BrowseView episodeService={episodeService} onNavigate={navigate} />;
      case 'play':
        return selectedEpisodeId ? (
          <PlayerView 
            episodeId={selectedEpisodeId} 
            episodeService={episodeService} 
            playerService={playerService}
            transcriptionService={transcriptionService}
            onNavigate={navigate}
          />
        ) : null;
      case 'transcribe':
        return selectedEpisodeId ? (
          <TranscribeView 
            episodeId={selectedEpisodeId} 
            episodeService={episodeService}
            transcriptionService={transcriptionService}
            onNavigate={navigate}
          />
        ) : null;
      default:
        return null;
    }
  };
  
  return (
    <ErrorBoundary>
      <Box flexDirection="column">
        {renderView()}
      </Box>
    </ErrorBoundary>
  );
};
```

### 7.3 Episode Browser Component

```tsx
// src/components/views/browse-view.tsx
import React, { FC, useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import { EpisodeService } from '../../services/episode-service';
import { Episode } from '../../models/episode';

interface BrowseViewProps {
  episodeService: EpisodeService;
  onNavigate: (view: string, episodeId?: string) => void;
}

export const BrowseView: FC<BrowseViewProps> = ({ 
  episodeService, 
  onNavigate 
}) => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  
  // Load episodes on mount
  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        setLoading(true);
        const result = await episodeService.getRecentEpisodes();
        setEpisodes(result);
        setError(null);
      } catch (err) {
        setError(`Failed to load episodes: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEpisodes();
  }, [episodeService]);
  
  // Filter episodes based on search input
  const filteredEpisodes = episodes.filter(episode => {
    if (!filter) return true;
    return (
      episode.title.toLowerCase().includes(filter.toLowerCase()) ||
      episode.podcastTitle?.toLowerCase().includes(filter.toLowerCase())
    );
  });
  
  // Handle episode selection
  const handleSelect = (item: { value: string }) => {
    const episodeId = item.value;
    onNavigate('play', episodeId);
  };
  
  // Toggle search mode
  const toggleSearch = () => {
    setIsSearching(!isSearching);
    if (!isSearching) {
      setSearchInput(filter);
    } else {
      setFilter(searchInput);
    }
  };
  
  // Handle key presses
  useEffect(() => {
    const handleKeyPress = (input: string) => {
      if (input === '/') {
        toggleSearch();
      } else if (input === 'q' && !isSearching) {
        process.exit(0);
      }
    };
    
    // Set up key press listener
    // Implementation would depend on how you handle input outside of components
    
    return () => {
      // Cleanup listener
    };
  }, [isSearching]);
  
  // Render loading state
  if (loading) {
    return (
      <Box>
        <Text>
          <Spinner type="dots" /> Loading episodes...
        </Text>
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text>Press any key to retry</Text>
      </Box>
    );
  }
  
  // Render search input if in search mode
  if (isSearching) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text>Search: </Text>
          <TextInput 
            value={searchInput} 
            onChange={setSearchInput}
            onSubmit={() => {
              setFilter(searchInput);
              setIsSearching(false);
            }}
          />
        </Box>
        <Text dimColor>Press Enter to search, Esc to cancel</Text>
      </Box>
    );
  }
  
  // Render episode list
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Pocketcast Episodes</Text>
        {filter && (
          <Text> (Filtered: {filter})</Text>
        )}
      </Box>
      
      {filteredEpisodes.length === 0 ? (
        <Text>No episodes found</Text>
      ) : (
        <SelectInput
          items={filteredEpisodes.map(episode => ({
            label: `${episode.podcastTitle} - ${episode.title} (${formatDuration(episode.duration)})`,
            value: episode.uuid
          }))}
          onSelect={handleSelect}
        />
      )}
      
      <Box marginTop={1}>
        <Text dimColor>Press / to search, q to quit</Text>
      </Box>
    </Box>
  );
};

// Utility function for formatting duration
const formatDuration = (seconds?: number): string => {
  if (!seconds) return '--:--';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};
```

### 7.4 Player View Component

```tsx
// src/components/views/player-view.tsx
import React, { FC, useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import ProgressBar from 'ink-progress-bar';
import { EpisodeService } from '../../services/episode-service';
import { AudioPlayerService } from '../../services/audio-player-service';
import { TranscriptionService } from '../../services/transcription-service';
import { Episode } from '../../models/episode';
import { formatDuration } from '../../utils/format';
import { useInput } from 'ink';

interface PlayerViewProps {
  episodeId: string;
  episodeService: EpisodeService;
  playerService: AudioPlayerService;
  transcriptionService: TranscriptionService;
  onNavigate: (view: string, episodeId?: string) => void;
}

export const PlayerView: FC<PlayerViewProps> = ({
  episodeId,
  episodeService,
  playerService,
  transcriptionService,
  onNavigate
}) => {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [transcriptAvailable, setTranscriptAvailable] = useState<boolean>(false);
  const [transcriptLoading, setTranscriptLoading] = useState<boolean>(false);
  
  // Load episode data
  useEffect(() => {
    const loadEpisode = async () => {
      try {
        setLoading(true);
        const ep = await episodeService.getEpisodeById(episodeId);
        if (!ep) {
          throw new Error(`Episode not found: ${episodeId}`);
        }
        
        setEpisode(ep);
        
        // Check if transcript is available
        const hasTranscript = await transcriptionService.hasTranscript(episodeId);
        setTranscriptAvailable(hasTranscript);
        
        // Start playback if the episode is downloaded
        if (ep.isDownloaded) {
          await playerService.play(ep.filePath);
          setIsPlaying(true);
        } else {
          // Would handle download here
        }
      } catch (err) {
        setError(`Failed to load episode: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadEpisode();
    
    // Set up interval to update position
    const interval = setInterval(() => {
      if (isPlaying) {
        setCurrentPosition(playerService.getCurrentPosition());
      }
    }, 500);
    
    // Cleanup
    return () => {
      clearInterval(interval);
      playerService.stop();
    };
  }, [episodeId, episodeService, playerService, transcriptionService]);
  
  // Handle keyboard input
  useInput((input, key) => {
    // Handle play/pause (Enter)
    if (key.return) {
      togglePlayback();
    }
    
    // Seek backward (Left arrow)
    if (key.leftArrow) {
      seekBackward();
    }
    
    // Seek forward (Right arrow)
    if (key.rightArrow) {
      seekForward();
    }
    
    // Start chat (c)
    if (input === 'c' && transcriptAvailable) {
      onNavigate('chat', episodeId);
    }
    
    // Back to browse (q)
    if (input === 'q') {
      onNavigate('browse');
    }
    
    // Create transcript (t)
    if (input === 't' && !transcriptAvailable && !transcriptLoading) {
      startTranscription();
    }
  });
  
  // Toggle play/pause
  const togglePlayback = async () => {
    if (!episode) return;
    
    if (isPlaying) {
      await playerService.stop();
      setIsPlaying(false);
    } else {
      await playerService.play(episode.filePath, currentPosition);
      setIsPlaying(true);
    }
  };
  
  // Seek backward
  const seekBackward = async () => {
    if (!episode || !isPlaying) return;
    
    const newPosition = Math.max(0, currentPosition - 30);
    setCurrentPosition(newPosition);
    await playerService.seek(newPosition);
  };
  
  // Seek forward
  const seekForward = async () => {
    if (!episode || !isPlaying) return;
    
    const newPosition = Math.min(episode.duration || 0, currentPosition + 30);
    setCurrentPosition(newPosition);
    await playerService.seek(newPosition);
  };
  
  // Start transcription
  const startTranscription = async () => {
    if (!episode) return;
    
    try {
      setTranscriptLoading(true);
      await transcriptionService.transcribe(episode.filePath);
      
      // Poll for transcript completion
      const pollingInterval = setInterval(async () => {
        const hasTranscript = await transcriptionService.hasTranscript(episodeId);
        if (hasTranscript) {
          setTranscriptAvailable(true);
          setTranscriptLoading(false);
          clearInterval(pollingInterval);
        }
      }, 5000);
    } catch (err) {
      setError(`Failed to start transcription: ${err instanceof Error ? err.message : String(err)}`);
      setTranscriptLoading(false);
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <Box>
        <Text>
          <Spinner type="dots" /> Loading episode...
        </Text>
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text>Press 'q' to go back</Text>
      </Box>
    );
  }
  
  // Render player if episode is loaded
  if (episode) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>{episode.podcastTitle}</Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text bold>{episode.title}</Text>
        </Box>
        
        <ProgressBar
          percent={episode.duration ? currentPosition / episode.duration : 0}
          width={50}
          character="█"
          leftCharacter=""
          rightCharacter=""
        />
        
        <Box marginY={1}>
          <Text>{formatDuration(currentPosition)} / {formatDuration(episode.duration)}</Text>
        </Box>
        
        <Box marginY={1}>
          <Text>Status: {isPlaying ? 'Playing' : 'Paused'}</Text>
          {transcriptLoading && (
            <Text> | <Spinner type="dots" /> Transcribing...</Text>
          )}
          {transcriptAvailable && (
            <Text> | Transcript Available</Text>
          )}
        </Box>
        
        <Box marginTop={1}>
          <Text dimColor>
            ↵ {isPlaying ? 'Pause' : 'Play'} | ← -30s | → +30s
            {transcriptAvailable && ' | c Chat'} 
            {!transcriptAvailable && !transcriptLoading && ' | t Transcribe'}
            | q Back
          </Text>
        </Box>
      </Box>
    );
  }
  
  return null;
};
```

### 7.5 Chat Interface Component

```tsx
// src/components/views/chat-view.tsx
import React, { FC, useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { TranscriptionService } from '../../services/transcription-service';
import { ChatService } from '../../services/chat-service';
import { useInput } from 'ink';

interface ChatViewProps {
  episodeId: string;
  transcriptionService: TranscriptionService;
  chatService: ChatService;
  onNavigate: (view: string, episodeId?: string) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatView: FC<ChatViewProps> = ({
  episodeId,
  transcriptionService,
  chatService,
  onNavigate
}) => {
  const [transcript, setTranscript] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [thinking, setThinking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load transcript
  useEffect(() => {
    const loadTranscript = async () => {
      try {
        setLoading(true);
        const transcript = await transcriptionService.getTranscript(episodeId);
        if (!transcript) {
          throw new Error('Transcript not found');
        }
        setTranscript(transcript);
        
        // Add system welcome message
        setMessages([
          {
            role: 'assistant',
            content: 'I have loaded the transcript. How can I help you understand this episode?'
          }
        ]);
      } catch (err) {
        setError(`Failed to load transcript: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadTranscript();
  }, [episodeId, transcriptionService]);
  
  // Handle keyboard shortcuts
  useInput((input, key) => {
    // Quit chat and return to player (only when not typing)
    if (input === 'q' && !input && !thinking) {
      onNavigate('play', episodeId);
    }
  });
  
  // Handle sending a message
  const handleSendMessage = async () => {
    if (!input.trim() || thinking) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    // If user types 'exit' or 'quit', return to player
    if (userMessage.toLowerCase() === 'exit' || userMessage.toLowerCase() === 'quit') {
      onNavigate('play', episodeId);
      return;
    }
    
    try {
      setThinking(true);
      
      // Create chat context from messages
      const chatMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Add user's new message
      chatMessages.push({ 
        role: 'user', 
        content: userMessage 
      });
      
      // Get response from AI
      const response = await chatService.chat(episodeId, chatMessages);
      
      // Add assistant response to chat
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: response }
      ]);
    } catch (err) {
      // Add error message to chat
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: `Error: ${err instanceof Error ? err.message : String(err)}` 
        }
      ]);
    } finally {
      setThinking(false);
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <Box>
        <Text>
          <Spinner type="dots" /> Loading transcript for chat...
        </Text>
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text>Press 'q' to go back to player</Text>
      </Box>
    );
  }
  
  // Render chat interface
  return (
    <Box flexDirection="column" width={80}>
      <Box marginBottom={1}>
        <Text bold>Chat with Episode Transcript</Text>
      </Box>
      
      {/* Message history */}
      <Box flexDirection="column" marginBottom={1}>
        {messages.map((msg, i) => (
          <Box key={i} flexDirection="column" marginBottom={1}>
            <Text bold color={msg.role === 'user' ? 'green' : 'blue'}>
              {msg.role === 'user' ? 'You' : 'Assistant'}:
            </Text>
            <Text>{msg.content}</Text>
          </Box>
        ))}
        
        {thinking && (
          <Box>
            <Text color="blue">
              <Spinner type="dots" /> Assistant is thinking...
            </Text>
          </Box>
        )}
      </Box>
      
      {/* Input area */}
      <Box>
        <Text>> </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSendMessage}
          placeholder="Type your question (q to exit)"
        />
      </Box>
      
      <Box marginTop={1}>
        <Text dimColor>Press Enter to send, type 'exit' or 'quit' to return to player</Text>
      </Box>
    </Box>
  );
};
```

These component examples demonstrate how to implement the core functionality of the application using Ink with React patterns. Each component is designed to be reusable, maintainable, and focused on a specific aspect of the application.