# Idle Slayer: Referans Analizi

> **Tarih:** 2026-10-24 · **Plan:** §2.3 · **Blueprint:** v2
> **Kapsam:** `D:\SteamLibrary\steamapps\common\Idle Slayer` salt-okunur incelendi. Oyun çalıştırılmadı.
> Güven: confirmed / likely / hypothesis.

## 1. Teknoloji yığını

| Bulgu | Kanıt | Güven |
|---|---|---|
| Unity **6000.3.14f1**, **IL2CPP** (`GameAssembly.dll` 44.9 MB, SHA-256 `e310fe2f…`) | `globalgamemanagers`, dosyalar | confirmed |
| `global-metadata.dat` **v39**, şifresiz (sihirli değer `0xFAB11BAF`), SHA-256 `86378867…` | başlık | confirmed |
| `Idle Slayer.exe` başlatıcı: 12 kaynak, 9 ikon | REA `inspect_pe_resources` `ev_1e16aeab…6016` | confirmed |
| SDK'lar: Steamworks.NET, Firebase (Analytics, RemoteConfig, Crashlytics, Auth, Storage, Functions), Unity Purchasing, Yodo1 reklam, Addressables, Cinemachine | metadata image adları | confirmed |
| Yayıncı: Pablo Leban | `app.info` | confirmed |

**Yöntem sınırı.**
- IL2CPP olduğu için yönetilen DLL yok; REA `inspect_managed_*` uygulanamaz.
- Native decompiler sağlayıcıları (Ghidra/IDA) bu makinede yok (REA `binary_session`).
- v39 metadata'nın değişken genişlikli tabloları ayrıştırılmadı. Yalnızca **tanımlayıcı dizge tablosu** (Assembly-CSharp bölümü: ~10 100 ad) ve sıra komşulukları okundu.
- Bu yüzden bu belgedeki yapısal bulgular çoğunlukla **adlardan çıkarımdır (likely)**. Sayısal oran ve olasılık yoktur.

## 2. Odak soruları

### 2.1 Rastgele kutular: aralık, olay türleri, dağılım yapısı

- **Üç kutu ailesi var:** standart `RandomBox`, `SilverRandomBox` (ayrı yönetici, reklamla ikiye katlama: `ShowSilverRandomBoxAd`) ve `SpecialRandomBox` (bonus aşamaya veya patron savaşına götürür: `BossFightFromSpecialRandomBox`). (confirmed: ad varlığı; işlev: likely)
- **`RandomEventManager` olay seçimi:** `SelectRandomEvent`, `GetRandomEvent`, `ShuffleRandomEvents`, `CheckEventRequirements`, `enabledRandomEvent/disabledRandomEvent`.
  - Olaylar **koşullu bir havuzdan karıştırılarak** çekiliyor. Bir "shuffle-bag" yapısı olabilir (hypothesis).
  - Olay örnekleri: horde (düşman sürüsü), frenzy, ruh bonusu, büyük CpS çarpanı, para değeri çarpanı, rage düğmesi. (likely)
- **Süre ve değiştiriciler:**
  - `AddDurationModifier`, `IncreaseTimeOfRandomEvents`, `DecreaseRandomBoxCoinsChance`, `IncreaseSpawnRandomBox`, `IncreaseSpecialRandomBoxChance`, `IncreaseSilverRandomBoxAmount`.
  - Kutu sıklığı, olay süresi ve sonuç ağırlıkları **yükseltilebilir eksenler**. (likely)
- **Mıknatıs yükseltmeleri** (`RandomBoxVerticalMagnet`): kutular oyuncuyu takip ediyor. Bir oyuncu yorumu bunu doğruluyor: "they follow you". (likely)

### 2.2 Bonus bölüm (mini oyun): ekonomideki payı ve beceri etkisi

- **Bonus aşama denetleyicisi:**
  - Bölümler (`currentSection`), süre (`maxTime`, `BlinkRedTimer`) ve başarısızlık durumları var: düşme (`CharacterFellOff`), testere (`SawHitted`).
  - Toplanan küreler, ödül bölgesi ve bölüm tamamlama efektleri bulunuyor. (confirmed: adlar)
  - **Beceri doğrudan etkili:** düşen ya da çarpan oyuncu bölümü kaybediyor. (likely)
- **Ödülü yükseltilebilir.** `IncreaseBonusStageRewards`, `IncreaseBonusStageGemChance`. (likely)
- **Diğer mini oyunlar:** Chest Hunt (`ChestHuntManager`, `PerfectChest`), Ascending Heights, Soul Grapple zaman denemesi, Casino. Ödül türleri: Skin, Recolor, Upgrade (`EMinigameRewardType`). (confirmed: adlar)
- **Ekonomideki payı:** statik olarak ölçülemedi (unresolved). Yorumlar mini oyunların ve ekipman düşüşünün geç oyunda belirleyici olduğunu söylüyor (aşağıda).

### 2.3 Elle oyun ve idle oranı: "ilerleme şansa bağımlı" şikâyeti

- **Kod yapısı:**
  - Idle tarafı: `SlayWhileIdleBonus`, `IncreaseIdleCPS`, `IncreaseIdleSoulsBonus`, `ApplyIdleRewards`, `SweepIdleRewards`, `GetOfflineRewards`, `IncreaseOfflineSPAdBonus` (çevrimdışı ödül reklamla artıyor).
  - Aktif tarafı: zıplama, ok, rage modu (`RageModeManager`; bekleme süresi ve süre), boost (`SpiritBoost`, `MegaBoost`, `HyperBoost`).
  - (confirmed: adlar)
- **Steam yorumları (topluluk, 10 en faydalı olumsuz + 10 olumlu):**
  - Olumsuz yorumların çoğu **aynı şikâyeti** taşıyor: "Idle" adı yanıltıcı; idle gelir önemsiz; anlamlı ilerleme aktif ve RNG'ye bağlı. Alıntılar:
    - "all meaningful progression beyond the first few hours requires RNG during active spurts"
    - "Your idle income is a pittance"
    - "Offline grinding … was nerfed for the 2nd major time"
  - Ekipman (armory) düşüşü "pray to RNG" zinciri olarak tarif ediliyor: mini oyun gelmeli → düşmeli → doğru parça olmalı.
  - **Sonuç:** şikâyet **doğrulandı** (topluluk görüşü olarak; kod oranı ölçülmedi).
- **Mağaza özeti:** son 30 gün %81 olumlu (125 yorum); İngilizce tüm zaman %78 (4 351). Diğer üç oyundan belirgin şekilde düşük.

### 2.4 Görevler, başarımlar, günlük içerik

- `QuestManager`, `DailyQuestsManager` (`RegenerateDailys`, `CheckDateWhenOnline`), `WeeklyQuestsManager`, `MinionsQuest` (zamanlı minyon görevleri: `MinionTimeBonus`, `ClaimAll/SendAll`), `AchievementManager` (başarım çarpanı: `IncreaseAchievementMultiplier`). (confirmed: adlar)
- Günlük bonuslar: `DailyCPSBonus`, `DailyMinionBonus`, `DailySilverBonus`, `CanTriggerDailyBonus`. Ayrıca mevsimsel etkinlikler (`SeasonalEvent`, `FestivalPass`) ve uzak yapılandırmalı etkinlikler (`MapEventRemoteData`). (confirmed: adlar)

### 2.5 Prestij katmanları ve kalıcı ağaç

- **Ascension** (`AscensionManager`): beceri ağacı (`SkillTreeManager`, `AscensionSkill`, `ReqAscensionSkill`); ruh (`Soul`) ile yükseltmeler; önerilen yükseliş göstergesi (`AscensionRecommended`).
- **Ultra Ascension** (`UltraAscendPopup`) ikinci katman.
- Paralel kalıcı sistemler: **Divinities**, **Minions** (evrim), **Jewels of Soul**, **Stones/Upgrades of Time**, kalıcı ve geçici zanaat (`PermanentCraftingManager`, `TemporaryCraftingManager`).
- (confirmed: adlar; ağaç biçimi: düğüm ve ön koşul (`ReqUpgrade`) yapısı, likely)

## 3. Açılım zaman çizelgesi

Oynanmadı. Mağaza metnindeki "5 dakika, 5 saat, 5 gün" iddiası bir olumsuz yorumda "completely false" olarak eleştiriliyor (50 saatte "5 saat" aşamasında olduğunu söylüyor).

## 4. Öğrenilecek kalıplar

1. **Koşullu, karıştırılmış rastgele olay havuzu** ve olayların süre/sıklık/ağırlık eksenlerinin yükseltilebilir olması. Şans, yatırım yapılabilir bir sisteme dönüşüyor.
2. **Kısa, başarısız olunabilen bonus bölümler.** Ana döngüden kopan, beceri isteyen ödül mini oyunları. Bizdeki putt mini oyunuyla aynı aile (§4-B).
3. **Günlük + haftalık + zamanlı gönderim görevleri** üçlüsü. Farklı ziyaret ritimlerine hitap ediyor.

## 5. Kaçınılacak hatalar

- **"Idle" vaadi ile aktif/RNG zorunluluğu arasındaki uçurum.** En sık ve en sert şikâyet bu. Bizim aktif/idle hız oranı hedefimiz (§12.3: 1.5–3×) bu tuzağı önlemek için **sert üst sınır** olarak kalmalı.
- **Kritik ilerlemeyi (ekipman) çok aşamalı RNG zincirine bağlamak.** Her aşama ayrı şans → oyuncu kontrol hissini kaybediyor. Gerekirse pity sayaçlarıyla sınırlanmalı (bkz. FAPI ve NGU).
- **Sonradan idle/çevrimdışı nerf'ü.** Güven kaybı, uzun süreli oyuncuların olumsuz yorumlarına dönüşüyor.
- **Reklamla çevrimdışı ödül çarpanı.** Karar #5 (reklamsız) ile zaten dışarıda.

## 6. Kanıt ve sınırlamalar

- REA: `inspect_pe_resources` `ev_1e16aeab4d44ac779e85edff6da9d141e3eb4b12f45f8936f658cf77730b6016`.
- Metadata dizgeleri: kendi okuyucumla, v39 başlığındaki dizge bölümü (ofset `0x7F2D0`, 87 618 dizge). Tip-alan ilişkisi kurulmadı.
- Hiçbir native kod disassemble edilmedi; formül veya olasılık **yok**.
