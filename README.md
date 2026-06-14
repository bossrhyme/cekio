# cekio — On-Chain Cheque ("Çek") Platform

Çeklerin zincir üstünde, şeffaf ve karşılıksız çıkamayacak şekilde dijitalleştirilmesi. Keşideci
çek miktarını baştan kilitler; para vade boyunca bir lend platformunda çalışır, getiri keşideciye
gider, vade tarihinde anapara otomatik olarak alacaklının cüzdanına geçer. Çek bir NFT olduğundan
alacaklı, keşideciye sormadan ciro edebilir.

## Nasıl çalışır

```
Keşideci ──createCheck(miktar, vade, vault)──► CheckRegistry ──deposit──► ERC-4626 Yield Vault
   │                                              │ (NFT alacaklıya mint edilir)
   │                                              │
   │  ciro = NFT transfer (izin gerektirmez)      ▼
   └───────────────────────────────────────► Alacaklı / sonraki hamil
                                                  │
   vade tarihinde (keeper veya elle settle):      ▼
        anapara ──► güncel hamil   |   getiri ──► keşideci
```

## Tasarım kararları

| Konu | Seçim |
|---|---|
| Zincir | Base |
| Varlık | Çoklu stablecoin (USDC, USDbC, DAI/USDS) |
| Lend | ERC-4626 adaptörü + sadece düşük riskli vault beyaz listesi (Aave, Sky sUSDS, curated Morpho) |
| Anapara garantisi | Vadede önce hamil tam alır; getiri ilk-zarar tamponu olarak çalışır |
| Otomasyon | Chainlink Automation keeper + elle `settle()` |
| Ciro | ERC-721 transferi |

## Depo yapısı

- [`contracts/`](./contracts) — Hardhat + Solidity. `CheckRegistry` (ERC-721 + ERC-4626 escrow), testler, deploy.
- [`web/`](./web) — Next.js + wagmi/viem + RainbowKit arayüzü (4 ekran).
- `.claude/` — proje subagent ve skill tanımları.

## Durum

- ✅ Akıllı kontratlar yazıldı ve test edildi (14/14 geçiyor).
- ✅ Frontend yazıldı, build doğrulandı.
- ⏳ Yapılacaklar: gerçek Base vault adreslerinin doğrulanması, testnet deploy, fork testleri, Slither/Mythril, harici denetim.

## Güvenlik & sınırlamalar

- Lend, anapara riski getirir; bu yüzden yalnızca düşük riskli, denetlenmiş vault'lar beyaz listeye
  alınır ve getiri tamponu ilk zararı karşılar. Yine de stablecoin depeg / vault iflası riski
  sıfır değildir.
- Üretim öncesi: çok-imzalı (multisig) sahiplik, harici denetim, gerçek vault adreslerinin
  doğrulanması ve fork testleri şarttır.
- Türk çek mevzuatı açısından hukuki uygunluk bu teknik kapsamın dışındadır; danışılması önerilir.
