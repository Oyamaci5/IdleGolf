# Melvor Idle: Referans Oyun Analizi (Adım 2)

> **Kapsam ve yöntem**
> - Hedef: `D:\SteamLibrary\steamapps\common\Melvor Idle`. Salt-okunur incelendi. Hiçbir oyun dosyası değiştirilmedi, yamalanmadı ya da projeye kopyalanmadı.
> - **Önemli:** Kurulum klasöründe oyun mantığı **yok**. `package.nw/index.html` yalnızca `https://steam.melvoridle.com` adresini bir `<iframe>` içinde açıyor (confirmed). Oyun kodu her açılışta sunucudan iniyor.
> - Bu yüzden kod, oyunun kendi NW.js profilindeki Chromium HTTP önbelleğinden (`%LOCALAPPDATA%\Melvor Idle\User Data\Default\Cache\Cache_Data`, blockfile biçimi) okundu.
>   - Önbellek dosyaları salt-okunur açıldı. Çıkarılan 1085 kayıt yalnızca oturum scratchpad'ine yazıldı; `IdleGolf` klasörüne kod ya da varlık kopyalanmadı.
>   - Ağ isteği yapılmadı, oyun çalıştırılmadı.
> - **REA:** `analyze_javascript_application` çıkarılan `assets/js/built` ağacı üzerinde koşuldu. 143 dosyalık envanter alındı ve 8 dosya ayrıştırıldı (`game.js`, `skill.js`, `utils.js`, `constants.js`, `serializeSave.js`, `account.js`, `shop.js`, `currency.js`).
>   - Evidence: `ev_e3ce5140bc32b61cefba77a2a675f0749b5e358c4573a381495fa2e41442f4c1` (özet görünümü `ev_b300f0b0…b096`).
>   - REA'nın sınırı: statik ayrıştırma, çalıştırma yok, kapsam kısmi. Formüller kaynak satırlarından elle okundu ve aşağıda dosya, sınıf ve fonksiyonla gösterildi.
> - **Güven seviyeleri:**
>   - **confirmed**: kodda doğrudan görüldü.
>   - **likely**: veri JSON'undan okundu ya da koddan türetilen bir hesap.
>   - **hypothesis**: zayıf çıkarım.
> - **Önbellek sürümü:** JS dosyaları `?12097`, veri dosyaları `?528` sorgu parametresiyle önbelleğe alınmış. Gelecekteki sunucu güncellemeleri bu sayıları değiştirebilir (likely).

---

## 1. Motor ve sürüm

| Bulgu | Kanıt | Güven |
|---|---|---|
| Masaüstü sarmalayıcı **NW.js 0.82.0** (Chromium ve Node gömülü) | `nw.dll` ve `node.dll` dosya sürümü 0.82.0; `Melvor Idle.exe` 1.0.8 | confirmed |
| Sarmalayıcı paketi `package.nw/package.json`: `"version": "1.2.2"`, `author: "Games by Malcs Pty Ltd"` | `package.nw/package.json` | confirmed |
| Oyun istemcisi **v1.3.1**, saf JavaScript (TypeScript'ten derlenmiş `built/*.js`), DOM/jQuery UI ve PixiJS | `account.js`: `gameVersion = 'v1.3.1'`; `assets/js/pixi.min.js`, `jquery`, `petite-vue.min.js` | confirmed |
| Sunucudan yükleniyor; yerel paket yalnızca iframe, Steam (greenworks) ve Discord RPC köprüsü | `package.nw/index.html` (`<iframe src="https://steam.melvoridle.com">`), `steamInit.js`, `discord.js` | confirmed |
| İçerik veri güdümlü: 5 JSON paketi (`melvorDemo`, `melvorFull`, `melvorTotH`, `melvorExpansion2` = AoD, `melvorItA`) | `assets/data/*.json` | confirmed |
| Oyun döngüsü 50 ms'lik tick | `combatManager.js`: `const TICK_INTERVAL = 50` | confirmed |

**Oyun idle mi?** Evet. Gerçek bir idle/incremental oyun (confirmed):
- Tek bir aktif eylem zamanla kendiliğinden tekrarlanıyor.
- Çevrimdışı ilerleme var.
- İlerleme üstel XP eğrisiyle ölçülüyor.

Ancak **klasik "sayı patlatan" bir incremental değil**. Ekonomi seviye tavanlı bir RPG (skill-based idle) gibi kurulu. Bu yüzden aşağıdaki bazı başlıklar (prestij, çok büyük sayılar) **uygulanmıyor** ya da farklı bir biçimde var.

---

## 2. İlerleme sistemleri

### 2.1 Para birimleri

| Birim | Kanıt | Güven |
|---|---|---|
| GP (ana para), Slayer Coins, Raid Coins, Abyssal Pieces, Abyssal Slayer Coins | `currency.js`: `class GP extends Currency`, `SlayerCoins`, `RaidCoins`, `AbyssalPieces`, `AbyssalSlayerCoins` | confirmed |
| Para miktarı düz `number` (`_amount = 0`) olarak tutuluyor; ayrı bir BigNum yok | `currency.js` `Currency` yapıcısı | confirmed |
| Asıl "ilerleme para birimi" **XP**. Her beceri ayrı XP ve seviye tutar, eylem başına ayrıca ustalık (mastery) XP'si birikir | `skill.js` `Skill`, `SkillWithMastery.addMasteryForAction` | confirmed |

### 2.2 XP ve seviye formülü (çekirdek eğri)

```
equate(L)     = floor( L + 300 · 2^(L/7) )
xpSum(L)      = Σ_{i=1..L-1} equate(i)
levelToXP(L)  = floor( xpSum(L) / 4 )
```

- Kaynak: `utils.js` `class ExperienceCalculator` (`equate`, `computeNextLevelXP`, `levelToXP`, `xpToLevel`). Güven: confirmed.
- Ters fonksiyon tahmini: `estimateXPToLevel(xp) = floor(7·log2(2^(1/7) + xp·(2^(1/7)−1)/75)) − 1`, ardından tek adımlı düzeltme (confirmed).

**Türetilmiş değerler** (aynı formülü çalıştırarak hesaplandı, likely):

| Seviye | 10 | 30 | 50 | 70 | 90 | 92 | 99 | 120 |
|---|---|---|---|---|---|---|---|---|
| Toplam XP | 1 154 | 13 363 | 101 333 | 737 627 | 5.35e6 | 6.52e6 | 13.03e6 | 104.3e6 |

- Seviye başına gereken XP her **7 seviyede ×2** artıyor (seviye başına ×≈1.104).
- Seviye 92 ≈ seviye 99 XP'sinin yarısı (likely, hesap).

**Abyssal seviyeler**: `AbyssalExperienceCalculator` aynı eğriyi 98 seviye kaydırarak kullanıyor (`levelOffset = 98`, `xpOffset = levelToXP(99)`). Yani abyssal 1→2 maliyeti, 99→100 maliyetine eşit (confirmed, `utils.js`).

### 2.3 Eylem hızı, gelir ve azalan getiri

- Eylem süresi değiştiriciler uygulandıktan sonra **en az 250 ms** (`skill.js` `Skill.modifyInterval`: `return Math.max(interval, 250)`, confirmed). Hız yükseltmelerinin sert tabanı bu.
- Örnek veri, Woodcutting ağaçları (`melvorDemo.json` ve `melvorTotH.json` › `skillData` › `trees`, likely):

  | Ağaç | Seviye | XP | Süre | XP/saat |
  |---|---|---|---|---|
  | Normal | 1 | 10 | 3 s | 12 000 |
  | Willow | 25 | 22 | 5 s | 15 840 |
  | Yew | 60 | 80 | 12 s | 24 000 |
  | Redwood | 90 | 180 | 15 s | 43 200 |
  | Carrion | 120 | 555 | 40 s | 49 950 |

- **Okuma (likely, hesap):**
  - Seviye maliyeti üstel büyüyor (7 seviyede ×2).
  - Eylem verimi ise yaklaşık doğrusal büyüyor (1'den 120'ye ~4×).
  - Değiştiricisiz bir modelde en iyi ağaçla toplam süre: seviye 50'ye ~6 saat, seviye 75'e ~55 saat, seviye 99'a ~405 saat, seviye 120'ye ~2 250 saat. Hesap scratchpad'de yapıldı. Ustalık, dükkân ve diğer değiştiriciler hesaba katılmadı; gerçek süreler daha kısa (hypothesis).
- **Dükkân, banka yuvası maliyeti** (`shop.js` `Shop.getCurrencyCost`, `case 'BankSlot'` + `class NewNewBankUpgradeCost`, confirmed):

  ```
  yuva(L) = floor( 2654570 · 50·L / 142015^(163/(120+L)) )
  ```

  Her yuva fiyatı **5 000 000 GP ile sınırlı**. Sınıra ulaşınca kalan her yuva sabit 5M. Bu, büyüyen bir maliyet eğrisinin **sert tavanla** kesilmesine örnek.
- **Doğrusal ölçekli satın alma** (`case 'Linear'`): `scaling/2·(n'(n'−1) − n(n−1)) + adet·initial`, yani aritmetik seri toplamı (confirmed).

### 2.4 Ustalık (mastery) ve havuz

- Eylem başına ustalık XP'si (`skill.js` `SkillWithMastery.getBaseMasteryXPToAddForAction`, confirmed):

  ```
  xp = ((açılmışEylem · toplamUstalık / maksToplamUstalık) + ustalıkSeviyesi · (toplamEylem / 10)) · (süre_ms / 1000) / 2
  ```

  Formül hem o eylemin seviyesini hem **o becerideki tüm eylemlerin toplam ustalığını** ödüllendiriyor. Yeni bir eylemi açmak eskileri de hızlandırıyor.
- Havuza akan pay (`getMasteryXPToAddToPool`): beceri seviyesi < 99 iken `xp/4`, ≥ 99 iken `xp/2` (confirmed).
- Havuz tavanı (`getBaseMasteryPoolCap`): `eylemSayısı × 500 000` (confirmed).
- Havuz eşikleri **%10 / %25 / %50 / %95**. Her eşik kalıcı bir bonus açıyor; örneğin Woodcutting: +%5 ustalık XP, +%5 ikileme, +%50 kütük satış GP'si, +1 kuş yuvası (`melvorDemo.json` › Woodcutting › `masteryPoolBonuses`, likely). Eşik sayımı `getActiveMasteryPoolBonusCount` ile yapılıyor (confirmed).
- Havuz XP'si harcanınca eşiğin altına düşülürse oyuncuya uyarı gösteriliyor (`levelUpMasteryWithPoolXP` → `MENU_TEXT_HOLD_UP`, confirmed).
- Ustalık seviye bonusları: örneğin "seviye 10'dan itibaren her 10 seviyede +%5 ikileme, 90'da durur" (`levelScalingSlope: 10`, `levelScalingMax: 90`) ve 99'da −0.2 s süre. Kaynak: `skill.js` `class MasteryLevelBonus.getBonusScale` (confirmed) ve veri (likely).

### 2.5 Seviye tavanları ve içerik kapıları (prestijin yerine geçen şey)

- `skillLevelCapIncreases` (likely):
  - AoD genişlemesi `Pre99Dungeons`: 21 zindan seti; her set +5 sabit artış ve rastgele +15; tavan 99.
  - TotH `Post99Dungeons`: 6 set, +3 sabit ve +8 rastgele, tavan 120.
  - ItA `TheAbyss`: abyssal +10/+15, tavan 60.
- Kod tarafı (confirmed): `skill.js` `Skill.currentLevelCap`, `maxLevelCap` ve `levelCapPurchase` render akışı. Oyun modunda `levelCapCost` varsa tavan satın alınabiliyor (`game.currentGamemode.levelCapCost`).
- **Okuma:** İlerleme "sıfırla ve tekrar oyna" ile değil, **içerik tamamlama ile açılan tavan bantlarıyla** uzatılıyor (likely).

### 2.6 Prestij ve sıfırlama

- **Yok** (confirmed, sınırlı arama). `assets/js/built/*.js` içinde "prestige" geçen hiçbir tanımlayıcı yok. Bu bir grep sonucu: dinamik adlar gözden kaçmış olabilir, ama tasarımda bir sıfırlama katmanı görülmedi.
- Sıfırlamanın yerine geçen **oyun modları** var (`melvorDemo/Full/Expansion2.json` › `gamemodes`, likely):
  - `Hardcore`: `isPermaDeath: true`, `hasRegen: false`.
  - `Adventure`: `capNonCombatSkillLevels: true`. Beceriler para ile tek tek açılıyor; `skillUnlockCost` 10 000 → 25 000 → … → 500 000 000 GP.
  - `AncientRelics`: ikileme şansı kapalı, relic sistemi açık.
  - Süreli etkinlik modları (`isEvent: true`, `endDate`).
- Bunlar yeni bir karakterle baştan oynamayı teşvik ediyor ama **kalıcı bonus aktarmıyor** (hypothesis: karakterler arası bonus kodu aranmadı).

### 2.7 Çevrimdışı ilerleme

Kaynak `game.js` `class Game` (confirmed):

```
MIN_OFFLINE_TIME = 60 000 ms      // 1 dk'dan kısa boşluk çevrimdışı sayılmaz
MAX_OFFLINE_TIME = 86 400 000 ms  // 24 saat tavan
loop(): delta = max(now − tickTimestamp, 0)        // negatif saat → 0
        delta ≥ MIN ise enterOfflineLoop()
loopOffline(): totalTime = min(now − startTime, MAX_OFFLINE_TIME)
               ticksLeft = floor((totalTime − timeProcessed) / TICK_INTERVAL)
               runTicks(min(tickRate, ticksLeft))   // AYNI tick mantığı, verim %100
               tickRate = floor(ticks/ms · 50 · OFFLINE_GC_RATIO(0.95))   // uyarlamalı parti boyu
exitOfflineLoop(): snapshot farkı modalda gösterilir, trackOfflineTelemetry(...)
```

- Çevrimdışı süre bir formülle tahmin edilmiyor; **gerçek tick'ler hızlandırılmış olarak yeniden oynatılıyor**. Verim %100, tavan 24 saat (confirmed).
- Bazı eylemler çevrimdışına girerken durduruluyor: ayar kapalıysa savaş, kilitliyse hırsızlık (`enterOfflineLoop`, confirmed).
- Dönüşte "siz yokken" özeti gösteriliyor: `offline-progress` bileşeni, `setMessages(old, new, timeProcessed)` (confirmed).

### 2.8 Kayıt biçimi ve sürümleme

- **İkili kayıt** (`saveWriter.js` `SaveWriter.getSaveString`, confirmed):
  1. `'melvor'` sihirli başlık (6 bayt), başlık bloğu ve gövde.
  2. `fflate.zlibSync` ile sıkıştırma.
  3. `btoa` ile Base64 metin.
- Okurken sihirli başlık doğrulanıyor (`setDataFromSaveString`, confirmed).
- `serializeSave.js`: `const currentSaveVersion = 131` (confirmed). Eski biçim için göç döngüsü var: `for (i = saveVersion + 1; i <= saveFormat2Version; i++) { …Diff[i].add.forEach(setSaveKeyToDefault) }` (confirmed). Her sürümde eklenen alanlar varsayılanla dolduruluyor.
- Kayıt başlığı (`game.js` `Game.getSaveHeader`, confirmed): `saveVersion`, `characterName`, `currentGamemode`, `totalSkillLevel`, `gp`, `offlineAction`, `tickTimestamp`, `saveTimestamp`, `activeNamespaces`, `modProfile`.
- **Gelecek sürüm koruması:** Kaydın sürümü istemciden yeniyse yüklenmiyor (`game.js` `getHeaderFromSaveString`: `if (header.saveVersion > currentSaveVersion)`, confirmed).
- Otomatik kayıt **10 s**'de bir: `game.js` `const AUTO_SAVE_INTERVAL = 10000`; `Game.autoSave` (confirmed). Bulut kayıt için ayrı `cloudUpdate` var (confirmed).

### 2.9 Büyük sayı gösterimi

- `utils.js` `formatNumber`, ayar `ShowThousands` (confirmed):
  - 1e5 ile 1e7 arası "K", 1e7 ile 1e10 arası "M", 1e10 ile 1e13 arası "B", 1e13 ile 1e15 arası "T".
  - **≥ 1e15 ise ">999T"** gösteriliyor.
  - Bu dalda 1e13–1e15 aralığı `/1e9` ile bölünüyor. Kodda böyle (confirmed). Hata olup olmadığı belirsiz (hypothesis).
- `CondenseThousands` ayarında eşikler 1e5 / 1e6 / 1e9 / 1e12'de başlıyor (confirmed).
- **Okuma:** Ekonomi sayıları 1e15'in altında kalacak biçimde tasarlanmış. Bilimsel gösterim yok (likely).

---

## 3. Tempo: erken, orta ve geç oyun

| Evre | Ne oluyor? | Kanıt | Güven |
|---|---|---|---|
| **Erken** (ilk saat) | Seviyeler dakikalar içinde geliyor; seviye 10 için 1 154 XP yeterli, Normal ağaçla ~6 dk. Yeni ağaç kademeleri sık açılıyor (seviye 1, 10, 25, 35…) | XP tablosu + `trees` verisi | likely |
| **Orta** (onlarca saat) | Seviye başına süre her 7 seviyede ikiye katlanıyor. Bunu dengeleyen şeyler: yeni eylemler, ustalık havuzu eşikleri ve dükkân yükseltmeleri | `ExperienceCalculator`, `masteryPoolBonuses` | likely |
| **Geç** (yüzlerce saat) | 99'a yaklaşırken bir seviye günler sürebiliyor (92 = 99'un yarısı). Ardından genişleme içeriğinin açtığı yeni tavan bantları geliyor (99→120, abyssal 1→60) | `skillLevelCapIncreases` | likely |

### Oyunun sıkıcılaşmayı nasıl önlediği

1. **Paralel ilerleme hatları.** ~29 beceri kaydı (`game.js` `registerSkill(` çağrısı sayısı 29, likely), her becerinin onlarca eylemi ve eylem başına ayrı ustalık var. Bir hat yavaşlayınca başka bir hat hızlı.
2. **Çapraz besleme.** Ustalık XP formülü becerinin toplam ustalığını içeriyor. Yeni eylem açmak eski eylemlerin de hızını artırıyor (confirmed).
3. **Eşik bonusları.** Havuz %10/25/50/95 ve ustalık seviye bonusları oyuncuya sürekli "yakın bir sonraki hedef" veriyor (confirmed + likely).
4. **İçerik kapılı tavan bantları.** Seviye tavanı zindan tamamlamayla adım adım açılıyor; bu bir "son"dan sonra yeni bir bant demek (likely).
5. **Sert tabanlar ve tavanlar.** Eylem süresi ≥ 250 ms, banka yuvası ≤ 5M GP, ustalık 99, havuz tavanı. Sayılar sonsuza kaçmıyor (confirmed).
6. **Koleksiyon ve tamamlama.** `completionLog.js` `class Completion` (beceri, ustalık, eşya, canavar, evcil hayvan yüzdeleri; confirmed). 77 evcil hayvan ve 92 Steam başarımı var (`pets`, `steamAchievements` veri sayımı, likely).
7. **Alternatif oyun modları.** Hardcore, Adventure, Ancient Relics ve süreli etkinlik modları farklı kurallarla yeniden başlama imkânı veriyor (likely).
8. **Cömert çevrimdışı.** Verim %100, tavan 24 saat. Oyuncu ertesi gün döndüğünde ilerlemiş oluyor (confirmed).

---

## 4. Idle Golf için çıkarımlar (genel kalıplar, kopya değil)

| Kalıp | Melvor'daki örnek | Idle Golf'te kullanım (§'ler `design/idle_golf_blueprint_v2.md`) |
|---|---|---|
| İçerik tamamlama ile açılan bantlar | Zindan → seviye tavanı | Kurs veya bant tamamlama → bir sonraki bandın kilidi (§11.3) |
| Hız için sert taban | 250 ms | Kaddi vuruş hızı görsel tavanı ve fazlasının çarpana dönüşmesi (§11.4) |
| Maliyet tavanı | Banka yuvası 5M | Kalite-yaşam (QoL) yükseltmelerinde sabit tavan |
| Eşik bonusları | Havuz %10/25/50/95 | Yıldız eşikleri (kurs başına 18/36/54★) (§11.5) |
| Çevrimdışı = aynı simülasyon | `runTicks` tekrarı | Çevrimdışını kaba adımlı aynı simülasyonla hesaplamak (§5) |
| Kayıt göçü ve gelecek sürüm koruması | `currentSaveVersion`, göç döngüsü | `saveVersion` + sıralı `migrate_vN` + "daha yeni kaydı reddet" (§6.2) |

**Kopyalanmaması gerekenler** (blueprint §9'a eklendi):
- Melvor adları: beceri, eşya, bölge, mod ve para birimi adları ("Mastery Pool", "Ancient Relics", "Golbin", "Township"…).
- Görseller, metinler ve veri tabloları; örneğin XP sabitleri `300·2^(L/7)` ve `/4`, havuzun `500 000`'i, yuva formülü sabitleri, `skillUnlockCost` dizisi.
- Kod yapısı.

---

## Ek: Bulgu defteri

| # | Bulgu | Kanıt (dosya › sınıf.fonksiyon) | Güven |
|---|---|---|---|
| 1 | Yerel pakette oyun mantığı yok; iframe ile uzak istemci | `package.nw/index.html` | confirmed |
| 2 | NW.js 0.82.0; istemci v1.3.1 | `nw.dll` VersionInfo; `account.js` `gameVersion` | confirmed |
| 3 | Tick 50 ms | `combatManager.js` `TICK_INTERVAL` | confirmed |
| 4 | XP eğrisi `floor(L+300·2^(L/7))`, toplam/4 | `utils.js` `ExperienceCalculator.equate/levelToXP` | confirmed |
| 5 | Abyssal eğri 98 seviye kaydırmalı | `utils.js` `AbyssalExperienceCalculator` | confirmed |
| 6 | Eylem süresi tabanı 250 ms | `skill.js` `Skill.modifyInterval` | confirmed |
| 7 | Ustalık XP formülü ve havuz payı 1/4 (99'da 1/2) | `skill.js` `SkillWithMastery.getBaseMasteryXPToAddForAction`, `getMasteryXPToAddToPool` | confirmed |
| 8 | Havuz tavanı eylem × 500k; eşik sayımı | `skill.js` `getBaseMasteryPoolCap`, `getActiveMasteryPoolBonusCount` | confirmed |
| 9 | Havuz eşikleri 10/25/50/95 | `melvorDemo.json` › `masteryPoolBonuses` | likely |
| 10 | Seviye tavanı içerikle açılıyor (99, 120, abyssal 60) | `melvorExpansion2/TotH/ItA.json` › `skillLevelCapIncreases`; `skill.js` `currentLevelCap` | likely / confirmed |
| 11 | Prestij yok | `built/*.js` grep (sınırlı arama) | confirmed (aranan kapsamda) |
| 12 | Oyun modları, Adventure açılım maliyetleri | `*.json` › `gamemodes` | likely |
| 13 | Çevrimdışı: min 1 dk, maks 24 saat, aynı tick'ler, %100 | `game.js` `Game.loop/enterOfflineLoop/loopOffline` | confirmed |
| 14 | Kayıt: 'melvor' + zlib + Base64; sürüm 131; göç döngüsü; yeni sürüm reddi | `saveWriter.js` `getSaveString`; `serializeSave.js`; `game.js` `getHeaderFromSaveString` | confirmed |
| 15 | Otomatik kayıt 10 s | `game.js` `AUTO_SAVE_INTERVAL` | confirmed |
| 16 | Sayı gösterimi ≥1e15 → ">999T" | `utils.js` `formatNumber` | confirmed |
| 17 | Banka yuvası maliyeti 5M tavanlı | `shop.js` `Shop.getCurrencyCost`, `NewNewBankUpgradeCost` | confirmed |
| 18 | Değiştiricisiz 99 ≈ 405 saat | Formül + veri hesabı | likely (modelin dışında kalan değiştiriciler var) |
| 19 | ~29 beceri, 77 evcil hayvan, 92 Steam başarımı | `game.js` `registerSkill(` sayımı; veri sayımı | likely |

Kaynak dosyaların SHA-256 ön ekleri (önbellekten çıkarılan sürüm):
- `game.js` b2a3e7cb1f6f3b58
- `skill.js` 105a282d8c656c4d
- `utils.js` 9ea66086de6a5a52
- `shop.js` ef40040fd8869e77
- `serializeSave.js` 0513e76ff1e61cf4
- `saveWriter.js` 63cf90fd6c1c08c5
- `combatManager.js` 0ab7c443acdfcb26
- `melvorDemo.json` ba3832348dc252c9
- `melvorFull.json` aa3d0babaaa5ef1b
- `melvorTotH.json` 48db245f3e41010c
- `melvorExpansion2.json` ce577cfed388c446
- `melvorItA.json` 5738029b8c3dc6aa
