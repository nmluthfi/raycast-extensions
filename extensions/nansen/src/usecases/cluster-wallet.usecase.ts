import { identifyInput } from "../utils/format";
import type { WalletCluster, RelatedWallet, NansenLabel } from "../lib/types";
import { INansenProfilerService, IPolymarketService } from "../core/interfaces";

const MAX_CLUSTER_SIZE = 50;

export class ClusterWalletUseCase {
  constructor(
    private profilerService: INansenProfilerService,
    private polymarketService: IPolymarketService,
  ) {}

  public async execute(
    addressInput: string,
    days = 90,
  ): Promise<WalletCluster> {
    let address = addressInput;

    if (identifyInput(address) === "username") {
      const resolved = await this.polymarketService.resolveUsername(address);
      if (!resolved) {
        throw new Error(
          `Could not find a Polymarket user with the username "${address}".`,
        );
      }
      address = resolved;
    }

    let seedLabels: NansenLabel[] = [];
    try {
      seedLabels = await this.profilerService.getWalletLabels(address);
    } catch (e: any) {
      if (
        e?.message?.includes("CREDITS_EXHAUSTED") ||
        e?.message?.includes("FORBIDDEN")
      )
        throw e;
    }

    const relatedWallets: RelatedWallet[] = [];
    const visited = new Set<string>([address.toLowerCase()]);

    try {
      const related = await this.profilerService.getRelatedWallets(address);

      for (const rw of related) {
        const relatedAddress = rw.address || (rw as any).counterparty_address;
        if (!relatedAddress) continue;
        if (relatedWallets.length >= MAX_CLUSTER_SIZE) break;
        if (visited.has(relatedAddress.toLowerCase())) continue;
        if (rw.confidence && rw.confidence.toLowerCase() === "low") continue;

        visited.add(relatedAddress.toLowerCase());

        let labels: NansenLabel[] = [];
        try {
          labels = await this.profilerService.getWalletLabels(relatedAddress);
        } catch (e: any) {
          if (
            e?.message?.includes("CREDITS_EXHAUSTED") ||
            e?.message?.includes("FORBIDDEN")
          )
            throw e;
        }

        const isKnownProtocol = labels.some((l) =>
          ["cex", "protocol", "exchange"].some((kw) =>
            l.category.toLowerCase().includes(kw),
          ),
        );

        relatedWallets.push({
          address: relatedAddress,
          confidence:
            rw.confidence && rw.confidence.toLowerCase() === "high"
              ? "high"
              : "medium",
          relationship: rw.relationship || (rw as any).relation || "Related",
          labels,
        });

        if (isKnownProtocol) continue;
      }
    } catch (e: any) {
      if (
        e?.message?.includes("CREDITS_EXHAUSTED") ||
        e?.message?.includes("FORBIDDEN")
      )
        throw e;
    }

    if (relatedWallets.length < MAX_CLUSTER_SIZE) {
      try {
        const counterparties = await this.profilerService.getCounterparties(
          address,
          days,
        );

        for (const cp of counterparties) {
          const cpAddress = cp.address || (cp as any).counterparty_address;
          if (!cpAddress) continue;
          if (relatedWallets.length >= MAX_CLUSTER_SIZE) break;
          if (visited.has(cpAddress.toLowerCase())) continue;

          visited.add(cpAddress.toLowerCase());

          let labels: NansenLabel[] = [];
          try {
            labels = await this.profilerService.getWalletLabels(cpAddress);
          } catch (e: any) {
            if (
              e?.message?.includes("CREDITS_EXHAUSTED") ||
              e?.message?.includes("FORBIDDEN")
            )
              throw e;
          }

          relatedWallets.push({
            address: cpAddress,
            confidence: "medium",
            relationship: `counterparty (${cp.interaction_count || "multiple"} interactions)`,
            labels,
          });
        }
      } catch (e: any) {
        if (
          e?.message?.includes("CREDITS_EXHAUSTED") ||
          e?.message?.includes("FORBIDDEN")
        )
          throw e;
      }
    }

    return {
      seedAddress: address,
      seedLabels,
      relatedWallets,
    };
  }
}
