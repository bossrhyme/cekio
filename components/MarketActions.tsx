"use client";

import { useEffect, useState } from "react";
import { parseAbiItem } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { CHECK_REGISTRY_ABI } from "@/lib/abi";
import { REGISTRY_ADDRESS } from "@/lib/config";
import { ERC20_ABI } from "@/lib/erc20";
import { CheckData } from "@/lib/useChecks";
import { fmtAmount, shortAddr, stablecoinByAddress } from "@/lib/format";
import { parseUnits } from "viem";

const registry = { address: REGISTRY_ADDRESS, abi: CHECK_REGISTRY_ABI } as const;

type OfferRow = { bidder: `0x${string}`; price: bigint; escrow: bigint };

export function MarketActions({ check, isHolder, refresh }: { check: CheckData; isHolder: boolean; refresh: () => void }) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const dec = stablecoinByAddress(check.stablecoin)?.decimals ?? 18;

  const [listPrice, setListPrice] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [busy, setBusy] = useState(false);

  const { data: listing, refetch: refetchListing } = useReadContract({
    ...registry,
    functionName: "listings",
    args: [check.id],
  });
  const { data: saleFeeBps } = useReadContract({ ...registry, functionName: "saleFeeBps" });
  const listed = (listing as readonly [string, bigint] | undefined)?.[1] ?? 0n;
  const feeBps = BigInt((saleFeeBps as number | undefined) ?? 50);

  // Load offers from on-chain logs.
  async function loadOffers() {
    if (!publicClient) return;
    try {
      const logs = await publicClient.getLogs({
        address: REGISTRY_ADDRESS,
        event: parseAbiItem("event OfferMade(uint256 indexed checkId, address indexed bidder, uint256 price)"),
        args: { checkId: check.id },
        fromBlock: 0n,
      });
      const bidders = [...new Set(logs.map((l) => l.args.bidder as `0x${string}`))];
      const rows: OfferRow[] = [];
      for (const b of bidders) {
        const o = (await publicClient.readContract({
          ...registry,
          functionName: "offers",
          args: [check.id, b],
        })) as readonly [bigint, bigint];
        if (o[1] > 0n) rows.push({ bidder: b, price: o[0], escrow: o[1] });
      }
      setOffers(rows);
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    loadOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [check.id, publicClient]);

  const after = () => {
    refresh();
    refetchListing();
    loadOffers();
  };

  async function approveIfNeeded(total: bigint) {
    const allowance = (await publicClient!.readContract({
      address: check.stablecoin,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [address!, REGISTRY_ADDRESS],
    })) as bigint;
    if (allowance < total) {
      await writeContractAsync({
        address: check.stablecoin,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [REGISTRY_ADDRESS, total],
      });
    }
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      after();
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || isPending || !isConnected;

  // ---- Holder view ----
  if (isHolder) {
    return (
      <div className="card space-y-4">
        <h2 className="font-display text-lg font-semibold">Pazaryeri</h2>
        {listed > 0n ? (
          <div className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3">
            <span className="text-sm">
              Satışta: <span className="font-semibold">{fmtAmount(listed, check.stablecoin)}</span>
            </span>
            <button
              className="btn-ghost"
              disabled={disabled}
              onClick={() => run(async () => void (await writeContractAsync({ ...registry, functionName: "cancelListing", args: [check.id] })))}
            >
              İlanı kaldır
            </button>
          </div>
        ) : (
          <div>
            <label className="label">Satış fiyatı ({stablecoinByAddress(check.stablecoin)?.symbol})</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input className="input" type="number" placeholder="Örn. nominalden biraz düşük" value={listPrice} onChange={(e) => setListPrice(e.target.value)} />
              <button
                className="btn whitespace-nowrap"
                disabled={disabled || !listPrice}
                onClick={() =>
                  run(async () =>
                    void (await writeContractAsync({ ...registry, functionName: "listForSale", args: [check.id, parseUnits(listPrice, dec)] })),
                  )
                }
              >
                Pazaryerine çıkar
              </button>
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-ink/80">Gelen teklifler</p>
          {offers.length === 0 ? (
            <p className="text-sm text-muted">Henüz teklif yok.</p>
          ) : (
            <ul className="space-y-2">
              {offers.map((o) => (
                <li key={o.bidder} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-2.5 text-sm">
                  <span>
                    <span className="font-semibold">{fmtAmount(o.price, check.stablecoin)}</span>{" "}
                    <span className="text-muted">· {shortAddr(o.bidder)}</span>
                  </span>
                  <button
                    className="btn"
                    disabled={disabled}
                    onClick={() => run(async () => void (await writeContractAsync({ ...registry, functionName: "acceptOffer", args: [check.id, o.bidder] })))}
                  >
                    Kabul et
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // ---- Non-holder view ----
  return (
    <div className="card space-y-4">
      <h2 className="font-display text-lg font-semibold">Pazaryeri</h2>
      {listed > 0n && (
        <div className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3">
          <span className="text-sm">
            Liste fiyatı: <span className="font-semibold">{fmtAmount(listed, check.stablecoin)}</span>
            <span className="text-muted"> + %{(Number(feeBps) / 100).toFixed(1)} ücret</span>
          </span>
          <button
            className="btn"
            disabled={disabled}
            onClick={() =>
              run(async () => {
                const fee = (listed * feeBps) / 10000n;
                await approveIfNeeded(listed + fee);
                await writeContractAsync({ ...registry, functionName: "buy", args: [check.id] });
              })
            }
          >
            Anında Al
          </button>
        </div>
      )}

      <div>
        <label className="label">Teklif ver ({stablecoinByAddress(check.stablecoin)?.symbol})</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="input" type="number" placeholder="Teklif tutarı" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} />
          <button
            className="btn-ghost whitespace-nowrap"
            disabled={disabled || !offerPrice}
            onClick={() =>
              run(async () => {
                const price = parseUnits(offerPrice, dec);
                const fee = (price * feeBps) / 10000n;
                await approveIfNeeded(price + fee);
                await writeContractAsync({ ...registry, functionName: "makeOffer", args: [check.id, price] });
                setOfferPrice("");
              })
            }
          >
            Teklif ver
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">Teklif tutarı + %{(Number(feeBps) / 100).toFixed(1)} ücret cüzdanından emanete alınır; istediğin an geri çekebilirsin.</p>
      </div>
    </div>
  );
}
