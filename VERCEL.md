# Vercel Deployment

The Next.js app now lives at the **repo root**, so Vercel works with **no special settings** —
Root Directory stays the default (`./`) and the framework is auto-detected as Next.js.

## Steps

1. Import the repo in Vercel (already connected).
2. Leave **Root Directory** as default (`./`). Framework: **Next.js** (auto).
3. Deploy — every push builds a Preview; the production branch builds Production. Each commit/PR
   gets its own preview URL.

> The smart-contract tooling lives in `contracts/` and is excluded from the Next.js build
> (`tsconfig.json` excludes it), so it does not affect the Vercel deployment.

## Environment variables (Settings → Environment Variables)

| Variable | Needed for | Value |
|---|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect wallets in the connect modal | from https://cloud.walletconnect.com |
| `NEXT_PUBLIC_USE_TESTNET` | Point the app at Base Sepolia | `true` (after a testnet deploy) |
| `NEXT_PUBLIC_REGISTRY_ADDRESS` | Read/write the deployed registry | `CheckRegistry` address on Base Sepolia |

Without these the preview still builds and renders the UI (wallet connect + pages); on-chain reads
are empty until a registry is deployed and `NEXT_PUBLIC_REGISTRY_ADDRESS` is set.

## Making the preview show live data

1. Deploy the contracts to Base Sepolia (see `contracts/TESTNET.md`).
2. In Vercel env set `NEXT_PUBLIC_USE_TESTNET=true` and
   `NEXT_PUBLIC_REGISTRY_ADDRESS=<registry from deployments/baseSepolia.json>`.
3. Redeploy. Users connect a Base Sepolia wallet and can create/endorse/settle cheques from the UI.
