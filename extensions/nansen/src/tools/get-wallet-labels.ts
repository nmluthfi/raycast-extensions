import { getCached, setCache, makeCacheKey, CacheTTL } from "../lib/cache";
import { withErrorHandling } from "../utils/errors";
import { identifyInput } from "../utils/format";
import type { NansenLabel } from "../lib/types";

import { CliClient } from "../core/cli-client";
import { HttpClient } from "../core/http-client";
import { NansenProfilerService } from "../services/nansen-profiler.service";
import { PolymarketService } from "../services/polymarket.service";

type Input = {
  address: string;
};

interface LabelsResult {
  resolvedAddress: string;
  labels: NansenLabel[];
  isKnownEntity: boolean;
}

export default async function tool(input: Input) {
  return withErrorHandling("get-wallet-labels", async () => {
    let { address } = input;

    const cliClient = new CliClient();
    const httpClient = new HttpClient();
    const profilerSvc = new NansenProfilerService(cliClient);
    const polySvc = new PolymarketService(httpClient);

    if (identifyInput(address) === "username") {
      const resolved = await polySvc.resolveUsername(address);
      if (!resolved) {
        return {
          success: false as const,
          error: `Could not find a Polymarket user with the username "${address}".`,
        };
      }
      address = resolved;
    }

    const cacheKey = makeCacheKey("get-wallet-labels", { address });
    const cached = getCached<LabelsResult>(cacheKey);
    if (cached) return cached;

    const labels = await profilerSvc.getWalletLabels(address);

    const result: LabelsResult = {
      resolvedAddress: address,
      labels,
      isKnownEntity: labels.length > 0,
    };

    setCache(cacheKey, result, CacheTTL.WALLET_LABELS);

    return result;
  });
}
