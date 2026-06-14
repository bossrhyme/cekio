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

  const status = check.settled
    ? { label: "Ödendi", cls: "text-muted" }
    : matured
      ? { label: "Vadesi geldi", cls: "text-positive" }
      : { label: "Vade bekleniyor", cls: "text-accent-soft" };

  return (
    <div className="card card-hover flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-display text-2xl font-bold">{fmtAmount(check.principal, check.stablecoin)}</div>
          <div className="text-sm text-muted">Çek #{check.id.toString()}</div>
        </div>
        <span className={`pill ${status.cls}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {status.label}
        </span>
      </div>

      <dl className="mt-5 space-y-2.5 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted">Vade</dt>
          <dd>{fmtDate(check.maturity)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted">{role === "drawer" ? "Alacaklı" : "Keşideci"}</dt>
          <dd className="font-mono">{shortAddr(role === "drawer" ? check.holder : check.drawer)}</dd>
        </div>
        {!check.settled && (
          <div className="flex items-center justify-between">
            <dt className="text-muted">Biriken getiri</dt>
            <dd className="text-positive">
              {yieldAmount !== undefined ? fmtAmount(yieldAmount as bigint, check.stablecoin) : "…"}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-6 flex gap-2">
        <Link href={`/check/${check.id}`} className="btn-ghost flex-1">
          Detay
        </Link>
        {!check.settled && matured && (
          <button className="btn flex-1" onClick={settle} disabled={isPending}>
            {isPending ? "İşleniyor…" : "Tahsil et"}
          </button>
        )}
      </div>
    </div>
  );
}
