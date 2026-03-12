# opencode-timeout-continuer

Auto-retry OpenCode operations on timeout errors with exponential backoff.

## Install

```bash
npm install -g opencode-timeout-continuer
```

## Usage

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-timeout-continuer"]
}
```

## Config

```json
{
  "plugin": ["opencode-timeout-continuer"],
  "plugin_config": {
    "opencode-timeout-continuer": {
      "maxRetries": 3,
      "baseDelayMs": 1000,
      "maxDelayMs": 30000,
      "prompt": "Continue"
    }
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `maxRetries` | 3 | Max retry attempts |
| `baseDelayMs` | 1000 | Base delay for backoff |
| `maxDelayMs` | 30000 | Max delay cap |
| `prompt` | "Continue" | Prompt sent on retry |

## How it works

1. Detects timeout/retryable errors (HTTP 408, 429, 502, 503, 504)
2. Retries with exponential backoff (1s → 2s → 4s → ...)
3. Resets count when session completes

## License

MIT
