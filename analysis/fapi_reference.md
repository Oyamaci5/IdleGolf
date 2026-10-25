# Farmer Against Potatoes Idle (FAPI): Referans Analizi

> **Tarih:** 2026-10-24 · **Plan:** §2.5 · **Blueprint:** v2
> **Kapsam:** `D:\SteamLibrary\steamapps\common\Farmer Against Potatoes Idle` salt-okunur incelendi. Oyun çalıştırılmadı.
> Güven: confirmed / likely / hypothesis.

## 1. Teknoloji yığını

| Bulgu | Kanıt | Güven |
|---|---|---|
| Unity **2022.3.62f3**, **Mono** (`Assembly-CSharp.dll` 6.1 MB, SHA-256 `c3aca1df…670e`, MVID `271965c9-…`) | REA `inspect_managed_artifact` | confirmed |
| 416 tip, **10 544 alan**, 5 224 metot. `PlayerData` tek sınıfta ~2 000 alan | REA sayıları, kendi tablo okuyucum | confirmed |
| Büyük sayı: `BreakInfinity.BigDouble` | tip adları | confirmed |
| Çevrimiçi katman: WebSocket istemcisi; liderlik tabloları; çok oyunculu patron etkinliği (buff satın alma, topluluk kademeleri); bulut kayıt; Steam envanter satın alma | `MainScript.communication.*` | confirmed |
| Para kazanma: IAP ("Soul Shop"), AdMob (mobil), Patreon bağlantısı, kupon sistemi | tip adları | confirmed |
| Yayıncı: Oni Gaming | `app.info` | confirmed |

**REA sınırı.**
- Tam üye envanteri, REA'nın 64 MiB temsil bütçesini aştı (`ev_b53669d0…98c9`, coverage `unavailable`).
- Tip seçimiyle yapılan çalıştırma tamamlandı (`ev_2f31441b…2683`, 22 tip, 757 metot).
- Yalnız `PlayerData` seçimi de bütçeyi aştı. Alan token → ad eşlemesi kendi ECMA-335 tablo okuyucumla yapıldı.

## 2. Odak soruları

### 2.1 Kaç sistem var, hangi sırayla açılıyor?

Tek bir merkezî fonksiyon (`ShowUnlock.CurrentUnlock`) her yenilemede koşulları sırayla kontrol ediyor. Her açılım bir öğretici adımı (`TutorialPartN`) ve bir Steam başarımı (`"…UNLOCK"`) tetikliyor. (confirmed)

| Sıra | Sistem | Açılma koşulunun türü | Tahmini dilim |
|---|---|---|---|
| 1 | Görevler (quest) | Bölge ilerlemesi eşiği + ikinci bölge | ilk dakikalar |
| 2 | Ölüm ekranı / savaş yükseltmeleri | İlk ölüm | ilk dakikalar |
| 3 | Yetenek ağacı (talent) | Toplam seviye eşiği | ilk saat |
| 4 | Solucan yetiştirme | Belirli bölgede ilerleme eşiği | ilk saat |
| 5 | **Reenkarnasyon (prestij 1)** | Daha ileri bölgede ilerleme eşiği | ilk saat (likely) |
| 6 | Whack-a-Potato mini oyunu | **Gerçek oynama süresi** (10 ve 30 dakika eşikleri) | ilk saat |
| 7 | Meydan okumalar | Bayrak (reenkarnasyona bağlı) | 1–5 saat |
| 8 | İnek fabrikası | Bayrak | 1–5 saat |
| 9 | **Yükseliş (Ascension, prestij 2)** | En iyi bölge eşiği | 5–20 saat (hypothesis) |
| 10 | Evcil hayvanlar | En iyi bölge eşiği | 5–20 saat |
| 11 | Seferler (expedition) | Yükseliş sayısı ≥ küçük eşik | 20+ saat |
| 12 | Kartlar | Yükseliş sayısı ≥ daha büyük eşik | 20+ saat |
| 13 | Tarım → Çekirge → Montaj | Kaynak toplamı eşikleri (log ölçekli) | 20+ saat |
| 14 | Karakollar (outpost) | Yükseliş sayısı | gün/hafta |
| 15 | Boyutsal portal | Yükseliş sayısı | gün/hafta |
| 16 | **Transcendence (prestij 3)** | Yükseliş sayısı (yüksek eşik) | haftalar |

Saat dilimleri statiktir ve oynanarak doğrulanmadı (plan §3 adım 3 yapılmadı). Bir olumsuz yorum "215 saatte yükseliş 13" ve "yükseliş 12'den sonra haftalarca durgunluk" diyor. Bu, son satırların gün/hafta ölçeğinde olduğunu destekliyor.

**Yapısal gözlem.** Erken sistemler oyun içi ilerlemeyle; orta/geç sistemler **prestij sayacıyla** açılıyor. Prestij sayısı, içerik açılımının asıl saati. (confirmed)

### 2.2 Günlük ve zamanlayıcılı içerik

- **7 günlük görev yuvası** (hedef, tamamlanma, ortak zamanlayıcı). (confirmed: `DailyQuest1..7*`, `DailyQuestTimer`)
- **Günlük sınırlar:** mini oyundan günlük premium para limiti, günlük kupon iksiri. (confirmed: `DailySoulWhackLimit`, `DailyCouponPotion`)
- **Bekleme süreli mini oyun:** Whack-a-Potato. Bir olumsuz yorum, kısa bekleme süresiyle "sonsuza dek" oynamak zorunda hissettiğini söylüyor. (yorum)
- **Zamanlayıcılı üretim:**
  - Solucan yetiştirme (`BreedingTime`) ve süt (`MilkTimer`).
  - Sefer süreleri ve bina inşa süresi (`TotalTimeSpentBuilding`, `TradeCenterDealTime`).
  - Kart şarjı (`CardChargeTimeleft`), tarım (`TimePassedFarming`).
  - 13 ayrı süreli iksir (`SoulPotion*Time`). (confirmed)
- **Sezonlar** (sezon kozmetikleri ve ödülleri) ve sunucu taraflı patron etkinliği. (confirmed: adlar)

### 2.3 Ekipman ve koleksiyon katmanı

- **6 ekipman yuvası:** silah, şapka, kalkan, eldiven, göğüs, ayakkabı. (confirmed)
- **Ekipman özellikleri:** nadirlik, "rating band", güçlendirme (malzeme ve maliyet), filtre, otomatik geri dönüşüm ve karşılaştırma. (confirmed: `EquipmentRatingBand`, `EnhancingPower`, `SoulAutoRecycleEquipmentFull`, `EquipmentFiltering`)
- **Pity sayaçları:** ekipman düşüşleri ve çevrimdışı solucan/larva düşüşleri için ayrı. (confirmed: `PityCounterEquipment`, `WormPityCounterOffline`)
- **Diğer koleksiyonlar:** evcil hayvanlar (sefer takımları ve yükleme), kartlar, artefaktlar (mücevher renkleri, kilometre taşı türleri), madenciler, kasaba. (confirmed)

### 2.4 Çevrimdışı ilerleme (ek bulgu, blueprint §5 için önemli)

- **Seed'li RNG.** Çevrimdışı hesap başlamadan `Random.InitState(PlayerData.RandomSeed)` çağrılıyor. (confirmed: `OfflineMath.OfflineResult`)
- **Süre tavanı:** `min(now − TimeSaved, ≈10 gün)`. Negatif süre 0'a çekiliyor ve günlüğe yazılıyor. Çevrimdışı süre `TimePlayed`'e ekleniyor. (confirmed)
- **Kademeli doğruluk.** Adım sayısına göre üç yol var: kısa aralık → savaşı adım adım simüle et; orta → toplu tetikleme; uzun → "bulk" yaklaşım. (confirmed: `OfflineMathNotDone` eşikleri)
- Çevrimdışında iksir kullanımı (`UsePotionOffline`) ve sonuç ekranı. (confirmed)

## 3. Steam yorumları

**Özet:** İngilizce tüm zaman %94 olumlu (4 684). Son 30 gün %86 (60).

| Övgü | Şikâyet |
|---|---|
| "Ücretsiz için inanılmaz içerik" | IAP ve liderlik tablosunda P2W ("costs at least $500") |
| "New mechanics are unlocked at the right time… most of them interact with each other" | Zorunlu hissettiren, bekleme süreli mini oyun |
| PoE tarzı yetenek ağacı ve sınıflar | Çok sayıda farklı menü/UI; zayıf İngilizce açıklamalar |
| Prestij ve challenge koşuları tazelik veriyor | Sınıf başına ağacı elle yeniden kurmak |
| | "After ascension 12… drags for weeks if not months" |
| | "Idle" değil: 5–10 dakikada bir etkileşim gerekiyor |

## 4. Öğrenilecek kalıplar

1. **Tek merkezî açılım tablosu** + her açılımda öğretici adımı + başarım. Sıra ve koşullar tek yerde; test ve ayar kolay. → §2 "Saha açılımları", §13.
2. **Geç içeriği prestij sayacıyla açmak.** Oyuncu sıfırlamayı bir kayıp değil, "kilit açma saati" olarak görüyor. → §11.1 kurs açılımı.
3. **Seed'li çevrimdışı RNG + kademeli simülasyon doğruluğu + sert tavan.** → §5. Bizdeki "en fazla 2000 adım" kuralıyla uyumlu; seed eksik.
4. **Pity sayaçları.** Nadir düşüşte en kötü durum garantisi. → §11.5 (kozmetik ve başarım düşüşleri olursa).
5. **Gerçek oynama süresine bağlı yumuşak açılım** (mini oyun 10–30 dakika sonra). Yeni oyuncuyu ilk dakikalarda boğmuyor.

## 5. Kaçınılacak hatalar

- **Zorunlu hissettiren, kısa bekleme süreli aktif mini oyun.** Bizde putt **isteğe bağlı** ve kısa. Bekleme süreli bir "her 5 dakikada gel" mekaniği eklenmemeli.
- **Sınıf veya kurs başına elle yeniden kurulum gereken ağaçlar.** Prestij sonrası tekrar işini azaltın; Otomatik Alım perk'i doğru yön (§3.4).
- **Sistem sayısının UI'ı aşması.** 16+ sistem, her biri ayrı menü. Bizim §13 akışı az sayıda panelle kalmalı.
- **Geç oyunda haftalarca değişmeyen durum** (yükseliş 12+ şikâyeti). Bizim §12.3 "ardışık bant süre oranı ≤ 1.3×" ve "ölü süre" metrikleri bunu yakalamak için doğru araç.

## 6. Kanıt

- REA `inspect_managed_artifact` (summary): `ev_a5504a3a7362c7a5be5e926cfde34a5a1867088850fd59434c3e4b0e1d92a2f7` (ebeveyn `ev_21e089f8…59c8`).
- REA `inspect_managed_members` tam: `ev_b53669d0…98c9` (bütçe aşımı). Seçili 22 tip: `ev_2f31441b450d58f421ab21eb1bf845eed9444b549478e6a6596c9edd152d2683`.
- Koşul sabitleri: REA gövde ofsetleri + kendi CIL çözücüm (`tools/cil_dis.py`). `PlayerData` alan adları kendi metadata okuyucumla (`tools/meta_list.py`).
