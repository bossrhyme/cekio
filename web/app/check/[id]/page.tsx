"use client";

import { useState } from "react";
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

  if (!check) return <p className="text-muted">Yükleniyor…</p>;
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Çek #{id.toString()}</h1>
          <span
            className={`rounded-full px-3 py-1 text-xs ${
              c.settled ? "bg-white/10 text-muted" : matured ? "bg-emerald-500/15 text-emerald-400" : "bg-accent/15 text-accent"
            }`}
          >
            {c.settled ? "Ödendi" : matured ? "Vadesi geldi" : "Vade bekleniyor"}
          </span>
        </div>

        {/* UI #2 — kontrat özellikleri + alıcı bilgileri */}
        <dl className="mt-5 grid grid-cols-2 gap-y-3 text-sm">
          <Row label="Tutar (anapara)" value={fmtAmount(c.principal, c.stablecoin)} />
          <Row label="Güncel değer" value={currentValue !== undefined ? fmtAmount(currentValue as bigint, c.stablecoin) : "…"} />
          <Row label="Biriken getiri (keşideciye)" value={yieldAmount !== undefined ? fmtAmount(yieldAmount as bigint, c.stablecoin) : "…"} />
          <Row label="Vade tarihi" value={fmtDate(c.maturity)} />
          <Row label="Oluşturulma" value={fmtDate(c.createdAt)} />
          <Row label="Keşideci" value={shortAddr(c.drawer)} />
          <Row label="Güncel alacaklı (NFT sahibi)" value={c.settled ? "—" : shortAddr(holder)} />
          <Row label="Lend vault" value={shortAddr(c.vault)} />
        </dl>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!c.settled && (
        <div className="card space-y-4">
          {isHolder && (
            <div>
              <label className="label">Ciro et (başka bir cüzdana devret — keşideciye sorulmaz)</label>
              <div className="flex gap-2">
                <input className="input" placeholder="0x…" value={to} onChange={(e) => setTo(e.target.value)} />
                <button className="btn-ghost whitespace-nowrap" onClick={endorse} disabled={isPending}>
                  Ciro et
                </button>
              </div>
            </div>
          )}
          {matured && (
            <button className="btn w-full" onClick={settle} disabled={isPending}>
              {isPending ? "İşleniyor…" : "Ödemeyi tamamla (anapara alacaklıya, getiri keşideciye)"}
            </button>
          )}
          {!matured && <p className="text-sm text-muted">Vade dolunca ödeme otomatik (keeper) ya da elle tamamlanabilir.</p>}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{value}</dd>
    </>
  );
}
