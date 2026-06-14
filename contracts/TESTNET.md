# Testnet Deployment Guide (Base Sepolia)

Step-by-step guide to deploy and exercise the on-chain cheque system on Base Sepolia, before
wiring real mainnet vault addresses (Phase 6).

## Phase 0 — Prerequisites

1. A deployer wallet private key (testnet only).
2. Base Sepolia test ETH — faucet: https://www.alchemy.com/faucets/base-sepolia
3. A Base Sepolia RPC URL (public `https://sepolia.base.org` works, or Alchemy/Infura).
4. (Optional) A BaseScan API key for verification: https://basescan.org/myapikey

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
# set DEPLOYER_PRIVATE_KEY, BASE_SEPOLIA_RPC_URL, BASESCAN_API_KEY
```

> `.env` is loaded automatically (via `dotenv/config` in `hardhat.config.ts`).

## Phase 1 — Local end-to-end check (no funds needed)

```bash
npm install
npm run compile
npm run e2e          # deploy mocks + full flow on an ephemeral local node, asserts PASS
```

## Phase 2 — Deploy to Base Sepolia

Self-contained deployment: a faucet stablecoin (`TestUSDC`), an ERC-4626 `TestYieldVault`, the
`CheckRegistry`, and the vault whitelist. Addresses are written to `deployments/baseSepolia.json`.

```bash
npm run deploy:testnet
```

Verify on BaseScan (optional):

```bash
npm run verify:testnet <REGISTRY_ADDRESS> <DEPLOYER_ADDRESS>
```

Exercise the flow (creates a cheque with a 5-minute maturity and donates simulated yield):

```bash
npx hardhat run scripts/demo.ts --network baseSepolia
# wait until maturity, then:
CHECK_ID=1 npx hardhat run scripts/settle.ts --network baseSepolia
```

## Phase 3 — Chainlink Automation (automatic settlement)

1. Go to https://automation.chain.link (Base Sepolia).
2. Register a **Custom logic** upkeep pointing at the `CheckRegistry` address.
3. Fund it with testnet LINK.
4. Create a cheque with a short maturity and confirm the keeper calls `performUpkeep` → `settle`
   automatically once it matures.

## Phase 4 — Frontend on testnet

In `.env.local` at the repo root:

```
NEXT_PUBLIC_USE_TESTNET=true
NEXT_PUBLIC_REGISTRY_ADDRESS=<registry from deployments/baseSepolia.json>
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your id>
```

Then run `npm run dev` from the repo root and walk through create → endorse → settle with a wallet on Base Sepolia.

## Phase 6 — Mainnet (real addresses) — LAST

Replace the testnet mocks with verified, audited Base mainnet vaults in `scripts/deploy.ts` and
`lib/config.ts` (repo root), whitelist them via `setVault`, and transfer ownership to a multisig. Do this
only after fork tests, Slither/Mythril, and an external audit.
