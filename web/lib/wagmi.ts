import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, baseSepolia, hardhat } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "cekio — On-Chain Cheque",
  // Get a free projectId at https://cloud.walletconnect.com
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo",
  // hardhat (chainId 31337) supports the local-node testbed (NEXT_PUBLIC_USE_LOCAL=true).
  chains: [base, baseSepolia, hardhat],
  ssr: true,
});
