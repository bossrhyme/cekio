import { formatUnits } from "viem";
import { STABLECOINS } from "./config";

export function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function stablecoinByAddress(addr?: string) {
  return STABLECOINS.find((s) => s.address.toLowerCase() === addr?.toLowerCase());
}

export function fmtAmount(value: bigint, tokenAddr?: string) {
  const sc = stablecoinByAddress(tokenAddr);
  const decimals = sc?.decimals ?? 18;
  const n = Number(formatUnits(value, decimals));
  return `${n.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${sc?.symbol ?? ""}`.trim();
}

export function fmtDate(ts: bigint | number) {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" });
}

export function isMatured(maturity: bigint | number) {
  return Number(maturity) * 1000 <= Date.now();
}
