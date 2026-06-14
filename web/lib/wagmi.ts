import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, baseSepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "cekio — On-Chain Cheque",
  // Get a free projectId at https://cloud.walletconnect.com
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "demo",
  chains: [base, baseSepolia],
  ssr: true,
});
