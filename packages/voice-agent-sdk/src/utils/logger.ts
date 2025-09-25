/* eslint-disable no-console */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  level: LogLevel = 'info';

  private shouldLog(level: LogLevel): boolean {
    const order: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    return order[level] >= order[this.level];
  }

  debug(message: string, meta?: unknown): void {
    if (this.shouldLog('debug')) {
      console.debug(`[MAKA][DEBUG] ${message}`, meta ?? '');
    }
  }

  info(message: string, meta?: unknown): void {
    if (this.shouldLog('info')) {
      console.info(`[MAKA][INFO] ${message}`, meta ?? '');
    }
  }

  warn(message: string, meta?: unknown): void {
    if (this.shouldLog('warn')) {
      console.warn(`[MAKA][WARN] ${message}`, meta ?? '');
    }
  }

  error(message: string, meta?: unknown): void {
    if (this.shouldLog('error')) {
      console.error(`[MAKA][ERROR] ${message}`, meta ?? '');
    }
  }
}

export const logger = new Logger();
