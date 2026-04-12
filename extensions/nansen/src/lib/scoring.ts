/**
 * Insider scoring algorithm for Polymarket wallets.
 *
 * Implements the scoring system from Nansen's polymarket-insider-scan SKILL.md.
 * Each wallet is evaluated against a set of behavioral flags and assigned a
 * suspicion score from 0 (clean) to 13 (maximum suspicious).
 *
 * Scoring table:
 *   NEW_WALLET        +3  First funded within 7 days of first trade
 *   YOUNG_WALLET      +1  First funded 8-28 days before first trade (skip if NEW_WALLET)
 *   SINGLE_MARKET     +3  Only 1 distinct market traded
 *   FEW_MARKETS       +1  2-3 distinct markets traded (skip if SINGLE_MARKET)
 *   EXTREME_ROI       +3  ROI ≥ 500%
 *   HIGH_ROI          +2  ROI 200-499% (skip if EXTREME_ROI)
 *   LATE_ENTRY        +2  Any trade at price ≥ 0.80
 *   LARGE_POSITION    +2  net_buy_cost_usd ≥ $10,000
 *   KNOWN_ENTITY      -2  Has Nansen labels (known fund, protocol, CEX, etc.)
 */

import type { InsiderFlag, RiskLevel, NansenLabel } from "./types";

/** Raw data about a wallet needed for scoring. */
export interface WalletScoringData {
  /** Days between wallet's first funding and first trade on this market. */
  walletAgeDays: number | null;
  /** Number of distinct markets this wallet has traded on. */
  distinctMarkets: number;
  /** Return on investment as a percentage (e.g., 500 = 500%). */
  roiPercent: number;
  /** Whether any trade was made at a price of 0.80 or higher. */
  hasLateEntry: boolean;
  /** Net buy cost in USD for this market. */
  netBuyCostUsd: number;
  /** Nansen labels attached to this wallet. */
  labels: NansenLabel[];
}

/** Score result with the computed score, triggered flags, and risk level. */
export interface ScoreResult {
  score: number;
  flags: InsiderFlag[];
  riskLevel: RiskLevel;
}

/**
 * Computes the insider suspicion score for a wallet.
 * Flags are mutually exclusive within their groups (e.g., NEW_WALLET vs YOUNG_WALLET).
 */
export function computeInsiderScore(data: WalletScoringData): ScoreResult {
  let score = 0;
  const flags: InsiderFlag[] = [];

  // ── Wallet Age Flags (mutually exclusive) ──
  if (data.walletAgeDays !== null) {
    if (data.walletAgeDays <= 7) {
      flags.push("NEW_WALLET");
      score += 3;
    } else if (data.walletAgeDays <= 28) {
      flags.push("YOUNG_WALLET");
      score += 1;
    }
  }

  // ── Market Diversity Flags (mutually exclusive) ──
  if (data.distinctMarkets === 1) {
    flags.push("SINGLE_MARKET");
    score += 3;
  } else if (data.distinctMarkets >= 2 && data.distinctMarkets <= 3) {
    flags.push("FEW_MARKETS");
    score += 1;
  }

  // ── ROI Flags (mutually exclusive) ──
  if (data.roiPercent >= 500) {
    flags.push("EXTREME_ROI");
    score += 3;
  } else if (data.roiPercent >= 200) {
    flags.push("HIGH_ROI");
    score += 2;
  }

  // ── Independent Flags ──
  if (data.hasLateEntry) {
    flags.push("LATE_ENTRY");
    score += 2;
  }

  if (data.netBuyCostUsd >= 10_000) {
    flags.push("LARGE_POSITION");
    score += 2;
  }

  // ── Known Entity Deduction ──
  if (data.labels.length > 0) {
    flags.push("KNOWN_ENTITY");
    score -= 2;
  }

  // Clamp to minimum of 0
  score = Math.max(0, score);

  return {
    score,
    flags,
    riskLevel: classifyRisk(score),
  };
}

/**
 * Classifies a numeric score into a risk level for display.
 */
export function classifyRisk(score: number): RiskLevel {
  if (score >= 9) return "high_confidence_suspicious";
  if (score >= 7) return "high_risk";
  if (score >= 3) return "flagged";
  return "not_suspicious";
}
