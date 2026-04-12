/**
 * Rate limiter for sequential API calls.
 *
 * Nansen CLI requires ~1.5s pauses between calls to avoid rate limits.
 * This module provides a simple delay-based throttle and exponential
 * backoff for 429 responses.
 */

/** Default delay between sequential Nansen CLI calls (milliseconds). */
const NANSEN_CALL_DELAY_MS = 1500;

/** Maximum retry attempts for rate-limited requests. */
const MAX_RETRIES = 3;

/**
 * Pauses execution for the specified duration.
 * Used between sequential Nansen CLI calls to respect rate limits.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes an async function with a pre-call delay.
 * Ensures minimum spacing between sequential API calls.
 */
export async function throttled<T>(
  fn: () => Promise<T>,
  delayMs = NANSEN_CALL_DELAY_MS,
): Promise<T> {
  await delay(delayMs);
  return fn();
}

/**
 * Retries a function with exponential backoff on failure.
 * Useful for handling transient 429 rate limit responses.
 *
 * Backoff schedule: 2s, 4s, 8s (base * 2^attempt).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    /** Optional predicate to determine if an error is retryable. */
    isRetryable?: (error: unknown) => boolean;
  } = {},
): Promise<T> {
  const {
    maxRetries = MAX_RETRIES,
    baseDelayMs = 2000,
    isRetryable = defaultIsRetryable,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Only retry if the error is retryable and we have attempts left
      if (attempt < maxRetries && isRetryable(err)) {
        const backoff = baseDelayMs * Math.pow(2, attempt);
        await delay(backoff);
        continue;
      }

      throw err;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Default retry predicate — retries on rate limits (429) and server errors (5xx).
 */
function defaultIsRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("429") ||
      msg.includes("rate limit") ||
      msg.includes("too many requests") ||
      msg.includes("500") ||
      msg.includes("502") ||
      msg.includes("503") ||
      msg.includes("504")
    );
  }
  return false;
}
