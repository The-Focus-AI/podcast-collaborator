export interface CommandResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
  args?: string[];
  output?: string;
}

export interface Command {
  name: string;
  description: string;
  execute: (args?: string[]) => Promise<CommandResult>;
} 