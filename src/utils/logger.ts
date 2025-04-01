import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get app root directory
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOG_DIR = path.join(__dirname, '../../logs')
const LOG_FILE = path.join(LOG_DIR, 'app.log')

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

interface LoggerConfig {
  timestamp?: boolean;
  logLevel?: boolean;
  json?: boolean;
  logToFile?: boolean;
}

interface LogContext {
  requestId?: string;
  episodeId?: string;
  source?: string;
  cached?: boolean;
  prefix?: string;
  json?: boolean;
}

export class Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      logToFile: true,  // Enable file logging by default
      ...config
    };
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatContext(context: LogContext): string {
    const parts = [];
    if (context.requestId) parts.push(`request=${context.requestId}`);
    if (context.episodeId) parts.push(`episode=${context.episodeId}`);
    if (context.source) parts.push(`source=${context.source}`);
    if (context.cached !== undefined) parts.push(`cached=${context.cached}`);
    return parts.length ? `[${parts.join(' ')}]` : '';
  }

  private safeStringify(obj: any): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (error) {
      return '[object Object]';
    }
  }

  private formatMessage(level: string, message: any, context: LogContext = {}, forConsole: boolean = true): string {
    if (context.json || this.config.json) {
      try {
        return JSON.stringify({
          timestamp: this.getTimestamp(),
          level: level.toLowerCase(),
          message: typeof message === 'string' ? message : this.safeStringify(message),
          ...context
        });
      } catch (error) {
        return JSON.stringify({
          timestamp: this.getTimestamp(),
          level: level.toLowerCase(),
          message: '[object Object]',
          ...context
        });
      }
    }

    let formattedMessage = '';
    
    // Only add timestamp and level for console output
    if (forConsole) {
      if (this.config.timestamp) {
        formattedMessage += `[${this.getTimestamp()}] `;
      }
      
      if (this.config.logLevel) {
        formattedMessage += `${level} `;
      }
    }

    if (context.prefix) {
      formattedMessage += `${context.prefix} `;
    }

    formattedMessage += this.formatContext(context);

    if (Array.isArray(message)) {
      formattedMessage += this.safeStringify(message);
    } else if (typeof message === 'object' && message !== null) {
      formattedMessage += this.safeStringify(message);
    } else {
      formattedMessage += String(message);
    }

    return formattedMessage.trim();
  }

  private writeToFile(level: string, message: any, context: LogContext = {}) {
    if (!this.config.logToFile) return;
    
    try {
      // Format message without timestamp/level, as we'll add them here
      const formattedMessage = this.formatMessage(level, message, context, false);
      const logEntry = `${this.getTimestamp()} ${level} ${formattedMessage}\n`;
      fs.appendFileSync(LOG_FILE, logEntry);
    } catch (error) {
      console.error(`Failed to write to log file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  info(message: any, context: LogContext = {}) {
    const formattedMessage = this.formatMessage('INFO', message, context);
    console.log(formattedMessage);
    this.writeToFile('INFO', message, context);
  }

  warn(message: any, context: LogContext = {}) {
    const formattedMessage = this.formatMessage('WARN', message, context);
    console.warn(chalk.yellow(formattedMessage));
    this.writeToFile('WARN', message, context);
  }

  error(message: string | Error, context: LogContext = {}) {
    const errorMessage = message instanceof Error ? message.message : message;
    const formattedMessage = this.formatMessage('ERROR', errorMessage, context);
    console.error(chalk.red(formattedMessage));
    this.writeToFile('ERROR', errorMessage, context);
  }

  debug(message: any, context: LogContext = {}) {
    if (process.env.DEBUG === 'true') {
      const formattedMessage = this.formatMessage('DEBUG', message, context);
      console.debug(chalk.gray(formattedMessage));
      this.writeToFile('DEBUG', message, context);
    }
  }

  api(method: string, url: string, status: number, duration: number, context: LogContext = {}) {
    const message = `${method} ${url} ${status} ${duration}ms`;
    const formattedMessage = this.formatMessage('API', message, context);
    const color = status >= 400 ? chalk.red : status >= 300 ? chalk.yellow : chalk.green;
    console.log(color(formattedMessage));
    this.writeToFile('API', message, context);
  }

  cache(hit: boolean, key: string, context: LogContext = {}) {
    const message = `${hit ? 'HIT' : 'MISS'} ${key}`;
    const formattedMessage = this.formatMessage('CACHE', message, context);
    const color = hit ? chalk.green : chalk.yellow;
    console.log(color(formattedMessage));
    this.writeToFile('CACHE', message, context);
  }

  success(message: any, context: LogContext = {}) {
    const formattedMessage = this.formatMessage('SUCCESS', message, context);
    console.log(chalk.green(formattedMessage));
    this.writeToFile('SUCCESS', message, context);
  }

  warning(message: any, context: LogContext = {}) {
    const formattedMessage = this.formatMessage('WARNING', message, context);
    console.warn(chalk.yellow(formattedMessage));
    this.writeToFile('WARNING', message, context);
  }

  commandOutput(message: string, context: LogContext = {}) {
    const formattedMessage = `→ ${message}`;
    console.log(formattedMessage);
    this.writeToFile('CMD', message, context);
  }

  commandSuccess(message: string, context: LogContext = {}) {
    const formattedMessage = `✓ ${message}`;
    console.log(chalk.green(formattedMessage));
    this.writeToFile('CMD', message, context);
  }

  commandError(message: string, context: LogContext = {}) {
    const formattedMessage = `✗ ${message}`;
    console.error(chalk.red(formattedMessage));
    this.writeToFile('CMD', message, context);
  }

  commandWarning(message: string, context: LogContext = {}) {
    const formattedMessage = `⚠ ${message}`;
    console.warn(chalk.yellow(formattedMessage));
    this.writeToFile('CMD', message, context);
  }
}

export const logger = new Logger({ timestamp: true, logLevel: true }); // Default instance with timestamps and log levels enabled 