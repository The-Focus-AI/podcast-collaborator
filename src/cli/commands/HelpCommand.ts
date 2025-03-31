import { Command, CommandResult } from '../Command.js';

interface HelpCommandResult extends CommandResult {
  output?: string;
}

export class HelpCommand implements Command {
  name = 'help';
  description = 'Show help information for available commands';

  constructor(private commands: Map<string, Command>) {}

  async execute(args: string[] = []): Promise<HelpCommandResult> {
    if (args.length > 0) {
      return this.showCommandHelp(args[0]);
    }
    return this.showGeneralHelp();
  }

  private async showGeneralHelp(): Promise<HelpCommandResult> {
    const commandList = Array.from(this.commands.values())
      .map(cmd => `  ${cmd.name.padEnd(15)} ${cmd.description}`)
      .join('\n');

    const output = `
Podcast Collaborator CLI

Usage:
  podcast-collaborator [command] [options]

Options:
  --help, -h     Show help information

Available commands:
${commandList}

For detailed help on a command:
  podcast-collaborator help [command]
`.trim();

    return {
      success: true,
      output,
    };
  }

  private async showCommandHelp(commandName: string): Promise<HelpCommandResult> {
    const command = this.commands.get(commandName);

    if (!command) {
      return {
        success: false,
        error: `Unknown command: ${commandName}. Use 'help' to see available commands.`,
      };
    }

    const output = `
${command.name}

Description:
  ${command.description}

Usage:
  podcast-collaborator ${command.name} [options]
`.trim();

    return {
      success: true,
      output,
    };
  }
} 