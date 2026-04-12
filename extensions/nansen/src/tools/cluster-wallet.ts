import { getCached, setCache, makeCacheKey, CacheTTL } from "../lib/cache";
import { withErrorHandling } from "../utils/errors";
import type { WalletCluster } from "../lib/types";

import { CliClient } from "../core/cli-client";
import { HttpClient } from "../core/http-client";
import { NansenProfilerService } from "../services/nansen-profiler.service";
import { PolymarketService } from "../services/polymarket.service";
import { ClusterWalletUseCase } from "../usecases/cluster-wallet.usecase";

type Input = {
  address: string;
  days?: number;
};

export default async function tool(input: Input) {
  return withErrorHandling("cluster-wallet", async () => {
    const { days = 90, address } = input;

    const cacheKey = makeCacheKey("cluster-wallet", { address, days });
    const cached = getCached<WalletCluster>(cacheKey);
    if (cached) return cached;

    const cliClient = new CliClient();
    const httpClient = new HttpClient();
    const profilerSvc = new NansenProfilerService(cliClient);
    const polySvc = new PolymarketService(httpClient);

    const useCase = new ClusterWalletUseCase(profilerSvc, polySvc);
    const cluster = await useCase.execute(address, days);

    setCache(cacheKey, cluster, CacheTTL.WALLET_CLUSTERS);

    return cluster;
  });
}
