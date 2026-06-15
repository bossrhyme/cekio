"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CHECK_REGISTRY_ABI } from "@/lib/abi";
import { REGISTRY_ADDRESS, STABLECOINS, LEND_VAULTS } from "@/lib/config";
import { fmtAmount, fmtDate, isMatured, shortAddr } from "@/lib/format";
import { MarketActions } from "@/components/MarketActions";
import type { CheckData } from "@/lib/useChecks";

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
  const { data: adapterEmergency } = useReadContract({
    ...registry,
    functionName: "adapterEmergency",
    args: [(check as any)?.adapter ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!check },
  });
  const { data: rescued, refetch: refetchRescued } = useReadContract({ ...registry, functionName: "rescued", args: [id] });
  const { data: migration, refetch: refetchMigration } = useReadContract({ ...registry, functionName: "migrations", args: [id] });
  const { data: registryOwner } = useReadContract({ ...registry, functionName: "owner" });

  const [migrationTarget, setMigrationTarget] = useState("");

  if (!check) return <p className="container-app py-10 text-muted">Yükleniyor…</p>;
  const c = check as any;
  const matured = isMatured(c.maturity);
  const isHolder = holder?.toLowerCase() === address?.toLowerCase();
  const isDrawer = c.drawer?.toLowerCase() === address?.toLowerCase();
  const isGuardian = (registryOwner as string)?.toLowerCase() === address?.toLowerCase();

  // migrations() returns [target, drawerOk, holderOk]
  const mg = migration as readonly [string, boolean, boolean] | undefined;
  const mTarget = mg?.[0] ?? "0x0000000000000000000000000000000000000000";
  const mDrawerOk = mg?.[1] ?? false;
  const mHolderOk = mg?.[2] ?? false;
  const hasMigration = mTarget !== "0x0000000000000000000000000000000000000000";

  // Vaults eligible as a migration target: same stablecoin, not the (flagged) current adapter.
  const sym = STABLECOINS.find((s) => s.address.toLowerCase() === c.stablecoin?.toLowerCase())?.symbol;
  const targetVaults = LEND_VAULTS.filter(
    (v) => v.stablecoin === sym && v.address.toLowerCase() !== c.adapter?.toLowerCase(),
  );

  async function emergencyExit() {
    setError("");
    try {
      await writeContractAsync({ ...registry, functionName: "emergencyExit", args: [id] });
      await refetch();
    } catch (e: any) {
      setError(e?.shortMessage ?? "Acil çıkış başarısız");
    }
  }

  async function requestMigration() {
    setError("");
    if (!/^0x[a-fA-F0-9]{40}$/.test(migrationTarget)) return setError("Bir hedef vault seçin");
    try {
      await writeContractAsync({ ...registry, functionName: "requestMigration", args: [id, migrationTarget as `0x${string}`] });
      await refetchMigration();
    } catch (e: any) {
      setError(e?.shortMessage ?? "Geçiş talebi başarısız");
    }
  }

  async function approveMigration() {
    setError("");
    try {
      await writeContractAsync({ ...registry, functionName: "approveMigration", args: [id] });
      await Promise.all([refetch(), refetchRescued(), refetchMigration()]);
    } catch (e: any) {
      setError(e?.shortMessage ?? "Onay başarısız");
    }
  }

  async function cancelMigration() {
    setError("");
    try {
      await writeContractAsync({ ...registry, functionName: "cancelMigration", args: [id] });
      await refetchMigration();
    } catch (e: any) {
      setError(e?.shortMessage ?? "İptal başarısız");
    }
  }

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

      {/* Emergency: vault flagged as expired */}
      {!c.settled && adapterEmergency ? (
        <div className="card border-warn/50 bg-warn/5">
          <h2 className="font-display text-lg font-semibold text-warn">Lend platformu donduruldu</h2>
          <p className="mt-1 text-sm text-ink/70">
            Bu çekin lend platformu acil durum olarak işaretlendi. Anapara güvene çekilebilir; vade gününde
            normal şekilde ödenir.
          </p>
          {rescued ? (
            <p className="mt-3 text-sm font-medium text-positive">Anapara güvene alındı — vadede ödenecek.</p>
          ) : (
            (isHolder || isDrawer) && (
              <button className="btn mt-4" onClick={emergencyExit} disabled={isPending}>
                {isPending ? "İşleniyor…" : "Acil çıkış (anaparayı güvene al)"}
              </button>
            )
          )}
        </div>
      ) : null}

      {/* Migration: redeploy rescued principal into a new vault (two-sided consent + guardian) */}
      {!c.settled && rescued ? (
        <div className="card">
          <h2 className="font-display text-lg font-semibold">Yeni vault'a taşı</h2>
          <p className="mt-1 text-sm text-muted">
            Güvene alınan anapara, yeniden getiri kazanması için başka bir lend platformuna taşınabilir.
            Geçiş için <span className="text-ink">hem keşideci hem alacaklı</span> aynı hedefi onaylamalı,
            ardından guardian işlemi gerçekleştirir.
          </p>

          {/* Consent state */}
          {hasMigration && (
            <div className="mt-4 rounded-2xl border border-line bg-surface p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Hedef vault</span>
                <span className="font-mono">
                  {LEND_VAULTS.find((v) => v.address.toLowerCase() === mTarget.toLowerCase())?.label ??
                    shortAddr(mTarget)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted">Keşideci onayı</span>
                <span className={mDrawerOk ? "text-positive" : "text-muted"}>{mDrawerOk ? "✓ verildi" : "bekleniyor"}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted">Alacaklı onayı</span>
                <span className={mHolderOk ? "text-positive" : "text-muted"}>{mHolderOk ? "✓ verildi" : "bekleniyor"}</span>
              </div>
            </div>
          )}

          {/* Party action: pick target + consent */}
          {(isHolder || isDrawer) && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <select
                className="input"
                value={migrationTarget || mTarget}
                onChange={(e) => setMigrationTarget(e.target.value)}
              >
                <option value="">Hedef vault seç…</option>
                {targetVaults.map((v) => (
                  <option key={v.address} value={v.address}>
                    {v.label} (~%{v.apy})
                  </option>
                ))}
              </select>
              <button className="btn-ghost whitespace-nowrap" onClick={requestMigration} disabled={isPending}>
                {(isDrawer && mDrawerOk) || (isHolder && mHolderOk) ? "Onayı güncelle" : "Geçişi onayla"}
              </button>
            </div>
          )}

          {/* Guardian action */}
          {isGuardian && hasMigration && (
            <button className="btn mt-3 w-full" onClick={approveMigration} disabled={isPending || !mDrawerOk || !mHolderOk}>
              {mDrawerOk && mHolderOk ? "Guardian: onayla ve taşı" : "İki taraf da onaylamadı"}
            </button>
          )}

          {hasMigration && (isHolder || isDrawer || isGuardian) && (
            <button className="mt-2 text-xs text-muted hover:text-ink" onClick={cancelMigration} disabled={isPending}>
              Geçiş talebini iptal et
            </button>
          )}

          {targetVaults.length === 0 && (
            <p className="mt-3 text-xs text-muted">
              Bu para birimi için uygun başka vault yok. Anapara vadede güvenle ödenecek.
            </p>
          )}
        </div>
      ) : null}

      {/* Actions */}
      {!c.settled && (
        <div className="space-y-4">
          <MarketActions
            check={{ id, stablecoin: c.stablecoin, principal: c.principal, holder } as unknown as CheckData}
            isHolder={isHolder}
            refresh={() => {
              refetch();
              refetchHolder();
            }}
          />
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
