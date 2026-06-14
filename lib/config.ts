import { mainnet, baseSepolia, hardhat } from "wagmi/chains";
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

// Production runs on Ethereum mainnet, where Brix iTRY / wiTRY live.
export const ACTIVE_CHAIN = USE_LOCAL ? hardhat : USE_TESTNET ? baseSepolia : mainnet;

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

/**
 * Supported stablecoins. iTRY (Brix on-chain Turkish Lira) is the default.
 * TODO: replace iTRY/USDT addresses + decimals with verified values from https://docs.brix.money
 * and the target chain (Ethereum mainnet, where iTRY/wiTRY live).
 */
const MAINNET_STABLECOINS: Stablecoin[] = [
  // Default — Brix iTRY (Turkish Lira), Ethereum mainnet.
  // TODO: confirm decimals (assumed 18) via Etherscan `decimals()` on the contract below.
  { symbol: "iTRY", address: "0xb492B4aFD9658093694CF9452D5C272e8230F3B0", decimals: 18 },
  // USDC (Ethereum mainnet)
  { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
  // USDT (Ethereum mainnet)
  { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
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
 * Whitelisted ERC-4626 yield vaults (low-risk only). Must also be whitelisted on-chain via
 * CheckRegistry.setVault. Addresses are placeholders — replace with verified values
 * (see contracts/INTEGRATIONS.md; run scripts/check-vault.ts before whitelisting).
 */
const MAINNET_VAULTS: LendVault[] = [
  // Default — Brix wiTRY (Turkish-Lira money-market yield, 3-day cooldown).
  // NOTE: `address` must be the deployed BrixWiTRYAdapter (set after scripts/deploy.ts on mainnet),
  // NOT the raw wiTRY token (0xE346C29b5B60Ef870b9724c57ccfbBc631e47DEE) — createCheck takes an adapter.
  {
    label: "Brix wiTRY",
    protocol: "Brix",
    address: "0x0000000000000000000000000000000000000000",
    stablecoin: "iTRY",
    apy: 40,
    risk: "low",
  },
  {
    label: "Aave v3 USDC",
    protocol: "Aave",
    address: "0x0000000000000000000000000000000000000001",
    stablecoin: "USDC",
    apy: 5.2,
    risk: "low",
  },
  {
    label: "Aave v3 USDT",
    protocol: "Aave",
    address: "0x0000000000000000000000000000000000000002",
    stablecoin: "USDT",
    apy: 5.0,
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
