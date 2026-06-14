# Adding a Lend Vault (ERC-4626)

`CheckRegistry` works with **any ERC-4626 vault** — no contract changes needed. Adding a vault
(Aave aToken vault, Sky sUSDS, Morpho, Brix wiTRY, …) is a 3-step process.

## Steps

1. **Verify the vault is ERC-4626** on the target network:
   ```bash
   VAULT=0x<vault> npx hardhat run scripts/check-vault.ts --network <net>
   ```
   It must expose `asset()`, `convertToAssets`, `convertToShares`, `deposit`, `redeem`. The printed
   underlying asset must equal the stablecoin you want cheques denominated in.

2. **Whitelist it on-chain** (registry and vault must be on the **same chain**):
   ```solidity
   registry.setVault(asset, vault, true); // asset == vault.asset()
   ```

3. **Expose it in the UI** — add the stablecoin + vault to `lib/config.ts` (repo root) so the
   "lend yeri seçme" selector shows it.

---

## Brix Money — iTRY / wiTRY (Turkish Lira yield)

[Brix](https://brix.money) tokenizes emerging-market (Turkish) money-market yield:

- **iTRY** — Turkish-Lira-pegged stablecoin, 1:1 backed by TRY money-market funds (on-chain
  Proof-of-Reserves). Deployed on **Ethereum** and **MegaETH** (via LayerZero).
- **wiTRY** — yield-bearing wrapper of iTRY (stake iTRY → wiTRY; appreciates as fund yield accrues).
  Built on LayerZero **OVault**, which is the omnichain ERC-4626 vault pattern → **expected to be
  ERC-4626 compatible**.

### Why it's a great fit

This is a **Turkish cheque** ("çek") product. With Brix, a cheque can be denominated in **iTRY**
(on-chain Turkish Lira) and the locked principal earns **Turkish money-market yield** via wiTRY —
historically much higher than USD rates. The "yield → drawer" feature becomes very compelling.

### To integrate (once addresses are verified)

1. Get the verified **iTRY** and **wiTRY** addresses + the network (Ethereum mainnet hub, or MegaETH)
   from https://docs.brix.money. Confirm with:
   ```bash
   VAULT=<wiTRY> npx hardhat run scripts/check-vault.ts --network mainnet
   # expect asset() == iTRY
   ```
2. Deploy `CheckRegistry` on that chain (the registry must be on the same chain as wiTRY, because it
   calls `wiTRY.deposit(iTRY)` directly).
3. `registry.setVault(iTRY, wiTRY, true)`.
4. Add iTRY (stablecoin) + wiTRY (vault) to `lib/config.ts`.

## Architecture: adapters + cooldown

`CheckRegistry` talks to an **`ILendingAdapter`**, not a raw vault, so instant and cooldown venues
share one interface:

- **`ERC4626Adapter`** — instant ERC-4626 vaults (Aave, Sky, Morpho). Redeem is immediate.
- **`BrixWiTRYAdapter`** — Brix wiTRY with a **3-day unstake cooldown** (wiTRY burned → iTRYSilo →
  withdraw after cooldown). Each redemption uses an isolated `BrixSiloHelper` so overlapping
  cooldowns don't commingle.

For cooldown adapters the keeper calls **`prepareRedeem`** at `maturity − cooldown` (starts the
unstake) and **`settle`** at maturity (pays out) — so the payee is still paid exactly at maturity.
This flow is covered by tests via `MockCooldownAdapter`.

Whitelist the **adapter** (not the raw vault): `registry.setVault(asset, adapter, true)`. Deploy
adapters via `scripts/deploy.ts` (`adapterType: "erc4626" | "brix"`).

## Open items to confirm (Brix, before mainnet)

- [ ] **Confirm wiTRY's exact ABI** — `BrixWiTRYAdapter`/`IBrixWiTRY` assume Ethena-style
      `cooldownShares(shares)` + `unstake(receiver)` + `cooldownDuration()`. Verify against the
      deployed wiTRY (0xE346C29b5B60Ef870b9724c57ccfbBc631e47DEE) and adjust if different.
- [ ] **Fork-test** the Brix adapter against Ethereum mainnet state (deposit → cooldown → unstake).
- [ ] Confirm iTRY decimals (assumed 18).
- [ ] Run `scripts/check-vault.ts` against wiTRY to confirm `asset() == iTRY`.
