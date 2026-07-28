import { AxiosError } from 'axios';

export type QueryErrorKind = 'unauthorized' | 'forbidden' | 'not_found' | 'network' | 'timeout' | 'server' | 'unknown';

export interface QueryErrorInfo {
  kind: QueryErrorKind;
  title: string;
  message: string;
  /** Whether showing a "Retry" action makes sense for this error. */
  retryable: boolean;
}

/**
 * Normalizes any error thrown by an axios-backed React Query call into a
 * consistent shape the UI can render without each page re-deriving it.
 *
 * Backend errors match GlobalHttpExceptionFilter's payload:
 *   { statusCode, code, message, path, timestamp }
 */
export function getQueryErrorInfo(error: unknown): QueryErrorInfo {
  if (!(error instanceof AxiosError)) {
    return {
      kind: 'unknown',
      title: 'Something went wrong',
      message: error instanceof Error ? error.message : 'Unexpected error.',
      retryable: true,
    };
  }

  // No response at all: either a timeout or the request never reached the server.
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return {
        kind: 'timeout',
        title: 'Request timed out',
        message: 'The server took too long to respond. Check your connection and try again.',
        retryable: true,
      };
    }
    return {
      kind: 'network',
      title: 'Network error',
      message: 'Could not reach the server. Check your connection and try again.',
      retryable: true,
    };
  }

  const status = error.response.status;
  const body = error.response.data as { message?: string | string[] } | undefined;
  const serverMessage = Array.isArray(body?.message) ? body?.message.join(', ') : body?.message;

  if (status === 401) {
    return {
      kind: 'unauthorized',
      title: 'Session expired',
      message: 'Your session has expired. Please sign in again.',
      retryable: false,
    };
  }
  if (status === 403) {
    return {
      kind: 'forbidden',
      title: 'Access denied',
      message: serverMessage ?? 'You do not have permission to view this.',
      retryable: false,
    };
  }
  if (status === 404) {
    return {
      kind: 'not_found',
      title: 'Not found',
      message: serverMessage ?? 'The requested resource could not be found.',
      retryable: false,
    };
  }
  if (status >= 500) {
    return {
      kind: 'server',
      title: 'Server error',
      message: serverMessage ?? 'The server ran into a problem. Please try again shortly.',
      retryable: true,
    };
  }
  return {
    kind: 'unknown',
    title: 'Request failed',
    message: serverMessage ?? 'Something went wrong processing your request.',
    retryable: true,
  };
}
