import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, baseSepolia, mainnet, sepolia, hardhat } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Vade — On-Chain Cheque",
  // Get a free projectId at https://cloud.walletconnect.com
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo",
  // Base is primary; Ethereum (mainnet + Sepolia) and the local hardhat node are also supported.
  // hardhat (chainId 31337) powers the local-node testbed (NEXT_PUBLIC_USE_LOCAL=true).
  chains: [base, baseSepolia, mainnet, sepolia, hardhat],
  ssr: true,
});
