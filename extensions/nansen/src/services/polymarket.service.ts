import { IHttpClient, IPolymarketService } from "../core/interfaces";
import type {
  PolymarketEvent,
  PolymarketMarket,
  WalletPosition,
  WalletTrade,
} from "../lib/types";

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";
const DATA_API_BASE = "https://data-api.polymarket.com";

interface GammaEvent {
  id: string;
  title: string;
  slug: string;
  markets: GammaMarket[];
  volume: number;
  active: boolean;
  end_date_iso?: string;
}

interface GammaMarket {
  id: string;
  question: string;
  condition_id: string;
  slug: string;
  tokens: Array<{ price: number }>;
  volume: number;
  active: boolean;
  end_date_iso?: string;
}

interface GammaProfile {
  name: string;
  pseudonym: string;
  proxyWallet: string;
  displayUsernamePublic: boolean;
}

export class PolymarketService implements IPolymarketService {
  constructor(private httpClient: IHttpClient) {}

  public async searchMarkets(
    query: string,
    options: { limit?: number; status?: "open" | "closed" | "all" } = {},
  ): Promise<PolymarketEvent[]> {
    const { limit = 5, status = "all" } = options;
    const params = new URLSearchParams({
      q: query,
      limit_per_type: "20",
      ...(status === "open" ? { events_status: "open" } : {}),
      ...(status === "closed" ? { events_status: "closed" } : {}),
    });

    const data = await this.httpClient.get<{ events?: GammaEvent[] }>(
      `${GAMMA_API_BASE}/public-search?${params.toString()}`,
    );
    const rawEvents = data.events || [];

    const searchTerms = query
      .toLowerCase()
      .split(/[\\s,]+/)
      .filter((t) => t.length > 1);

    const scoredEvents = rawEvents.map((event) => {
      const titleLower = event.title.toLowerCase();
      const slugLower = event.slug.toLowerCase();
      let score = 0;
      for (const term of searchTerms) {
        if (titleLower.includes(term) || slugLower.includes(term)) score++;
      }
      return { ...event, _matchScore: score };
    });

    return scoredEvents
      .filter((e) => e._matchScore > 0)
      .sort((a, b) => b._matchScore - a._matchScore || b.volume - a.volume)
      .slice(0, limit)
      .map(({ _matchScore, ...event }) => ({
        id: event.id,
        title: event.title,
        slug: event.slug,
        markets: (event.markets || []).map((m) => ({
          id: m.id,
          question: m.question,
          conditionId: m.condition_id,
          slug: m.slug,
          outcomePrices: (m.tokens || []).map((t) => String(t.price)),
          volume: m.volume || 0,
          active: m.active,
          endDate: m.end_date_iso,
        })),
        volume: event.volume || 0,
        active: event.active,
        endDate: event.end_date_iso,
      }));
  }

  public async getPositions(address: string): Promise<WalletPosition[]> {
    const rawPositions = await this.httpClient.get<any[]>(
      `${DATA_API_BASE}/positions?user=${address}`,
    );
    return rawPositions.map((pos) => ({
      marketTitle: pos.title || "Unknown Market",
      conditionId: pos.conditionId,
      side: pos.outcome === "Yes" ? "YES" : "NO",
      size: pos.size,
      entryPrice: pos.avgPrice,
      currentPrice: pos.curPrice,
      unrealizedPnl: pos.cashPnl,
    }));
  }

  public async getTrades(address: string, limit = 50): Promise<WalletTrade[]> {
    const rawTrades = await this.httpClient.get<any[]>(
      `${DATA_API_BASE}/trades?user=${address}&limit=${limit}`,
    );
    return rawTrades.map((trade) => ({
      marketTitle: trade.title || "Unknown Market",
      conditionId: trade.conditionId,
      side: trade.outcome === "Yes" ? "YES" : "NO",
      price: trade.price,
      size: trade.size,
      usdcValue: trade.price * trade.size,
      timestamp: new Date(trade.timestamp * 1000).toISOString(),
      takerAction: trade.side === "BUY" ? "BUY" : "SELL",
    }));
  }

  public async resolveUsername(username: string): Promise<string | null> {
    const params = new URLSearchParams({
      q: username,
      search_profiles: "true",
      limit_per_type: "5",
    });
    try {
      const data = await this.httpClient.get<{ profiles?: GammaProfile[] }>(
        `${GAMMA_API_BASE}/public-search?${params.toString()}`,
      );
      if (data.profiles && data.profiles.length > 0) {
        const exactMatch = data.profiles.find(
          (p) => p.name.toLowerCase() === username.toLowerCase(),
        );
        return (exactMatch || data.profiles[0]).proxyWallet;
      }
      return null;
    } catch {
      return null;
    }
  }

  public async resolveAddress(address: string): Promise<string | null> {
    const params = new URLSearchParams({ address });
    try {
      const profile = await this.httpClient.get<GammaProfile>(
        `${GAMMA_API_BASE}/public-profile?${params.toString()}`,
      );
      if (profile.displayUsernamePublic) {
        return profile.name || profile.pseudonym || null;
      }
      return null;
    } catch {
      return null;
    }
  }
}
