# PocketCast CLI Project Plan

Last Updated: 2025-03-31 08:52:30 EDT

## Overview

This plan outlines the step-by-step implementation of a terminal-based Pocketcast client with AI-powered features. The project will be built using TypeScript, Ink for terminal UI, and follow test-driven development practices.

## Implementation Phases

### Phase 1: Project Setup and Core Infrastructure
- [X] Initialize project with TypeScript and dependencies
- [X] Set up testing infrastructure with Vitest
- [X] Implement basic CLI command structure
- [X] Create core service interfaces and types
- [X] Set up error handling utilities
- [X] Implement storage layer
  - [X] Define storage interfaces
  - [X] Create mock storage for testing
  - [X] Implement filesystem storage
  - [X] Add storage provider
  - [X] Complete storage tests
- [-] Implement command system
  - [X] Command registry
  - [X] Command parser
  - [X] Help command
  - [X] Version command
  - [-] Init command with storage integration
  - [ ] Remaining core commands

### Phase 2: Command Implementation
- [-] Basic Commands
  - [-] Init command (in progress)
  - [ ] New episode command
  - [ ] List episodes command
  - [ ] Edit episode command
- [ ] Advanced Commands
  - [ ] Generate command
  - [ ] Publish command
  - [ ] Export command
- [ ] Error Recovery
  - [ ] Add error recovery mechanisms
  - [ ] Implement storage migrations
  - [ ] Add rollback support

### Phase 3: Content Generation
- [ ] Set up AI integration
- [ ] Implement content generation
- [ ] Add template support
- [ ] Create content validation

### Phase 4: Publishing and Distribution
- [ ] Implement publishing service
- [ ] Add distribution channels
- [ ] Create publishing workflows
- [ ] Add scheduling support

### Phase 5: Polish and Integration
- [ ] Add progress indicators
- [ ] Implement error boundaries
- [ ] Add keyboard shortcuts
- [ ] Create help documentation
- [ ] Final integration testing

## Current Status

### Completed
- Project initialization and setup
- Testing infrastructure
- Basic command structure
- Storage layer implementation
- Core service interfaces
- Error handling utilities

### In Progress
- Command system integration with storage
- Init command implementation
- Error recovery mechanisms

### Up Next
1. Complete InitCommand implementation
2. Add remaining core commands
3. Implement error recovery
4. Add storage migrations

## Validation Criteria

### Storage Layer
- [X] Implements all required interfaces
- [X] Handles project initialization
- [X] Manages episodes and assets
- [X] Provides proper error handling
- [X] Validates data with schemas
- [X] Passes all tests

### Command System
- [X] Provides command registration
- [X] Handles command parsing
- [X] Supports help documentation
- [-] Integrates with storage layer
- [ ] Implements error recovery
- [ ] Supports all core commands

### Testing Coverage
- [X] Unit tests for storage
- [X] Integration tests for commands
- [X] Validation testing
- [X] Error handling coverage
- [ ] Command integration tests
- [ ] Migration tests

## Notes
- Storage layer implementation is complete and tested
- Moving on to command integration
- Need to implement remaining commands
- Consider adding migration support for future storage changes
- All storage tests are passing
- Command system integration is in progress

## Detailed Implementation Steps

### Phase 1: Project Setup and Core Infrastructure

#### 1.1 Project Initialization
```typescript
// Test: Project structure and compilation
describe('Project Setup', () => {
  it('should compile TypeScript without errors', () => {
    // Test TypeScript compilation
  });
  
  it('should have correct dependencies', () => {
    // Test package.json structure
  });
});
```

Implementation steps:
1. Initialize npm project
2. Add TypeScript configuration
3. Set up Vitest
4. Configure ESLint and Prettier
5. Add Ink and React dependencies

#### 1.2 Core Service Infrastructure
```typescript
// Test: Service factory and dependency injection
describe('ServiceFactory', () => {
  it('should create platform-specific services', () => {
    // Test service creation
  });
  
  it('should inject dependencies correctly', () => {
    // Test dependency injection
  });
});
```

Implementation steps:
1. Create service factory pattern
2. Implement dependency injection container
3. Add platform-specific adapters
4. Create service interfaces

#### 1.3 Error Handling
```typescript
// Test: Error handling utilities
describe('ErrorHandling', () => {
  it('should handle API errors appropriately', () => {
    // Test API error handling
  });
  
  it('should provide user-friendly error messages', () => {
    // Test error message formatting
  });
});
```

Implementation steps:
1. Create error types
2. Implement error handling utilities
3. Add error boundaries for UI
4. Create error logging system

### Phase 2: Authentication and API Integration

#### 2.1 API Client
```typescript
// Test: API client functionality
describe('ApiClient', () => {
  it('should make authenticated requests', () => {
    // Test request authentication
  });
  
  it('should handle network errors', () => {
    // Test error handling
  });
});
```

Implementation steps:
1. Create API client interface
2. Implement fetch wrapper
3. Add request/response interceptors
4. Create API error handling

#### 2.2 Authentication
```typescript
// Test: Authentication flow
describe('AuthService', () => {
  it('should handle login flow', () => {
    // Test login process
  });
  
  it('should manage tokens correctly', () => {
    // Test token management
  });
});
```

Implementation steps:
1. Create auth service interface
2. Implement token storage
3. Add login/logout logic
4. Create session management

### Phase 3: Episode Management

#### 3.1 Episode Service
```typescript
// Test: Episode management
describe('EpisodeService', () => {
  it('should fetch episodes', () => {
    // Test episode fetching
  });
  
  it('should cache results', () => {
    // Test caching
  });
});
```

Implementation steps:
1. Create episode service interface
2. Implement episode fetching
3. Add caching layer
4. Create episode models

#### 3.2 Episode UI
```typescript
// Test: Episode list component
describe('EpisodeList', () => {
  it('should render episodes', () => {
    // Test rendering
  });
  
  it('should handle selection', () => {
    // Test selection
  });
});
```

Implementation steps:
1. Create episode list component
2. Add episode detail view
3. Implement search/filter
4. Add keyboard navigation

### Phase 4: Audio Playback

#### 4.1 Audio Player Service
```typescript
// Test: Audio playback
describe('AudioPlayer', () => {
  it('should control playback', () => {
    // Test play/pause
  });
  
  it('should handle seeking', () => {
    // Test seek functionality
  });
});
```

Implementation steps:
1. Create audio player interface
2. Implement playback controls
3. Add seek functionality
4. Create progress tracking

#### 4.2 Player UI
```typescript
// Test: Player component
describe('PlayerView', () => {
  it('should show playback status', () => {
    // Test status display
  });
  
  it('should update progress', () => {
    // Test progress updates
  });
});
```

Implementation steps:
1. Create player view component
2. Add progress bar
3. Implement controls UI
4. Add keyboard shortcuts

### Phase 5: Transcription and AI Features

#### 5.1 Transcription Service
```typescript
// Test: Transcription functionality
describe('TranscriptionService', () => {
  it('should manage transcription jobs', () => {
    // Test job management
  });
  
  it('should store results', () => {
    // Test result storage
  });
});
```

Implementation steps:
1. Create transcription service
2. Implement job queue
3. Add result storage
4. Create progress tracking

#### 5.2 Chat Interface
```typescript
// Test: Chat functionality
describe('ChatView', () => {
  it('should display messages', () => {
    // Test message display
  });
  
  it('should handle AI responses', () => {
    // Test AI integration
  });
});
```

Implementation steps:
1. Create chat interface
2. Implement message handling
3. Add AI integration
4. Create response formatting

### Phase 6: Polish and Integration

#### 6.1 UI Polish
```typescript
// Test: UI components
describe('UIComponents', () => {
  it('should show loading states', () => {
    // Test loading indicators
  });
  
  it('should handle errors gracefully', () => {
    // Test error displays
  });
});
```

Implementation steps:
1. Add loading indicators
2. Implement error displays
3. Polish navigation
4. Add help system

#### 6.2 Integration
```typescript
// Test: Full integration
describe('Integration', () => {
  it('should work end-to-end', () => {
    // Test full workflow
  });
  
  it('should handle edge cases', () => {
    // Test error scenarios
  });
});
```

Implementation steps:
1. Integration testing
2. Performance testing
3. Error scenario testing
4. Documentation updates

## Development Guidelines

1. Each feature should have tests before implementation
2. Use TypeScript strictly - no any types
3. Follow error handling patterns consistently
4. Keep components focused and composable
5. Document all public interfaces
6. Use dependency injection for testability
7. Keep UI components pure when possible
8. Handle all edge cases explicitly

## Success Criteria

1. All tests passing
2. TypeScript compilation clean
3. No lint errors
4. All features working end-to-end
5. Proper error handling
6. Clean and intuitive UI
7. Responsive performance
8. Complete documentation

# Core Infrastructure

## Logging System
- [X] Basic logger implementation
- [X] Comprehensive test coverage
- [X] Error handling improvements
- [X] Command helper methods
- [ ] File output support (future enhancement)
- [ ] Log level configuration (future enhancement)
- [ ] Log rotation (future enhancement)

Validation Criteria:
- [X] All tests pass
- [X] Handles all common use cases
- [X] Proper error handling
- [X] Type safety maintained
- [X] Clear documentation 

## Transcription Service Implementation

### Overview
Adding transcription capabilities using Vercel AI SDK and Gemini Pro model for high-quality audio transcription.

### Components

1. Storage Layer
   - [X] Define transcription schema
   - [X] Add storage interfaces
   - [X] Implement file system storage
   - [ ] Add caching layer
   - [ ] Add search capabilities

2. Service Layer
   - [ ] Implement TranscriptionService
   - [ ] Add Gemini Pro integration
   - [ ] Add progress tracking
   - [ ] Implement error handling
   - [ ] Add retry mechanism

3. CLI Integration
   - [X] Design command structure
   - [ ] Implement transcribe command
   - [ ] Add progress display
   - [ ] Add configuration options
   - [ ] Add search functionality

### Technical Details

#### Storage Schema
```typescript
interface TranscriptionSegment {
  id: string;
  start: number;
  end: number;
  text: string;
  confidence: number;
  speaker?: string;
}

interface Transcription {
  id: string;
  episodeId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  language: string;
  model: string;
  segments: TranscriptionSegment[];
  metadata: {
    duration: number;
    wordCount: number;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    error?: string;
  };
  summary?: string;
  keywords?: string[];
}
```

#### CLI Usage
```bash
# Basic usage
podcast-cli transcribe <episodeId>

# With options
podcast-cli transcribe <episodeId> --language en-US --model gemini-2.5-pro-exp-03-25 --force

# Skip summary/keywords
podcast-cli transcribe <episodeId> --no-summary --no-keywords
```

### Validation Criteria
- [ ] Transcription accuracy meets quality threshold
- [ ] Performance within acceptable limits
- [ ] Proper error handling and recovery
- [ ] Successful integration with player
- [ ] Efficient storage and retrieval
- [ ] User-friendly interface
- [ ] Proper progress tracking
- [ ] Resource cleanup on failures 