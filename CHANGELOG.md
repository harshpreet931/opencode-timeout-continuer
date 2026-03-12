# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-12

### Added
- Initial release
- Automatic retry on timeout and retryable API errors
- Exponential backoff with configurable delays (1s → 2s → 4s → ...)
- Per-session retry tracking with automatic reset on completion
- Silent operation with no UI interruptions
- Configurable via `plugin_config` in opencode.json:
  - `enabled` - Enable/disable auto-retry
  - `maxRetries` - Maximum retry attempts (default: 3)
  - `baseDelayMs` - Base delay for exponential backoff (default: 1000ms)
  - `maxDelayMs` - Maximum delay cap (default: 30000ms)
  - `prompt` - Prompt text sent on retry (default: "Continue")
- Support for retryable error detection:
  - API errors with `isRetryable: true`
  - HTTP status codes: 408, 429, 502, 503, 504
  - Error names containing "timeout" or "ETIMEDOUT"

### Technical Details
- TypeScript implementation with strict mode
- Event-based architecture using OpenCode's `event` hook
- Handles `session.error` and `session.idle` events
- Uses `client.session.prompt()` for retry continuation
