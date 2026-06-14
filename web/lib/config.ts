import { base, baseSepolia } from "wagmi/chains";
import testnetDeploymentRaw from "./deployment.testnet.json";

type DeploymentFile = {
  registry: string;
  stablecoins: { symbol: string; address: string; decimals: number }[];
  vaults: { label: string; address: string; stablecoin: string; apy?: number }[];
};
const testnetDeployment = testnetDeploymentRaw as DeploymentFile;

export const USE_TESTNET = process.env.NEXT_PUBLIC_USE_TESTNET === "true";
export const ACTIVE_CHAIN = USE_TESTNET ? baseSepolia : base;

/**
 * Deployed CheckRegistry address.
 * On testnet it is auto-loaded from deployment.testnet.json (written by `deploy-testnet.ts`);
 * env NEXT_PUBLIC_REGISTRY_ADDRESS overrides it if set.
 */
export const REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ??
  (USE_TESTNET ? testnetDeployment.registry : undefined) ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export type Stablecoin = {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
};

/** Supported stablecoins (Base mainnet). Verify addresses before production use. */
const MAINNET_STABLECOINS: Stablecoin[] = [
  { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
  { symbol: "USDbC", address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", decimals: 6 },
  { symbol: "DAI", address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", decimals: 18 },
];

const TESTNET_STABLECOINS: Stablecoin[] = testnetDeployment.stablecoins.map((s) => ({
  symbol: s.symbol,
  address: s.address as `0x${string}`,
  decimals: s.decimals,
}));

export const STABLECOINS: Stablecoin[] =
  USE_TESTNET && TESTNET_STABLECOINS.length > 0 ? TESTNET_STABLECOINS : MAINNET_STABLECOINS;

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
 * CheckRegistry.setVault. Mainnet addresses are placeholders — replace with verified Base vaults.
 */
const MAINNET_VAULTS: LendVault[] = [
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

const TESTNET_VAULTS: LendVault[] = testnetDeployment.vaults.map((v: any) => ({
  label: v.label,
  protocol: "Testnet",
  address: v.address as `0x${string}`,
  stablecoin: v.stablecoin,
  apy: v.apy ?? 5,
  risk: "low" as const,
}));

export const LEND_VAULTS: LendVault[] =
  USE_TESTNET && TESTNET_VAULTS.length > 0 ? TESTNET_VAULTS : MAINNET_VAULTS;
