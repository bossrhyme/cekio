import { ethers, network } from "hardhat";
import { readDeployment } from "./deployments";

/**
 * Sets protocol fees on a deployed registry.
 * Env (bps): PERF (default 1000=10%), CREATE (10=0.1%), SALE (50=0.5%), TREASURY (default deployer).
 * Run: npx hardhat run scripts/set-fees.ts --network <net>
 */
async function main() {
  const d = readDeployment(network.name);
  if (!d) throw new Error(`No deployment for ${network.name}`);
  const [signer] = await ethers.getSigners();
  const perf = Number(process.env.PERF ?? "1000");
  const create = Number(process.env.CREATE ?? "10");
  const sale = Number(process.env.SALE ?? "50");
  const treasury = process.env.TREASURY ?? signer.address;

  const registry = await ethers.getContractAt("CheckRegistry", d.registry);
  await (await registry.setFees(perf, create, sale, treasury)).wait();
  console.log(`Fees set: perf=${perf}bps create=${create}bps sale=${sale}bps treasury=${treasury}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
