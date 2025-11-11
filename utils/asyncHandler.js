import { jsonError } from '../lib/response';

// Wrap a handler to provide consistent error handling
export function withErrorHandling(handler) {
  return async function wrappedHandler(req, res) {
    try {
      await handler(req, res);
    } catch (err) {
      return jsonError(res, 500, 'Internal server error', err?.message || 'Unknown error');
    }
  };
}


