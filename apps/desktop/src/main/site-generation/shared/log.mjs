const LEVEL_RANK = { debug: 10, info: 20, warn: 30, error: 40 }

function configuredLevel() {
  const raw = process.env.EMPRINT_LOG_LEVEL?.trim().toLowerCase()
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') return raw
  return process.env.NODE_ENV === 'production' ? 'warn' : 'info'
}

function shouldLog(level) {
  return LEVEL_RANK[level] >= LEVEL_RANK[configuredLevel()]
}

export function logInfo(...args) {
  if (shouldLog('info')) console.info('[emprint]', ...args)
}

export function logWarn(...args) {
  if (shouldLog('warn')) console.warn('[emprint]', ...args)
}

export function logError(...args) {
  if (shouldLog('error')) console.error('[emprint]', ...args)
}
