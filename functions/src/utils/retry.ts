/**
 * Retry utility with exponential backoff
 */

import { Logger } from './logger';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number; // ms
  maxDelay?: number; // ms
  factor?: number; // exponential backoff multiplier
  retryableErrors?: string[]; // Error messages/codes to retry
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  factor: 2,
  retryableErrors: []
};

/**
 * Execute a function with retry logic
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  logger?: Logger
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      const isRetryable = opts.retryableErrors.length === 0 ||
        opts.retryableErrors.some(msg =>
          lastError.message.includes(msg) ||
          lastError.name.includes(msg)
        );

      if (!isRetryable || attempt === opts.maxAttempts) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.factor, attempt - 1),
        opts.maxDelay
      );

      logger?.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, {
        error: lastError.message
      });

      // Call retry callback if provided
      options.onRetry?.(attempt, lastError);

      // Wait before retry
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with jitter (randomization to prevent thundering herd)
 */
export async function retryWithJitter<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  logger?: Logger
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === opts.maxAttempts) {
        throw lastError;
      }

      // Calculate delay with jitter
      const exponentialDelay = opts.initialDelay * Math.pow(opts.factor, attempt - 1);
      const jitter = Math.random() * exponentialDelay * 0.3; // ±30% jitter
      const delay = Math.min(exponentialDelay + jitter, opts.maxDelay);

      logger?.warn(`Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`, {
        error: lastError.message
      });

      options.onRetry?.(attempt, lastError);

      await sleep(delay);
    }
  }

  throw lastError!;
}
