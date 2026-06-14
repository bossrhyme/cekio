# cekio — On-Chain Cheque ("Çek") Contracts

Smart contracts for digitizing post-dated cheques on-chain with yield-bearing escrow.

## Concept

A drawer (*keşideci*) creates a cheque by locking the cheque amount up front, so the cheque **cannot
bounce** (*karşılıksız çek* prevention). Instead of sitting idle, the locked principal is supplied
into a whitelisted **ERC-4626 yield vault** (Aave v3, Sky sUSDS, curated Morpho vaults, …). At
maturity (*vade tarihi*):

- the **principal** is paid to the current holder (payee / *alacaklı*),
- any **yield** earned during the term goes to the **drawer**.

Each cheque is an **ERC-721 token**; the token holder is the current creditor. **Endorsement
(*ciro*) is simply an NFT transfer** — the holder can endorse the cheque to anyone without asking
the drawer.

## Design decisions

| Topic | Choice |
|---|---|
| Chain | Base |
| Assets | Multiple stablecoins (USDC, USDT, DAI/USDS) |
| Lending | ERC-4626 adapter + owner-curated whitelist of **low-risk vaults only** |
| Principal guarantee | Holder is paid first at settlement; accrued yield acts as a first-loss buffer |
| Maturity automation | Chainlink Automation keeper (`checkUpkeep`/`performUpkeep`); manual `settle()` also works |

## Contracts

- `CheckRegistry.sol` — core ERC-721 registry: `createCheck`, `settle`, Automation hooks, vault whitelist, views.
- `interfaces/AutomationCompatibleInterface.sol` — Chainlink Automation interface.
- `mocks/` — `MockERC20`, `MockERC4626` for tests.

## Develop

```bash
npm install
npm run compile
npm test
```

> Note: in restricted/offline environments the solc compiler binary host
> (`binaries.soliditylang.org`) may be blocked. The bundled `solc` npm package is used as a
> fallback (`scripts/compile-check.js` verifies compilation without network access).

## Deploy

```bash
BASE_SEPOLIA_RPC_URL=... DEPLOYER_PRIVATE_KEY=... npx hardhat run scripts/deploy.ts --network baseSepolia
```

Configure the per-network vault whitelist in `scripts/deploy.ts`. **Verify every vault address
on-chain** and only whitelist audited, low-risk vaults. Transfer ownership to a multisig for
production.

## Security notes

- Reentrancy guards on `createCheck`/`settle`; checks-effects-interactions ordering.
- `SafeERC20` + `forceApprove` (USDT-compatible).
- Owner-curated vault whitelist prevents pointing cheques at malicious "vaults".
- `Ownable2Step` + `Pausable` (create can be paused; `settle` always works so funds can exit).
- Recommended before mainnet: Slither/Mythril, fork tests against real Base vaults, external audit.
