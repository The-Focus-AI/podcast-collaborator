import chalk from 'chalk'

export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug'

interface LogOptions {
  prefix?: string
  timestamp?: boolean
  json?: boolean
}

class Logger {
  private readonly defaultOptions: LogOptions = {
    timestamp: false,
    json: false
  }

  constructor(private options: LogOptions = {}) {
    this.options = { ...this.defaultOptions, ...options }
  }

  private formatMessage(level: LogLevel, message: unknown, options: LogOptions = {}): string {
    const opts = { ...this.options, ...options }
    const timestamp = opts.timestamp ? `[${new Date().toISOString()}] ` : ''
    const prefix = opts.prefix ? `${opts.prefix} ` : ''

    if (opts.json) {
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        prefix: opts.prefix,
        message: this.stringifyMessage(message)
      }, null, 2)
    }

    return `${timestamp}${prefix}${this.stringifyMessage(message)}`
  }

  private stringifyMessage(message: unknown): string {
    if (message instanceof Error) {
      return message.message
    }
    if (typeof message === 'string') {
      return message
    }
    if (typeof message === 'object' && message !== null) {
      try {
        return JSON.stringify(message, null, 2)
      } catch (error) {
        // Handle circular references by falling back to String()
        if (error instanceof TypeError && error.message.includes('circular')) {
          return String(message)
        }
        throw error
      }
    }
    return String(message)
  }

  private colorize(message: string, level: LogLevel): string {
    switch (level) {
      case 'success':
        return chalk.green(message)
      case 'warning':
        return chalk.yellow(message)
      case 'error':
        return chalk.red(message)
      case 'debug':
        return chalk.gray(message)
      default:
        return message
    }
  }

  info(message: unknown, options: LogOptions = {}): void {
    console.log(this.colorize(this.formatMessage('info', message, options), 'info'))
  }

  success(message: unknown, options: LogOptions = {}): void {
    console.log(this.colorize(this.formatMessage('success', message, options), 'success'))
  }

  warning(message: unknown, options: LogOptions = {}): void {
    console.warn(this.colorize(this.formatMessage('warning', message, options), 'warning'))
  }

  error(message: unknown, options: LogOptions = {}): void {
    console.error(this.colorize(this.formatMessage('error', message, options), 'error'))
  }

  debug(message: unknown, options: LogOptions = {}): void {
    if (process.env.DEBUG) {
      console.debug(this.colorize(this.formatMessage('debug', message, options), 'debug'))
    }
  }

  // Helper for command output
  commandOutput(message: unknown, options: LogOptions = {}): void {
    const opts = { ...options, prefix: '→' }
    this.info(message, opts)
  }

  // Helper for command success
  commandSuccess(message: unknown, options: LogOptions = {}): void {
    const opts = { ...options, prefix: '✓' }
    this.success(message, opts)
  }

  // Helper for command error
  commandError(message: unknown, options: LogOptions = {}): void {
    const opts = { ...options, prefix: '✗' }
    this.error(message, opts)
  }

  // Helper for command warning
  commandWarning(message: unknown, options: LogOptions = {}): void {
    const opts = { ...options, prefix: '⚠' }
    this.warning(message, opts)
  }
}

// Export a default instance
export const logger = new Logger()

// Export the class for custom instances
export { Logger } 