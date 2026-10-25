# Idle Golf (Steam Demo v0.1.0): Rakip Referans Analizi

> **Tarih:** 2026-10-24 · **Plan:** `reference_games_rea_plan.md` §2.1 · **Blueprint eşlemesi:** `design/idle_golf_blueprint_v2.md`
> **Kapsam:** `D:\SteamLibrary\steamapps\common\Idle Golf Demo` salt-okunur incelendi. Oyun dosyalarına yazılmadı, oyun çalıştırılmadı.
> **Not:** Planın işaret ettiği ayrıntılı rakip planı (`analysis/idle_golf_competitor_rea_plan.md`) diskte **yok**. Bu belge §2.1'i plan §3 yöntemi ve "farklılaşma matrisi" hedefiyle kapatır.
>
> Güven: **confirmed** = koddan/başlıktan doğrudan · **likely** = güçlü çıkarım · **hypothesis** = zayıf tahmin.

## 1. Teknoloji yığını (kısa)

| Bulgu | Kanıt | Güven |
|---|---|---|
| Tek dosya: `IdleGolf_Demo_v0.1.0.exe` (138 MB), SHA-256 `91a8a752…a087` | dosya | confirmed |
| **Godot 4.6.0**, PCK exe'nin sonuna gömülü (pack v3, 407 dosya) | PCK başlığı `GDPC`, `godot=4.6.0` | confirmed |
| PCK dizini **şifresiz** (flags = 0x2: yalnızca göreli taban) | PCK bayrakları | confirmed |
| Betikler **ikili token GDScript** (`.gdc`, GDSC v101, zstd sıkıştırma); 16 betik | dosya başlıkları | confirmed |
| 3D sahne (RigidBody3D top fiziği, Sprite3D/Label3D billboard) | `Ball.gd`, `Flag.gd` | confirmed |
| Steamworks entegrasyonu bulunmadı | exe ve PCK'de `Steamworks` dizgesi 0 | likely (demo için) |
| Kayıt: `ConfigFile` → `user://idle_golf_demo_v0_1.cfg`, düz metin, sürüm alanı yok | `GameState.save/load_game` | confirmed |

**REA kullanımı ve sınırı.** `inspect_pe_resources` bu exe'yi "Non-identical resource byte ranges overlap" hatasıyla reddetti (gömülü PCK nedeniyle, likely). REA'nın Godot PCK/GDScript ayrıştırıcısı yok. Bu yüzden scratchpad'de iki küçük salt-okunur araç yazıldı: PCK dizin okuyucu ve GDSC token okuyucu. Token akışı tam okundu (her dosyada `consumed = toplam`).

## 2. Odak soruları

### 2.1 Çekirdek döngü

- **Oyuncu ne kontrol ediyor?** Yalnızca kalıcı **nişan kaydırıcısı** (sol-sağ) ve **spin pedi** (yan spin / fırlatma açısı). Atış başına beceri yok; vuruş zamanlaması yok. Golfçü bir zamanlayıcıyla **otomatik** vurur. Aralık = taban aralık / ateş hızı. (confirmed: `main.gd _on_ShotTimer_timeout`, `ShotControl.gd`)
  - Spin ayarı kalıcıdır, yani "ayarla ve bırak". Yan spin mesafeyi düşürür. (confirmed: `Ball.gd`)
- **Gelir.** Ödeme = mesafenin **karesel** fonksiyonu + sabit taban.
  - Üzerine **bayrak yakınlık bonusu** eklenir: isabet doğruluğu × bayrağın uzaklığı.
  - Doğrudan isabet sonucu bir çarpanla büyütür. Para çarpanları en son uygulanır.
  - Oyun içi yardım ekranı bu formülü oyuncuya açıkça gösteriyor. (confirmed: `main.gd _on_ball_landed`, `_build_help_pages`)
- **Şans.** Atış başına üç rastgelelik katmanı var:
  1. Ortak saçılma açısı.
  2. Mesafe çarpanı: `[en kötü, 1]` aralığında düzgün dağılım. "En kötü" değer Consistency yükseldikçe 1'e yaklaşır.
  3. **Iska (whiff):** eşik altında kalan atışta mesafe sert biçimde kesilir. Iska olasılığı Consistency'yle azalır ve alt/üst sınırları vardır.

  (confirmed: `Ball.gd launch`)
- **Combo.** Art arda doğrudan isabetler bir afiş gösterir; ekonomik etkisi yok, yalnızca görsel. (confirmed: `_register_direct_hit` sadece afiş çağırıyor)
- **Rastgele olaylar.**
  - **Altın bayrak:** rastgele aralıklarla (onlarca saniye) rastgele bir bayrak altına döner. Doğrudan isabet büyük bir bonus verir.
  - **Kırılabilir nesneler:** N isabette kırılır, para verir ve süre sonunda yeniden doğar.

  (confirmed)
- **Özel toplar (kural değiştirenler).**
  - Hedef arayan top.
  - Bayrak bonusunu katlayan top.
  - Tepe noktasında parçalara ayrılan top.
  - **"Market" topu:** isabetler bir bayrağa "yatırım" ekler. Yatırım saniyede bileşik büyür; ıska ya da kurs değişimi hepsini nakde çevirir. Aynı bayrağa üst üste isabet yatırımı katlar.
  - Bir bayraktan diğer tüm bayraklara zincirlenen top.

  Bazıları demoda kilitli. (confirmed: `GameState.balls`, `main.gd _pinball_chain`, `_cashout_all_investments`)

### 2.2 İlerleme ve prestij

- **Para yükseltmeleri** (koşu içi): top hızı, ateş hızı, para çarpanı, tutarlılık, XP çarpanı.
  - Maliyet `taban × g^L`, büyüme çok düşük (≈1.1 sınıfı). Etkiler doğrusal (+sabit %/seviye).
  - Sonuç: maliyet eğrisi yumuşak; uzun vadede düz büyüme. (confirmed)
- **XP / seviye.** Kazanılan paranın bir kısmı XP olur. Gereken XP üstel artar.
  - Her seviye, **sabit bir döngüdeki** sıradaki istatistiğe küçük kalıcı bonus verir.
  - Seviye aynı zamanda top, golfçü ve kurs kilitlerini açar. Seviye emeklilikte **sıfırlanmaz**. (confirmed: `_level_up`, `LEVEL_REWARDS`)
- **Emeklilik (prestij) → Madalya.**
  - İlk emeklilik: ömür boyu paranın `log10`'u ile orantılı madalya.
  - Sonrakiler: **yalnızca en iyi koşunun aşıldığı oran** ödüllenir (`log2(1 + iyileşme oranı)`). Mevcut koşu en iyiyi geçmezse **0 madalya**.
  - Tek emeklilik ödülü doymalı bir tavanla sınırlı: `T·(1 − e^(−x/T))`.
  - Sıfırlananlar: para ve para yükseltmeleri. Kalanlar: seviye, kilitler, madalya yükseltmeleri. (confirmed: `get_medal_reward`, `retire`)
- **Madalya yükseltmeleri:** sabit mesafe, çoklu top (maks seviyeli), çoklu top açısı ve tutarlılık çarpanı. Maliyetleri daha dik üstel. (confirmed)
- **Koleksiyon:** 7 top, 8 golfçü, 3 kurs. Her biri `unlock_level` + madalya maliyetiyle açılır. Golfçüler küçük pasif çarpanlar verir. (confirmed)
- **Çevrimdışı ilerleme yok.** Kayıtta zaman damgası yok; betiklerde `offline`, `unix` veya `Time.get_unix` geçmiyor. (confirmed, 16 betikte sınırlı arama)
- **Kayıt:** 15 s'de bir ve pencere kapanırken. Yüklemede `_sanitize_progress` ile negatif ve maks değer temizliği yapılıyor; checksum ve sürüm göçü yok. (confirmed)
- **Kullanılmayan kod:** `RelicShop.gd` (madalyayla "unbox", nadirlik ağırlıklı çark) `GameState.relics` ve `get_unbox_cost`'a başvuruyor. Bunlar `GameState`'te tanımlı değil, yani demoda ölü/kesilmiş özellik. Tam sürümde gacha benzeri bir katman planlanıyor olabilir. (kod: confirmed; niyet: hypothesis)

### 2.3 Açılım zaman çizelgesi (statik)

Oyun oynanmadı (plan §3 adım 3 yapılmadı). Statik kanıta göre:
- Başta: tek kurs (driving range), standart top ve golfçü, 5 para yükseltmesi.
- Seviyeyle açılan kilitler (demoda bir kısmı "Full Game" etiketli kilitli): golfçüler seviye 3–25, toplar 5–30, kurslar 8–15. (confirmed)
- Madalya mağazası ilk emeklilikten sonra anlamlı hale geliyor. (likely)

### 2.4 Steam yorumları

Demoda **8 yorum** var, puan üretilmemiş. Yetersiz örneklem; tema çıkarılmadı. Mağaza metni "laid-back", "retire runs to earn medals" ve "watching every shot or just checking back in" vurguluyor. Yani **pasif izleme** odaklı konumlanıyor.

## 3. Farklılaşma matrisi (bizim tasarım ↔ rakip)

| Eksen | Idle Golf (rakip, demo) | Par Fabrikası (blueprint v2) | Değerlendirme |
|---|---|---|---|
| Görünüm | 3D driving range, tek saha | 2D, delik delik ilerleyen kurs | Farklı |
| Oyuncu becerisi | Yok (kalıcı nişan ve spin ayarı) | Güç/zamanlama göstergesi, ıska/iyi/mükemmel, putt mini oyunu | **Güçlü farklılaştırıcı.** Korunmalı (§1, §4-B) |
| İlerleme birimi | Para + XP seviyesi | Delik / Par / Yıldız, kurs | Farklı. Golf dili bizde daha güçlü |
| Otomasyon | Golfçü baştan otomatik | Kaddi seviyeleri (§2) | Farklı |
| Prestij | Emeklilik → madalya (en iyiyi aşma oranı, doymalı) | Sezon → TP (`sqrt(Y)`), PP, Efsane | Benzer kategori, farklı formül |
| Koleksiyon | Top/golfçü/kurs mağazası | Top kategorisi (her 10 seviyede model), kozmetik | **Çakışma riski: "özel toplar"** |
| Rastgele olay | Altın bayrak, kırılabilirler | Rüzgâr (MVP+), modifiyeler | Bizde rastgele bonus olayı yok |
| Çevrimdışı | Yok | %60 verim, adımlı simülasyon (§5) | Bizim avantajımız |
| Kayıt | ConfigFile, sürümsüz | Şema + göç + checksum (§6.2) | Bizim avantajımız |
| Ad | **"Idle Golf"** (Steam'de yayında) | Çalışma adı *Par Fabrikası* | Dosya ve proje adlarımızda "Idle Golf" geçiyor. **Mağaza adı olarak kullanılamaz** |

## 4. Öğrenilecek kalıplar (genel)

1. **Prestij ödülünü "kişisel en iyiyi aşma"ya bağlamak.** Aynı seviyede tekrar oynamak hiçbir şey vermez, bu yüzden "eski kursu farm etme" stratejisini kendiliğinden öldürür. Ödülün doymalı tavanla sınırlanması da prestij spam'ini keser. → Blueprint §11.1'deki farm sorununa doğrudan aday kaldıraç (sentezde ayrıntı).
2. **Formülü oyuncuya açık göstermek.** Yardım sayfası maliyet ve ödeme formüllerini yazıyor. Optimizasyon seven idle kitlesi için düşük maliyetli bir güven aracı. → §13.
3. **Rastgele zamanlı bonus hedefi.** Ekrandaki mevcut hedeflerden biri geçici olarak "değerli" olur. Aktif oyuncuya nişan nedeni verir. → §4-A/§4-B ile birleştirilebilir.
4. **Riskli birikim mekaniği.** Seri sürdükçe bileşik büyüyen, ilk hatada nakde dönen havuz. Aktif oyuna gerilim katar; idle oyuncuyu cezalandırmaz.
5. **Kayıt yüklemede sanitize.** Negatif ve maks üstü değerleri ve geçersiz kuşanılmış öğeleri düzeltmek. → §6.2'ye ek kural.

## 5. Kaçınılacak hatalar

- **Beceri ekseninin yokluğu.** Oyuncu kararı bir kez ayarlanan kaydırıcıya iniyor. Bizim farkımız tam olarak bu; manuel vuruşu "zorunlu değil ama anlamlı" tutmalıyız.
- **Ekonomik etkisi olmayan combo.** Afiş gösterip ödül vermemek ilk saatlerden sonra görmezden gelinir.
- **Çevrimdışı ilerleme yok + 15 s kayıt + sürümsüz şema.** İdle türü için zayıf. Bizde zaten çözülü (§5, §6.2).
- **Ölü özellik kodu** demoda kalmış. Bizde M-aşamaları özellik bayraklarıyla yönetilmeli.

## 6. Kopyalanmayacaklar (§9'a ek)

"Idle Golf" adı; top, golfçü ve kurs adları; "Retire" ve "Medal" adlandırması; altın bayrak sunumu ve harf animasyonu; "Market" ve "Pin" top kuralları; ödeme ve madalya formüllerindeki sabitler; Balatro tarzı UI ve fontu. Yukarıdaki kalıplar yalnızca genel fikir olarak alınır.

## 7. Kanıt ve sınırlamalar

- REA `inspect_pe_resources`: reddedildi (çakışan kaynak aralıkları). Evidence yok.
- Kendi araçlarım (scratchpad, salt-okunur): `tools/pck_list.py` (PCK dizini) ve `tools/gdc_read.js` (GDSC v101 token okuyucu; Node 22 zstd). Kaynak dosya ve satır numaraları token akışındaki satırlardır.
- Oyun çalıştırılmadı. Zaman çizelgesi statik. Demo, tam sürümü temsil etmeyebilir.
