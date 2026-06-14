"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { parseAbiItem } from "viem";
import { useAccount, usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { CHECK_REGISTRY_ABI } from "@/lib/abi";
import { REGISTRY_ADDRESS } from "@/lib/config";
import { useChecks, CheckData } from "@/lib/useChecks";
import { ProfileTabs } from "@/components/ProfileTabs";
import { fmtAmount, fmtDate } from "@/lib/format";

const registry = { address: REGISTRY_ADDRESS, abi: CHECK_REGISTRY_ABI } as const;

export default function ActivityPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { checks, refetch } = useChecks();
  const { writeContractAsync, isPending } = useWriteContract();

  const byId = useMemo(() => new Map(checks.map((c) => [c.id.toString(), c])), [checks]);

  // --- My listings: cheques I hold that are listed ---
  const mineHeld = useMemo(
    () => checks.filter((c) => c.holder?.toLowerCase() === address?.toLowerCase() && !c.settled),
    [checks, address],
  );
  const { data: listingData, refetch: refetchListings } = useReadContracts({
    contracts: mineHeld.map((c) => ({ ...registry, functionName: "listings", args: [c.id] }) as const),
    query: { enabled: mineHeld.length > 0 },
  });
  const myListings = useMemo(() => {
    if (!listingData) return [];
    const out: { check: CheckData; price: bigint }[] = [];
    mineHeld.forEach((c, i) => {
      const r = listingData[i]?.result as readonly [string, bigint] | undefined;
      if (r && r[1] > 0n) out.push({ check: c, price: r[1] });
    });
    return out;
  }, [listingData, mineHeld]);

  // --- My offers: from OfferMade logs where I'm the bidder ---
  const [myOffers, setMyOffers] = useState<{ id: bigint; price: bigint }[]>([]);
  async function loadOffers() {
    if (!publicClient || !address) return;
    try {
      const logs = await publicClient.getLogs({
        address: REGISTRY_ADDRESS,
        event: parseAbiItem("event OfferMade(uint256 indexed checkId, address indexed bidder, uint256 price)"),
        args: { bidder: address },
        fromBlock: 0n,
      });
      const ids = [...new Set(logs.map((l) => (l.args.checkId as bigint).toString()))].map((s) => BigInt(s));
      const rows: { id: bigint; price: bigint }[] = [];
      for (const id of ids) {
        const o = (await publicClient.readContract({ ...registry, functionName: "offers", args: [id, address] })) as readonly [
          bigint,
          bigint,
        ];
        if (o[1] > 0n) rows.push({ id, price: o[0] });
      }
      setMyOffers(rows);
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    loadOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, publicClient, checks.length]);

  const after = () => {
    refetch();
    refetchListings();
    loadOffers();
  };
  async function tx(fn: () => Promise<unknown>) {
    await fn();
    after();
  }

  return (
    <div className="container-app py-10">
      <ProfileTabs />

      {!isConnected ? (
        <div className="card py-16 text-center text-muted">Cüzdanını bağla.</div>
      ) : (
        <div className="space-y-12">
          {/* İlanlarım */}
          <section>
            <h2 className="font-display text-xl font-semibold">İlanlarım</h2>
            <p className="mt-1 text-sm text-muted">Pazaryeri'nde satışa çıkardığın çekler.</p>
            {myListings.length === 0 ? (
              <div className="card mt-4 py-10 text-center text-sm text-muted">Aktif ilanın yok.</div>
            ) : (
              <div className="mt-4 space-y-3">
                {myListings.map(({ check, price }) => (
                  <div key={check.id.toString()} className="card flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        Çek #{check.id.toString()} · {fmtAmount(check.principal, check.stablecoin)}
                      </p>
                      <p className="text-sm text-muted">
                        Fiyat {fmtAmount(price, check.stablecoin)} · vade {fmtDate(check.maturity)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/check/${check.id}`} className="btn-ghost">
                        Detay
                      </Link>
                      <button
                        className="btn-ghost"
                        disabled={isPending}
                        onClick={() => tx(() => writeContractAsync({ ...registry, functionName: "cancelListing", args: [check.id] }))}
                      >
                        İlanı kaldır
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Tekliflerim */}
          <section>
            <h2 className="font-display text-xl font-semibold">Tekliflerim</h2>
            <p className="mt-1 text-sm text-muted">Başka çeklere verdiğin, emanette bekleyen teklifler.</p>
            {myOffers.length === 0 ? (
              <div className="card mt-4 py-10 text-center text-sm text-muted">Aktif teklifin yok.</div>
            ) : (
              <div className="mt-4 space-y-3">
                {myOffers.map((o) => {
                  const c = byId.get(o.id.toString());
                  return (
                    <div key={o.id.toString()} className="card flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          Çek #{o.id.toString()}
                          {c ? ` · ${fmtAmount(c.principal, c.stablecoin)} nominal` : ""}
                        </p>
                        <p className="text-sm text-muted">
                          Teklifin {c ? fmtAmount(o.price, c.stablecoin) : o.price.toString()}
                          {c ? ` · vade ${fmtDate(c.maturity)}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/check/${o.id}`} className="btn-ghost">
                          Detay
                        </Link>
                        <button
                          className="btn-ghost"
                          disabled={isPending}
                          onClick={() => tx(() => writeContractAsync({ ...registry, functionName: "cancelOffer", args: [o.id] }))}
                        >
                          Geri çek
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
