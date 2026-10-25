# Scritchy Scratchy: İlerleme ve Ekonomi Analizi (Faz 0, 2, 3)

> **Kanıt gösterimi:**
> - Kod kanıtı `Sınıf.Metot @ VA` biçiminde verildi (`GameAssembly.dll`, taban `0x180000000`).
> - Veri kanıtı `sharedassets2.assets › <TextAsset>` biçiminde verildi.
> - Sahne değeri kanıtı `level1 › <MonoBehaviour>.<alan>` biçiminde verildi.
>
> **Güven seviyeleri:**
> - **confirmed**: kodda doğrudan görüldü.
> - **likely**: veri dosyasından okunan sayı ya da güçlü çıkarım.
> - **hypothesis**: zayıf kanıta dayanan tahmin.
>
> Kullanıcı kuralı gereği **veri dosyalarından gelen tüm sayılar "likely"** olarak işaretlendi. Değerler sevk edilen JSON'dan birebir okundu. Ancak oyunda `GoogleSheetsImporter`, `RuntimeSheetImport` ve `StaticData.ReloadData` bulunuyor; yani veri çalışma zamanında yeniden yüklenebilir.

---

## Faz 0: Uygunluk kontrolü

**Sonuç: Evet, oyunda gerçek idle/incremental mekanikler var.** (confirmed)

| Mekanik | Var mı? | Kanıt |
|---|---|---|
| Zamanla biriken para (otomasyon) | Evet. ScratchBot, Fan, Mundo, Subscription Bot ve The Machine biletleri kendiliğinden kazıyor, topluyor ya da satın alıyor | `ScratchBot.Update`, `SubscriptionBot.Update`, `TheMachine.Update`; `UpgradeData` içinde "Scratch Bot Speed/Capacity/Strength", "Buying Speed" |
| Maliyeti artan yükseltmeler | Evet, üstel | `Helper.GetPrice @ 0x1804E5860` |
| Çevrimdışı ilerleme | **Hayır.** Yalnızca oynama süresi sayılıyor, o da 1 saatle sınırlı. Ayrıntı §2.5'te | `SaveManager.SaveNow @ 0x180535710` |
| Prestij/sıfırlama | Evet, iki katman. `SaveData` kalıcı; `PrestigeLayerOneData` her koşuda sıfırlanır | `SaveManager.ResetLayerOne @ 0x180535590`, `PrestigeManager.GrantPrestigeCurrency @ 0x180517CC0` |
| Sayı tabanlı ilerleme | Evet. Para `double` tipinde, bilet fiyatları 1'den 1e41'e uzanıyor; `BigNumFormatter` var | `PrestigeLayerOneData.money : double` |

Analiz ettikten sonra oyunun türünü şöyle tanımlıyorum: **kazı-kazan bileti temalı, aktif oynanış ile otomasyonu karıştıran bir incremental oyun.** Ayrıca "Final Chance" ölümüyle ilerleyen bir perde yapısı var (likely). Kodda `"Idle game"` string literal'ı da bulunuyor (metadata string #6083; büyük olasılıkla analitik etiketi, hypothesis).

---

## Faz 2: İlerleme ve ekonomi

### 2.1 Para birimleri

| Birim | Saklandığı yer | Nasıl kazanılır | Üst sınır | Güven |
|---|---|---|---|---|
| **Para ($)** | `PrestigeLayerOneData.money : double` | Bilet nakde çevrilince: `PlayerCashOut.CashOutTicket @ 0x18050DA80` → `Ticket.GetValue` → `PlayerWallet.AddMoney @ 0x180514ED0`. Manuel kazımada aksiyon başına, otomasyonda zamanlayıcı başına | Sınır yok, `double` (~1.8e308) | confirmed |
| **JP (prestij parası, "Jack Points")** | `SaveData.prestigeCurrency : int` | Koşu sonunda `GrantPrestigeCurrency` ile: `prestigeCurrency += GetRunReward()` | `int` | confirmed |
| **Tokens** | `SaveData.tokens : double` | Başarım rozetleri: `BadgeCollection.ClaimReward`. Harcandığı yer: `NightMarket` (kozmetik), `RespecTokens` | Sınır görülmedi | confirmed (alan ve metotlar). Kazanç miktarı: hypothesis |
| **Souls** | `PrestigeLayerOneData.souls : int` | The Machine kademeleri (`MachineTiersData.souls`). Bazı biletler ruh ister: `Ticket.CostsSoul` | | confirmed (alan). Akış: likely |
| Bilet XP | `TicketProgressionData {xp, level}` | Her nakde çevirme ya da çöpe atma: `TicketProgressionManager.AddXPToTicket @ 0x18053CCB0` | Seviye sınırı §2.2'de | confirmed |

**Başlangıç parası: `SaveData.STARTING_MONEY = 1` (confirmed).** `SaveData..cctor @ 0x180534460` statik alana `1` yazıyor. Aynı fonksiyon `CURRENT_SAVE_VERSION = "0.1"` değerini de atıyor. Allowance perk'i başlangıcı $100 yapar (`PerkData › Allowance.value = 100`, likely).

### 2.2 Yükseltmeler

**Maliyet formülü: üstel** (confirmed)

```
fiyat(n) = basePrice × priceIncrease ^ n          // Helper.GetPrice @ 0x1804E5860
                                                  // double × Math.Pow(float, int)
toplu alım = Σ_{i=0..k-1} fiyat(n+i)              // MultiBuyPanel.GetPrice @ 0x18055E690
mağaza fiyatı = Round(GetPrice(...) × kredi_çarpanı × meydan_okuma_çarpanı)
                                                  // ShopPanel.CalculatePrice @ 0x1805649D0
```

**Etki formülü** (confirmed): `UpgradeData.GetValue(buyCount, baseValue) @ 0x180574120`

- `valueIncreaseOperator == 1 (Mult)`: `baseValue × valueIncrease ^ buyCount`
- Aksi halde (`2 = Plus`): `baseValue + valueIncrease × buyCount`
- Enum değerleri metadata'dan: `MathOperator {Null=0, Mult=1, Plus=2}` (confirmed).
- Satın alma anında da aynı mantık artımlı uygulanıyor: `UpgradeEffects.Modify @ 0x180574330` ve `0x180574360`. Her alımda değer `+= valueIncrease` ya da `*= valueIncrease` olur.

**Yükseltme tablosu** (`sharedassets2.assets › UpgradeData`, 43 kayıt, **likely**). İki panel var: `panelIndex 0` = gadget/otomasyon, `1` = kazıma.

| Kategori | Yükseltme | basePrice | priceIncrease | Maks | Etki | Etki hedefi (kod) |
|---|---|---|---|---|---|---|
| Kazıma | Scratch Luck | 200 | ×5 | 60 | +1 şans | `PlayerScratching.BaseScratchLuck` (lambda `b__4_10 @ 0x180572B00`) |
| Kazıma | Coin araçları (Tin, Aluminum, Copper, Bronze, Iron, Steel, Titanium, Tungsten) | 1e3 → 1e27 | tek seferlik | 1 | Yeni kazıma aleti (daha büyük fırça) | `PlayerScratchTool..ctor` |
| Kazıma | Scratch Size_<Coin> | 25 → 1e28 | ×4 … ×10 | 2 | +1 fırça boyutu | `PlayerScratchTool` (likely) |
| Otomasyon | Scratch Bot | 1 000 | tek | 1 | Otomatik kazıyıcıyı açar | `UpgradeEffects` lambda 0–9 |
| Otomasyon | Scratch Bot Speed | 5 000 | ×5 | 30 | +0.5 hız çarpanı | `ScratchBot.speedMult` (+0xCC) |
| Otomasyon | Scratch Bot Capacity | 2 500 | ×10 | 10 | +3 kapasite | `ScratchBot.capacity` (+0xC4) |
| Otomasyon | Scratch Bot Strength | 2 000 | ×20 | 20 | +1 güç | `ScratchBot.strength` (+0xC8) |
| Otomasyon | Fan / Fan Speed / Fan Battery | 5e4 / 2.5e5 / 1e5 | – / ×5 / ×4 | 1 / 5 / 5 | Bileti bota üfler; hız +0.5; batarya **×2 (Mult)** | `Fan.SpeedMult`, `Fan.BatteryCapacityMult` |
| Otomasyon | Mundo / Mundo Speed | 2e9 / 1e10 | – / ×5 | 1 / 10 | Bilet toplayan evcil hayvan; hız +0.5 | `Mundo.ClaimSpeedMult` (+0xB8) |
| Otomasyon | Spell Book / Spell Charge Speed | 1e15 / 1e16 | – / ×5 | 1 / 10 | Anında kazıma büyüsü; +0.5 şarj | `SpellBook.RechargeSpeedMult` (+0x28) |
| Otomasyon | Subscription Bot / Buying Speed | 1e17 / 1e18 | – / ×5 | 1 / 10 | Otomatik bilet satın alma; +0.5 | `SubscriptionBot.ProcessingSpeedMult` (+0x60) |
| Otomasyon | Egg Timer / Timer Capacity / Timer Charge | 1e24 / 5e24 / 1e25 | – / ×5 / ×5 | 1 / 10 / 10 | Otomasyonu hızlandıran zaman çarpanı | `EggTimer` |
| Otomasyon | Warp Speed | 1e27 | ×1000 | 3 | +0.5 Egg Timer çarpanı | `EggTimer.MultMultiplier` (+0x48) |
| Otomasyon | The Machine | 1 000 | tek | 1 | Gelir çarpanı makinesi | `TheMachine` |
| Otomasyon | Trash Can, Sticky Mat, Badge Collection | 2 / 5e4 / 5e7 | tek | 1 | Masa gadget'ları | |
| Meydan okuma | Combo Time, Combo Count, Level Up, Reset and Multiply | 5e3, 5e4, 2e3, 5e3 | ×5, ×10, ×10, ×2 | 5, 4, 9, 3 | Yalnızca meydan okuma (challenge) modlarında. Combo = "2048 Mode" bilet birleştirme. Reset&Multiply = kazanç ×2^n | `TicketCombiner.get_MergeDelay/get_PairsPerMerge`, `SpecialUpgrades.get_WinningsMult @ 0x1804D0D50` |

**Önemli tasarım bulgusu, göreli şans (confirmed).** Her sembolün 7 şans katmanlı bir ağırlık dizisi var (`SymbolData.chances[7]`). Hangi katmanın kullanılacağı şöyle belirleniyor:

```
ScratchLuck = max(-3, BaseScratchLuck − LuckReduction)          // PlayerScratching.get_ScratchLuck @ 0x1805137B0
katman      = clamp(ScratchLuck − ticket.baseLuck, −3, +3) + 3   // Helper.GetMappedIndex @ 0x1804E5230 (layers=7)
```

Yani şans **mutlak değil, biletin `baseLuck` değerine göre** hesaplanıyor. Biletlerin `baseLuck` değeri 0'dan 58'e çıkıyor. Böylece yeni bilete geçen oyuncu "yeniden şanssız" başlar ve aynı yükseltme hattı tüm oyun boyunca anlamlı kalır.

**ScratchBot verimliliği** (confirmed: `ScratchBot.GetEfficiencyMult @ 0x180535E70`):

| `strength + extraStrength − hardness` | < −2 | −2 | −1 | 0 | +1 | ≥ +2 |
|---|---|---|---|---|---|---|
| Kazıma hızı çarpanı | 0 (kazıyamaz) | 0.25 | 0.5 | 1.0 | 1.5 | 2.0 |

- Day Job'un `hardness` değeri 99999; bot onu kazıyamaz.
- Dishwasher perk'i (PerkType 37) Day Job sertliğini 0 yapar (`ScratchBot.GetTicketHardness`, confirmed).

Bot hızı (confirmed: `ScratchBot.get_SpeedMult @ 0x180537B70`):

```
speedMult × max(1, extraSpeed) × LoanPanel.GetSpeedReductionMult × EggTimer.Multiplier
```

Sahne değerleri (`level1`, likely): `ScratchBot.processingDuration = 20 s`, `SubscriptionBot.processingDuration = 3 s`, `TheMachine.processingDuration = 30 s`.

**Bilet XP ve seviye** (confirmed):

```
XP_gereken(level) = floor(xpNeeded × xpIncreaseMult ^ level) × (1 − BuiltDifferent%)
                    // TicketProgressionManager.GetXPNeeded @ 0x18053D030
                    // → Helper.GetPredictedValueInt @ 0x1804E57E0
Maks seviye       = 10 (+ Experienced perk: 10 × adet, 5'e kadar)
                    // PerkManager.GetTicketMaxLevel @ 0x1804FF5A0, sabit 0xA
Day Job + PlateMaster5000 → sınırsız (0x7FFFFFFF)
```

Tipik bilet verisi (likely): `xpNeeded = 10`, `xpIncreaseMult = 1.2`, `valueMultIncrease = 1.3`. Day Job için 5 / 1.5 / 1.5.

**Prestij yükseltmeleri (Perk'ler)** (`PerkData`, 35 kayıt, likely):

- JP ile alınır. Fiyat `price × priceIncrease^n` (aynı üstel kalıp, likely).
- Örnekler:
  - Jackpot Power: 2 JP, ×2, 5 seviye, jackpot başına +1 JP
  - Starter Kit: 1 JP, Scratch Bot ile başla
  - Big Winner: +%15 jackpot
  - Experienced: 200 JP, +10 maks seviye
  - Muscle Memory, Allowance, Super Lucky, Time Travel: 0 JP, "1–4 kez ölünce kalıcı açılır"

### 2.3 Gelir formülü, çarpanlar ve azalan getiri

Bilet değeri (confirmed: yapı `Ticket.GetValue @ 0x180551350`; sembol eşleşme ayrıntısı kısmen):

```
değer = Σ(eşleşen sembol değerleri, SymbolSlot.GetValue) × Ticket.GetMult
```

`Ticket.GetMult @ 0x180550C40` (confirmed):

```
seviyeÇarpanı = 1 × valueMultIncrease ^ level            // Helper.GetPredictedValueFloat @ 0x1804E57B0
perkÇarpanı   = PerkManager.GetTicketMult(t)             // 1 + Σ perk yüzdeleri (TOPLAMSAL)
              − LoanPanel.GetTicketMultReduction(t)      // @ 0x1804FF670
düzÇarpan     = ChallengeRules.IncomeMult
              × TheMachine.IncomeMult
              × (LoanShark ? max(1, kredi_sayısı) : 1)
GetMult       = perkÇarpanı × seviyeÇarpanı × düzÇarpan
```

- `PerkManager.GetTicketMult` 1.0 ile başlar ve aktif perk'lerin değerini **toplar** (`addss` zinciri). Bazıları bilet seviyesiyle çarpılır (CleanFreak, SmartInvestment). Yani perk'ler **toplamsal**, seviye ise **üstel** çarpan veriyor (confirmed).
- `PerkData.GetValue @ 0x1804FE350`: `value × satın_alma_sayısı`. Açıklamada "%" varsa `/100` (confirmed).
- `TheMachine.IncomeMult @ 0x18053C9A0` = `tiers[min(machineTier−1, son)].bonusIncome`. Kademe yoksa 1 (confirmed). Kademeler 1.1'den 3.6'ya +0.1 adımla çıkıyor, 26 kademe; fiyat ×20 artıyor (`MachineTiersData`, likely).
- `EggTimer.Multiplier @ 0x180529C30` = `max(1, multiplier × MultMultiplier)`, yalnızca şarj > 0 iken (confirmed). Sahne değerleri (likely): `multiplier = 2`, kapasite 30 s, tıklama başına +1.5 s. **Bu çarpan geliri değil, otomasyon hızını etkiliyor.** Çağıranlar: `ScratchBot`, `Mundo`, `SubscriptionBot`, `SpellBook` (confirmed, xref).

**Azalan getiri ve yumuşak sınırlar** (hepsi confirmed):

1. Göreli şans: ±3'te kırpılıyor (`GetMappedIndex`). Bilet baseLuck'ının 3 üstüne çıkmak artık fayda vermez. Scratch Luck maliyeti ise ×5 büyüyor.
2. Bilet seviyesi maks 10'da kesiliyor. 1.3^10 ≈ 13.8×; sonrası için perk gerekiyor.
3. ScratchBot verimliliği 2.0'da tavan yapıyor; güç farkı +2'den sonra fayda yok.
4. Perk'ler toplamsal; her yeni perk göreli olarak daha az etki ediyor.
5. Krediler (`LoanData`, likely): gelir −%10/20/30, fiyat +%10/20/30, bot hızı −%30/60/90 gibi cezalar. İflas önleme mekanizması olarak çalışıyor.
   - `Ticket.GetLoanValue` ≈ `max(5, 2 × en_ucuz_bilet) − mevcut_para` (likely, `@ 0x180550A00`).

### 2.4 İlerleme kapıları (milestone'lar)

`ProgressionGoalData` (33 hedef, likely), bu koşuda kazanılan toplam paraya göre açılıyor. Kontrol yeri: `PlayerWallet.AddMoney` → `ProgressionManager.ClaimGoalRewards` (confirmed).

| Hedef $ | Açılan | Perde |
|---|---|---|
| 3 / 10 / 50 / 100 | Trash Can, Two Win bileti, Upgrade Catalog, Mini Scratch | 1 |
| 1 000 | Scratch Bot (+hız, kapasite, güç) | 1 |
| 2e3 / 1e4 / 5e4 / 1e5 / 3e5 | Apple Tree, Quick Cash, Fan, Sticky Mat, Lucky Cat | 1 |
| 5e7 | **Final Chance** (perde sonu) | 1 |
| 2e7 … 5e12 | Act 2 kataloğu, **Prestige Button**, Badge Collection, Mundo, yeni biletler, Final Chance_2 | 2 |
| 2e14 … 1e21 | Spell Book, Subscription Bot, Final Chance_3 | 3 |
| 1e23 … 1e30 | Egg Timer, Final Chance_4 | 4 |
| 1e30 … 1e41 | Runestone, Hand of Death, Internal Documents ("Tüm meydan okumalar tamamlandı") | 5 |

Bilet fiyatları (likely): 1, 10, 100, 2e3, 1e4, 3e5, 2e7, 5e8, 1e10, 2e11, 2e14, 1e16, 5e17, 2e19, 6e22, 5e24, 8e26, 3e28, 1e33, 1e37, 1e41. Ardışık oran ×5 ile ×33 000 arasında; perde geçişlerinde sıçrıyor.

### 2.5 Çevrimdışı ilerleme

**Yok** (confirmed).

- Assembly-CSharp içinde `DateTime`/`DateTimeOffset` çağıran fonksiyonlar tarandı:
  - `SaveManager.SaveNow`, `SaveData..ctor`, `SaveManager.Import`, `SaveManager/<Awake>`
  - `AutoSaver.Update/Save`, `FileSystemSaveStorage.BackupFile`
  - BugReporter ve ses ayarları
- Hiçbiri ekonomiye geçen süre eklemiyor.
- `SaveManager.SaveNow @ 0x180535710` şunu yapıyor:
  ```
  now = UtcNow.ToUnixTimeMilliseconds
  playedTime += min(now − timestamp, 3 600 000)   // MAX_PLAYED_TIME_DELTA = 0x36EE80 ms = 1 saat
  timestamp = now
  ```
- Bu yalnızca **oynama süresi istatistiği**. Oyun kapalıyken para, XP ya da otomasyon ilerlemiyor.
- Hiçbir string literal'da "offline" veya "while you were away" metni yok.

### 2.6 Prestij ve sıfırlama

- **Tetikleyiciler:**
  - `RunEnd` enum'u: `Prestige`, `FinalChance`, `Bankruptcy`, `SoulLoss`, `Abandoned`, `ChallengeCompleted`, `ChallengeFailed`, `Ending`, `SecondEnding`, `Debug` (confirmed).
  - Prestige Button 2. perdede açılıyor (`ProgressionGoalData[11]`, likely).
  - Final Chance biletinde tek sembol olan `Death`, 7 katmanın hepsinde 1000 ağırlıkla geliyor. Bu bilet koşuyu bitiriyor: `Ticket.EndsRun`, `IsFinalChanceTicket` (likely).
  - Ölüm sayısı (`SaveData.deathCount`) kalıcı perk'leri açıyor.
- **Ne sıfırlanır** (confirmed): `SaveManager.ResetLayerOne @ 0x180535590` → `SaveData.layerOne = new PrestigeLayerOneData()` → `FillLayerOneData()`. Sıfırlananlar:
  - para
  - bilet XP/seviyeleri
  - tüm yükseltme satın alımları (`upgradeDataDict`)
  - masa nesneleri
  - jackpot listeleri
  - makine kademesi ve ruhlar
  - krediler
  - gadget durumları (fan şarjı, egg timer, mundo)
  - mürekkep ve yakıt
- **Ne kalır** (confirmed, `SaveData` üst seviye alanları):
  - `prestigeCount`, `prestigeCurrency` (JP), `boughtPrestigeUpgrades` (perk'ler), `totalPrestigeCurrencySpent`
  - `currentAct`, `deathCount`, `tokens`
  - başarımlar, kozmetikler, meydan okuma sonuçları, diyalog geçmişi, `playedTime`
- **Ödül formülü** (confirmed: `PrestigeManager.GetRunReward @ 0x1805178D0`, `GetBaseTicketReward @ 0x1805177E0`):

  ```
  biletJP(t, süper) = max(1, prestigeCurrencyMult ^ (t.catalog − 1)) × (süper ? 2 : 1)
                      + JackpotPower perk değeri
  koşuJP = Round( Σ_{jackpotsGotten} biletJP(t, false)
                + Σ_{superJackpotsGotten} biletJP(t, true) )
           × ChallengeRewards.CompletionJPMultiplier
  ```

  - `prestigeCurrencyMult = 5` (`level1 › PrestigeManager`, sahne verisi, likely).
  - Katalog 1/2/3/4/5 biletleri sırasıyla **1/5/25/125/625 JP** veriyor.
  - Jackpot listesi bilet kimliği dizisi (`List<string>`). Bilet türü başına bir kez sayılıp sayılmadığı doğrulanmadı (hypothesis).

### 2.7 Kayıt verisi

- **Biçim:** Newtonsoft ile düz **JSON** (confirmed). Kayıt alan adları `SaveData` ile birebir eşleşiyor; yerel `save.json` dosyasının yapısı doğrulandı.
- **Konum:** `Application.persistentDataPath + "/save.json"`. Kanıt: `FileSystemSaveStorage.GetPath @ 0x18052B8F0` (`Path.Combine` + `".json"`) ve `SaveManager.SAVE_NAME = "save"` (confirmed). Windows'ta yol `%USERPROFILE%\AppData\LocalLow\Lunch Money Games\Scritchy Scratchy\save.json`. Klasörde `steam_autocloud.vdf` de var, yani Steam Cloud kullanılıyor.
- **Otomatik kayıt:**
  - `AutoSaver.timeBetweenAutoSaves = 120 s`, `autoSaveCount = 5` (`level1`, likely).
  - Dosya adı `AutoSave_yyyy-MM-dd_HH-mm-ss.json` (`AutoSaver.Update @ 0x180524FD0`, confirmed).
  - En eski yedekler `CleanupOldSaves` ile siliniyor.
  - Yerel klasördeki 5 dosyanın 2 dakika arayla oluşması bunu doğruluyor.
- **Güvenlik:** `FileSystemSaveStorage`; `IO_ATTEMPTS = 3`, `RETRY_DELAY_MS = 20`, recovery ve backup dosyaları (confirmed).
- **İlerleme alanları:**
  - Üst seviye: `saveVersion`, `timestamp` (unix ms), `playedTime` (ms), `prestigeCount`, `completedRunCount`, `prestigeCurrency`, `currentAct`, `deathCount`, `loanCount`, `tokens`, `boughtPrestigeUpgrades{id:adet}`, `everOwnedUpgrades`, `completedChallenges`, `challengeBestTimes`, `achievementsGotten/Claimed`
  - `layerOne`: `money`, `timeSpentInThisPrestige`, `ticketProgressionDict{id:{xp,level}}`, `upgradeDataDict{id:{buyCount}}`, `jackpotsGotten`, `superJackpotsGotten`, `lastUnlockedProgressionGoal`, `totalMoneyEarnedThisProgressionGoal`, `loans[{id,severity,amount}]`, `machineTier`, `souls`, `electricFanChargeLeft`, `eggTimerChargeLeft`, `printerInk`, `furnaceFuel`, …

---

## Faz 3: His ve tempo

### 3.1 Sabitlerden tahmin

**Erken oyun, ilk ~10 dakika (likely):**

- $1 ile başlanır. Day Job sınırsız ve yalnızca elle kazınır; bot kazıyamaz.
- İlk hedefler $3, $10, $50 ve $100. Bu, ilk dakikalarda hızlı bir "aç, aç, aç" ritmi yaratıyor.
- Scratch Bot $1 000'de açılıyor ve oyun otomasyona geçiyor.
- İlk şans seviyeleri ucuz: 200, 1 000, 5 000.

**Orta oyun, 2. ve 3. perde (likely):**

- Scratch Luck maliyeti ×5 artarken bilet `baseLuck` değeri her yeni bilette +2 ile +4 artıyor. Şans paritesini korumanın maliyeti bilet başına kabaca ×25 ile ×600 arasında. Bu, bilet fiyat oranlarıyla (×20 ile ×50) aynı mertebede.
- Sonuç: oyuncu her yeni biletle **göreli olarak aynı yerde** kalıyor ve ilerleme "hissi" korunuyor.
- Seviye 19'a kadar toplam şans maliyeti ≈ 9.5e14, seviye 25'e kadar ≈ 1.5e19.

**Geç oyun, 4. ve 5. perde (likely):** Bilet fiyatları ×1e4 ile ×3e4 sıçrıyor; burada perk'ler ve Egg Timer çarpanı devreye giriyor.

**Gerçek bir veri noktası (likely, tek oyuncu).** Yerel kayıtlarda şu görülüyor:

- ~137 dakika oynama süresinde 2. perde bitmiş, 3 ölüm ve 4 prestij var.
- 2. perde koşusunun 75. dakikasında para ~2.8e15, Scratch Luck 20, Bot Speed 17/30, Capacity 10/10.
- Toplam harcanan JP 55.

Bu, "bir perde ≈ 60–75 dakika" temposuna işaret ediyor.

### 3.2 Yavaşlamayı nasıl geciktiriyor?

Hepsi kod ya da veriyle destekleniyor:

1. **Sık ve küçük hedefler.** 33 ilerleme hedefi var ve her biri yeni bilet, gadget ya da diyalog açıyor. Oyuncu bir sonraki ödüle hep yakın.
2. **Göreli şans ve yeni bilet "sıfırlaması".** Her yeni bilet hem daha pahalı hem daha zor. Eski yükseltmeler değersizleşmiyor, hedef kayıyor.
3. **Otomasyonun kademeli açılması.** Bot ($1e3) → Fan ($5e4) → Mundo ($2e9) → Spell Book ($1e15) → Subscription Bot ($1e17) → Egg Timer ($1e24). Her duvar yeni bir otomasyon katmanıyla kırılıyor.
4. **Prestijde ölüm ve ilerleme kazancı.** Perde sonunda ölünce kalıcı perk'ler açılıyor (Muscle Memory +%25 vb.). Katalog başına ×5 artan JP, yeni perdelerin ödülünü üstel tutuyor.
5. **Kredi güvenlik ağı.** İflasta ceza karşılığında kredi verilerek ilerleme kilidi önleniyor (`PlayerCashOut.SpawnLoanWithDialogue`, `ResolveBankruptcy`).
6. **Meydan okumalar.** 9 farklı kural seti JP, başlangıç seviyesi, sonsuz fan bataryası gibi ödüller veriyor. Geç oyunda çeşitlilik sağlıyor (`ChallengeData`, likely).

---

## Ek: Bulgu defteri

| # | Bulgu | Kanıt | Güven |
|---|---|---|---|
| 1 | Fiyat = base × inc^n | `Helper.GetPrice @ 0x1804E5860` | confirmed |
| 2 | Etki Plus/Mult | `UpgradeData.GetValue @ 0x180574120`, `MathOperator` enum | confirmed |
| 3 | Göreli şans ±3 | `Helper.GetMappedIndex @ 0x1804E5230`, `PlayerScratching.get_ScratchLuck @ 0x1805137B0` | confirmed |
| 4 | Bilet çarpanı zinciri | `Ticket.GetMult @ 0x180550C40` | confirmed |
| 5 | XP formülü | `TicketProgressionManager.GetXPNeeded @ 0x18053D030`, `Helper.GetPredictedValueInt @ 0x1804E57E0` | confirmed (floor yuvarlaması: likely) |
| 6 | Maks seviye 10 (+Experienced) | `PerkManager.GetTicketMaxLevel @ 0x1804FF5A0` | confirmed |
| 7 | JP ödülü | `PrestigeManager.GetRunReward/GetBaseTicketReward` | confirmed; `prestigeCurrencyMult = 5` likely |
| 8 | Reset kapsamı | `SaveManager.ResetLayerOne @ 0x180535590` | confirmed |
| 9 | Çevrimdışı ilerleme yok; playedTime delta ≤ 1 saat | `SaveManager.SaveNow @ 0x180535710`, DateTime xref taraması | confirmed |
| 10 | Kayıt JSON, `persistentDataPath/save.json`, 120 s'de bir autosave ×5 | `FileSystemSaveStorage.GetPath`, `AutoSaver.Update`, `level1 › AutoSaver` | confirmed / likely |
| 11 | STARTING_MONEY = 1, save version "0.1" | `SaveData..cctor @ 0x180534460` | confirmed |
| 12 | Bot verimlilik tablosu | `ScratchBot.GetEfficiencyMult @ 0x180535E70` | confirmed |
| 13 | Tüm tablo sayıları | `sharedassets2.assets` JSON | likely |
| 14 | Sembol eşleşme mantığının tam ayrıntısı | `Ticket.GetValue`, `SymbolSlot.GetValue` | kısmi; ayrıntı çözülmedi |
| 15 | Jackpot listesinde bilet başına tekillik | `jackpotsGotten: List<string>` | hypothesis |
