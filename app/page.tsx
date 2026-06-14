"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useChecks } from "@/lib/useChecks";
import { CheckCard } from "@/components/CheckCard";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { checks, isLoading } = useChecks();

  const mine = checks.filter((c) => c.drawer.toLowerCase() === address?.toLowerCase());
  const incoming = checks.filter((c) => c.holder?.toLowerCase() === address?.toLowerCase());

  return (
    <div className="space-y-10">
      <section className="card flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Zincir üstü çek</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Çek miktarı baştan kilitlenir (karşılıksız çıkmaz), vade boyunca lend edilir; getiri
            keşideciye, anapara vadede alacaklıya gider. Çek ERC-721'dir — ciro = transfer.
          </p>
        </div>
        <Link href="/create" className="btn whitespace-nowrap">
          + Çek Oluştur
        </Link>
      </section>

      {!isConnected ? (
        <p className="text-muted">Çeklerinizi görmek için cüzdanınızı bağlayın.</p>
      ) : isLoading ? (
        <p className="text-muted">Yükleniyor…</p>
      ) : (
        <>
          <Section title="Bana gelen çekler (alacaklı)" empty="Size gelen çek yok." items={incoming} role="holder" />
          <Section title="Kestiğim çekler (keşideci)" empty="Henüz çek oluşturmadınız." items={mine} role="drawer" />
        </>
      )}
    </div>
  );
}

function Section({
  title,
  empty,
  items,
  role,
}: {
  title: string;
  empty: string;
  items: ReturnType<typeof useChecks>["checks"];
  role: "drawer" | "holder";
}) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-medium">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <CheckCard key={c.id.toString()} check={c} role={role} />
          ))}
        </div>
      )}
    </section>
  );
}
