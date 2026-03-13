/**
 * Configuration options for the auto-continue plugin
 */
export interface AutoContinueConfig {
  /** Enable/disable auto-continue functionality */
  enabled: boolean;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds for exponential backoff */
  baseDelayMs: number;
  /** Maximum delay cap in milliseconds */
  maxDelayMs: number;
  /** Prompt text to send when retrying */
  prompt: string;
}

/**
 * Tracks retry state for a specific session
 */
export interface SessionRetryState {
  /** Current retry count */
  count: number;
  /** Timestamp of last error */
  lastError: Date;
  /** Pending timeout ID for cleanup */
  timeoutId?: ReturnType<typeof setTimeout>;
}

/**
 * API error structure from OpenCode
 */
export interface ApiError {
  name: 'ApiError';
  data: {
    message: string;
    statusCode?: number;
    isRetryable: boolean;
    responseHeaders?: Record<string, string>;
    responseBody?: string;
  };
}

/**
 * Other error types that should NOT be retried
 */
export type NonRetryableError = 
  | { name: 'ProviderAuthError' }
  | { name: 'MessageOutputLengthError' }
  | { name: 'MessageAbortedError' };

/**
 * Event properties for session.error
 */
export interface SessionErrorEventProperties {
  sessionID?: string;
  error?: ApiError | NonRetryableError | Error;
}

/**
 * Event properties for session.idle
 */
export interface SessionIdleEventProperties {
  sessionID: string;
}

/**
 * OpenCode event types that the plugin handles
 */
export type OpenCodeEvent = 
  | { type: 'session.error'; properties: SessionErrorEventProperties }
  | { type: 'session.idle'; properties: SessionIdleEventProperties }
  | { type: 'message.updated'; properties: { info?: { sessionID?: string; role?: string; error?: unknown } } };
