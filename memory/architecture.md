# Architecture Documentation

## Directory Structure
```
podcast-collaborator/
├── src/
│   ├── cli/              # CLI command system
│   │   ├── commands/     # Individual command implementations
│   │   ├── Command.ts    # Command interfaces
│   │   ├── CommandParser.ts
│   │   └── CommandRegistry.ts
│   ├── components/       # React/Ink UI components
│   │   └── App.tsx      # Main UI component
│   ├── App.ts           # Main application logic
│   └── index.tsx        # Entry point
├── tests/
│   └── unit/            # Unit tests matching src structure
├── memory/              # Project documentation and memory
└── dist/               # Compiled output
```

## Core Technologies
- TypeScript 5.x with strict mode
- React 18.x for component architecture
- Ink 5.x for terminal UI
- Vitest for testing
- ESLint 9.x for code quality
- pnpm for package management

## Implementation Patterns

### Command Pattern
- Each command is a class implementing the Command interface
- Commands are registered with CommandRegistry
- CommandParser handles routing and argument processing
- Commands return CommandResult with success/error/output

### Testing Strategy
1. Unit Tests:
   - Individual command tests
   - Parser and registry tests
   - UI component tests
2. Integration Tests:
   - Command system integration
   - End-to-end command execution
3. Test First Development:
   - Write tests before implementation
   - Use tests as documentation
   - Maintain high coverage

### Error Handling
1. Command Errors:
   - Return CommandResult with error details
   - Include helpful error messages
   - Preserve error context
2. System Errors:
   - Catch and log appropriately
   - Clean exit with status codes
   - User-friendly error messages

### UI Components
1. Simple Commands:
   - Direct console output
   - Non-interactive responses
2. Interactive Features:
   - React/Ink components
   - Rich terminal UI
   - Progress indicators

### Configuration Management
1. User Settings:
   - Local configuration file
   - Environment variables
   - Command-line overrides
2. API Integration:
   - Credential management
   - Rate limiting
   - Error recovery

## Best Practices
1. Code Organization:
   - Clear separation of concerns
   - Single responsibility principle
   - Dependency injection
2. Type Safety:
   - Strict TypeScript configuration
   - Explicit return types
   - Interface-driven development
3. Testing:
   - TDD approach
   - Comprehensive test coverage
   - Clear test descriptions
4. Documentation:
   - Clear code comments
   - Up-to-date documentation
   - Example usage

## Tech Stack

### Core Technologies
- TypeScript (Strict Mode)
- Node.js
- React (for Ink components)
- Ink (Terminal UI)
- Vitest (Testing)

### External Services
- Pocketcast API
- AI Services (for transcription and chat)

## Terminal UI Library Evaluation

We evaluated several terminal UI libraries for Node.js/TypeScript:

### Ink (Selected)
**Technical Foundation**
- Native TypeScript support with high-quality type definitions
- React-based architecture for familiar component patterns
- Flexbox layouts using Yoga engine
- Lightweight dependency footprint

**Development Experience**
- Excellent documentation and examples
- Large ecosystem of components (ink-select-input, ink-spinner, etc.)
- Strong IDE support through React tooling
- Quick prototyping with create-ink-app

**Performance & Reliability**
- Efficient rendering through React reconciliation
- Good memory management
- Stable release cycle (v5.2.0 as of March 2025)

**Community & Ecosystem**
- 27.8k GitHub stars
- Active maintenance by Vadim Demedes and Sindre Sorhus
- Large number of third-party components
- 828,492 weekly downloads

**Project-Specific Fit**
- Perfect for our TDD approach with component testing
- Matches our React-based architecture
- Built-in support for our needed UI patterns

### Alternatives Considered

#### Blessed
- More low-level with curses-like API
- Richer terminal manipulation capabilities
- Steeper learning curve
- Less active maintenance
- Not as TypeScript-friendly

#### Vue-termui
- Vue.js based alternative
- Newer with smaller ecosystem
- Would require different testing patterns
- Less mature than Ink

#### Commander.js
- More focused on command parsing
- Less suitable for rich UI interactions
- Would need additional UI libraries

### Decision Rationale

We selected Ink for the following reasons:
1. React-based architecture aligns with team expertise
2. Strong TypeScript support matches our requirements
3. Rich component ecosystem reduces development time
4. Active maintenance and large community
5. Excellent testing capabilities with ink-testing-library
6. Modern Flexbox-based layouts for complex UIs

### Mitigation Strategies
1. Performance: Use `<Static>` component for permanent output
2. Memory: Implement proper cleanup in components
3. Testing: Leverage ink-testing-library for thorough coverage
4. Complexity: Create reusable component library

## Directory Layout
```
src/
├── commands/         # CLI command implementations
├── components/       # Ink UI components
├── services/         # Business logic and external integrations
├── models/          # TypeScript interfaces and types
├── utils/           # Shared utilities
└── types/           # Global type definitions

tests/
├── unit/            # Unit tests
├── integration/     # Integration tests
└── fixtures/        # Test data and mocks

memory/              # Project documentation and tracking
```

## Implementation Patterns

### Service Pattern
- Services are platform-agnostic
- Dependency injection for all services
- Interface-based design
- Error handling through Result type

### Component Pattern
- Pure functional components when possible
- Custom hooks for complex logic
- Error boundaries for UI error handling
- Consistent keyboard navigation

### Testing Pattern
- TDD approach for all features
- Unit tests for services and utilities
- Component tests using ink-testing-library
- Integration tests for full workflows
- Mocks for external services

### Error Handling Pattern
- Custom error types for different scenarios
- Result type for operation outcomes
- Error boundaries in UI
- Consistent error logging

### State Management
- Service-level state management
- React hooks for component state
- Event-based communication
- Immutable data patterns

## Testing Strategy

### Unit Testing
- Services tested in isolation
- Mocked dependencies
- Error cases covered
- Pure function testing

### Component Testing
```typescript
import { render } from 'ink-testing-library';

// Component test pattern
describe('Component', () => {
  it('should render correctly', () => {
    const { lastFrame } = render(<Component />);
    // Assertions
  });
});
```

### Integration Testing
- End-to-end workflows
- API integration tests
- UI interaction tests
- Error scenario testing

### Test Data Management
- Fixture files for test data
- Factory functions for test objects
- Consistent mock patterns
- Snapshot testing when appropriate

## Security Considerations
- Secure token storage
- API key management
- Input validation
- Error message security

## Performance Guidelines
- Lazy loading where appropriate
- Efficient state updates
- Proper cleanup in components
- Resource management

## Documentation Standards
- TSDoc for public interfaces
- README for each directory
- Inline comments for complex logic
- Architecture decision records 

# Logger Utility Patterns

## Usage
The logger utility provides both a default instance and the ability to create custom instances:

```typescript
// Using default instance
import { logger } from '@/utils/logger'
logger.info('message')

// Creating custom instance
import { Logger } from '@/utils/logger'
const customLogger = new Logger({ timestamp: true })
```

## Log Levels
- `info`: Standard information (default color)
- `success`: Success messages (green)
- `warning`: Warning messages (yellow)
- `error`: Error messages (red)
- `debug`: Debug messages (gray, only shown when DEBUG=true)

## Command Helpers
Special formatters for CLI output:
- `commandOutput`: Arrow prefix (→)
- `commandSuccess`: Checkmark prefix (✓)
- `commandError`: Cross prefix (✗)
- `commandWarning`: Warning prefix (⚠)

## Options
- `timestamp`: Add ISO timestamp prefix
- `prefix`: Add custom prefix
- `json`: Output in JSON format

## Error Handling
- Gracefully handles circular references
- Properly formats Error objects
- Supports various input types (strings, objects, arrays) 

# Storage Layer Architecture

## Overview
The storage layer provides a robust foundation for managing podcast data with a clear separation of concerns and multiple backend support.

## Core Interfaces

### PodcastStorage
Combined interface that includes:
- ProjectStorage: Project configuration management
- EpisodeStorage: Episode CRUD operations
- AssetStorage: Binary asset management

### Implementation Patterns
1. FileSystemStorage:
   - JSON-based metadata storage
   - Binary data handling for assets
   - Directory structure:
     ```
     root/
     ├── config.json
     ├── episodes/
     │   └── {episode-id}.json
     └── assets/
         └── {episode-id}/
             └── {asset-name}.json
     ```

2. MockStorage:
   - In-memory storage for testing
   - Map-based data structures
   - Full interface implementation

3. StorageProvider:
   - Factory pattern for storage instances
   - Configuration management
   - Runtime reconfiguration support
   - Default path handling

## Validation Strategy
- Zod schemas for runtime validation
- Type safety with TypeScript
- Comprehensive error handling
- Date handling for serialization

## Error Handling
- Specific error types for different scenarios
- Proper cleanup on failures
- Validation before operations
- Meaningful error messages 