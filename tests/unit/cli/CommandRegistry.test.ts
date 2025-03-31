import { describe, it, expect, beforeEach } from 'vitest';
import { CommandRegistry } from '../../../src/cli/CommandRegistry.js';
import { Command } from '../../../src/cli/Command.js';
import { HelpCommand } from '../../../src/cli/commands/HelpCommand.js';
import { VersionCommand } from '../../../src/cli/commands/VersionCommand.js';

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  describe('registerCommand', () => {
    it('should register a command successfully', () => {
      const mockCommand: Command = {
        name: 'test',
        description: 'A test command',
        execute: async () => ({ success: true }),
      };

      registry.registerCommand(mockCommand);
      expect(registry.getCommand('test')).toBe(mockCommand);
    });

    it('should throw error when registering duplicate command', () => {
      const mockCommand: Command = {
        name: 'test',
        description: 'A test command',
        execute: async () => ({ success: true }),
      };

      registry.registerCommand(mockCommand);
      expect(() => registry.registerCommand(mockCommand)).toThrow('Command already registered: test');
    });
  });

  describe('getCommand', () => {
    it('should return undefined for unknown command', () => {
      expect(registry.getCommand('unknown')).toBeUndefined();
    });
  });

  describe('getAllCommands', () => {
    it('should return all registered commands including help and version', () => {
      const mockCommand1: Command = {
        name: 'test1',
        description: 'Test command 1',
        execute: async () => ({ success: true }),
      };
      const mockCommand2: Command = {
        name: 'test2',
        description: 'Test command 2',
        execute: async () => ({ success: true }),
      };

      registry.registerCommand(mockCommand1);
      registry.registerCommand(mockCommand2);

      const commands = registry.getAllCommands();
      expect(commands.size).toBe(4); // Including help and version commands
      expect(commands.get('test1')).toBe(mockCommand1);
      expect(commands.get('test2')).toBe(mockCommand2);
      expect(commands.get('help')).toBeInstanceOf(HelpCommand);
      expect(commands.get('version')).toBeInstanceOf(VersionCommand);
    });

    it('should include help and version commands by default', () => {
      const commands = registry.getAllCommands();
      expect(commands.size).toBe(2);
      expect(commands.get('help')).toBeInstanceOf(HelpCommand);
      expect(commands.get('version')).toBeInstanceOf(VersionCommand);
    });
  });

  describe('initialization', () => {
    it('should initialize with help and version commands', () => {
      const commands = registry.getAllCommands();
      const helpCommand = commands.get('help');
      const versionCommand = commands.get('version');
      
      expect(helpCommand).toBeDefined();
      expect(helpCommand?.name).toBe('help');
      expect(helpCommand?.description).toContain('help');
      
      expect(versionCommand).toBeDefined();
      expect(versionCommand?.name).toBe('version');
      expect(versionCommand?.description).toContain('version');
    });
  });
}); 