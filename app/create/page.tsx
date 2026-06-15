"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseUnits } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CHECK_REGISTRY_ABI } from "@/lib/abi";
import { REGISTRY_ADDRESS, STABLECOINS, LEND_VAULTS } from "@/lib/config";
import { VaultSelector } from "@/components/VaultSelector";

const ERC20_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

const registryRead = { address: REGISTRY_ADDRESS, abi: CHECK_REGISTRY_ABI } as const;

export default function CreatePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const [payee, setPayee] = useState("");
  const [symbol, setSymbol] = useState(STABLECOINS[0].symbol);
  const [amount, setAmount] = useState("");
  const [maturity, setMaturity] = useState("");
  const [vault, setVault] = useState("");
  const [error, setError] = useState("");

  const stablecoin = useMemo(() => STABLECOINS.find((s) => s.symbol === symbol)!, [symbol]);
  const amountWei = useMemo(() => {
    try {
      return amount ? parseUnits(amount, stablecoin.decimals) : 0n;
    } catch {
      return 0n;
    }
  }, [amount, stablecoin]);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: stablecoin.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, REGISTRY_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  // Approve principal + up to 1% (covers the on-chain creation fee, capped at 1%).
  const approveAmount = amountWei + amountWei / 100n;
  const needsApproval = (allowance ?? 0n) < approveAmount;
  const maturityTs = maturity ? Math.floor(new Date(maturity).getTime() / 1000) : 0;

  // On-chain fee rates (uint16 → number); fall back to the planned schedule.
  const { data: perfFeeBps } = useReadContract({ ...registryRead, functionName: "perfFeeBps" });
  const { data: createFeeBps } = useReadContract({ ...registryRead, functionName: "createFeeBps" });

  // Cost & maturity-return estimate.
  const summary = useMemo(() => {
    const principalN = Number(amount || "0");
    const days = maturityTs > 0 ? Math.max(0, (maturityTs - Date.now() / 1000) / 86400) : 0;
    const apy = LEND_VAULTS.find((v) => v.address.toLowerCase() === vault.toLowerCase())?.apy ?? 0;
    const createBps = Number(createFeeBps ?? 10);
    const perfBps = Number(perfFeeBps ?? 1000);
    const createFee = (principalN * createBps) / 10000;
    const grossYield = (principalN * (apy / 100) * days) / 365;
    const perfFee = (grossYield * perfBps) / 10000;
    return {
      costReady: principalN > 0,
      yieldReady: principalN > 0 && days > 0 && /^0x[a-fA-F0-9]{40}$/.test(vault),
      principalN,
      days: Math.ceil(days),
      apy,
      createBps,
      perfBps,
      createFee,
      totalNow: principalN + createFee,
      grossYield,
      perfFee,
      netYield: grossYield - perfFee,
    };
  }, [amount, maturityTs, vault, createFeeBps, perfFeeBps]);

  const fmt = (n: number) =>
    `${n.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${stablecoin.symbol}`;

  const valid =
    isConnected &&
    /^0x[a-fA-F0-9]{40}$/.test(payee) &&
    amountWei > 0n &&
    maturityTs > Math.floor(Date.now() / 1000) &&
    /^0x[a-fA-F0-9]{40}$/.test(vault);

  async function handleApprove() {
    setError("");
    try {
      await writeContractAsync({
        address: stablecoin.address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [REGISTRY_ADDRESS, approveAmount],
      });
      await refetchAllowance();
    } catch (e: any) {
      setError(e?.shortMessage ?? "Onay başarısız");
    }
  }

  async function handleCreate() {
    setError("");
    try {
      await writeContractAsync({
        address: REGISTRY_ADDRESS,
        abi: CHECK_REGISTRY_ABI,
        functionName: "createCheck",
        args: [payee as `0x${string}`, stablecoin.address, vault as `0x${string}`, amountWei, BigInt(maturityTs)],
      });
      router.push("/");
    } catch (e: any) {
      setError(e?.shortMessage ?? "Çek oluşturulamadı");
    }
  }

  return (
    <div className="container-app max-w-2xl py-10">
      <p className="eyebrow">Yeni çek</p>
      <h1 className="mb-1 mt-2 font-display text-3xl font-bold">Çek Oluştur</h1>
      <p className="mb-6 text-sm text-muted">
        Tutarı kilitle, vadeyi ve lend platformunu seç. Çek alacaklıya NFT olarak basılır.
      </p>

      <div className="card space-y-5">
        {/* UI #2 — alıcı bilgileri */}
        <div>
          <label className="label">Alacaklı cüzdan adresi</label>
          <input className="input" placeholder="0x…" value={payee} onChange={(e) => setPayee(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Para birimi</label>
            <select
              className="input"
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value);
                setVault("");
              }}
            >
              {STABLECOINS.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Miktar</label>
            <input
              className="input"
              type="number"
              min="0"
              placeholder="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label">Vade tarihi</label>
          <input className="input" type="date" value={maturity} onChange={(e) => setMaturity(e.target.value)} />
        </div>

        {/* UI #3 — lend yeri seçimi */}
        <div>
          <label className="label">Para nerede lend edilsin? (getiri size gider)</label>
          <VaultSelector stablecoinSymbol={symbol} value={vault} onChange={setVault} />
        </div>

        {/* Maliyet & vade sonu özeti */}
        {summary.costReady && (
          <div className="panel-soft p-4">
            <p className="mb-3 text-sm font-semibold">
              Özet{summary.yieldReady ? ` (${summary.days} gün vade)` : ""}
            </p>
            <dl className="space-y-2 text-sm">
              <Line k="Çek tutarı (anapara)" v={fmt(summary.principalN)} />
              <Line k={`Oluşturma ücreti (%${(summary.createBps / 100).toFixed(2)})`} v={`+ ${fmt(summary.createFee)}`} muted />
              <div className="my-2 border-t border-line" />
              <Line k="Şimdi ödenecek toplam" v={fmt(summary.totalNow)} strong />
              {summary.yieldReady ? (
                <>
                  <div className="my-2 border-t border-line" />
                  <Line k={`Tahmini getiri (~%${summary.apy} yıllık)`} v={`+ ${fmt(summary.grossYield)}`} tech />
                  <Line k={`Protokol payı (%${(summary.perfBps / 100).toFixed(0)} getiriden)`} v={`− ${fmt(summary.perfFee)}`} muted />
                  <Line k="Vade sonunda sana dönen getiri" v={fmt(summary.netYield)} positive />
                  <Line k="Vade sonunda alacaklıya ödenecek" v={fmt(summary.principalN)} />
                </>
              ) : (
                <p className="pt-1 text-xs text-muted">
                  Vade tarihi ve lend platformu seçince tahmini getiri burada görünür.
                </p>
              )}
            </dl>
            {summary.yieldReady && (
              <p className="mt-3 text-xs text-muted">
                Getiri tahminîdir; gerçek oran lend platformunun değişken APY'sine göre belirlenir. Anapara her
                zaman tam ödenir.
              </p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-3 pt-2">
          {needsApproval ? (
            <button className="btn flex-1" disabled={!valid || isPending} onClick={handleApprove}>
              {isPending ? "İşleniyor…" : `${symbol} onayla`}
            </button>
          ) : (
            <button className="btn flex-1" disabled={!valid || isPending} onClick={handleCreate}>
              {isPending ? "İşleniyor…" : "Çeki oluştur ve fonla"}
            </button>
          )}
        </div>
        {!isConnected && <p className="text-sm text-muted">Devam etmek için cüzdanınızı bağlayın.</p>}
        {/* summary helper rendered above */}

        <p className="border-t border-line pt-3 text-xs text-muted">
          Ücretler: oluşturmada <span className="text-ink">%0.1</span>, getiriden{" "}
          <span className="text-ink">%10</span> protokol payı. Anaparaya hiç dokunulmaz — alacaklı her zaman
          tam tutarı alır.
        </p>
      </div>
    </div>
  );
}

function Line({
  k,
  v,
  strong,
  muted,
  tech,
  positive,
}: {
  k: string;
  v: string;
  strong?: boolean;
  muted?: boolean;
  tech?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-muted" : "text-ink/80"}>{k}</dt>
      <dd
        className={
          (strong ? "font-display text-lg font-bold " : "") +
          (positive ? "text-positive" : tech ? "text-tech" : muted ? "text-muted" : "text-ink")
        }
      >
        {v}
      </dd>
    </div>
  );
}
