import { describe, it, expect, beforeEach } from 'vitest';
import { HelpCommand } from '../../../../src/cli/commands/HelpCommand.js';
import { Command } from '../../../../src/cli/Command.js';

describe('HelpCommand', () => {
  let mockCommands: Map<string, Command>;
  let helpCommand: HelpCommand;

  beforeEach(() => {
    mockCommands = new Map();
    mockCommands.set('test', {
      name: 'test',
      description: 'A test command',
      execute: async () => ({ success: true }),
    });
    mockCommands.set('another', {
      name: 'another',
      description: 'Another test command',
      execute: async () => ({ success: true }),
    });
    helpCommand = new HelpCommand(mockCommands);
  });

  describe('execute', () => {
    it('should list all available commands when no args provided', async () => {
      const result = await helpCommand.execute();
      expect(result.success).toBe(true);
      expect(result.output).toContain('Available commands:');
      expect(result.output).toContain('test');
      expect(result.output).toContain('A test command');
      expect(result.output).toContain('another');
      expect(result.output).toContain('Another test command');
      expect(result.output).toContain('help');
    });

    it('should show detailed help for a specific command', async () => {
      const result = await helpCommand.execute(['test']);
      expect(result.success).toBe(true);
      expect(result.output).toContain('test');
      expect(result.output).toContain('A test command');
    });

    it('should handle unknown command help requests', async () => {
      const result = await helpCommand.execute(['unknown']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown command: unknown');
    });

    it('should include usage information', async () => {
      const result = await helpCommand.execute();
      expect(result.output).toContain('Usage:');
      expect(result.output).toContain('podcast-collaborator [command]');
      expect(result.output).toContain('--help, -h');
    });
  });
}); 