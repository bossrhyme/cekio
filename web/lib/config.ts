import { base, baseSepolia } from "wagmi/chains";

/** Deployed CheckRegistry address (set NEXT_PUBLIC_REGISTRY_ADDRESS after deploy). */
export const REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const ACTIVE_CHAIN = process.env.NEXT_PUBLIC_USE_TESTNET === "true" ? baseSepolia : base;

export type Stablecoin = {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
};

/** Supported stablecoins (Base mainnet). Verify addresses before production use. */
export const STABLECOINS: Stablecoin[] = [
  { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
  { symbol: "USDbC", address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", decimals: 6 },
  { symbol: "DAI", address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", decimals: 18 },
];

export type LendVault = {
  label: string;
  protocol: string;
  address: `0x${string}`;
  stablecoin: string; // symbol
  /** Indicative APY shown in UI; live APY should be fetched from the protocol/DefiLlama. */
  apy: number;
  risk: "low" | "medium";
};

/**
 * Whitelisted ERC-4626 yield vaults (low-risk only). These must also be whitelisted on-chain via
 * CheckRegistry.setVault. Addresses are placeholders — replace with verified Base vaults.
 */
export const LEND_VAULTS: LendVault[] = [
  {
    label: "Aave v3 USDC",
    protocol: "Aave",
    address: "0x0000000000000000000000000000000000000001",
    stablecoin: "USDC",
    apy: 5.2,
    risk: "low",
  },
  {
    label: "Morpho Steakhouse USDC",
    protocol: "Morpho",
    address: "0x0000000000000000000000000000000000000002",
    stablecoin: "USDC",
    apy: 6.8,
    risk: "medium",
  },
  {
    label: "Sky sUSDS",
    protocol: "Sky",
    address: "0x0000000000000000000000000000000000000003",
    stablecoin: "DAI",
    apy: 4.5,
    risk: "low",
  },
];
