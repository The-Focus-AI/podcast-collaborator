import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../src/App.js';
import { CommandRegistry } from '../../src/cli/CommandRegistry.js';
import { Command } from '../../src/cli/Command.js';

describe('App', () => {
  let app: App;
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
    app = new App(registry);
  });

  describe('run', () => {
    it('should execute help command when no arguments provided', async () => {
      const result = await app.run([]);
      expect(result.success).toBe(true);
      expect(result.output).toContain('Available commands');
    });

    it('should execute specific command with arguments', async () => {
      const mockCommand: Command = {
        name: 'test',
        description: 'Test command',
        execute: async (args) => ({ success: true, output: `Executed with args: ${args?.join(', ')}` }),
      };
      registry.registerCommand(mockCommand);

      const result = await app.run(['test', '--flag', 'value']);
      expect(result.success).toBe(true);
      expect(result.output).toBe('Executed with args: --flag, value');
    });

    it('should handle unknown commands', async () => {
      const result = await app.run(['unknown']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown command');
    });

    it('should handle command execution errors', async () => {
      const errorCommand: Command = {
        name: 'error',
        description: 'Error command',
        execute: async () => {
          throw new Error('Command failed');
        },
      };
      registry.registerCommand(errorCommand);

      const result = await app.run(['error']);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Command failed');
    });
  });
}); 