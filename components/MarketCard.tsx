"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CHECK_REGISTRY_ABI } from "@/lib/abi";
import { REGISTRY_ADDRESS } from "@/lib/config";
import { ERC20_ABI } from "@/lib/erc20";
import { CheckData } from "@/lib/useChecks";
import { fmtAmount, fmtDate, shortAddr, stablecoinByAddress } from "@/lib/format";
import { formatUnits } from "viem";

export function MarketCard({
  check,
  price,
  saleFeeBps,
  onDone,
}: {
  check: CheckData;
  price: bigint;
  saleFeeBps: bigint;
  onDone: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [busy, setBusy] = useState(false);

  const fee = (price * saleFeeBps) / 10000n;
  const total = price + fee;
  const dec = stablecoinByAddress(check.stablecoin)?.decimals ?? 18;
  const faceN = Number(formatUnits(check.principal, dec));
  const priceN = Number(formatUnits(price, dec));
  const discount = check.principal > 0n ? (1 - priceN / faceN) * 100 : 0;
  // Buyer's annualized return: buy at price now, collect face at maturity.
  const days = Math.max(1, (Number(check.maturity) - Date.now() / 1000) / 86400);
  const annual = priceN > 0 ? ((faceN - priceN) / priceN) * (365 / days) * 100 : 0;

  const { data: allowance, refetch } = useReadContract({
    address: check.stablecoin,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, REGISTRY_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  const isOwn = check.holder?.toLowerCase() === address?.toLowerCase();
  const needsApproval = (allowance ?? 0n) < total;

  async function buy() {
    setBusy(true);
    try {
      if (needsApproval) {
        await writeContractAsync({
          address: check.stablecoin,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [REGISTRY_ADDRESS, total],
        });
        await refetch();
      }
      await writeContractAsync({
        address: REGISTRY_ADDRESS,
        abi: CHECK_REGISTRY_ABI,
        functionName: "buy",
        args: [check.id],
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card card-hover flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">Çek #{check.id.toString()} · Nominal</p>
          <p className="font-display text-2xl font-bold">{fmtAmount(check.principal, check.stablecoin)}</p>
        </div>
        {discount > 0 && <span className="pill text-positive">%{discount.toFixed(1)} iskonto</span>}
      </div>

      {annual > 0 && (
        <div className="mt-4 flex items-baseline justify-between rounded-2xl border border-line bg-surface px-4 py-3">
          <span className="text-xs text-muted">Yıllık getiri (alıcıya)</span>
          <span className="font-display text-xl font-bold text-tech">~%{annual.toFixed(1)}</span>
        </div>
      )}

      <dl className="mt-5 space-y-2.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Fiyat</dt>
          <dd className="font-semibold">{fmtAmount(price, check.stablecoin)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Vade</dt>
          <dd>{fmtDate(check.maturity)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Satıcı</dt>
          <dd className="font-mono">{shortAddr(check.holder)}</dd>
        </div>
        <div className="flex justify-between text-xs">
          <dt className="text-muted">+ %0.5 alıcı ücreti</dt>
          <dd className="text-muted">{fmtAmount(fee, check.stablecoin)}</dd>
        </div>
      </dl>

      <div className="mt-6 flex gap-2">
        <Link href={`/check/${check.id}`} className="btn-ghost flex-1">
          İncele
        </Link>
        {!isOwn && (
          <button className="btn flex-1" disabled={!isConnected || busy || isPending} onClick={buy}>
            {busy || isPending ? "İşleniyor…" : "Anında Al"}
          </button>
        )}
      </div>
    </div>
  );
}
