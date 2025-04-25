export enum Level {
  debug = "debug",
  info = "info",
  warn = "warn",
  error = "error",
}

export function log(level: Level, message: string, key?: string) {
  let logger = console.log;
  switch (level) {
    case Level.debug:
      logger = console.debug;
      break;
    case Level.warn:
      logger = console.warn;
      break;
    case Level.error:
      logger = console.error;
      break;
  }
  logger(
    `${new Date().toJSON()} ${level.toUpperCase()} ${
      key ? `[key=${key}] ` : ""
    }${message}`
  );
}

export function debug(message: string, key?: string) {
  log(Level.debug, message, key);
}

export function info(message: string, key?: string) {
  log(Level.info, message, key);
}

export function warn(message: string, key?: string) {
  log(Level.warn, message, key);
}

export function error(message: string, key?: string, error?: Error | unknown) {
  log(Level.error, message, key);
}
