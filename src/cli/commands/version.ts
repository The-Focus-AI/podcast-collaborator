import { Command } from 'commander'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { logger } from '../../utils/logger.js'

interface PackageInfo {
  name: string
  version: string
  dependencies: Record<string, string>
}

async function getPackageInfo(): Promise<PackageInfo> {
  try {
    const packageJsonPath = join(process.cwd(), 'package.json')
    const packageJson = await readFile(packageJsonPath, 'utf-8')
    return JSON.parse(packageJson)
  } catch (error) {
    throw new Error('Failed to read package.json')
  }
}

export function createVersionCommand(): Command {
  const command = new Command('version')
    .description('Show version information')
    .option('--json', 'Output in JSON format')
    .action(async (options) => {
      try {
        const packageInfo = await getPackageInfo()

        if (options.json) {
          logger.info(JSON.stringify(packageInfo, null, 2))
          return
        }

        logger.info(`${packageInfo.name} v${packageInfo.version}`)
        logger.info('\nDependencies:')
        Object.entries(packageInfo.dependencies).forEach(([name, version]) => {
          logger.info(`  ${name}: ${version}`)
        })
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message)
          throw error
        }
        logger.error('An unknown error occurred')
        throw new Error('An unknown error occurred')
      }
    })

  return command
} 