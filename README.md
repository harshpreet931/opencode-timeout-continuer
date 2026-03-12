# opencode-timeout-continuer

An OpenCode CLI plugin that automatically retries operations when timeout or retryable errors occur, using exponential backoff.

## Features

- **Automatic retry** on timeout and retryable API errors
- **Exponential backoff** with configurable delays (1s → 2s → 4s → ...)
- **Per-session tracking** - retry counts reset when session completes
- **Silent operation** - no UI interruptions
- **Fully configurable** - customize retry count, delays, and prompts

## Installation

### From npm (when published)

```bash
npm install -g opencode-timeout-continuer
```

### From source

```bash
git clone <repo-url>
cd opencode-timeout-continuer
npm install
npm run build
npm pack
npm install -g opencode-timeout-continuer-*.tgz
```

## Configuration

Add the plugin to your `opencode.json`:

```json
{
  "plugin": ["opencode-timeout-continuer"],
  "plugin_config": {
    "opencode-timeout-continuer": {
      "enabled": true,
      "maxRetries": 3,
      "baseDelayMs": 1000,
      "maxDelayMs": 30000,
      "prompt": "Continue"
    }
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable auto-retry |
| `maxRetries` | number | `3` | Maximum retry attempts per session (1-10) |
| `baseDelayMs` | number | `1000` | Base delay for exponential backoff in ms (100-60000) |
| `maxDelayMs` | number | `30000` | Maximum delay cap in ms (1000-300000) |
| `prompt` | string | `"Continue"` | Prompt text sent on retry |

## How It Works

1. **Detect**: The plugin listens for `session.error` events from OpenCode
2. **Analyze**: Checks if the error is retryable:
   - API errors with `isRetryable: true`
   - HTTP status codes: 408, 429, 502, 503, 504
   - Error names containing "timeout" or "ETIMEDOUT"
3. **Retry**: If retryable and under max retries:
   - Calculates exponential backoff delay
   - Sends a continuation prompt after the delay
4. **Reset**: When a session goes idle, retry counts are reset

### Exponential Backoff

The delay between retries grows exponentially:

| Attempt | Delay |
|---------|-------|
| 1 | 1s |
| 2 | 2s |
| 3 | 4s |
| 4 | 8s (capped at maxDelayMs) |

Formula: `delay = min(baseDelayMs * 2^attempt, maxDelayMs)`

## Manual Testing

To test the plugin:

1. Install the plugin globally
2. Add it to your `opencode.json`
3. Start OpenCode with a prompt that might timeout (e.g., a complex query)
4. Watch for log messages in OpenCode's output:
   - `Plugin initialized with maxRetries=3, baseDelayMs=1000`
   - `Retryable error detected for session xxx, scheduling retry 1/3`

## Error Types Handled

| Error Type | Retryable? |
|------------|------------|
| API Timeout | Yes |
| HTTP 408 (Request Timeout) | Yes |
| HTTP 429 (Too Many Requests) | Yes |
| HTTP 502 (Bad Gateway) | Yes |
| HTTP 503 (Service Unavailable) | Yes |
| HTTP 504 (Gateway Timeout) | Yes |
| ProviderAuthError | No |
| MessageOutputLengthError | No |
| MessageAbortedError | No |

## License

MIT
