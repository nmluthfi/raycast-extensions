/**
 * Shared TypeScript types for the Nansen Raycast extension.
 * Central type definitions used across tools, libs, and utilities.
 */

// ─── Polymarket Types ────────────────────────────────────────────────

/** A Polymarket event/market returned from the Gamma or Search API. */
export interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  /** Individual binary markets within this event. */
  markets: PolymarketMarket[];
  /** Total volume across all markets in this event (USDC). */
  volume: number;
  /** Whether the event is currently active (has open markets). */
  active: boolean;
  /** ISO date string for when the event closes. */
  endDate?: string;
}

/** A single binary market within a Polymarket event. */
export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  /** YES/NO outcome token prices as decimal strings (e.g., "0.65"). */
  outcomePrices: string[];
  /** Total volume traded in USDC. */
  volume: number;
  active: boolean;
  endDate?: string;
}

/** A wallet's trading position on Polymarket. */
export interface WalletPosition {
  marketTitle: string;
  conditionId: string;
  /** YES or NO */
  side: "YES" | "NO";
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
}

/** A single trade executed by a wallet on Polymarket. */
export interface WalletTrade {
  marketTitle: string;
  conditionId: string;
  side: "YES" | "NO";
  price: number;
  size: number;
  usdcValue: number;
  timestamp: string;
  takerAction: "BUY" | "SELL";
}

// ─── Nansen Types ────────────────────────────────────────────────────

/** Nansen label attached to a wallet address. */
export interface NansenLabel {
  label: string;
  category: string;
}

/** Flags used in the insider scoring system. */
export type InsiderFlag =
  | "NEW_WALLET"
  | "YOUNG_WALLET"
  | "SINGLE_MARKET"
  | "FEW_MARKETS"
  | "EXTREME_ROI"
  | "HIGH_ROI"
  | "LATE_ENTRY"
  | "LARGE_POSITION"
  | "KNOWN_ENTITY";

/** Risk classification derived from the suspicion score. */
export type RiskLevel =
  | "not_suspicious"
  | "flagged"
  | "high_risk"
  | "high_confidence_suspicious";

/** A scored wallet from the insider scan. */
export interface ScoredWallet {
  /** Proxy address used for trading on Polymarket. */
  address: string;
  /** Owner address (the EOA that created the proxy). */
  ownerAddress: string;
  /** Polymarket username, if resolved. */
  polymarketUsername?: string;
  /** Suspicion score from 0 (clean) to 13 (max suspicious). */
  score: number;
  /** Array of flags that triggered scoring. */
  flags: InsiderFlag[];
  /** Total realized PnL in USD. */
  totalPnlUsd: number;
  /** Return on investment as a percentage. */
  roiPercent: number;
  /** Nansen labels, if any. Labeled wallets get a -2 score adjustment. */
  labels: NansenLabel[];
  /** Derived risk classification. */
  riskLevel: RiskLevel;
}

/** A related wallet discovered via Nansen clustering. */
export interface RelatedWallet {
  address: string;
  /** Polymarket username, if resolved. */
  polymarketUsername?: string;
  confidence: "high" | "medium";
  /** How this wallet is connected to the seed (e.g., "funder", "shared signer"). */
  relationship: string;
  labels: NansenLabel[];
}

/** The full cluster result for a seed wallet. */
export interface WalletCluster {
  seedAddress: string;
  seedLabels: NansenLabel[];
  relatedWallets: RelatedWallet[];
}

// ─── Tool Response Types ─────────────────────────────────────────────

/**
 * Standardized tool return type.
 * Successful responses include data; failures include an error message
 * that Raycast AI can interpret and communicate to the user.
 */
export type ToolResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
