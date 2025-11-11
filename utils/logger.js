// Simple logging utilities with consistent prefixes for server logs
// Avoids introducing external dependencies while providing structured logs
export const logger = {
  info: (message, meta) => {
    if (meta) {
      console.log('[INFO]', message, meta);
    } else {
      console.log('[INFO]', message);
    }
  },
  warn: (message, meta) => {
    if (meta) {
      console.warn('[WARN]', message, meta);
    } else {
      console.warn('[WARN]', message);
    }
  },
  error: (message, meta) => {
    if (meta) {
      console.error('[ERROR]', message, meta);
    } else {
      console.error('[ERROR]', message);
    }
  },
};


