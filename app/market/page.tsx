"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { CHECK_REGISTRY_ABI } from "@/lib/abi";
import { REGISTRY_ADDRESS } from "@/lib/config";
import { useChecks } from "@/lib/useChecks";
import { MarketCard } from "@/components/MarketCard";

const registry = { address: REGISTRY_ADDRESS, abi: CHECK_REGISTRY_ABI } as const;

export default function MarketPage() {
  const { checks, isLoading, refetch } = useChecks();

  const { data: saleFeeBps } = useReadContract({ ...registry, functionName: "saleFeeBps" });

  const active = useMemo(() => checks.filter((c) => !c.settled), [checks]);

  const { data: listingData, refetch: refetchListings } = useReadContracts({
    contracts: active.map((c) => ({ ...registry, functionName: "listings", args: [c.id] }) as const),
    query: { enabled: active.length > 0 },
  });

  const listed = useMemo(() => {
    if (!listingData) return [];
    const out: { check: (typeof active)[number]; price: bigint }[] = [];
    active.forEach((c, i) => {
      const res = listingData[i]?.result as readonly [string, bigint] | undefined;
      if (res && res[1] > 0n) out.push({ check: c, price: res[1] });
    });
    return out;
  }, [listingData, active]);

  const refresh = () => {
    refetch();
    refetchListings();
  };

  return (
    <div className="container-app py-10">
      <p className="eyebrow">Pazaryeri</p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Çek Pazaryeri</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Alacaklılar çeklerini vadeden önce satışa çıkarır; sen iskontolu alıp vadede nominal tutarı
        tahsil edersin. Faktoringe göre çok daha şeffaf ve ucuz.
      </p>

      {isLoading ? (
        <p className="mt-10 text-muted">Yükleniyor…</p>
      ) : listed.length === 0 ? (
        <div className="card mt-8 py-16 text-center text-muted">
          Şu an satışta çek yok. Bir çekin sahibiyseniz detay sayfasından Pazaryeri'ne çıkarabilirsiniz.
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listed.map(({ check, price }) => (
            <MarketCard
              key={check.id.toString()}
              check={check}
              price={price}
              saleFeeBps={BigInt((saleFeeBps as number | undefined) ?? 50)}
              onDone={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
