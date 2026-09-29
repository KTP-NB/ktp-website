const PREFIX = '[job-board]';

export function logInfo(message, meta) {
  console.info(PREFIX, message, meta || '');
}

export function logWarn(message, meta) {
  console.warn(PREFIX, message, meta || '');
}

export function logError(message, error) {
  console.error(PREFIX, message, error || '');
}
