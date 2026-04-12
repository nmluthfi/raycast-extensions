import { computeInsiderScore, type WalletScoringData } from "../lib/scoring";
import type { ScoredWallet, NansenLabel } from "../lib/types";
import {
  INansenMarketService,
  INansenProfilerService,
  IPolymarketService,
} from "../core/interfaces";

export interface InsiderScanResult {
  marketName: string;
  totalPnlWallets: number;
  walletsAnalyzed: number;
  walletsFlagged: number;
  wallets: ScoredWallet[];
  bestCandidate: {
    address: string;
    username: string | null;
    score: number;
    profileUrl: string;
  } | null;
  insiderList: string;
}

export class ScanInsidersUseCase {
  constructor(
    private marketService: INansenMarketService,
    private profilerService: INansenProfilerService,
    private polymarketService: IPolymarketService,
  ) {}

  public async execute(
    marketId: string,
    marketName: string,
    minScore = 3,
    limit = 100,
  ): Promise<InsiderScanResult> {
    const pnlWallets = await this.marketService.getPnlByMarket(marketId, limit);

    if (pnlWallets.length === 0) {
      return {
        marketName,
        totalPnlWallets: 0,
        walletsAnalyzed: 0,
        walletsFlagged: 0,
        wallets: [],
        bestCandidate: null,
        insiderList: "",
      };
    }

    const scoredWallets: ScoredWallet[] = [];

    for (const wallet of pnlWallets) {
      try {
        const scored = await this.analyzeWallet(
          wallet.address,
          wallet.owner_address,
          wallet,
        );
        scoredWallets.push(scored);
      } catch (e: any) {
        if (e?.message?.includes("CREDITS_EXHAUSTED")) throw e;
        continue;
      }
    }

    const filtered = scoredWallets
      .filter((w) => w.score >= minScore)
      .sort((a, b) => {
        const aTopTier = a.score >= 9 ? 1 : 0;
        const bTopTier = b.score >= 9 ? 1 : 0;
        if (aTopTier !== bTopTier) return bTopTier - aTopTier;
        return b.score - a.score;
      });

    await Promise.all(
      filtered.map(async (w) => {
        try {
          const username = await this.polymarketService.resolveAddress(
            w.address,
          );
          if (username) {
            w.polymarketUsername = username;
          }
        } catch {
          return;
        }
      }),
    );

    const best = filtered.length > 0 ? filtered[0] : null;
    const bestCandidate = best
      ? {
          address: best.address,
          username: best.polymarketUsername || null,
          score: best.score,
          profileUrl: `https://polymarket.com/portfolio/${best.address}`,
        }
      : null;

    const insiderList = filtered
      .map((w, i) => {
        const name = w.polymarketUsername ? ` (@${w.polymarketUsername})` : "";
        return `${i + 1}. ${w.address}${name} (Score: ${w.score}, PnL: $${w.totalPnlUsd.toLocaleString()})`;
      })
      .join("\n");

    return {
      marketName,
      totalPnlWallets: pnlWallets.length,
      walletsAnalyzed: scoredWallets.length,
      walletsFlagged: filtered.length,
      wallets: filtered,
      bestCandidate,
      insiderList,
    };
  }

  private async analyzeWallet(
    proxyAddress: string,
    ownerAddress: string,
    pnlData: { total_pnl_usd: number; net_buy_cost_usd: number },
  ): Promise<ScoredWallet> {
    const profileAddress =
      ownerAddress && ownerAddress !== "0x" ? ownerAddress : proxyAddress;
    const roiPercent =
      pnlData.net_buy_cost_usd > 0
        ? (pnlData.total_pnl_usd / pnlData.net_buy_cost_usd) * 100
        : 0;

    const trades = await this.marketService.getTradesByAddress(proxyAddress);
    const distinctMarkets = new Set(trades.map((t) => t.market_id)).size;
    const hasLateEntry = trades.some((t) => t.price >= 0.8);

    let walletAgeDays: number | null = null;
    try {
      const balances =
        await this.profilerService.getHistoricalBalances(profileAddress);
      const firstFunded = balances.find((b) => b.value_usd > 0);
      if (firstFunded) {
        const fundedDate = new Date(firstFunded.block_timestamp);
        walletAgeDays = Math.floor(
          (Date.now() - fundedDate.getTime()) / (1000 * 60 * 60 * 24),
        );
      }
    } catch (e: any) {
      if (e?.message?.includes("CREDITS_EXHAUSTED")) throw e;
    }

    let labels: NansenLabel[] = [];
    try {
      labels = await this.profilerService.getWalletLabels(profileAddress);
    } catch (e: any) {
      if (e?.message?.includes("CREDITS_EXHAUSTED")) throw e;
    }

    const scoringData: WalletScoringData = {
      walletAgeDays,
      distinctMarkets: distinctMarkets || 1,
      roiPercent,
      hasLateEntry,
      netBuyCostUsd: pnlData.net_buy_cost_usd,
      labels,
    };

    const { score, flags, riskLevel } = computeInsiderScore(scoringData);

    return {
      address: proxyAddress,
      ownerAddress: profileAddress,
      score,
      flags,
      totalPnlUsd: pnlData.total_pnl_usd,
      roiPercent,
      labels,
      riskLevel,
    };
  }
}
