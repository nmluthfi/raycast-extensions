import { getCached, setCache, makeCacheKey, CacheTTL } from "../lib/cache";
import { withErrorHandling } from "../utils/errors";
import { identifyInput } from "../utils/format";
import type { WalletPosition, WalletTrade } from "../lib/types";

import { HttpClient } from "../core/http-client";
import { PolymarketService } from "../services/polymarket.service";

type Input = {
  address: string;
  limit?: number;
};

interface PositionsResult {
  resolvedAddress: string;
  activePositions: WalletPosition[];
  recentTrades: WalletTrade[];
}

export default async function tool(input: Input) {
  return withErrorHandling("get-wallet-positions", async () => {
    const { limit = 50 } = input;
    let { address } = input;

    const httpClient = new HttpClient();
    const polySvc = new PolymarketService(httpClient);

    if (identifyInput(address) === "username") {
      const resolved = await polySvc.resolveUsername(address);
      if (!resolved) {
        throw new Error(
          `Could not find a Polymarket user with the username "${address}".`,
        );
      }
      address = resolved;
    }

    const cacheKey = makeCacheKey("get-wallet-positions", { address, limit });
    const cached = getCached<PositionsResult>(cacheKey);
    if (cached) return cached;

    const [activePositions, recentTrades] = await Promise.all([
      polySvc.getPositions(address),
      polySvc.getTrades(address, limit),
    ]);

    const result: PositionsResult = {
      resolvedAddress: address,
      activePositions,
      recentTrades,
    };

    setCache(cacheKey, result, CacheTTL.WALLET_POSITIONS);

    return result;
  });
}
