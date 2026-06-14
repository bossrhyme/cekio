import { ethers, network } from "hardhat";
import { parseUnits } from "ethers";
import { readDeployment } from "./deployments";

/** Donates simulated yield into the first vault. Env: DONATE (tUSDC, default 25).
 *  Run: DONATE=25 npx hardhat run scripts/donate-yield.ts --network localhost */
async function main() {
  const d = readDeployment(network.name);
  if (!d) throw new Error(`No deployment for ${network.name}`);
  const [deployer] = await ethers.getSigners();
  const amt = parseUnits(process.env.DONATE ?? "25", 6);

  const usdc = await ethers.getContractAt("TestUSDC", d.stablecoins[0].address);
  const vault = await ethers.getContractAt("TestYieldVault", d.vaults[0].address);
  if ((await usdc.balanceOf(deployer.address)) < amt) await (await usdc.mint(deployer.address, amt)).wait();
  await (await usdc.approve(d.vaults[0].address, amt)).wait();
  await (await vault.simulateYield(amt)).wait();
  console.log(`Donated ${process.env.DONATE ?? "25"} tUSDC of yield to ${d.vaults[0].address}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
