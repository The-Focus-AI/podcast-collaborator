import { CommandRegistry } from './cli/CommandRegistry.js';
import { CommandResult } from './cli/Command.js';
import { CommandParser } from './cli/CommandParser.js';

export class App {
  private parser: CommandParser;

  constructor(private registry: CommandRegistry) {
    this.parser = new CommandParser(registry.getAllCommands());
  }

  async run(args: string[]): Promise<CommandResult> {
    try {
      const command = args.length > 0 ? this.registry.getCommand(args[0]) : undefined;
      
      if (command) {
        return await command.execute(args.slice(1));
      }

      // If no command found or no args, use the parser which will handle help
      return await this.parser.parseArgs(args);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  }
} 