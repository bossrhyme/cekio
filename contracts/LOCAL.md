# Local Testbed (no network, no keys)

Run the entire system on a local blockchain node — useful for development and for testing with a
browser wallet without any testnet ETH or RPC access. (This is exactly what was verified
end-to-end: deploy → create cheque → yield → maturity → keeper settlement, all passing.)

## 1. Start a local node

```bash
cd contracts
npm install
npm run node          # local JSON-RPC at http://127.0.0.1:8545 (chainId 31337), funded accounts
```

Keep this running and open a second terminal for the next steps.

## 2. Deploy the full stack

```bash
npm run deploy:local  # deploys TestUSDC + TestYieldVault + CheckRegistry, whitelists the vault
```

This writes `deployments/localhost.json` and populates `web/lib/deployment.local.json` so the
frontend auto-loads the addresses.

## 3. Verify the flows

```bash
npm run e2e               # in-process: create -> yield -> maturity -> settle (asserts PASS)
npm run automation:local  # keeper path: checkUpkeep -> performUpkeep auto-settles (asserts PASS)
```

## 4. Run the frontend against the local node

```bash
cd ../web
npm install
NEXT_PUBLIC_USE_LOCAL=true npm run dev
```

In your wallet (e.g. MetaMask): add network `http://127.0.0.1:8545`, chainId `31337`, and import one
of the node's printed private keys. You can now create cheques, endorse (transfer), and settle from
the UI. Use `TestUSDC.faucet()` / `mint` for test funds.

> The local node's accounts and state reset every time you restart `npm run node`.
