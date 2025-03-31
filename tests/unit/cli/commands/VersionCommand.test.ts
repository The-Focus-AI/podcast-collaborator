import { describe, it, expect, beforeEach } from 'vitest';
import { VersionCommand } from '../../../../src/cli/commands/VersionCommand.js';

describe('VersionCommand', () => {
  let command: VersionCommand;

  beforeEach(() => {
    command = new VersionCommand();
  });

  describe('execute', () => {
    it('should return version information', async () => {
      const result = await command.execute();
      expect(result.success).toBe(true);
      expect(result.output).toContain('podcast-collaborator');
      expect(result.output).toMatch(/v\d+\.\d+\.\d+/); // Matches semantic version format
    });

    it('should include package information', async () => {
      const result = await command.execute();
      expect(result.output).toContain('Node.js');
      expect(result.output).toContain('TypeScript');
      expect(result.output).toContain('React');
      expect(result.output).toContain('Ink');
    });

    it('should handle --json flag for machine-readable output', async () => {
      const result = await command.execute(['--json']);
      expect(result.success).toBe(true);
      const jsonOutput = JSON.parse(result.output as string);
      expect(jsonOutput).toHaveProperty('version');
      expect(jsonOutput).toHaveProperty('dependencies');
      expect(jsonOutput.dependencies).toHaveProperty('react');
      expect(jsonOutput.dependencies).toHaveProperty('ink');
    });

    it('should handle unknown flags gracefully', async () => {
      const result = await command.execute(['--unknown']);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown flag');
    });
  });
}); 