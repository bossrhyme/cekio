"use client";

import { LEND_VAULTS } from "@/lib/config";

/** UI #3 — "Paranın nerede lend edileceğini seçme" arayüzü. */
export function VaultSelector({
  stablecoinSymbol,
  value,
  onChange,
}: {
  stablecoinSymbol: string;
  value?: string;
  onChange: (vaultAddress: string) => void;
}) {
  const options = LEND_VAULTS.filter((v) => v.stablecoin === stablecoinSymbol);

  if (options.length === 0) {
    return <p className="text-sm text-muted">Bu stablecoin için onaylı lend platformu yok.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((v) => {
        const selected = value?.toLowerCase() === v.address.toLowerCase();
        return (
          <button
            type="button"
            key={v.address}
            onClick={() => onChange(v.address)}
            className={`text-left rounded-2xl border p-4 transition ${
              selected ? "border-accent bg-accent/10" : "border-line hover:border-accent/40 hover:bg-surface"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{v.label}</span>
              <span className="font-semibold text-accent">%{v.apy} APY</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
              <span>{v.protocol}</span>
              <span>·</span>
              <span className={v.risk === "low" ? "text-positive" : "text-warn"}>
                {v.risk === "low" ? "düşük risk" : "orta risk"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
