# Lessons Learned

## Service Architecture
1. Centralize domain logic in dedicated services
   - Example: Moving episode management to EpisodeService improved code organization
   - Benefit: Better separation of concerns and reusability

2. Maintain consistent data access patterns
   - Example: Aligning episode listing between browse and list commands
   - Benefit: Reduces bugs and makes code more maintainable

3. Handle service dependencies properly
   - Example: Fixed PocketCastsService instantiation with OnePasswordService
   - Benefit: Ensures services have access to required dependencies

## Data Management
1. Preserve data ordering when merging from multiple sources
   - Example: Maintaining listened episode order while merging with starred episodes
   - Benefit: Better user experience and data integrity

2. Use consistent data transformation approaches
   - Example: Standardized episode conversion across commands
   - Benefit: Reduces bugs and makes code more predictable

## Testing
1. Test both raw data access and transformed data
   - Example: Testing both getRawData and listEpisodes
   - Benefit: Catches issues at both levels

2. Verify service integration points
   - Example: Testing EpisodeService with PocketCasts and storage
   - Benefit: Catches integration issues early

## Testing
1. **Test Directory Management**
   - Using `mkdtemp` for temporary test directories improves reliability
   - Proper cleanup in test teardown is crucial
   - Isolating test files prevents cross-test contamination

2. **Test Assertions**
   - Precise assertions are better than partial matches
   - Clear error messages help debugging
   - Comprehensive validation testing catches edge cases

## Storage Layer
1. **Data Organization**
   - Separating binary data from metadata improves performance
   - JSON-based metadata storage with proper date handling works well
   - Clear interface separation (Project, Episode, Asset storage) maintains code clarity

2. **Error Handling**
   - Thorough validation at boundaries prevents data corruption
   - Proper cleanup for failed operations is essential
   - Type safety with Zod provides runtime validation

## Logger Implementation
1. **Error Handling**
   - Using `String()` fallback for circular references prevents crashes
   - Following common color conventions improves usability
   - Precise error messages help debugging

2. **Testing Strategy**
   - Mock console output for reliable tests
   - Test different log levels thoroughly
   - Verify color and formatting output

## Code Organization
1. **Path Aliases**
   - Using `@` alias improves code readability
   - Clear import paths reduce confusion
   - Consistent naming conventions help maintenance

2. **Command Pattern**
   - Thin command layer improves maintainability
   - Clear separation of concerns
   - Platform-agnostic business logic

Last Updated: 2024-04-01 10:30 EDT 