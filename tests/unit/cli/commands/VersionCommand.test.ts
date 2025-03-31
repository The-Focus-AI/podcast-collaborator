import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createVersionCommand } from '../../../../src/cli/commands/version.js'
import { logger } from '../../../../src/utils/logger.js'

vi.mock('../../../../src/utils/logger.js')
vi.mock('fs/promises')

describe('version command', () => {
  const mockPackageInfo = {
    name: 'podcast-collaborator',
    version: '1.0.0',
    dependencies: {
      commander: '^13.1.0',
      ink: '^4.4.1',
      react: '^18.2.0',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(logger.info).mockClear()
    vi.mocked(logger.error).mockClear()
  })

  it('should show version information', async () => {
    const { readFile } = await import('fs/promises')
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockPackageInfo))

    const command = createVersionCommand()
    await command.parseAsync(['node', 'test'])

    expect(logger.info).toHaveBeenCalledWith(`${mockPackageInfo.name} v${mockPackageInfo.version}`)
    expect(logger.info).toHaveBeenCalledWith('\nDependencies:')
    Object.entries(mockPackageInfo.dependencies).forEach(([name, version]) => {
      expect(logger.info).toHaveBeenCalledWith(`  ${name}: ${version}`)
    })
  })

  it('should include package information', async () => {
    const { readFile } = await import('fs/promises')
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockPackageInfo))

    const command = createVersionCommand()
    await command.parseAsync(['node', 'test'])

    expect(logger.info).toHaveBeenCalledWith(`${mockPackageInfo.name} v${mockPackageInfo.version}`)
  })

  it('should handle --json flag for machine-readable output', async () => {
    const { readFile } = await import('fs/promises')
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockPackageInfo))

    const command = createVersionCommand()
    await command.parseAsync(['node', 'test', '--json'])

    expect(logger.info).toHaveBeenCalledWith(JSON.stringify(mockPackageInfo, null, 2))
  })

  it('should handle errors gracefully', async () => {
    const { readFile } = await import('fs/promises')
    vi.mocked(readFile).mockRejectedValue(new Error('Failed to read package.json'))

    const command = createVersionCommand()
    await expect(command.parseAsync(['node', 'test'])).rejects.toThrow('Failed to read package.json')
    expect(logger.error).toHaveBeenCalledWith('Failed to read package.json')
  })
}) 