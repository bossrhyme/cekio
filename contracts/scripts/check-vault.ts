import { ethers, network } from "hardhat";

/**
 * Verifies that a given address is a usable ERC-4626 vault for CheckRegistry.
 * Checks asset(), metadata, and the convert/total views. Use before whitelisting any vault
 * (Aave aToken vault, Brix wiTRY, Morpho, Sky sUSDS, …).
 *
 * Run: VAULT=0x... npx hardhat run scripts/check-vault.ts --network <net>
 */
const ERC4626_ABI = [
  "function asset() view returns (address)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalAssets() view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function convertToShares(uint256 assets) view returns (uint256)",
  "function maxDeposit(address) view returns (uint256)",
];
const ERC20_ABI = ["function symbol() view returns (string)", "function decimals() view returns (uint8)"];

async function main() {
  const vaultAddr = process.env.VAULT;
  if (!vaultAddr) throw new Error("Set VAULT=0x... env var.");
  console.log(`Network: ${network.name}`);
  console.log(`Vault:   ${vaultAddr}\n`);

  const v = await ethers.getContractAt(ERC4626_ABI, vaultAddr);
  const checks: [string, () => Promise<unknown>][] = [
    ["name", () => v.name()],
    ["symbol", () => v.symbol()],
    ["decimals", () => v.decimals()],
    ["asset", () => v.asset()],
    ["totalAssets", () => v.totalAssets()],
    ["convertToAssets(1e18)", () => v.convertToAssets(ethers.parseUnits("1", 18))],
    ["convertToShares(1e18)", () => v.convertToShares(ethers.parseUnits("1", 18))],
    ["maxDeposit(0x0)", () => v.maxDeposit(ethers.ZeroAddress)],
  ];

  let ok = true;
  let assetAddr: string | undefined;
  for (const [label, fn] of checks) {
    try {
      const res = await fn();
      if (label === "asset") assetAddr = res as string;
      console.log(`  ✓ ${label.padEnd(22)} ${res}`);
    } catch {
      ok = false;
      console.log(`  ✗ ${label.padEnd(22)} NOT IMPLEMENTED`);
    }
  }

  if (assetAddr) {
    try {
      const a = await ethers.getContractAt(ERC20_ABI, assetAddr);
      console.log(`\n  Underlying asset: ${await a.symbol()} (${await a.decimals()} decimals) @ ${assetAddr}`);
    } catch {
      console.log(`\n  Underlying asset @ ${assetAddr} (metadata unreadable)`);
    }
  }

  console.log(
    ok
      ? "\nERC-4626 COMPATIBLE ✅ — safe to whitelist via registry.setVault(asset, vault, true)"
      : "\nNOT FULLY ERC-4626 ❌ — needs an adapter before integration.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
