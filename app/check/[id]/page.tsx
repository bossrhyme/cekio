"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CHECK_REGISTRY_ABI } from "@/lib/abi";
import { REGISTRY_ADDRESS } from "@/lib/config";
import { fmtAmount, fmtDate, isMatured, shortAddr } from "@/lib/format";

const registry = { address: REGISTRY_ADDRESS, abi: CHECK_REGISTRY_ABI } as const;

export default function CheckDetailPage() {
  const params = useParams<{ id: string }>();
  const id = BigInt(params.id);
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [to, setTo] = useState("");
  const [error, setError] = useState("");

  const { data: check, refetch } = useReadContract({ ...registry, functionName: "getCheck", args: [id] });
  const { data: holder, refetch: refetchHolder } = useReadContract({
    ...registry,
    functionName: "ownerOf",
    args: [id],
    query: { retry: false },
  });
  const { data: yieldAmount } = useReadContract({ ...registry, functionName: "accruedYield", args: [id] });
  const { data: currentValue } = useReadContract({ ...registry, functionName: "currentValue", args: [id] });

  if (!check) return <p className="container-app py-10 text-muted">Yükleniyor…</p>;
  const c = check as any;
  const matured = isMatured(c.maturity);
  const isHolder = holder?.toLowerCase() === address?.toLowerCase();

  async function endorse() {
    setError("");
    if (!/^0x[a-fA-F0-9]{40}$/.test(to)) return setError("Geçerli bir adres girin");
    try {
      await writeContractAsync({
        ...registry,
        functionName: "transferFrom",
        args: [holder as `0x${string}`, to as `0x${string}`, id],
      });
      setTo("");
      await Promise.all([refetch(), refetchHolder()]);
    } catch (e: any) {
      setError(e?.shortMessage ?? "Ciro başarısız");
    }
  }

  async function settle() {
    setError("");
    try {
      await writeContractAsync({ ...registry, functionName: "settle", args: [id] });
      await refetch();
    } catch (e: any) {
      setError(e?.shortMessage ?? "Ödeme başarısız");
    }
  }

  const created = Number(c.createdAt);
  const due = Number(c.maturity);
  const now = Math.floor(Date.now() / 1000);
  const progress = c.settled ? 100 : Math.min(100, Math.max(0, ((now - created) / Math.max(1, due - created)) * 100));

  return (
    <div className="container-app max-w-2xl space-y-6 py-10">
      <Link href="/dashboard" className="text-sm text-muted hover:text-ink">
        ← Panoya dön
      </Link>

      {/* Summary */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted">Çek #{id.toString()} · Tutar</p>
            <p className="mt-1 font-display text-4xl font-bold">{fmtAmount(c.principal, c.stablecoin)}</p>
          </div>
          <span className={`pill ${c.settled ? "text-muted" : matured ? "text-positive" : "text-accent-soft"}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {c.settled ? "Ödendi" : matured ? "Vadesi geldi" : "Vade bekleniyor"}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs text-muted">Güncel değer</p>
            <p className="mt-1 font-display text-lg font-semibold">
              {currentValue !== undefined ? fmtAmount(currentValue as bigint, c.stablecoin) : "…"}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs text-muted">Biriken getiri (keşideciye)</p>
            <p className="mt-1 font-display text-lg font-semibold text-positive">
              {yieldAmount !== undefined ? fmtAmount(yieldAmount as bigint, c.stablecoin) : "…"}
            </p>
          </div>
        </div>

        {!c.settled && (
          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-accent-grad" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">
              Vadeye %{progress.toFixed(0)} — {matured ? "vade doldu" : `son tarih ${fmtDate(c.maturity)}`}
            </p>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="card">
        <h2 className="font-display text-lg font-semibold">Kontrat detayları</h2>
        <dl className="mt-4 divide-y divide-line text-sm">
          <Row label="Vade tarihi" value={fmtDate(c.maturity)} />
          <Row label="Oluşturulma" value={fmtDate(c.createdAt)} />
          <Row label="Keşideci" value={shortAddr(c.drawer)} mono />
          <Row label="Güncel alacaklı (NFT sahibi)" value={c.settled ? "—" : shortAddr(holder)} mono />
          <Row label="Lend vault" value={shortAddr(c.vault)} mono />
        </dl>
      </div>

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      {/* Actions */}
      {!c.settled && (
        <div className="space-y-4">
          {isHolder && (
            <div className="card">
              <h2 className="font-display text-lg font-semibold">Ciro et</h2>
              <p className="mt-1 text-sm text-muted">
                Çeki başka bir cüzdana devret — keşideciye sorulmaz. NFT yeni sahibine geçer.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input className="input" placeholder="0x… yeni alacaklı" value={to} onChange={(e) => setTo(e.target.value)} />
                <button className="btn-ghost whitespace-nowrap" onClick={endorse} disabled={isPending}>
                  Ciro et →
                </button>
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="font-display text-lg font-semibold">Ödeme</h2>
            {/* Transaction preview */}
            <div className="mt-4 space-y-2 rounded-2xl border border-line bg-surface p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Alacaklıya (anapara)</span>
                <span>{fmtAmount(c.principal, c.stablecoin)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Keşideciye (getiri)</span>
                <span className="text-positive">
                  {yieldAmount !== undefined ? fmtAmount(yieldAmount as bigint, c.stablecoin) : "…"}
                </span>
              </div>
            </div>
            {matured ? (
              <button className="btn mt-4 w-full" onClick={settle} disabled={isPending}>
                {isPending ? "İşleniyor…" : "Ödemeyi tamamla"}
              </button>
            ) : (
              <p className="mt-4 text-sm text-muted">
                Vade dolunca ödeme otomatik (Chainlink keeper) ya da bu butonla elle tamamlanabilir.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className={mono ? "font-mono" : ""}>{value}</dd>
    </div>
  );
}
