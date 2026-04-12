import { getCached, setCache, makeCacheKey, CacheTTL } from "../lib/cache";
import { withErrorHandling } from "../utils/errors";

import { CliClient } from "../core/cli-client";
import { HttpClient } from "../core/http-client";
import { NansenMarketService } from "../services/nansen-market.service";
import { NansenProfilerService } from "../services/nansen-profiler.service";
import { PolymarketService } from "../services/polymarket.service";
import {
  ScanInsidersUseCase,
  type InsiderScanResult,
} from "../usecases/scan-insiders.usecase";

type Input = {
  marketId: string;
  marketName: string;
  minScore?: number;
  limit?: number;
};

export default async function tool(input: Input) {
  return withErrorHandling("scan-insiders", async () => {
    const { marketId, marketName, minScore = 3, limit = 100 } = input;

    const cacheKey = makeCacheKey("scan-insiders-v2", {
      marketId,
      minScore,
      limit,
    });
    const cached = getCached<InsiderScanResult>(cacheKey);
    if (cached) return cached;

    const cliClient = new CliClient();
    const httpClient = new HttpClient();

    const marketSvc = new NansenMarketService(cliClient);
    const profilerSvc = new NansenProfilerService(cliClient);
    const polySvc = new PolymarketService(httpClient);

    const useCase = new ScanInsidersUseCase(marketSvc, profilerSvc, polySvc);
    const result = await useCase.execute(marketId, marketName, minScore, limit);

    setCache(cacheKey, result, CacheTTL.INSIDER_SCAN);

    return result;
  });
}
