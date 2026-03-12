import { RetryManager } from './retry-manager.js';
import { getConfig } from './config.js';
import type { OpenCodeEvent, SessionErrorEventProperties } from './types.js';

/**
 * OpenCode plugin for automatic retry on timeout errors
 * 
 * This plugin automatically retries OpenCode operations when timeout
 * or retryable errors occur, using exponential backoff.
 * 
 * Configuration (in opencode.json):
 * ```json
 * {
 *   "plugin": ["opencode-timeout-continuer"],
 *   "plugin_config": {
 *     "opencode-timeout-continuer": {
 *       "enabled": true,
 *       "maxRetries": 3,
 *       "baseDelayMs": 1000,
 *       "maxDelayMs": 30000,
 *       "prompt": "Continue"
 *     }
 *   }
 * }
 * ```
 */

// Plugin type definition (local, since @opencode-ai/plugin may not be published)
type Plugin = (input: {
  client: {
    session: {
      prompt: (params: {
        path: { id: string };
        body: { parts: Array<{ type: string; text: string }> };
      }) => Promise<void>;
    };
    app: {
      log: (params: {
        body: {
          service: string;
          level: 'debug' | 'info' | 'warn' | 'error';
          message: string;
        };
      }) => Promise<void>;
    };
  };
  config?: Record<string, unknown>;
}) => Promise<{
  event?: (params: { event: OpenCodeEvent }) => Promise<void>;
}>;

const plugin: Plugin = async ({ client, config }) => {
  // Get plugin configuration
  const pluginConfig = config as Record<string, unknown> | undefined;
  const retryConfig = getConfig(pluginConfig);

  // Initialize retry manager
  const retryManager = new RetryManager(retryConfig);

  // Log plugin initialization
  await client.app.log({
    body: {
      service: 'opencode-timeout-continuer',
      level: 'info',
      message: `Plugin initialized with maxRetries=${retryConfig.maxRetries}, baseDelayMs=${retryConfig.baseDelayMs}`,
    },
  });

  return {
    event: async ({ event }) => {
      // Handle session.error
      if (event.type === 'session.error') {
        const { sessionID, error } = event.properties as SessionErrorEventProperties;

        if (!sessionID) {
          return;
        }

        // Check if we should retry
        if (retryManager.shouldRetry(sessionID, error)) {
          const currentCount = retryManager.getCount(sessionID);

          await client.app.log({
            body: {
              service: 'opencode-timeout-continuer',
              level: 'info',
              message: `Retryable error detected for session ${sessionID}, scheduling retry ${currentCount + 1}/${retryConfig.maxRetries}`,
            },
          });

          // Schedule retry with exponential backoff
          retryManager.scheduleRetry(
            sessionID,
            async () => {
              try {
                await client.session.prompt({
                  path: { id: sessionID },
                  body: {
                    parts: [{ type: 'text', text: retryConfig.prompt }],
                  },
                });
              } catch (err) {
                await client.app.log({
                  body: {
                    service: 'opencode-timeout-continuer',
                    level: 'error',
                    message: `Failed to send retry prompt: ${err instanceof Error ? err.message : String(err)}`,
                  },
                });
              }
            },
            currentCount
          );
        } else if (error) {
          // Log non-retryable error for debugging
          const errInfo = error as { name?: string; data?: { message?: string } };
          await client.app.log({
            body: {
              service: 'opencode-timeout-continuer',
              level: 'debug',
              message: `Non-retryable error for session ${sessionID}: ${errInfo.name || 'unknown'} - ${errInfo.data?.message || 'no message'}`,
            },
          });
        }
      }

      // Handle session.idle - reset retry state
      if (event.type === 'session.idle') {
        const { sessionID } = event.properties;
        if (sessionID) {
          retryManager.reset(sessionID);
          await client.app.log({
            body: {
              service: 'opencode-timeout-continuer',
              level: 'debug',
              message: `Session ${sessionID} went idle, reset retry state`,
            },
          });
        }
      }
    },
  };
};

export default plugin;
