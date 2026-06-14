"use client";

import Link from "next/link";
import { useReadContract, useWriteContract } from "wagmi";
import { CHECK_REGISTRY_ABI } from "@/lib/abi";
import { REGISTRY_ADDRESS } from "@/lib/config";
import { CheckData } from "@/lib/useChecks";
import { fmtAmount, fmtDate, isMatured, shortAddr } from "@/lib/format";

export function CheckCard({ check, role }: { check: CheckData; role: "drawer" | "holder" }) {
  const { writeContract, isPending } = useWriteContract();
  const matured = isMatured(check.maturity);

  const { data: yieldAmount } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: CHECK_REGISTRY_ABI,
    functionName: "accruedYield",
    args: [check.id],
    query: { enabled: !check.settled },
  });

  const settle = () =>
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: CHECK_REGISTRY_ABI,
      functionName: "settle",
      args: [check.id],
    });

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-semibold">{fmtAmount(check.principal, check.stablecoin)}</div>
          <div className="text-sm text-muted">Çek #{check.id.toString()}</div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            check.settled
              ? "bg-white/10 text-muted"
              : matured
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-accent/15 text-accent"
          }`}
        >
          {check.settled ? "Ödendi" : matured ? "Vadesi geldi" : "Vade bekleniyor"}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-muted">Vade</dt>
        <dd className="text-right">{fmtDate(check.maturity)}</dd>
        <dt className="text-muted">{role === "drawer" ? "Alacaklı" : "Keşideci"}</dt>
        <dd className="text-right">{shortAddr(role === "drawer" ? check.holder : check.drawer)}</dd>
        {!check.settled && (
          <>
            <dt className="text-muted">Biriken getiri</dt>
            <dd className="text-right text-emerald-400">
              {yieldAmount !== undefined ? fmtAmount(yieldAmount as bigint, check.stablecoin) : "…"}
            </dd>
          </>
        )}
      </dl>

      <div className="mt-4 flex gap-2">
        <Link href={`/check/${check.id}`} className="btn-ghost flex-1">
          Detay
        </Link>
        {!check.settled && matured && (
          <button className="btn flex-1" onClick={settle} disabled={isPending}>
            {isPending ? "İşleniyor…" : "Ödemeyi tamamla"}
          </button>
        )}
      </div>
    </div>
  );
}
