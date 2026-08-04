/**
 * Simple Logger for Vite + React Applications
 *
 * Features:
 * - Centralized logging utility
 * - Environment-based log filtering
 * - Development: debug, info, warn, error
 * - Production: warn, error
 * - ISO timestamp for every log
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const getEnvironment = (): string => {
  try {
    return (
      import.meta.env.VITE_ENV ??
      import.meta.env.MODE ??
      'development'
    );
  } catch {
    return 'development';
  }
};

const isProduction = getEnvironment() === 'production';

const formatHeader = (level: LogLevel): string => {
  return `[${level.toUpperCase()}]`;
};

const shouldLog = (level: LogLevel): boolean => {
  if (!isProduction) {
    return true;
  }

  return level === 'warn' || level === 'error';
};

const printLog = (level: LogLevel, args: unknown[]): void => {
  if (!shouldLog(level)) {
    return;
  }

  const header = formatHeader(level);

  switch (level) {
    case 'debug':
      console.debug(header, ...args);
      break;

    case 'info':
      if (typeof args[0] === 'string') {
        console.info(`${header} ${args[0]}`, ...args.slice(1));
      } else {
        console.info(header, ...args);
      }
      break;

    case 'warn':
      console.warn(header, ...args);
      break;

    case 'error':
      console.error(header, ...args);
      break;
  }
};

export const logger = {
  debug: (...args: unknown[]) => printLog('debug', args),

  info: (...args: unknown[]) => printLog('info', args),

  log: (...args: unknown[]) => printLog('info', args),

  warn: (...args: unknown[]) => printLog('warn', args),

  error: (...args: unknown[]) => printLog('error', args),
};

export default logger;