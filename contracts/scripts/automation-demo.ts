import { ethers, network } from "hardhat";
import { parseUnits } from "ethers";
import { readDeployment } from "./deployments";

/**
 * Demonstrates the Chainlink Automation keeper path end-to-end against a LOCAL node:
 * create a short-maturity cheque -> fast-forward -> checkUpkeep -> performUpkeep -> assert settled.
 *
 * Run: npx hardhat run scripts/automation-demo.ts --network localhost
 */
async function main() {
  const net = await ethers.provider.getNetwork();
  if (net.chainId !== 31337n) {
    throw new Error("automation-demo only fast-forwards on a local node (chainId 31337).");
  }
  const d = readDeployment(network.name);
  if (!d) throw new Error(`No deployment for ${network.name}. Run deploy-testnet --network localhost.`);

  const [deployer, payee] = await ethers.getSigners();
  const usdc = await ethers.getContractAt("TestUSDC", d.stablecoins[0].address);
  const vault = await ethers.getContractAt("TestYieldVault", d.vaults[0].address);
  const registry = await ethers.getContractAt("CheckRegistry", d.registry);

  const amount = parseUnits("250", 6);
  const yieldAmt = parseUnits("7", 6);
  await (await usdc.mint(deployer.address, amount + yieldAmt)).wait();

  const maturity = (await ethers.provider.getBlock("latest"))!.timestamp + 60;
  await (await usdc.approve(d.registry, amount)).wait();
  const rc = await (await registry.createCheck(payee.address, d.stablecoins[0].address, d.vaults[0].address, amount, maturity)).wait();
  // Derive the new checkId from nextId.
  const id = (await registry.nextId()) - 1n;
  console.log(`✓ created cheque #${id} (matures in 60s), tx ${rc?.hash}`);

  await (await usdc.approve(d.vaults[0].address, yieldAmt)).wait();
  await (await vault.simulateYield(yieldAmt)).wait();

  // Before maturity, the keeper should report no work.
  let [needed] = await registry.checkUpkeep.staticCall("0x");
  console.log(`checkUpkeep before maturity → upkeepNeeded=${needed}`);

  // Fast-forward past maturity (local node only).
  await network.provider.send("evm_increaseTime", [61]);
  await network.provider.send("evm_mine", []);

  const res = await registry.checkUpkeep.staticCall("0x");
  console.log(`checkUpkeep after maturity → upkeepNeeded=${res[0]}`);
  if (!res[0]) throw new Error("FAIL: keeper did not detect matured cheque");

  const payeeBefore = await usdc.balanceOf(payee.address);
  await (await registry.performUpkeep(res[1])).wait();
  console.log("✓ performUpkeep executed (keeper settlement)");

  const c = await registry.getCheck(id);
  const payeeGain = (await usdc.balanceOf(payee.address)) - payeeBefore;
  console.log(`  cheque #${id} settled=${c.settled}, payee received ${ethers.formatUnits(payeeGain, 6)} tUSDC`);
  if (!c.settled || payeeGain !== amount) throw new Error("FAIL: keeper settlement incorrect");

  console.log("\nAUTOMATION DEMO PASS ✅ (keeper auto-settled the matured cheque)");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
