import { ethers, network } from "hardhat";
import { readDeployment } from "./deployments";

/**
 * Settles a matured cheque. Env: CHECK_ID (required).
 * Run: CHECK_ID=1 npx hardhat run scripts/settle.ts --network baseSepolia
 */
async function main() {
  const d = readDeployment(network.name);
  if (!d) throw new Error(`No deployment found for ${network.name}.`);
  const id = process.env.CHECK_ID;
  if (!id) throw new Error("Set CHECK_ID env var.");

  const registry = await ethers.getContractAt("CheckRegistry", d.registry);
  const c = await registry.getCheck(id);
  const now = (await ethers.provider.getBlock("latest"))!.timestamp;
  if (now < Number(c.maturity)) {
    throw new Error(`Not matured yet. Maturity at ${c.maturity}, now ${now}.`);
  }

  const tx = await registry.settle(id);
  const rc = await tx.wait();
  console.log(`Settled cheque #${id} in tx ${rc?.hash}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
