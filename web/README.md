# cekio — Web (Frontend)

Next.js 14 + wagmi v2 + viem + RainbowKit + Tailwind UI for the on-chain cheque system on Base.

## Interfaces

1. **Çek oluşturma** (`/create`) — alacaklı adresi, para birimi, miktar, vade tarihi + lend vault seçimi.
2. **Çek + alıcı detay** (`/check/[id]`) — kontrat özellikleri, alacaklı/keşideci, getiri, ciro ve ödeme.
3. **Lend yeri seçme** — `components/VaultSelector.tsx` (oluşturma akışında, APY + risk ile).
4. **Pano** (`/`) — keşideci ve alacaklı çekleri, biriken getiri, ödeme aksiyonu.

## Geliştirme

```bash
npm install
npm run dev
```

## Ortam değişkenleri

| Değişken | Açıklama |
|---|---|
| `NEXT_PUBLIC_REGISTRY_ADDRESS` | Deploy edilen `CheckRegistry` adresi |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud projectId |
| `NEXT_PUBLIC_USE_TESTNET` | `true` ise Base Sepolia kullanılır |

## Notlar

- `lib/config.ts` içindeki stablecoin ve lend vault adresleri **doğrulanmalı** (şu an placeholder); vault'lar ayrıca on-chain `setVault` ile beyaz listeye eklenmeli.
- `lib/abi.ts` derlenmiş kontrattan üretildi (`contracts/`).
- Çek listeleme demo amaçlı id taramasıyla yapılır; üretimde subgraph/indexer önerilir.
