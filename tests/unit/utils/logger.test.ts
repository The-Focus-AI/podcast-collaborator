import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Logger } from '@/utils/logger.js'
import chalk from 'chalk'

describe('Logger', () => {
  let logger: Logger
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>
  let originalDebug: string | undefined

  beforeEach(() => {
    // Create a new logger instance for each test
    logger = new Logger()

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

    // Store original DEBUG env var
    originalDebug = process.env.DEBUG
  })

  afterEach(() => {
    // Restore console mocks
    vi.restoreAllMocks()

    // Restore DEBUG env var
    if (originalDebug === undefined) {
      delete process.env.DEBUG
    } else {
      process.env.DEBUG = originalDebug
    }
  })

  describe('Basic Logging', () => {
    it('should log string messages', () => {
      logger.info('test message')
      expect(consoleLogSpy).toHaveBeenCalledWith('test message')
    })

    it('should log object messages as JSON', () => {
      const obj = { key: 'value' }
      logger.info(obj)
      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(obj, null, 2))
    })

    it('should handle Error objects', () => {
      const error = new Error('test error')
      logger.error(error)
      expect(consoleErrorSpy).toHaveBeenCalledWith(chalk.red('test error'))
    })

    it('should handle null and undefined', () => {
      logger.info(null)
      expect(consoleLogSpy).toHaveBeenCalledWith('null')
      
      logger.info(undefined)
      expect(consoleLogSpy).toHaveBeenCalledWith('undefined')
    })
  })

  describe('Log Levels', () => {
    it('should use correct console methods for each level', () => {
      logger.info('info message')
      expect(consoleLogSpy).toHaveBeenCalledWith('info message')

      logger.success('success message')
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.green('success message'))

      logger.warning('warning message')
      expect(consoleWarnSpy).toHaveBeenCalledWith(chalk.yellow('warning message'))

      logger.error('error message')
      expect(consoleErrorSpy).toHaveBeenCalledWith(chalk.red('error message'))
    })

    it('should only log debug messages when DEBUG is set', () => {
      logger.debug('debug message')
      expect(consoleDebugSpy).not.toHaveBeenCalled()

      process.env.DEBUG = 'true'
      logger.debug('debug message')
      expect(consoleDebugSpy).toHaveBeenCalledWith(chalk.gray('debug message'))
    })
  })

  describe('Formatting Options', () => {
    it('should include timestamp when enabled', () => {
      const logger = new Logger({ timestamp: true })
      logger.info('test')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] test/)
      )
    })

    it('should include prefix when provided', () => {
      logger.info('test', { prefix: 'PREFIX' })
      expect(consoleLogSpy).toHaveBeenCalledWith('PREFIX test')
    })

    it('should output JSON format when enabled', () => {
      logger.info('test', { json: true })
      const call = consoleLogSpy.mock.calls[0][0]
      // Ensure call is a string before parsing
      expect(typeof call).toBe('string')
      const parsed = JSON.parse(call as string)
      expect(parsed).toMatchObject({
        level: 'info',
        message: 'test'
      })
      expect(parsed.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/)
    })
  })

  describe('Command Helpers', () => {
    it('should add arrow prefix for commandOutput', () => {
      logger.commandOutput('test')
      expect(consoleLogSpy).toHaveBeenCalledWith('→ test')
    })

    it('should add checkmark prefix for commandSuccess', () => {
      logger.commandSuccess('test')
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.green('✓ test'))
    })

    it('should add cross prefix for commandError', () => {
      logger.commandError('test')
      expect(consoleErrorSpy).toHaveBeenCalledWith(chalk.red('✗ test'))
    })

    it('should add warning prefix for commandWarning', () => {
      logger.commandWarning('test')
      expect(consoleWarnSpy).toHaveBeenCalledWith(chalk.yellow('⚠ test'))
    })
  })

  describe('Color Output', () => {
    it('should colorize success messages in green', () => {
      logger.success('test')
      expect(consoleLogSpy).toHaveBeenCalledWith(chalk.green('test'))
    })

    it('should colorize warning messages in yellow', () => {
      logger.warning('test')
      expect(consoleWarnSpy).toHaveBeenCalledWith(chalk.yellow('test'))
    })

    it('should colorize error messages in red', () => {
      logger.error('test')
      expect(consoleErrorSpy).toHaveBeenCalledWith(chalk.red('test'))
    })

    it('should colorize debug messages in gray', () => {
      process.env.DEBUG = 'true'
      logger.debug('test')
      expect(consoleDebugSpy).toHaveBeenCalledWith(chalk.gray('test'))
    })
  })

  describe('Edge Cases', () => {
    it('should handle circular references', () => {
      const circular: any = { a: 1 }
      circular.self = circular
      
      // Should not throw when logging
      expect(() => logger.info(circular)).not.toThrow()
      
      // Should have called console.log with some string output
      expect(consoleLogSpy).toHaveBeenCalled()
      const output = consoleLogSpy.mock.calls[0][0]
      expect(typeof output).toBe('string')
      expect(output).toContain('[object Object]')
    })

    it('should handle very long messages', () => {
      const longMessage = 'a'.repeat(10000)
      logger.info(longMessage)
      expect(consoleLogSpy).toHaveBeenCalledWith(longMessage)
    })

    it('should handle multiple arguments in message', () => {
      const obj = { key: 'value' }
      logger.info(['message', obj, 123])
      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(['message', obj, 123], null, 2))
    })
  })
}) 