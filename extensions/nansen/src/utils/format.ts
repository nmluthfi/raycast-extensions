/**
 * Formatting utilities for wallet addresses, numbers, and display values.
 * Keeps UI output consistent across all tools.
 */

/**
 * Truncates a hex address to the format 0xabcd...ef12 for readability.
 * Returns the original string if it's not a valid hex address.
 */
export function truncateAddress(address: string): string {
  if (!address || !address.startsWith("0x") || address.length < 12) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Formats a number as USD with commas and 2 decimal places.
 * Example: 12345.6 → "$12,345.60"
 */
export function formatUsd(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-$${formatted}` : `$${formatted}`;
}

/**
 * Formats a percentage with 1 decimal place.
 * Example: 523.456 → "523.5%"
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Formats a large number with compact notation for volume display.
 * Example: 1500000 → "$1.5M"
 */
export function formatVolume(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return formatUsd(amount);
}

/**
 * Validates that a string looks like a valid Ethereum address (0x + 40 hex chars).
 */
export function isValidAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

/**
 * Determines whether a user input is an Ethereum address or a Polymarket username.
 * Returns the type so tools can route lookups appropriately.
 */
export function identifyInput(value: string): "address" | "username" {
  return isValidAddress(value) ? "address" : "username";
}
