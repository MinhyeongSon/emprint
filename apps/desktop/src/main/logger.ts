type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
}

function configuredLevel(): LogLevel {
  const raw = process.env.EMPRINT_LOG_LEVEL?.trim().toLowerCase()
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') return raw
  return process.env.NODE_ENV === 'production' ? 'warn' : 'info'
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[configuredLevel()]
}

export const logger = {
  debug(...args: unknown[]): void {
    if (shouldLog('debug')) console.debug('[emprint]', ...args)
  },
  info(...args: unknown[]): void {
    if (shouldLog('info')) console.info('[emprint]', ...args)
  },
  warn(...args: unknown[]): void {
    if (shouldLog('warn')) console.warn('[emprint]', ...args)
  },
  error(...args: unknown[]): void {
    if (shouldLog('error')) console.error('[emprint]', ...args)
  }
}
