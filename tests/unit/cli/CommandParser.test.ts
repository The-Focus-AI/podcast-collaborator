import { describe, it, expect, beforeEach } from 'vitest';
import { CommandParser } from '../../../src/cli/CommandParser.js';
import { Command } from '../../../src/cli/Command.js';

describe('CommandParser', () => {
  let parser: CommandParser;
  let mockCommands: Map<string, Command>;

  beforeEach(() => {
    mockCommands = new Map();
    mockCommands.set('help', {
      name: 'help',
      description: 'Show help information',
      execute: async () => ({ success: true }),
    });
    mockCommands.set('version', {
      name: 'version',
      description: 'Show version information',
      execute: async () => ({ success: true }),
    });
    parser = new CommandParser(mockCommands);
  });

  describe('parseArgs', () => {
    it('should parse command name correctly', async () => {
      const result = await parser.parseArgs(['help']);
      expect(result.success).toBe(true);
    });

    it('should handle unknown commands', async () => {
      const result = await parser.parseArgs(['unknown']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown command');
    });

    it('should handle --help flag', async () => {
      const result = await parser.parseArgs(['--help']);
      expect(result.success).toBe(true);
    });

    it('should handle -h flag', async () => {
      const result = await parser.parseArgs(['-h']);
      expect(result.success).toBe(true);
    });

    it('should parse command arguments', async () => {
      mockCommands.set('test', {
        name: 'test',
        description: 'Test command',
        execute: async (args: string[] = []) => ({ success: true, args }),
      });

      const result = await parser.parseArgs(['test', '--flag', 'value']);
      expect(result.success).toBe(true);
      expect(result.args).toEqual(['--flag', 'value']);
    });
  });
}); 