"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { CHECK_REGISTRY_ABI } from "./abi";
import { REGISTRY_ADDRESS } from "./config";

export type CheckData = {
  id: bigint;
  drawer: `0x${string}`;
  stablecoin: `0x${string}`;
  vault: `0x${string}`;
  principal: bigint;
  shares: bigint;
  createdAt: bigint;
  maturity: bigint;
  settled: boolean;
  holder?: `0x${string}`;
};

const registry = { address: REGISTRY_ADDRESS, abi: CHECK_REGISTRY_ABI } as const;

/** Reads all cheques by scanning ids 1..nextId-1. Fine for small/demo deployments;
 *  use a subgraph/indexer for production scale. */
export function useChecks() {
  const { data: nextId } = useReadContract({ ...registry, functionName: "nextId" });

  const ids = useMemo(() => {
    const n = nextId ? Number(nextId) : 1;
    return Array.from({ length: Math.max(0, n - 1) }, (_, i) => BigInt(i + 1));
  }, [nextId]);

  const { data, isLoading, refetch } = useReadContracts({
    contracts: ids.flatMap((id) => [
      { ...registry, functionName: "getCheck", args: [id] } as const,
      { ...registry, functionName: "ownerOf", args: [id] } as const,
    ]),
    query: { enabled: ids.length > 0 },
  });

  const checks = useMemo<CheckData[]>(() => {
    if (!data) return [];
    const out: CheckData[] = [];
    ids.forEach((id, i) => {
      const c = data[i * 2]?.result as any;
      const owner = data[i * 2 + 1]?.result as `0x${string}` | undefined;
      if (!c) return;
      out.push({
        id,
        drawer: c.drawer,
        stablecoin: c.stablecoin,
        vault: c.vault,
        principal: c.principal,
        shares: c.shares,
        createdAt: c.createdAt,
        maturity: c.maturity,
        settled: c.settled,
        holder: owner,
      });
    });
    return out;
  }, [data, ids]);

  return { checks, isLoading, refetch };
}
