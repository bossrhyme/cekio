"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { useChecks } from "@/lib/useChecks";
import { CheckCard } from "@/components/CheckCard";
import { ProfileTabs } from "@/components/ProfileTabs";
import { stablecoinByAddress } from "@/lib/format";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { checks, isLoading } = useChecks();

  const mine = checks.filter((c) => c.drawer.toLowerCase() === address?.toLowerCase());
  const incoming = checks.filter((c) => c.holder?.toLowerCase() === address?.toLowerCase());

  // Aggregate quick stats (normalised to human units across stablecoins).
  const stats = useMemo(() => {
    const sum = (arr: typeof checks, sel: (c: (typeof checks)[number]) => bigint) =>
      arr.reduce((acc, c) => {
        const dec = stablecoinByAddress(c.stablecoin)?.decimals ?? 18;
        return acc + Number(formatUnits(sel(c), dec));
      }, 0);
    const active = mine.filter((c) => !c.settled);
    return {
      locked: sum(active, (c) => c.principal),
      activeCount: active.length,
      incomingCount: incoming.filter((c) => !c.settled).length,
    };
  }, [mine, incoming, checks]);

  return (
    <div className="container-app py-10">
      <ProfileTabs />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Pano</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Çeklerim</h1>
          <p className="mt-1 text-muted">Kestiğin ve sana gelen çekleri yönet, getiriyi ve vadeyi takip et.</p>
        </div>
        <Link href="/create" className="btn w-fit">
          + Çek Oluştur
        </Link>
      </div>

      {!isConnected ? (
        <div className="card mt-8 flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-lg font-medium">Cüzdanını bağla</p>
          <p className="max-w-sm text-sm text-muted">
            Çeklerini görüntülemek, oluşturmak ve ödemeleri yönetmek için cüzdanını bağlaman gerekir.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <StatCard label="Kilitli anapara (aktif)" value={fmt(stats.locked)} accent />
            <StatCard label="Aktif kestiğim çek" value={String(stats.activeCount)} />
            <StatCard label="Bekleyen gelen çek" value={String(stats.incomingCount)} />
          </div>

          {isLoading ? (
            <p className="mt-10 text-muted">Yükleniyor…</p>
          ) : (
            <>
              <Section
                title="Bana gelen çekler"
                subtitle="Alacaklı olduğun çekler — vadede tahsil et veya ciro et."
                empty="Sana gelen çek yok."
                items={incoming}
                role="holder"
              />
              <Section
                title="Kestiğim çekler"
                subtitle="Keşideci olduğun çekler — biriken getiri sana ait."
                empty="Henüz çek oluşturmadın."
                items={mine}
                role="drawer"
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card card-hover">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 font-display text-3xl font-bold ${accent ? "gradient-text" : ""}`}>{value}</p>
    </div>
  );
}

function Section({
  title,
  subtitle,
  empty,
  items,
  role,
}: {
  title: string;
  subtitle: string;
  empty: string;
  items: ReturnType<typeof useChecks>["checks"];
  role: "drawer" | "holder";
}) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
      {items.length === 0 ? (
        <div className="card mt-4 py-10 text-center text-sm text-muted">{empty}</div>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <CheckCard key={c.id.toString()} check={c} role={role} />
          ))}
        </div>
      )}
    </section>
  );
}
