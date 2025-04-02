# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- Install: `pnpm install`
- Build: `pnpm build`
- Start: `pnpm start`, Develop: `pnpm dev` 
- Test all: `pnpm test`
- Test single: `pnpm test -- -t "test name"` or `pnpm test -- path/to/test.ts`
- Lint: `pnpm lint`, Fix: `pnpm lint:fix`
- Format: `pnpm format`

## Code Style
- TypeScript: Strict typing, ES2022, module NodeNext
- Imports: Use ES modules with .js extension, @/ path alias
- Naming: PascalCase (components/classes), camelCase (variables/functions)
- Error handling: Structured with context, use logger
- React components: Functional with hooks
- Testing: Vitest with JSDOM, `.test.ts` file naming
- Structure: Follow existing patterns in src/ and tests/ directories
- Documentation: Document "why" over "what"