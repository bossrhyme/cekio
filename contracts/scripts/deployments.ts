import fs from "fs";
import path from "path";

export type Deployment = {
  network: string;
  chainId: number;
  registry: string;
  stablecoins: { symbol: string; address: string; decimals: number }[];
  vaults: { label: string; address: string; stablecoin: string; apy?: number }[];
  deployedAt: string;
};

const DIR = path.resolve(__dirname, "..", "deployments");

export function writeDeployment(d: Deployment) {
  fs.mkdirSync(DIR, { recursive: true });
  const file = path.join(DIR, `${d.network}.json`);
  fs.writeFileSync(file, JSON.stringify(d, null, 2) + "\n");
  return file;
}

export function readDeployment(network: string): Deployment | undefined {
  const file = path.join(DIR, `${network}.json`);
  if (!fs.existsSync(file)) return undefined;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
