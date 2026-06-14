import { ethers, network } from "hardhat";

/**
 * Deploys CheckRegistry and (optionally) whitelists the configured ERC-4626 vaults.
 *
 * Configure per-network vault whitelists below. Only add low-risk, audited vaults
 * (e.g. Aave v3 aToken vaults, Sky sUSDS, curated Morpho USDC vaults). Each entry maps a
 * stablecoin address to the ERC-4626 vault that holds it.
 *
 * Verify every address on-chain before mainnet use — these are placeholders to be filled in.
 */
const VAULTS: Record<string, { stablecoin: string; vault: string; label: string }[]> = {
  base: [
    // { stablecoin: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", vault: "<ERC4626_USDC_VAULT>", label: "USDC vault" },
  ],
  baseSepolia: [],
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);

  const Registry = await ethers.getContractFactory("CheckRegistry");
  const registry = await Registry.deploy(deployer.address);
  await registry.waitForDeployment();
  const addr = await registry.getAddress();
  console.log(`CheckRegistry deployed at: ${addr}`);

  const vaults = VAULTS[network.name] ?? [];
  for (const v of vaults) {
    const tx = await registry.setVault(v.stablecoin, v.vault, true);
    await tx.wait();
    console.log(`Whitelisted ${v.label}: ${v.vault} (asset ${v.stablecoin})`);
  }

  console.log("Done. Remember to transfer ownership to a multisig for production.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
