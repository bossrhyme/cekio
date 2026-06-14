import { ethers, network } from "hardhat";
import { parseUnits } from "ethers";
import { readDeployment } from "./deployments";

/**
 * Creates a demo cheque on a live network using the addresses in deployments/<network>.json.
 *
 * Env:
 *   PAYEE                  payee address (defaults to the deployer)
 *   DEMO_AMOUNT            cheque amount in tUSDC (default 100)
 *   DEMO_MATURITY_SECONDS seconds until maturity (default 300 = 5 min)
 *   DEMO_YIELD             tUSDC to donate as simulated yield (default 5)
 *
 * Run: npx hardhat run scripts/demo.ts --network baseSepolia
 */
async function main() {
  const d = readDeployment(network.name);
  if (!d) throw new Error(`No deployment found for ${network.name}. Run deploy-testnet first.`);

  const [deployer] = await ethers.getSigners();
  const payee = process.env.PAYEE ?? deployer.address;
  const amount = parseUnits(process.env.DEMO_AMOUNT ?? "100", 6);
  const yieldAmt = parseUnits(process.env.DEMO_YIELD ?? "5", 6);
  const ttl = Number(process.env.DEMO_MATURITY_SECONDS ?? "300");

  const usdc = await ethers.getContractAt("TestUSDC", d.stablecoins[0].address);
  const vault = await ethers.getContractAt("TestYieldVault", d.testVault ?? d.vaults[0].address);
  const registry = await ethers.getContractAt("CheckRegistry", d.registry);

  // Ensure the deployer holds enough tUSDC.
  const bal = await usdc.balanceOf(deployer.address);
  if (bal < amount) await (await usdc.faucet()).wait();

  const maturity = (await ethers.provider.getBlock("latest"))!.timestamp + ttl;
  await (await usdc.approve(d.registry, amount)).wait();
  const tx = await registry.createCheck(payee, d.stablecoins[0].address, d.vaults[0].address, amount, maturity);
  const rc = await tx.wait();
  console.log(`Cheque created in tx ${rc?.hash}`);

  // Donate simulated yield.
  if (yieldAmt > 0n) {
    if ((await usdc.balanceOf(deployer.address)) < yieldAmt) await (await usdc.faucet()).wait();
    await (await usdc.approve(await vault.getAddress(), yieldAmt)).wait();
    await (await vault.simulateYield(yieldAmt)).wait();
    console.log(`Donated ${process.env.DEMO_YIELD ?? "5"} tUSDC of simulated yield`);
  }

  console.log(`\nMaturity at unix ${maturity} (~${ttl}s from now).`);
  console.log(`After maturity run: CHECK_ID=<id> npx hardhat run scripts/settle.ts --network ${network.name}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
