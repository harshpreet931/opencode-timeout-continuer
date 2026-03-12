import type { AutoContinueConfig } from './types';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: AutoContinueConfig = {
  enabled: true,
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  prompt: 'Continue',
};

/**
 * Validates a single config value and returns default if invalid
 */
function validateNumber(value: unknown, defaultValue: number, min?: number, max?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return defaultValue;
  }
  if (min !== undefined && value < min) {
    return defaultValue;
  }
  if (max !== undefined && value > max) {
    return defaultValue;
  }
  return value;
}

/**
 * Validates string config value
 */
function validateString(value: unknown, defaultValue: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    return defaultValue;
  }
  return value;
}

/**
 * Validates boolean config value
 */
function validateBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value !== 'boolean') {
    return defaultValue;
  }
  return value;
}

/**
 * Gets the plugin configuration by merging user config with defaults
 * 
 * @param pluginConfig - The plugin_config section from opencode.json
 * @returns Merged and validated configuration
 */
export function getConfig(pluginConfig?: Record<string, unknown>): AutoContinueConfig {
  if (!pluginConfig || typeof pluginConfig !== 'object') {
    return { ...DEFAULT_CONFIG };
  }

  return {
    enabled: validateBoolean(pluginConfig.enabled, DEFAULT_CONFIG.enabled),
    maxRetries: validateNumber(pluginConfig.maxRetries, DEFAULT_CONFIG.maxRetries, 1, 10),
    baseDelayMs: validateNumber(pluginConfig.baseDelayMs, DEFAULT_CONFIG.baseDelayMs, 100, 60000),
    maxDelayMs: validateNumber(pluginConfig.maxDelayMs, DEFAULT_CONFIG.maxDelayMs, 1000, 300000),
    prompt: validateString(pluginConfig.prompt, DEFAULT_CONFIG.prompt),
  };
}
