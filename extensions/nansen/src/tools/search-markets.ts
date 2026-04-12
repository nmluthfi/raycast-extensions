import { getCached, setCache, makeCacheKey, CacheTTL } from "../lib/cache";
import { withErrorHandling } from "../utils/errors";
import { formatVolume } from "../utils/format";
import type { PolymarketEvent } from "../lib/types";

import { HttpClient } from "../core/http-client";
import { PolymarketService } from "../services/polymarket.service";

type Input = {
  query?: string;
  keyword?: string;
  limit?: number;
  status?: "open" | "closed" | "all";
};

interface MarketResult {
  eventId: string;
  title: string;
  eventSlug: string;
  eventUrl: string;
  markets: Array<{
    marketId: string;
    question: string;
    conditionId: string;
    odds: string;
    volume: string;
    active: boolean;
  }>;
  totalVolume: string;
  active: boolean;
  endDate?: string;
}

export default async function tool(input: Input) {
  return withErrorHandling("search-markets", async () => {
    const { limit = 5, status = "all" } = input;
    const searchTerm = input.query || input.keyword;

    if (!searchTerm) {
      throw new Error("You must provide a search query or keyword.");
    }

    const cacheKey = makeCacheKey("search-markets", {
      query: searchTerm,
      limit,
      status,
    });
    const cached = getCached<MarketResult[]>(cacheKey);
    if (cached) return cached;

    const httpClient = new HttpClient();
    const polySvc = new PolymarketService(httpClient);

    const events = await polySvc.searchMarkets(searchTerm, { limit, status });

    if (events.length === 0) {
      return [] as MarketResult[];
    }

    const results: MarketResult[] = events.map((event: PolymarketEvent) => ({
      eventId: event.id,
      title: event.title,
      eventSlug: event.slug,
      eventUrl: `https://polymarket.com/event/${event.slug}`,
      markets: event.markets.map((m) => ({
        marketId: m.id,
        question: m.question,
        conditionId: m.conditionId,
        odds:
          m.outcomePrices.length >= 2
            ? `YES: ${(parseFloat(m.outcomePrices[0]) * 100).toFixed(0)}% / NO: ${(parseFloat(m.outcomePrices[1]) * 100).toFixed(0)}%`
            : "N/A",
        volume: formatVolume(m.volume),
        active: m.active,
      })),
      totalVolume: formatVolume(event.volume),
      active: event.active,
      endDate: event.endDate,
    }));

    setCache(cacheKey, results, CacheTTL.MARKET_SEARCH);

    return results;
  });
}
