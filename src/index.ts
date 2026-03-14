import { RetryManager } from './retry-manager.js';
import { getConfig } from './config.js';
import type { OpenCodeEvent, SessionErrorEventProperties } from './types.js';

/**
 * OpenCode plugin for automatic retry on timeout errors
 */

type Plugin = (input: {
  client: {
    session: {
      prompt: (params: {
        path: { id: string };
        body: { parts: Array<{ type: string; text: string }> };
        query?: { directory: string };
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
  directory?: string;
}) => Promise<{
  event?: (params: { event: OpenCodeEvent }) => Promise<void>;
}>;

const plugin: Plugin = async ({ client, config, directory }) => {
  const pluginConfig = config as Record<string, unknown> | undefined;
  const retryConfig = getConfig(pluginConfig);
  const retryManager = new RetryManager(retryConfig);
  const workingDirectory = directory || '.';

  await client.app.log({
    body: {
      service: 'opencode-timeout-continuer',
      level: 'info',
      message: `Plugin initialized with maxRetries=${retryConfig.maxRetries}, baseDelayMs=${retryConfig.baseDelayMs}, directory: ${workingDirectory}`,
    },
  });

  const hooks = {
    event: async ({ event }: { event: OpenCodeEvent }) => {
      try {
        if (event.type === 'session.error') {
          const { sessionID, error } = event.properties as SessionErrorEventProperties;

          await client.app.log({
            body: {
              service: 'opencode-timeout-continuer',
              level: 'info',
              message: `session.error received - sessionID: ${sessionID}, error: ${JSON.stringify(error).slice(0, 500)}`,
            },
          });

          if (sessionID && retryManager.shouldRetry(sessionID, error)) {
            const currentCount = retryManager.getCount(sessionID);

            await client.app.log({
              body: {
                service: 'opencode-timeout-continuer',
                level: 'info',
                message: `Retryable error detected, scheduling retry ${currentCount + 1}/${retryConfig.maxRetries}. Error: ${JSON.stringify(error).slice(0, 500)}`,
              },
            });

            retryManager.scheduleRetry(
              sessionID,
              async () => {
                try {
                  await client.session.prompt({
                    path: { id: sessionID },
                    body: { parts: [{ type: 'text', text: retryConfig.prompt }] },
                    query: { directory: workingDirectory },
                  });
                } catch {
                  // Callback errors are handled by the event system
                }
              },
              currentCount
            );
          }
        }

        if (event.type === 'message.updated') {
          const props = event.properties as Record<string, unknown> | undefined;
          const info = props?.info as Record<string, unknown> | undefined;
          const sessionID = info?.sessionID as string | undefined;
          const role = info?.role as string | undefined;
          const error = info?.error;

          if (sessionID && role === 'assistant' && error) {
            if (retryManager.shouldRetry(sessionID, error)) {
              try {
                await client.session.prompt({
                  path: { id: sessionID },
                  body: { parts: [{ type: 'text', text: retryConfig.prompt }] },
                  query: { directory: workingDirectory },
                });
              } catch {
                // Callback errors are handled by the event system
              }
            }
          }
        }

        if (event.type === 'session.idle') {
          const { sessionID } = event.properties;
          if (sessionID) {
            retryManager.reset(sessionID);
          }
        }
      } catch {
        // Event handler errors are logged internally
      }
    },
  };

  return hooks;
};

export default plugin;
