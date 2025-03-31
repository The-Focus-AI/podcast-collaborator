import { Command, CommandResult } from './Command.js';

export class CommandParser {
  private commands: Map<string, Command>;

  constructor(commands: Map<string, Command>) {
    this.commands = commands;
  }

  async parseArgs(args: string[]): Promise<CommandResult> {
    if (args.length === 0) {
      return this.executeCommand('help');
    }

    const [commandName, ...commandArgs] = args;

    if (commandName === '--help' || commandName === '-h') {
      return this.executeCommand('help');
    }

    return this.executeCommand(commandName, commandArgs);
  }

  private async executeCommand(name: string, args: string[] = []): Promise<CommandResult> {
    const command = this.commands.get(name);

    if (!command) {
      return {
        success: false,
        error: `Unknown command: ${name}. Use --help to see available commands.`,
      };
    }

    try {
      return await command.execute(args);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  }
} 