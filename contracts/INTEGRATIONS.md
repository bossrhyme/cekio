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

### Open items to confirm

- [ ] wiTRY exposes the full ERC-4626 interface (`deposit`/`redeem`/`convertToAssets`). If it only
      offers `wrap`/`unwrap`, a thin `ILendingAdapter` wrapper is needed.
- [ ] Target chain for our deployment (Ethereum mainnet vs MegaETH). MegaETH must be added to
      `lib/wagmi.ts` as a custom chain if chosen.
- [ ] iTRY / wiTRY verified contract addresses.
