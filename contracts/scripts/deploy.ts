import { ethers, network } from "hardhat";
import { writeDeployment, Deployment } from "./deployments";

/**
 * Deploys CheckRegistry, deploys a lending adapter per configured vault, and whitelists each.
 *
 * Only add low-risk, audited vaults. `adapterType`:
 *   - "erc4626" → instant ERC-4626 vaults (Aave aToken vault, Sky sUSDS, Morpho).
 *   - "brix"    → Brix wiTRY (cooldown + silo). VERIFY the wiTRY ABI + fork-test first
 *                 (see INTEGRATIONS.md) — its cooldown/unstake selectors are assumed.
 *
 * Verify every address with scripts/check-vault.ts before mainnet use.
 */
type VaultCfg = {
  stablecoin: string;
  symbol: string;
  decimals: number;
  vault: string; // underlying ERC-4626 / staking vault
  label: string;
  apy: number;
  adapterType: "erc4626" | "brix";
};

const VAULTS: Record<string, VaultCfg[]> = {
  // Ethereum mainnet — Brix iTRY → wiTRY (cooldown). Confirm wiTRY ABI before relying on this.
  mainnet: [
    {
      stablecoin: "0xb492B4aFD9658093694CF9452D5C272e8230F3B0", // iTRY
      symbol: "iTRY",
      decimals: 18,
      vault: "0xE346C29b5B60Ef870b9724c57ccfbBc631e47DEE", // wiTRY
      label: "Brix wiTRY",
      apy: 40,
      adapterType: "brix",
    },
  ],
  base: [],
  baseSepolia: [],
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (chainId ${net.chainId})`);
  console.log(`Deployer: ${deployer.address}`);

  const registry = await (await ethers.getContractFactory("CheckRegistry")).deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log(`CheckRegistry: ${registryAddr}`);

  const cfgs = VAULTS[network.name] ?? [];
  const deployedVaults: Deployment["vaults"] = [];
  const stablecoins: Deployment["stablecoins"] = [];

  for (const c of cfgs) {
    const factory = c.adapterType === "brix" ? "BrixWiTRYAdapter" : "ERC4626Adapter";
    const adapter = await (await ethers.getContractFactory(factory)).deploy(c.vault, registryAddr);
    await adapter.waitForDeployment();
    const adapterAddr = await adapter.getAddress();
    await (await registry.setVault(c.stablecoin, adapterAddr, true)).wait();
    console.log(`Whitelisted ${c.label}: adapter ${adapterAddr} (vault ${c.vault}, asset ${c.stablecoin})`);

    stablecoins.push({ symbol: c.symbol, address: c.stablecoin, decimals: c.decimals });
    deployedVaults.push({ label: c.label, address: adapterAddr, stablecoin: c.symbol, apy: c.apy });
  }

  if (cfgs.length > 0) {
    const file = writeDeployment({
      network: network.name,
      chainId: Number(net.chainId),
      registry: registryAddr,
      stablecoins,
      vaults: deployedVaults,
      deployedAt: new Date().toISOString(),
    });
    console.log(`\nDeployment written to ${file}`);
    console.log("Set NEXT_PUBLIC_REGISTRY_ADDRESS and the vault adapter address in lib/config.ts.");
  }

  console.log("Done. Transfer ownership to a multisig for production.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
