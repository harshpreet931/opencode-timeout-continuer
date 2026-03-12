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
    if (!error || typeof error !== 'object') {
      return false;
    }

    const err = error as { name?: string; data?: { isRetryable?: boolean; statusCode?: number } };

    // Check for ApiError with isRetryable flag
    if (err.name === 'ApiError' && err.data?.isRetryable === true) {
      return true;
    }

    // Check for timeout-related status codes
    const statusCode = err.data?.statusCode;
    if (statusCode && [408, 429, 502, 503, 504].includes(statusCode)) {
      return true;
    }

    // Check error name for timeout patterns
    const errorName = err.name?.toLowerCase() || '';
    if (errorName.includes('timeout') || errorName.includes('etimedout')) {
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
    if (!this.isRetryableError(error)) {
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
   * Reset retry state for a session (called on session.idle)
   */
  reset(sessionId: string): void {
    const state = this.sessions.get(sessionId);
    if (state?.timeoutId) {
      clearTimeout(state.timeoutId);
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
