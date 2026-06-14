import { ethers, network } from "hardhat";
import { parseUnits } from "ethers";

/**
 * End-to-end flow verification against a local Hardhat node:
 * deploy mocks + registry -> create cheque -> simulate yield -> fast-forward to maturity ->
 * settle -> assert principal went to the holder and yield to the drawer.
 *
 * Run: npx hardhat run scripts/e2e-local.ts
 */
async function main() {
  const [drawer, payee] = await ethers.getSigners();

  const USDC = await (await ethers.getContractFactory("TestUSDC")).deploy();
  const usdc = USDC;
  const vault = await (await ethers.getContractFactory("TestYieldVault")).deploy(await usdc.getAddress());
  const registry = await (await ethers.getContractFactory("CheckRegistry")).deploy(drawer.address);

  await (await registry.setVault(await usdc.getAddress(), await vault.getAddress(), true)).wait();

  const amount = parseUnits("1000", 6);
  const yieldAmount = parseUnits("40", 6);
  await (await usdc.mint(drawer.address, amount + yieldAmount)).wait();

  // Create the cheque (maturity 1 hour out).
  const maturity = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
  await (await usdc.approve(await registry.getAddress(), amount)).wait();
  await (await registry.createCheck(payee.address, await usdc.getAddress(), await vault.getAddress(), amount, maturity)).wait();
  console.log("✓ cheque #1 created, principal locked in vault");

  // Simulate yield by donating into the vault.
  await (await usdc.approve(await vault.getAddress(), yieldAmount)).wait();
  await (await vault.simulateYield(yieldAmount)).wait();
  const accrued = await registry.accruedYield(1);
  console.log(`✓ accrued yield: ${ethers.formatUnits(accrued, 6)} tUSDC`);

  // Endorse to nobody (keep payee). Fast-forward past maturity.
  await network.provider.send("evm_increaseTime", [3601]);
  await network.provider.send("evm_mine", []);

  const drawerBefore = await usdc.balanceOf(drawer.address);
  await (await registry.settle(1)).wait();

  const payeeBal = await usdc.balanceOf(payee.address);
  const drawerGain = (await usdc.balanceOf(drawer.address)) - drawerBefore;
  console.log(`✓ settled — payee received ${ethers.formatUnits(payeeBal, 6)} tUSDC (principal)`);
  console.log(`✓ settled — drawer received ${ethers.formatUnits(drawerGain, 6)} tUSDC (yield)`);

  if (payeeBal !== amount) throw new Error("FAIL: payee did not receive full principal");
  if (drawerGain < yieldAmount - 2n || drawerGain > yieldAmount + 2n) throw new Error("FAIL: drawer yield mismatch");

  console.log("\nE2E PASS ✅");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
