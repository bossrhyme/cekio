# Vercel Preview Deployment

The frontend lives in the **`web/`** subdirectory of this monorepo. Vercel must be told this.

## 1. Set the Root Directory (REQUIRED — dashboard only)

Vercel project → **Settings → General → Root Directory** → set to **`web`** → Save.

> This cannot be set from `vercel.json`; it must be done in the dashboard. Without it the build
> fails because there is no Next.js app at the repo root.

Framework preset auto-detects as **Next.js**. Build command `next build` and output are automatic.

## 2. Environment variables (Settings → Environment Variables)

| Variable | Needed for | Value |
|---|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect wallets in the connect modal | from https://cloud.walletconnect.com |
| `NEXT_PUBLIC_USE_TESTNET` | Point the app at Base Sepolia | `true` (after a testnet deploy) |
| `NEXT_PUBLIC_REGISTRY_ADDRESS` | Read/write the deployed registry | `CheckRegistry` address on Base Sepolia |

Without these the preview still builds and renders the UI (wallet connect + pages); on-chain reads
are empty until a registry is deployed and `NEXT_PUBLIC_REGISTRY_ADDRESS` is set.

## 3. Deploy

Push to the branch — Vercel builds a **Preview** deployment per commit, and a **Production**
deployment from the production branch. Each PR/commit gets its own preview URL.

## Making the preview show live data

1. Deploy the contracts to Base Sepolia (see `contracts/TESTNET.md`).
2. In Vercel env set `NEXT_PUBLIC_USE_TESTNET=true` and
   `NEXT_PUBLIC_REGISTRY_ADDRESS=<registry from deployments/baseSepolia.json>`.
3. Redeploy. Users connect a Base Sepolia wallet and can create/endorse/settle cheques from the UI.
