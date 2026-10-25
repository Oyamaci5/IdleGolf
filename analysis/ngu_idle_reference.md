# NGU Idle: Referans Analizi

> **Tarih:** 2026-10-24 · **Plan:** §2.6 · **Blueprint:** v2
> **Kapsam:** `D:\SteamLibrary\steamapps\common\NGU IDLE` salt-okunur incelendi. Oyun çalıştırılmadı.
> Güven: confirmed / likely / hypothesis.

## 1. Teknoloji yığını

| Bulgu | Kanıt | Güven |
|---|---|---|
| Unity **2019.4.22f1**, **Mono** (`Assembly-CSharp.dll` 2.0 MB, SHA-256 `f138c855…af71`, MVID `5ba2e26b-…`) | REA `inspect_managed_artifact` | confirmed |
| 370 tip, 4 074 alan, 5 371 metot | REA | confirmed |
| Platform izleri: Steamworks.NET, Kongregate API, Kartridge; masaüstü dosya diyaloğu (içe/dışa aktarma) | tip ve DLL adları | confirmed |
| Yayıncı: NGU Industries | `app.info` | confirmed |

REA tam üye envanteri bütçeyi aştı (`ev_85171caf…f7ce`, coverage `unavailable`). Tip seçimli çalıştırma tamamlandı (`ev_f9b12f58…f7d`, 17 tip, 826 metot).

## 2. Odak soruları

### 2.1 Paralel sistemlerin birbirini besleme biçimi

- **Üç ortak kaynak havuzu:** Energy, Magic, "Resource 3". Her biri hız, güç ve kapasite statlarıyla tanımlı. (confirmed: `Character.totalEnergySpeed/Power/Bar/Cap…`, `Resource3`)
- **Havuzlar sayısız alt sisteme dağıtılıyor:**
  - Eğitim (saldırı/savunma), gelişmiş eğitim, augment, zaman makinesi, Wandoos, NGU.
  - Kan büyüsü (ritüeller), hack'ler, dilekler.
  - Oyuncu her sisteme **yüzde ya da miktar** atıyor. Hazır "idle yüzdeleri" ayarları ve "en çoğunu geri al" komutları var. (confirmed: `removeMostEnergy`, `customIdleEnergyPercent1/2`, `EnergyInputController`)
- **Besleme zinciri** (çıktı → girdi):
  - Eğitim → saldırı/savunma → macera (adventure) bölgeleri → eşya düşüşü.
  - Eşya → envanter, daycare ve birleştirme → stat → daha derin bölgeler. Zaman makinesi → altın. Altın → augment ve satın alımlar.
  - Patron ilerlemesi → rebirth çarpanı.
  - Yggdrasil meyveleri → kalıcı stat, AP, PP, QP.
  - Beast quest → quirk'ler → meyve süresini kısaltma.
  - (confirmed: alan ve metot adları, örneğin `FruitController.tierThreshold` quirk seviyesini okuyor; zincirin tamamı likely)

### 2.2 Uzun vadeli hedefler ve saat ölçeğinde tempo

- **Zorluklar:** Normal → Evil → Sadistic. Her biri aynı sistemleri yeni ölçekte yeniden açıyor. (confirmed: `startNormalRebirth/startHardRebirth/startSadisticRebirth`)
- **Rebirth uzunluğu dolaylı olarak ayarlanıyor:**
  - **Rebirth süresine bağlı zaman çarpanı:** birkaç dakikanın altındaki rebirth'ler çok sert bölenle cezalandırılıyor.
  - **Asgari rebirth süresi:** birkaç dakika; dilekle kısaltılabiliyor.
  - Sonuç: rebirth spam'i ekonomik olarak anlamsız. (confirmed: `Rebirth.calculateTimeMulti`, `Rebirth.minRebirthTime`)
- **24 saatlik challenge** ve diğer kural değiştiren meydan okumalar (no-aug, no-equip, troll…). (confirmed)
- **Sonsuz kule (ITOPOD)** ve perk'leri; titan patronları (`TitanHPBars`). (confirmed)
- Yorumlar ölçeği doğruluyor: "The End"e binlerce saatte ulaşılıyor ("10 487 saat").

### 2.3 Zamanlayıcılı ve kuyruklu sistemler

| Sistem | Yapı | Güven |
|---|---|---|
| **Günlük çark** | Zaman **oyun süresiyle** birikir (deltaTime, çevrimdışı katkısı dahil). Hedef 24 saat. **Banka tavanı** var, yükseltmeyle bir haftaya çıkar. Sonuç kademesi spin sayacına bağlı **deterministik bir takvim** (her N. çevirmede daha iyi kademe) | confirmed (`DailyRewardController.maxSpinTime/targetSpinTime/newSpinOutcome`) |
| **Yggdrasil meyveleri** | Meyve saatlik kademelerle olgunlaşır, bir maks kademe vardır. Kademe süresi quirk'le kısalır. Hasat sırasında kademe çarpanı uygulanır | confirmed (`FruitController.tierThreshold/harvestTier`) |
| **Daycare** | Kreşe konan eşya süre geçtikçe seviye kazanır (seviye üst sınırlı) | confirmed (`DaycareItemController.levelsAdded`) |
| Beast quest | Idle mod; arka planda ilerleme | confirmed (adlar) |
| Kartlar, yemek pişirme, dilekler | Süre ve kaynak tabanlı ilerleme | likely |

**Çevrimdışı ilerleme sistem başına hesaplanıyor:** `trainingOfflineProgress`, `augmentOfflineProgress`, `yggdrasilOfflineProgress`, `wishOfflineProgress`, `cardsOfflineProgress`… (~20 fonksiyon). Her sistem kendi analitik özetini üretiyor; çevrimdışı ekranı mesajları birleştiriyor. Oyuncu çevrimdışı ilerlemeyi kapatabiliyor (`Character.ignoreOfflineProgress`). (confirmed)

## 3. Steam yorumları

**Özet:** İngilizce tüm zaman %95 olumlu (10 942). Son 30 gün %90 (54).

| Övgü | Şikâyet |
|---|---|
| "Numbers go up". Az sayıda kaynağın çok yönlü etkileşimi | Bağımlılık ve zaman kaybı (çoğu olumsuz yorum bu temada; aynı yazarların binlerce saati var) |
| "It's like owning a garden… daily tasks… return to find interesting things have happened" | Bilinçli "troll" tasarım ve gereksiz sıkıcılık |
| Uzun ömür | Geç oyunun yarım kalması |
| Esprili ton | Mikro yönetim ve verimlilik hesabı yorgunluğu |

## 4. Öğrenilecek kalıplar

1. **Kısa prestijleri süreye bağlı çarpanla cezalandırmak.** Asgari süreyle birlikte prestij spam'ini ekonomik olarak kapatıyor. → §11.1 kaldıraç 1 ("TP × min(1, t/15 dk)") için **doğrulama**.
2. **Biriken zaman bankası (tavanlı).** Günlük ödül duvar saatine değil biriken süreye bağlı; kaçırılan gün kaybolmuyor ama sonsuza da birikmiyor. → §5 ve §14'teki "günlük ücretsiz 2× dönüş bonusu".
3. **Deterministik pity takvimi.** Rastgele ödülde sayaçla garanti edilen kademeler.
4. **Çevrimdışı hesabı sistem başına analitik özetlemek.** Adım simülasyonuna alternatif; sistem sayısı arttıkça ölçeklenebilir.
5. **"Bahçe" ritmi.** Saatlik ve günlük olgunlaşan hasatlar uzun vadeli geri dönüş nedeni yaratıyor.

## 5. Kaçınılacak hatalar

- **Sınırsız mikro yönetim.** Kaynak dağıtımı derinlik veriyor ama en büyük şikâyet kaynağı da bu. Bizde tek kaynak (yarda) ve 6 kategori; bu sadelik korunmalı.
- **Bilinçli sıkıcılık ve "troll" tasarım.** Mizah, oyuncunun zamanına saygısızlık gibi okunabiliyor.
- **Bitmemiş son bölüm.** "Son" tanımı (Büyük Şampiyon, §11.1) ve sonsuz tur net olmalı.

## 6. Kanıt

- REA `inspect_managed_artifact` (summary): `ev_82dfabc5d61f12de84112c621f425fa7b1080bd81fd2548a8a5800a493d44efb` (ebeveyn `ev_eb158e67…3850`).
- REA `inspect_managed_members` seçili 17 tip: `ev_f9b12f58b03c41c5da81629dacb21eef47d731b2edbe54d2efa92f8730ff3e7d`.
- Sabitler: REA gövde ofsetleri + kendi CIL çözücüm. Alan adları kendi metadata okuyucumla.
