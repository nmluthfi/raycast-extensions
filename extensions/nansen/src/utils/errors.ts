/**
 * Error handling utilities for consistent error responses across tools.
 * Every tool should use these to produce messages the AI can interpret.
 */

/**
 * Wraps a tool execution in a try/catch and returns a standardized response.
 * Catches known error patterns (rate limits, network errors, CLI failures)
 * and returns user-friendly messages.
 */
export async function withErrorHandling<T>(
  toolName: string,
  fn: () => Promise<T>,
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    const message = extractErrorMessage(err);
    const userFriendly = classifyError(toolName, message);
    return { success: false, error: userFriendly };
  }
}

/**
 * Extracts a readable error message from unknown error types.
 */
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  return "An unknown error occurred";
}

/**
 * Classifies an error message into a user-friendly description
 * with actionable next steps for common failure modes.
 */
function classifyError(toolName: string, message: string): string {
  const lower = message.toLowerCase();

  // Rate limiting from any API
  if (
    lower.includes("429") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests")
  ) {
    return `Rate limited while running ${toolName}. Please wait 30 seconds and try again.`;
  }

  // Authentication issues
  if (
    lower.includes("401") ||
    lower.includes("unauthorized") ||
    lower.includes("403") ||
    lower.includes("forbidden")
  ) {
    return `Authentication failed for ${toolName}. Please check your Nansen API Key in Raycast preferences (Cmd + ,).`;
  }

  // Credits exhausted or payment required
  if (
    lower.includes("402") ||
    lower.includes("payment required") ||
    lower.includes("credits_exhausted")
  ) {
    return `Nansen API credits exhausted for ${toolName}. Check your plan at https://app.nansen.ai or top up credits.`;
  }

  // Network errors
  if (
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("network") ||
    lower.includes("timeout")
  ) {
    return `Network error while running ${toolName}. Please check your internet connection and try again.`;
  }

  // Nansen CLI not found
  if (
    lower.includes("nansen") &&
    (lower.includes("not found") ||
      lower.includes("enoent") ||
      lower.includes("command not found"))
  ) {
    return `Nansen CLI is not installed. Run: npm install -g nansen-cli`;
  }

  // Generic fallback with the original message for debugging
  return `Error in ${toolName}: ${message}`;
}
