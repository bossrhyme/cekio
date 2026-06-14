# Chainlink Automation — Otomatik Vade Ödemesi (Base Sepolia)

`CheckRegistry`, Chainlink Automation ile uyumludur (`checkUpkeep` / `performUpkeep`). Bir keeper,
vadesi gelen çekleri otomatik olarak `settle` eder; manuel `settle()` her zaman yedek olarak çalışır.

## Nasıl çalışır

- `checkUpkeep(bytes)` — zincir dışında (gas'sız) çağrılır; aktif çekleri tarar, vadesi gelmiş
  olanların id listesini `performData` olarak döner (`MAX_SETTLE_BATCH = 20` ile sınırlı).
- `performUpkeep(performData)` — keeper zincir üstünde çağırır; her id'yi yeniden doğrular
  (settled/vade) ve `settle` eder. Yarış durumları güvenli (zaten ödenmişse atlar).

## Adım adım kayıt

1. **Önkoşul:** `CheckRegistry` Base Sepolia'ya deploy edilmiş olmalı (bkz. `TESTNET.md` Aşama 2).
   Registry adresini `deployments/baseSepolia.json`'dan al.

2. **Automation arayüzü:** https://automation.chain.link adresine git, cüzdanını bağla ve ağı
   **Base Sepolia**'ya geçir.

3. **Test LINK al:** https://faucets.chain.link (Base Sepolia LINK).

4. **Register new Upkeep** → **Custom logic** seç.

5. **Target contract address:** `CheckRegistry` adresini gir. (Doğrulanmış ABI varsa arayüz
   `checkUpkeep`/`performUpkeep`'i otomatik tanır.)

6. **Bilgiler:**
   - Upkeep name: `cekio-settle`
   - Gas limit: `500000` (varsayılan; `MAX_SETTLE_BATCH` settle işlemine yetecek şekilde ayarla)
   - Starting balance (LINK): örn. `5` test LINK
   - Check data: boş (`0x`) — `checkUpkeep` argümanı kullanmıyor.

7. **Register** ve işlemi onayla.

## Doğrulama

```bash
# Kısa vadeli (örn. 2 dk) bir çek oluştur
DEMO_MATURITY_SECONDS=120 npx hardhat run scripts/demo.ts --network baseSepolia
```

Vade dolduğunda Automation arayüzünde upkeep'in **performUpkeep**'i tetiklediğini ve çekin
otomatik `settle` olduğunu (anapara hamile, getiri keşideciye) göreceksin. `getCheck(id).settled`
artık `true` döner.

## Üretim notları

- Aktif çek sayısı büyürse `checkUpkeep` taraması maliyetli olur; üretimde zaman-sıralı bir kuyruk
  veya log-trigger Automation deseni tercih edin.
- Keeper'ın LINK bakiyesini izleyin; biterse otomatik ödeme durur (manuel `settle` yine çalışır).
- Mainnet'te upkeep'i bir multisig ile yönetin.
