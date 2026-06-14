import { base, baseSepolia, hardhat } from "wagmi/chains";
import testnetDeploymentRaw from "./deployment.testnet.json";
import localDeploymentRaw from "./deployment.local.json";

type DeploymentFile = {
  registry: string;
  stablecoins: { symbol: string; address: string; decimals: number }[];
  vaults: { label: string; address: string; stablecoin: string; apy?: number }[];
};
const testnetDeployment = testnetDeploymentRaw as DeploymentFile;
const localDeployment = localDeploymentRaw as DeploymentFile;

export const USE_LOCAL = process.env.NEXT_PUBLIC_USE_LOCAL === "true";
export const USE_TESTNET = process.env.NEXT_PUBLIC_USE_TESTNET === "true";

export const ACTIVE_CHAIN = USE_LOCAL ? hardhat : USE_TESTNET ? baseSepolia : base;

/** Active deployment file for the selected network (local node or Base Sepolia). */
const activeDeployment = USE_LOCAL ? localDeployment : testnetDeployment;

/**
 * Deployed CheckRegistry address.
 * Auto-loaded from the deployment JSON (written by `deploy-testnet.ts`);
 * env NEXT_PUBLIC_REGISTRY_ADDRESS overrides it if set.
 */
export const REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ??
  (USE_LOCAL || USE_TESTNET ? activeDeployment.registry : undefined) ??
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

const DEPLOYED_STABLECOINS: Stablecoin[] = activeDeployment.stablecoins.map((s) => ({
  symbol: s.symbol,
  address: s.address as `0x${string}`,
  decimals: s.decimals,
}));

export const STABLECOINS: Stablecoin[] =
  (USE_LOCAL || USE_TESTNET) && DEPLOYED_STABLECOINS.length > 0 ? DEPLOYED_STABLECOINS : MAINNET_STABLECOINS;

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

const DEPLOYED_VAULTS: LendVault[] = activeDeployment.vaults.map((v) => ({
  label: v.label,
  protocol: USE_LOCAL ? "Local" : "Testnet",
  address: v.address as `0x${string}`,
  stablecoin: v.stablecoin,
  apy: v.apy ?? 5,
  risk: "low" as const,
}));

export const LEND_VAULTS: LendVault[] =
  (USE_LOCAL || USE_TESTNET) && DEPLOYED_VAULTS.length > 0 ? DEPLOYED_VAULTS : MAINNET_VAULTS;
