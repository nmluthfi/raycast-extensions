import {
  ICliClient,
  INansenMarketService,
  NansenMarketEntry,
  PnlByMarketEntry,
  NansenTrade,
} from "../core/interfaces";
import { delay } from "../lib/rate-limiter";

const CALL_SPACING_MS = 1500;

interface PaginatedResponse<T> {
  data: T[];
}

export class NansenMarketService implements INansenMarketService {
  constructor(private cliClient: ICliClient) {}

  public async searchMarkets(
    query: string,
    options: { status?: string; limit?: number } = {},
  ): Promise<NansenMarketEntry[]> {
    const { status = "closed", limit = 5 } = options;
    const cmd = [
      "nansen",
      "research",
      "prediction-market",
      "market-screener",
      "--query",
      query,
      "--status",
      status,
      "--limit",
      String(limit),
    ];
    const result =
      await this.cliClient.execute<PaginatedResponse<NansenMarketEntry>>(cmd);
    return result.data || [];
  }

  public async getPnlByMarket(
    marketId: string,
    limit = 50,
  ): Promise<PnlByMarketEntry[]> {
    const cmd = [
      "nansen",
      "research",
      "prediction-market",
      "pnl-by-market",
      "--market-id",
      marketId,
      "--limit",
      String(limit),
    ];
    const result =
      await this.cliClient.execute<PaginatedResponse<PnlByMarketEntry>>(cmd);
    return result.data || [];
  }

  public async getTradesByAddress(
    address: string,
    limit = 100,
  ): Promise<NansenTrade[]> {
    await delay(CALL_SPACING_MS);
    const cmd = [
      "nansen",
      "research",
      "prediction-market",
      "trades-by-address",
      "--address",
      address,
      "--limit",
      String(limit),
    ];
    const result =
      await this.cliClient.execute<PaginatedResponse<NansenTrade>>(cmd);
    return result.data || [];
  }
}
