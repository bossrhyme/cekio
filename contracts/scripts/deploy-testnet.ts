import fs from "fs";
import path from "path";
import { ethers, network } from "hardhat";
import { writeDeployment, Deployment } from "./deployments";

/**
 * Testnet deployment (Base Sepolia or local hardhat node).
 *
 * Self-contained: deploys a faucet stablecoin (TestUSDC) and a TestYieldVault (ERC-4626), then the
 * CheckRegistry, and whitelists the vault. This lets us exercise the full cheque flow without
 * depending on external testnet protocols. Mainnet uses real vault addresses instead (Phase 6).
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (chainId ${net.chainId})`);
  console.log(`Deployer: ${deployer.address}`);

  // 1. Faucet stablecoin
  const TestUSDC = await ethers.getContractFactory("TestUSDC");
  const usdc = await TestUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  console.log(`TestUSDC (tUSDC): ${usdcAddr}`);

  // 2. ERC-4626 yield vault
  const Vault = await ethers.getContractFactory("TestYieldVault");
  const vault = await Vault.deploy(usdcAddr);
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log(`TestYieldVault (tyUSDC): ${vaultAddr}`);

  // 3. CheckRegistry
  const Registry = await ethers.getContractFactory("CheckRegistry");
  const registry = await Registry.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log(`CheckRegistry: ${registryAddr}`);

  // 4. Instant ERC-4626 adapter wrapping the vault, owned by the registry
  const Adapter = await ethers.getContractFactory("ERC4626Adapter");
  const adapter = await Adapter.deploy(vaultAddr, registryAddr);
  await adapter.waitForDeployment();
  const adapterAddr = await adapter.getAddress();
  console.log(`ERC4626Adapter: ${adapterAddr}`);

  // 5. Whitelist the adapter for tUSDC
  await (await registry.setVault(usdcAddr, adapterAddr, true)).wait();
  console.log(`Whitelisted adapter ${adapterAddr} for ${usdcAddr}`);

  // Zero fees on testnet for simple demos (mainnet deploy.ts keeps real fees).
  await (await registry.setFees(0, 0, 0, deployer.address)).wait();

  // 6. Seed deployer with faucet funds
  await (await usdc.mint(deployer.address, 1_000_000e6)).wait();
  console.log(`Minted 1,000,000 tUSDC to deployer`);

  const deployment: Deployment = {
    network: network.name,
    chainId: Number(net.chainId),
    registry: registryAddr,
    stablecoins: [{ symbol: "tUSDC", address: usdcAddr, decimals: 6 }],
    vaults: [{ label: "Test Yield USDC", address: adapterAddr, stablecoin: "tUSDC", apy: 5 }],
    testVault: vaultAddr,
    deployedAt: new Date().toISOString(),
  };
  const file = writeDeployment(deployment);
  console.log(`\nDeployment written to ${file}`);

  // Feed the frontend's auto-load file: deployment.testnet.json for Base/Ethereum Sepolia,
  // deployment.local.json for the local node testbed. The frontend lives at the repo root.
  const webName =
    network.name === "baseSepolia" || network.name === "sepolia"
      ? "deployment.testnet.json"
      : network.name === "localhost" || network.name === "hardhat"
        ? "deployment.local.json"
        : undefined;
  if (webName) {
    const webFile = path.resolve(__dirname, "..", "..", "lib", webName);
    if (fs.existsSync(path.dirname(webFile))) {
      fs.writeFileSync(webFile, JSON.stringify(deployment, null, 2) + "\n");
      console.log(`Frontend deployment written to ${webFile}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
