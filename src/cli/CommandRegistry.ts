import { Command } from './Command.js';
import { HelpCommand } from './commands/HelpCommand.js';
import { VersionCommand } from './commands/VersionCommand.js';

export class CommandRegistry {
  private commands: Map<string, Command>;

  constructor() {
    this.commands = new Map();
    this.initializeDefaultCommands();
  }

  registerCommand(command: Command): void {
    if (this.commands.has(command.name)) {
      throw new Error(`Command already registered: ${command.name}`);
    }
    this.commands.set(command.name, command);
  }

  getCommand(name: string): Command | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): Map<string, Command> {
    return new Map(this.commands);
  }

  private initializeDefaultCommands(): void {
    // Help command needs access to all commands, so we pass this.commands
    const helpCommand = new HelpCommand(this.commands);
    this.commands.set(helpCommand.name, helpCommand);

    // Version command is standalone
    const versionCommand = new VersionCommand();
    this.commands.set(versionCommand.name, versionCommand);
  }
} 