# Pricing & Revenue Strategy

Core principle: **never touch the principal.** The "guaranteed, can't-bounce" promise is the
product — fees come only from the value created (yield) and transactions, never from the payee's
principal.

## Revenue streams

| Stream | Rate | Where it's taken | Status |
|---|---|---|---|
| **Performance fee** | **10%** of yield | At `settle`, from the drawer's yield (principal untouched) | ✅ on-chain (`perfFeeBps`, cap 20%) |
| **Secondary sale fee** | **0.5%** of sale price | At `buy` in the built-in discount market | ✅ on-chain (`saleFeeBps`, cap 2%) |
| **Creation fee** | **0.1%** of principal | At `createCheck`, paid by the drawer on top | ✅ on-chain (`createFeeBps`, cap 1%) |
| **Enterprise** | custom | API, bulk issuance, white-label (KOBİ/banks) | 🔜 later phase |

All fee rates are owner/multisig-configurable with hard caps, and flow to `treasury`.

## Why this is fair & sustainable

- **Performance fee** taxes only upside. With Turkish money-market yield (~40% APY via Brix wiTRY),
  10% still leaves the drawer ~36% effective — easy to justify, scales with TVL × yield.
- **Discount market (0.5%)** monetizes the factoring replacement: a payee who needs cash early sells
  the cheque NFT at a small discount instead of paying high factoring fees. Cheap + transparent.
- **Creation fee (0.1%)** is paid on top of principal so the payee still receives 100%.

## Rollout

1. **Bootstrap:** launch with low/zero fees to build TVL and network effects.
2. **Scale:** enable the 10% / 0.5% / 0.1% schedule above.
3. **Enterprise:** subscription tier for businesses (API, bulk, reporting, white-label).

## On-chain implementation

`CheckRegistry`:
- `setFees(perfFeeBps, createFeeBps, saleFeeBps, treasury)` — owner-only, capped.
- `createCheck` → pulls a `createFeeBps` fee to `treasury` on top of the principal.
- `settle` → splits redeemed funds: principal to holder, `perfFeeBps` of yield to `treasury`, rest to drawer.
- `listForSale` / `cancelListing` / `buy` → built-in secondary market; `buy` sends `saleFeeBps` to `treasury`.

Testnet/local deployments set all fees to 0 for simple demos; `scripts/deploy.ts` (mainnet) keeps the
real schedule.
