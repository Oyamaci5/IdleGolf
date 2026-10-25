# PegIdle (Steam Demo): Referans Analizi

> **Tarih:** 2026-10-24 · **Plan:** §2.2 · **Blueprint:** v2
> **Kapsam:** `D:\SteamLibrary\steamapps\common\PegIdle Demo` salt-okunur incelendi. Oyun çalıştırılmadı.
> Güven: confirmed / likely / hypothesis.

## 1. Teknoloji yığını

| Bulgu | Kanıt | Güven |
|---|---|---|
| Unity **2021.3.19f1**, **Mono** arka uç (`Managed\Assembly-CSharp.dll`, 966 KB) | `globalgamemanagers` başlığı; REA sınıflandırması `unity-mono` | confirmed |
| Assembly-CSharp SHA-256 `d2fedd57…f916`, MVID `1761305c-…`. 422 tip, 4822 alan, 2710 metot | REA `inspect_managed_artifact` | confirmed |
| Fizik: Unity **Physics2D** (Rigidbody2D, OnCollisionEnter2D) | çağrı kenarları | confirmed |
| Steam: Facepunch.Steamworks. Burst derlemeli eklenti var. Yerelleştirme: I2 Loc | Managed/Plugins | confirmed |
| Yayıncı: EagleEye Games | `app.info` | confirmed |

## 2. Odak soruları

### 2.1 Nişan ve fizik: oyuncu neyi kontrol ediyor?

- **Yalnızca yön.** Atıcı her karede fareye döner. Fırlatma hızı sabit bir kuvvet × yön (açı), yani güç ayarı ve zamanlama yok. (confirmed: `MainShooter.Update`, `ShootABallTesting`)
- **Önizleme noktaları** (yörünge göstergesi) var. Prestijle 2–5 eşzamanlı atış noktası açılır (çoklu atıcı). (confirmed: `pointParent2..5`, `moreShots1..4Purchased`)
- **Manuel cephane = sahip olunan top sayısı.** Atış envanterden bir top düşer; top tahtadan çıkınca envantere geri döner. "+1 top" satın almak manuel verimi artırır. Manuel hız böylece top sayısı × tahta geçiş süresi ile sınırlanır. (confirmed: `ShootBall`, `BasicBall.OnTriggerEnter2D`, `BallUpgrades.PurchasePluss1Ball`)
- **Şarj göstergesi ("full fill").** Atışlar orta bir göstergeyi doldurur. Dolunca kısa süreli otomatik **seri atış** yapılır: rastgele açılarla, satın alınmış top türleri arasından. (confirmed: `Levels.FullFillShooting`, `MainShooter.ShootFullFill`)

### 2.2 Otomatik bırakma ve elle atış oranı

- **Otomatik düşüş:** her top türünün kendi zamanlayıcılı coroutine'i var. Top, üstten **rastgele bir X konumundan** nişansız bırakılır. (confirmed: `AutoBallDrop`, `SetRandomDropPos`)
- **Değer ayrımı katman (layer) ile yapılıyor.**
  - Elle atılan toplar layer 9, otomatik düşenler layer 15.
  - Altın hesaplamasında yalnızca elle atılanlar ek bir **"aktif altın" çarpanı** alır (`activeGoldIncrease`). İkisi de prestij altın çarpanını alır. (confirmed: `PointsMechanics.SetGold` dalları)
- **Prestij ağacında ayrı bir "A" (aktif) dalı var** (33 düğüm). Atıştan altın ve atıştan prestij puanı şansı gibi etkiler veriyor. (confirmed: `A_Upgrade22/28Purchased` → `GoldFromShooting`)
- **Sonuç.** Elle/otomatik değer oranı tek bir sabit değil. Oyuncunun **hangi dala yatırım yaptığıyla** değişiyor. Elle atışın verimi top sayısıyla, otomatiğinki zamanlayıcıyla ölçekleniyor. (likely)

### 2.3 Şans nerede?

| Katman | Mekanizma | Güven |
|---|---|---|
| Tahta kurulumu | Tahta her açıldığında her çivinin türü olasılıklarla seçiliyor: altın, prestij, kırmızı, gökkuşağı, mor, bomba. Olasılıklar prestij ağacından | confirmed (`BasicPeg.OnEnable`) |
| Altın çarpanı | Altın çivide bağımsız ×2/×3/×5/×10 şansları, ağaç düğümleriyle açılıyor | confirmed (`PointsMechanics.SetGold`) |
| Top kritikleri | Altın topta çift/üç/beş kat altın şansları | confirmed (`BasicBall.SetBallGoldChance`) |
| Zamanlı buff'lar | Altın çivi isabetinde şansla **Gold Rush**; benzer şekilde Prestige Rush ve gökkuşağı buff'ları. Süre ağaçtan | confirmed (`BasicPeg.SetStats`, `Levels.GoldRush`) |
| Fizik saçılması | Physics2D çarpışmaları; otomatik düşüş konumu rastgele | confirmed |
| Kova | Kovaya düşüşte şansla prestij puanı | confirmed (`BucketCollision`) |

### 2.4 Top çeşitleri ve yükseltmeleri (yapı)

- **22 top türü.** Her biri için: satın alınma bayrağı, ayrı otomatik düşüş süresi, ayrı değer, açılış fiyatı ve ayrı "otomatik açık/kapalı" anahtarı. Kod tür başına kopyalanmış durumda (`startAuto*`, `Auto1..22`, `*BallAutoDrop`). (confirmed)
- **Türlerin davranışları farklı:** bomba (çevre patlaması ve mini toplar), yapışkan, zıplayan, hayalet, gökkuşağı, "glitch" ve benzerleri. (confirmed: `BasicBall` bayrakları)
- **Prestij ağacı 4 dallı:** G (altın, 51), PU (prestij çivileri, 44), NP (35; çevrimdışı çarpanlar burada), A (aktif, 33).
  - Puan birimi: prestij çivisi ve kovalardan toplanan **prestij puanı**.
  - **Ağaç bir sıfırlama değil.** Puan oyun sırasında toplanıp harcanıyor. `ResetGame` yalnızca ayarlardaki tam sıfırlamadan çağrılıyor. (confirmed)
- **Seviyeler:** 10 seviye (tahta kümeleri). Tahta temizleme bonusu ve **süre altı bonusu** var. Tahta temizlendikçe rastgele yeni tahta geliyor. (confirmed: `Levels.NewBoardLevelN`, `timerGoldBunus`)

### 2.5 Fizik deterministik mi?

- **Hayır (likely).**
  - Oyun kodunda `Random.InitState` ya da seed kullanımı yok. Rastgelelik global `UnityEngine.Random`'dan geliyor.
  - Fizik, Unity Physics2D. Aynı girdiyle tekrar oynatma tasarlanmamış.
- **Çevrimdışı fizik simüle edilmiyor.** Bunun yerine analitik bir tahmin var:
  - Formül: (en değerli otomatik topun altını × prestij altın çarpanı / o topun düşüş süresi) × geçen dakika.
  - Üstüne sabit bir katsayı ve NP dalı ile seviye satın alımlarından gelen çarpanlar biniyor.
  - Kodda tavan görülmedi (hypothesis: tavansız).
  - Saat `DateTime.Now`'un yerel metni olarak `PlayerPrefs`'e yazılıyor. **Demoda çevrimdışı kapalı** (`GameData.isDemo` kontrolü). (confirmed: `OfflineProgression.SetOfflineProgress`, `SetTime`)

## 3. Açılım zaman çizelgesi

Oynanmadı. Statik olarak: önce tek top türü ve manuel atış. Top türleri altınla satın alınıyor ve her biri satın alınınca otomatik düşüşü açabiliyor. Prestij ağacı prestij puanı biriktikçe açılıyor; seviyeler (tahtalar) ağaç düğümleriyle (`purchasedLevelN`) açılıyor. (likely)

## 4. Steam yorumları

Demo sayfasında puan yok. Topluluk yorum sayfası boş döndü. **Veri yetersiz.**

## 5. Öğrenilecek kalıplar

1. **Manuel ve otomatik değeri ayrı çarpan hatlarıyla yönetmek.** Hangisinin geç oyunda baskın olacağını tek bir sabite değil, oyuncunun dal seçimine bırakmak. → Blueprint §1 (manuel ×12 sabit) ve §3.4 "Uzun Vuruş" perk'i.
2. **Manuel atışı "envanterdeki top" ile sınırlamak.** Tıklama spam'i yerine kaynak sınırlı bir aktif oyun.
3. **Şarj göstergesi → kısa otomatik patlama.** Aktif oyunun ödülü olarak geçici otomasyon.
4. **Olasılıkları prestij ağacına bağlamak.** Şans, oyuncunun yatırım yaptığı bir eksen haline geliyor.
5. **Çevrimdışını fizik yerine analitik hızla hesaplamak.** Fizikli oyunlarda zorunlu. Bizde fizik yok; yaklaşımımız zaten formül tabanlı.

## 6. Kaçınılacak hatalar

- **Tür başına kopyalanmış kod** (22 neredeyse aynı coroutine ve alan grubu). Veri odaklı tanım yerine kopya; içerik eklemek pahalı ve hataya açık. Bizde yükseltme ve top tanımları tablo ile yapılmalı (§3.4).
- **Yerel saat metniyle çevrimdışı.** Saat dilimi ve biçim kırılgan. Bizim UTC unix ms ve `max(lastSeen, now)` kuralımız doğru (§5).
- **Tavansız çevrimdışı (hypothesis).** Uzun aralarda ekonomi kırılabilir. Bizde sert tavan var.

## 7. Kanıt

- REA `inspect_managed_artifact` (summary): `ev_8f4798eda6d34dff9382dc82f1715cfa2dda01a8b294f057a950d1b95d8486c6` (ebeveyn `ev_ad9ddc2d…0948`).
- REA `inspect_managed_members` (MCP summary): `ev_6b10e456…6751` (ebeveyn `ev_e68ec45f…70da`). CLI tam envanter: `ev_dab8112e…73d5`. 422 tip, 22 399 çağrı kenarı, 34 066 alan erişimi, 3 435 dizge.
- Formül ve sabitler: REA'nın metot gövdesi ofsetleri ve token adları üzerinden kendi CIL kod çözücümle (`tools/cil_dis.py`) okundu. Decompile yok.
