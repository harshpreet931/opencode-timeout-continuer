import type { AutoContinueConfig, SessionRetryState } from './types';

/**
 * Manages retry state and exponential backoff for session errors
 */
export class RetryManager {
  private sessions = new Map<string, SessionRetryState>();
  private config: AutoContinueConfig;

  constructor(config: AutoContinueConfig) {
    this.config = config;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    // Handle null/undefined
    if (!error) {
      return false;
    }

    // Handle string errors
    if (typeof error === 'string') {
      const lower = error.toLowerCase();
      return lower.includes('timeout') || lower.includes('timed out');
    }

    // Handle non-object types
    if (typeof error !== 'object') {
      return false;
    }

    const err = error as Record<string, unknown>;

    // Check for nested error property (some frameworks wrap errors)
    if (err.error && typeof err.error === 'object') {
      const nestedRetryable = this.isRetryableError(err.error);
      if (nestedRetryable) {
        return true;
      }
    }

    // Check for ApiError with isRetryable flag (handle both 'ApiError' and 'APIError' case variations)
    const data = err.data as Record<string, unknown> | undefined;
    const errorNameStr = String(err.name || '');
    if ((errorNameStr === 'ApiError' || errorNameStr === 'APIError') && data?.isRetryable === true) {
      return true;
    }

    // Check for timeout-related status codes
    const statusCode = data?.statusCode as number | undefined;
    if (statusCode && [408, 429, 502, 503, 504].includes(statusCode)) {
      return true;
    }

    // Check error name for timeout patterns
    const errorName = String(err.name || '').toLowerCase();
    if (errorName.includes('timeout') || errorName.includes('etimedout')) {
      return true;
    }

    // Check error message for timeout patterns
    const errorMessage = String(err.message || '').toLowerCase();
    const dataMessage = String(data?.message || '').toLowerCase();
    const combinedMessage = errorMessage + ' ' + dataMessage;
    if (combinedMessage.includes('timeout') || combinedMessage.includes('timed out')) {
      return true;
    }

    // Check constructor name as fallback
    const constructorName = (error as object).constructor?.name?.toLowerCase() || '';
    if (constructorName.includes('timeout')) {
      return true;
    }

    // Check for common timeout error names
    const timeoutErrorNames = ['timeouterror', 'timeout', 'etimedout', 'econnrefused', 'enotfound'];
    if (timeoutErrorNames.includes(errorName) || timeoutErrorNames.includes(constructorName)) {
      return true;
    }

    // If error object is empty but has keys like 'error', check for timeout context
    const errString = JSON.stringify(err).toLowerCase();
    if (errString.includes('timeout') || errString.includes('timed out')) {
      return true;
    }

    return false;
  }

  /**
   * Check if we should retry for this session
   */
  shouldRetry(sessionId: string, error: unknown): boolean {
    // Check if plugin is enabled
    if (!this.config.enabled) {
      return false;
    }

    // Check if error is retryable
    const retryable = this.isRetryableError(error);
    if (!retryable) {
      return false;
    }

    // Get or create session state
    const state = this.sessions.get(sessionId);
    const currentCount = state?.count ?? 0;

    // Check retry limit
    return currentCount < this.config.maxRetries;
  }

  /**
   * Get current retry count for a session
   */
  getCount(sessionId: string): number {
    return this.sessions.get(sessionId)?.count ?? 0;
  }

  /**
   * Schedule a retry with exponential backoff
   */
  scheduleRetry(sessionId: string, callback: () => void | Promise<void>, attempt: number): void {
    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.baseDelayMs * Math.pow(2, attempt),
      this.config.maxDelayMs
    );

    // Increment retry count
    const currentState = this.sessions.get(sessionId);
    const newState: SessionRetryState = {
      count: (currentState?.count ?? 0) + 1,
      lastError: new Date(),
    };

    // Set up timeout
    const timeoutId = setTimeout(async () => {
      try {
        await callback();
      } catch {
        // Callback errors are handled by the event system
      }
    }, delay);

    newState.timeoutId = timeoutId;
    this.sessions.set(sessionId, newState);
  }

  /**
   * Check if there's a pending retry for this session
   */
  hasPendingRetry(sessionId: string): boolean {
    const state = this.sessions.get(sessionId);
    return state?.timeoutId !== undefined;
  }

  /**
   * Reset retry state for a session (called on session.idle)
   * But don't reset if there's a pending retry - let the retry complete
   */
  reset(sessionId: string): void {
    const state = this.sessions.get(sessionId);
    // Don't reset if there's a pending retry - let it execute
    if (state?.timeoutId) {
      return;
    }
    this.sessions.delete(sessionId);
  }

  /**
   * Clear all retry state (cleanup on plugin unload)
   */
  clearAll(): void {
    for (const state of this.sessions.values()) {
      if (state.timeoutId) {
        clearTimeout(state.timeoutId);
      }
    }
    this.sessions.clear();
  }
}
