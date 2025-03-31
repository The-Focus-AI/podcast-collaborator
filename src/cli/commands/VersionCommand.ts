import { Command, CommandResult } from '../Command.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

interface PackageJson {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export class VersionCommand implements Command {
  name = 'version';
  description = 'Show version information';

  private async getPackageInfo(): Promise<PackageJson> {
    const __dirname = fileURLToPath(new URL('.', import.meta.url));
    const packagePath = join(__dirname, '..', '..', '..', 'package.json');
    const packageJson = await readFile(packagePath, 'utf-8');
    return JSON.parse(packageJson);
  }

  async execute(args: string[] = []): Promise<CommandResult> {
    try {
      if (args.length > 0 && !args.includes('--json') && args[0] !== '--json') {
        return {
          success: false,
          error: `Unknown flag: ${args[0]}. Use --json for machine-readable output.`,
        };
      }

      const pkg = await this.getPackageInfo();
      const isJson = args.includes('--json');

      if (isJson) {
        return {
          success: true,
          output: JSON.stringify({
            name: pkg.name,
            version: pkg.version,
            dependencies: {
              node: process.version,
              typescript: pkg.devDependencies.typescript,
              react: pkg.dependencies.react,
              ink: pkg.dependencies.ink,
            },
          }, null, 2),
        };
      }

      const output = `
${pkg.name} v${pkg.version}

Environment:
  Node.js:    ${process.version}
  TypeScript: v${pkg.devDependencies.typescript}
  React:      v${pkg.dependencies.react}
  Ink:        v${pkg.dependencies.ink}

Use --json flag for machine-readable output
`.trim();

      return {
        success: true,
        output,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read version information',
      };
    }
  }
} 