import type {
  PolymarketEvent,
  WalletPosition,
  WalletTrade,
  NansenLabel,
} from "../lib/types";

export interface IHttpClient {
  get<T>(url: string): Promise<T>;
}

export interface ICliClient {
  execute<T>(command: string, timeoutMs?: number): Promise<T>;
}

// Data models previously trapped inside API wrappers
export interface HistoricalBalance {
  block_timestamp: string;
  value_usd: number;
  token_symbol?: string;
}

export interface NansenTrade {
  market_id: string;
  market_question?: string;
  side: string;
  price: number;
  size: number;
  usdc_value?: number;
  taker_action?: string;
  timestamp: string;
}

export interface PnlByMarketEntry {
  address: string;
  owner_address: string;
  side_held: string;
  net_buy_cost_usd: number;
  net_sell_proceeds_usd?: number;
  total_pnl_usd: number;
}

export interface NansenMarketEntry {
  market_id: string;
  question: string;
  status: string;
  volume?: number;
  last_trade_price?: number;
}

export interface NansenRelatedWallet {
  address: string;
  confidence: string;
  relationship: string;
}

export interface NansenCounterparty {
  address: string;
  interaction_count: number;
  total_value_usd: number;
}

export interface IPolymarketService {
  searchMarkets(
    query: string,
    options?: { limit?: number; status?: "open" | "closed" | "all" },
  ): Promise<PolymarketEvent[]>;
  getPositions(address: string): Promise<WalletPosition[]>;
  getTrades(address: string, limit?: number): Promise<WalletTrade[]>;
  resolveUsername(username: string): Promise<string | null>;
  resolveAddress(address: string): Promise<string | null>;
}

export interface INansenMarketService {
  searchMarkets(
    query: string,
    options?: { status?: string; limit?: number },
  ): Promise<NansenMarketEntry[]>;
  getPnlByMarket(marketId: string, limit?: number): Promise<PnlByMarketEntry[]>;
  getTradesByAddress(address: string, limit?: number): Promise<NansenTrade[]>;
}

export interface INansenProfilerService {
  getHistoricalBalances(
    address: string,
    days?: number,
  ): Promise<HistoricalBalance[]>;
  getWalletLabels(address: string): Promise<NansenLabel[]>;
  getRelatedWallets(address: string): Promise<NansenRelatedWallet[]>;
  getCounterparties(
    address: string,
    days?: number,
  ): Promise<NansenCounterparty[]>;
}
