import consola from 'consola'

export interface LogContext {
  correlationId?: string
  requestId?: string
  component?: string
  operation?: string
  durationMs?: number
  [key: string]: unknown
}

export interface Logger {
  info(message: string, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  error(message: string, context?: LogContext): void
  debug(message: string, context?: LogContext): void
}

export type LoggerRuntime = 'node' | 'browser' | 'cli'

function serializeContext(context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) return ''
  return ` ${JSON.stringify(context)}`
}

function normalize(level: string, message: string, context?: LogContext): string {
  return `[${level}] ${message}${serializeContext(context)}`
}

function writeBrowser(
  method: 'info' | 'warn' | 'error' | 'debug',
  level: string,
  message: string,
  context?: LogContext,
): void {
  const formatted = normalize(level, message, context)
  if (method === 'error') console.error(formatted)
  else if (method === 'warn') console.warn(formatted)
  else if (method === 'debug') console.debug(formatted)
  else console.info(formatted)
}

function writeNode(level: string, message: string, context?: LogContext): void {
  const payload = {
    level: level.toLowerCase(),
    message,
    ...(context ?? {}),
    timestamp: new Date().toISOString(),
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload))
}

function writeCli(
  method: 'info' | 'warn' | 'error' | 'debug',
  level: string,
  message: string,
  context?: LogContext,
): void {
  const formatted = normalize(level, message, context)
  if (method === 'error') consola.error(formatted)
  else if (method === 'warn') consola.warn(formatted)
  else if (method === 'debug') consola.debug(formatted)
  else consola.info(formatted)
}

export function createLogger(runtime: LoggerRuntime = 'node'): Logger {
  const emit = (
    method: 'info' | 'warn' | 'error' | 'debug',
    level: string,
    message: string,
    context?: LogContext,
  ) => {
    if (runtime === 'browser') {
      writeBrowser(method, level, message, context)
      return
    }
    if (runtime === 'cli') {
      writeCli(method, level, message, context)
      return
    }
    writeNode(level, message, context)
  }

  return {
    info(message, context) {
      emit('info', 'INFO', message, context)
    },
    warn(message, context) {
      emit('warn', 'WARN', message, context)
    },
    error(message, context) {
      emit('error', 'ERROR', message, context)
    },
    debug(message, context) {
      emit('debug', 'DEBUG', message, context)
    },
  }
}

export const cliLogger = createLogger('cli')
export const browserLogger = createLogger('browser')
export const nodeLogger = createLogger('node')
