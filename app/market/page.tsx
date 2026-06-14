"use client";

import { useMemo, useState } from "react";
import { formatUnits } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import { CHECK_REGISTRY_ABI } from "@/lib/abi";
import { REGISTRY_ADDRESS, STABLECOINS } from "@/lib/config";
import { useChecks } from "@/lib/useChecks";
import { MarketCard } from "@/components/MarketCard";
import { stablecoinByAddress } from "@/lib/format";

type SortKey = "yield" | "discount" | "maturity";

const registry = { address: REGISTRY_ADDRESS, abi: CHECK_REGISTRY_ABI } as const;

export default function MarketPage() {
  const { checks, isLoading, refetch } = useChecks();

  const { data: saleFeeBps } = useReadContract({ ...registry, functionName: "saleFeeBps" });

  const active = useMemo(() => checks.filter((c) => !c.settled), [checks]);

  const { data: listingData, refetch: refetchListings } = useReadContracts({
    contracts: active.map((c) => ({ ...registry, functionName: "listings", args: [c.id] }) as const),
    query: { enabled: active.length > 0 },
  });

  const [sortBy, setSortBy] = useState<SortKey>("yield");
  const [coin, setCoin] = useState<string>("all");

  const listed = useMemo(() => {
    if (!listingData) return [];
    const out: { check: (typeof active)[number]; price: bigint; annual: number; discount: number }[] = [];
    active.forEach((c, i) => {
      const res = listingData[i]?.result as readonly [string, bigint] | undefined;
      if (!res || res[1] === 0n) return;
      const price = res[1];
      const dec = stablecoinByAddress(c.stablecoin)?.decimals ?? 18;
      const faceN = Number(formatUnits(c.principal, dec));
      const priceN = Number(formatUnits(price, dec));
      const days = Math.max(1, (Number(c.maturity) - Date.now() / 1000) / 86400);
      const annual = priceN > 0 ? ((faceN - priceN) / priceN) * (365 / days) * 100 : 0;
      const discount = faceN > 0 ? (1 - priceN / faceN) * 100 : 0;
      out.push({ check: c, price, annual, discount });
    });
    const filtered = coin === "all" ? out : out.filter((x) => stablecoinByAddress(x.check.stablecoin)?.symbol === coin);
    filtered.sort((a, b) => {
      if (sortBy === "yield") return b.annual - a.annual;
      if (sortBy === "discount") return b.discount - a.discount;
      return Number(a.check.maturity) - Number(b.check.maturity); // soonest maturity first
    });
    return filtered;
  }, [listingData, active, sortBy, coin]);

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

      {/* Filters / sort */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Sırala:</span>
          {(
            [
              ["yield", "Yıllık getiri"],
              ["discount", "İskonto"],
              ["maturity", "Vade (yakın)"],
            ] as [SortKey, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setSortBy(k)}
              className={`rounded-full px-3 py-1 transition ${sortBy === k ? "bg-accent-grad text-white" : "border border-line bg-card hover:bg-surface"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <select className="input ml-auto w-auto" value={coin} onChange={(e) => setCoin(e.target.value)}>
          <option value="all">Tüm para birimleri</option>
          {STABLECOINS.map((s) => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol}
            </option>
          ))}
        </select>
      </div>

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
