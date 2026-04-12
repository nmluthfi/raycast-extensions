import {
  ICliClient,
  INansenProfilerService,
  HistoricalBalance,
  NansenRelatedWallet,
  NansenCounterparty,
} from "../core/interfaces";
import type { NansenLabel } from "../lib/types";
import { delay } from "../lib/rate-limiter";

const CALL_SPACING_MS = 1500;

interface PaginatedResponse<T> {
  data: T[];
}

export class NansenProfilerService implements INansenProfilerService {
  constructor(private cliClient: ICliClient) {}

  public async getHistoricalBalances(
    address: string,
    days = 365,
  ): Promise<HistoricalBalance[]> {
    await delay(CALL_SPACING_MS);
    const cmd = `nansen research profiler historical-balances --address ${address} --chain polygon --days ${days} --sort block_timestamp:asc --limit 100`;
    const result =
      await this.cliClient.execute<PaginatedResponse<HistoricalBalance>>(cmd);
    return result.data || [];
  }

  public async getWalletLabels(address: string): Promise<NansenLabel[]> {
    await delay(CALL_SPACING_MS);
    const cmd = `nansen research profiler labels --address ${address} --chain polygon`;
    const result =
      await this.cliClient.execute<PaginatedResponse<NansenLabel>>(cmd);
    return result.data || [];
  }

  public async getRelatedWallets(
    address: string,
  ): Promise<NansenRelatedWallet[]> {
    await delay(CALL_SPACING_MS);
    const cmd = `nansen research profiler related-wallets --address ${address} --chain polygon`;
    const result =
      await this.cliClient.execute<PaginatedResponse<NansenRelatedWallet>>(cmd);
    return result.data || [];
  }

  public async getCounterparties(
    address: string,
    days = 90,
  ): Promise<NansenCounterparty[]> {
    await delay(CALL_SPACING_MS);
    const cmd = `nansen research profiler counterparties --address ${address} --chain polygon --days ${days}`;
    const result =
      await this.cliClient.execute<PaginatedResponse<NansenCounterparty>>(cmd);
    return result.data || [];
  }
}
