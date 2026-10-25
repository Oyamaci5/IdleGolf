# Idle Golf: Tasarım Planı (**v5**)

> **[v5] Sürüm notu**
> - v5, 2026-10-25. v4 (`design/idle_golf_blueprint_v4.md`) olduğu gibi duruyor. Bu belge v4'ün üstüne yazılır: değişen sistemleri baştan tanımlar, değişmeyenler için v4'teki bölüme atıf yapar.
> - Kaynak: oynanabilir prototip 1 (`prototype/`, v4 kuralları) oynandıktan sonra gelen kullanıcı geri bildirimi. Kararların hepsi prototip 2'de (`prototype/`, kayıt anahtarı `parfabrikasi-proto-v2`) uygulandı. Buradaki sayılar o koddan alınmıştır.
> - Değişiklikler `[v5]` etiketli. **TBT** = test edilecek varsayım.
> - Ayrıntılı oynanış ve ekran düzeni için prototip referanstır: `prototype/js/econ.js` (ekonomi), `tour.js` (turnuva), `putt.js`, `scene.js`, `ui.js`.

**Çalışma adı:** *Par Fabrikası* (geçici)
**Tür:** Golf temalı incremental/idle, 2D. Tek oyunculu, **sezonsuz** kariyer + zor günlük delik + haftalık asenkron turnuva.
**Hedef:** Kısa oturumlarda aktif vuruş ve uzun süreli otomasyon. Her birkaç dakikada görünür bir ilerleme anı (vuruş düşüşü, delik, sandık, hedef).

---

## 0. Bu sürümü doğuran geri bildirim

Prototip 1 oynandıktan sonra şunlar söylendi:

1. Sezon mantığı sevilmedi; görüntüde iyi durmuyor, ilerleme hissi zayıf.
2. "Akademi" yerine "Araştırma" kullanılmalı.
3. Sondaki putt mini oyununda güç ayarı yok.
4. Günlük görevler kötü.
5. "Çanta" anlamsız bir kelime gibi duruyor.
6. Altın top iyi. Koleksiyon albümü mantıklı ama parçanın gelip gelmediği belli değil.
7. Araştırma ve ekipman geliştirme çok kısıtlı.
8. Üstteki delik haritası iyi; ama rastgelelik (RNG) ve turnuva kısmı görülemedi.
9. Günlük delik sonucu ve haftalık turnuva olsun, ama daha zor olsun.
10. Sopa taşıma mesafesinin anlamı belli değil.
11. Zeminin etkisi hissedilmiyor; par'ın ne anlama geldiği belli değil. Zemin, tutuş, rüzgâr gibi parametrelerin etkisi görünmüyor.
12. Kostüm ve özelleştirme yok: oyuncu hem sopayı hem karakteri, yanındaki vurucuları da görebilmeli.

---

## 1. [v5] Kararlar

| # | Karar | Gerekçe (geri bildirim no.) | Ayrıntı |
|---|---|---|---|
| 17 | **Sezon (prestij 1) kaldırıldı.** Delikler kurs kurs kesintisiz ilerler; hiçbir şey sıfırlanmaz | 1 | §3, §4 |
| 18 | Her biten kurs kalıcı **kupa** verir: tüm mesafeler ×2 | 1 | §4.2 |
| 19 | Kariyer deliği **vuruş bölümlerine** ayrılır. Par = bölüm sayısı + 2 putt; skor ve yıldız buradan çıkar | 11 | §3 |
| 20 | Zemin her vuruş bölümünde rastgele belirlenir; Tutuş olasılığı değiştirir. Etkisi sahnede ve haritada görünür | 8, 11 | §3.3 |
| 21 | Putt iki aşamalı: **yön + güç** | 3 | §8 |
| 22 | Akademi → **Araştırma**. Ağaç 18 düğüme, çok seviyeli yapıya genişledi; 2. laboratuvar yuvası | 2, 7 | §5 |
| 23 | Çanta → **Sandık**. İçerik olasılıkları ekranda; yeni parça büyük açılış ve "YENİ" etiketiyle gelir | 5, 6 | §6.1 |
| 24 | **Parça** birimi ve ekipman geliştirme (sv 1–10). Kopya parça seviye yerine parça verir | 7 | §6.2 |
| 25 | Günlük görevler kaldırıldı; yerine sırayla açılan uzun vadeli **hedefler** | 4, 1 | §7 |
| 26 | **Görünüm** sistemi: oyuncu ve her vurucu ayrı giydirilir; sopa rengi ekipmandan gelir | 12 | §9 |
| 27 | Günlük delik ve haftalık turnuva **zor** saha üretir; sonuç ekranı dağılım ve sıralama gösterir | 8, 9 | §10 |
| 28 | Her turnuva vuruşundan sonra **sapma dökümü** (kalite, rüzgâr, şans payı, zemin) | 8, 10 | §10.5 |
| 29 | Sopa tablosu taşıma mesafesini ve ± sapmayı gösterir; kariyer ekipmanı turnuva sopasını güçlendirir | 10 | §10.3 |

**v4'ten kalkan ya da askıya alınan:** Tur Puanı (TP), Perk Puanı (PP), perk ağacı, "Sezonu Bitir / Sezondan Çekil", kurs seçimi, `M_TP`, kurs başına `D = 1000` sıçraması, 18/36/54★ kurs eşikleri, günlük görevler ve haftalık sandık. Efsane (prestij 2), Sonsuz Tur ve Meydan Okumalar v4'te sezona dayanıyordu; v5'te **yeniden tasarlanacak** (§13).

**v4'ten aynen kalan:** motor kararı Unity 6 + C# ve deterministik `GolfCore` (v4 §6.1); kayıt kuralları (v4 §6.2, şema değişikliği §12); kopyalama kuralları (v4 §9); para kazanma kararı #5 (v4 §14); turnuvanın adalet, hile ve arka uç kuralları (v4 §16.7–§16.8); altın top (v4 §17.6); elle vuruş, Power Drive ve τ_man (v4 §17.3).

---

## 2. Çekirdek döngü [v5]

| Katman | Oyuncu ne yapar? | Ne otomatik çalışır? | Ne değişir? |
|---|---|---|---|
| **Saniyeler** | Halkayla elle vuruş (ıska ×0.5, iyi ×1, mükemmel ×2.5); altın topa tıklar | Otomatik vurucular (1–10) vurur | Mesafe, mükemmel şansı, vuruş hızı |
| **Vuruş bölümü** (~0.5–5 dk) | Bölüm sonunda topun nereye düştüğünü görür | Düşüş zemini rastgele seçilir (Tutuş'a ve rüzgâra bağlı) | Sonraki bölümün hızı, skor |
| **Delik** | Yeşilde putt oynar (yön + güç) | Putt oynanmazsa 3 putt sayılır | Yıldız (+%1 kalıcı / ★), sandık |
| **Kurs (18 delik)** | Kurs skor kartını doldurur | – | Kupa ×2, yeni saha teması, kostüm açılımları |
| **Gün** | Sandıkları açar, araştırma başlatır, ekipman geliştirir, günlük deliği oynar | Araştırma zamanlayıcıları; çevrimdışı ilerleme | Kalıcı güç |
| **Hafta** | 9 delikli turnuvada 3 tur oynar | – | Rozet, Bilgi, parça, kostüm |

**Birimler**

| Birim | Ne işe yarar? | Nereden gelir? |
|---|---|---|
| Yarda (yd) | Yükseltme alır; delik ilerlemesi | Vuruşlar, sandık, altın top |
| Yıldız (★) | Kalıcı +%1 mesafe / ★ (tüm oyun boyunca) | Delik skoru |
| Bilgi | Araştırma | Sandık, hedef, turnuva |
| Parça | Ekipman geliştirme | Sandık, kopya ekipman, hedef, turnuva |

---

## 3. [v5] Delik yapısı: vuruş bölümleri, par, zemin

### 3.1 Bölümler

- Delik `n` (global sıra: 1, 2, 3, …) için par, 18'lik desenden gelir: `[4,4,3,5,4,4,3,4,5,4,3,4,5,4,4,3,4,5]`.
- **Vuruş bölümü sayısı `S = par − 2`** (par 3: 1, par 4: 2, par 5: 3).
- Delik ilerlemesinin ilk %90'ı `S` eşit bölüme ayrılır. Son %10 yeşil fazıdır (putt).
- Bölüm `k` biterken (`ilerleme ≥ 0.9·L·k/S`) top düşer ve zemini rastgele seçilir (§3.3). Son bölümde fairway sonucu "yeşil" sayılır.

### 3.2 Skor ve yıldız

```
vuruş       = S + (bunker düşüşü sayısı) + (su düşüşü sayısı) + putt
putt        = oynanan putt deneme sayısı; oynanmazsa / zaman atlamada / "Geç" ile 3
rel         = vuruş − par
yıldız      = rel ≤ −1 → 3★ (birdie)   rel = 0 → 2★ (par)   rel = 1 → 1★ (bogey)   rel ≥ 2 → 0★
M_yıldız    = 1 + 0.01 × toplam yıldız          // global, kalıcı
```

- Delik başına en iyi skor ve en iyi yıldız saklanır. Skor kartı (kurs başına 18 delik, par satırı, skor satırı; birdie daire, bogey kare) Kariyer ekranında ve oyun ekranının üstündeki kurs şeridinde görünür.
- **Par'ın anlamı:** iyi bir oyuncunun deliği bitirdiği vuruş sayısı. Kariyerde temiz oynanan bir delik (hepsi fairway, 2 putt) par'dır; tek putt birdie getirir; bunker bir vuruş ekler.
- Idle oyuncu (3 putt) temiz delikte bogey (1★) alır. Aktif oyuncu putt'la yıldızları yükseltir.

### 3.3 Zemin

`δ = Tutuş − zorluk(n)`, `zorluk(n) = floor(0.5·n)` (TBT). v4'teki `0.75·h + 4·(c−1)` kurs sıçraması kalktı.

**Düşüş olasılığı** (`δ` −4…+5 arasına kırpılır):

```
P(bunker) = clamp(0.14 − 0.05·δ, 0.02, 0.50)
P(rough)  = clamp(0.36 − 0.09·δ + rüzgâr, 0.04, 0.60)     rüzgâr: karşı +0.08, arka −0.04
P(su)     = sulu delikte (deliklerin %35'i, seed'li) δ < 0 ise 0.07, değilse 0.03
P(fairway)= 1 − diğerleri
```

**Zemin çarpanı** (bulunulan bölümün tüm gelirine uygulanır):

| Zemin | Çarpan | Araştırma | Not |
|---|---|---|---|
| Tee, fairway, yeşil | `1 + 0.1 × clamp(δ, 0, 5)` (en fazla ×1.5) | – | Tutuş deliğin önündeyse bonus |
| Rough | `min(1, 0.6 + 0.1·Rough ustalığı + 0.03·clamp(δ,0,5))` | Rough ustalığı (3 sv) | |
| Bunker | `min(1, 0.35 + 0.12·Bunker çıkışı + 0.03·clamp(δ,0,5))` | Bunker çıkışı (3 sv) | +1 vuruş |
| Su | 0.6 | – | +1 ceza vuruşu |

**Görünürlük (karar #20):**
- Sahnede karakterlerin bastığı zemin, topun bulunduğu zemine dönüşür: tee işaretleri, biçilmiş fairway, uzun çimli rough, tırmıklı kum, yeşil. Köşede "BUNKER ×0.35" etiketi.
- Her düşüşte afiş çıkar ("2. vuruş: BUNKER! +1 vuruş · zemin ×0.35"). Üstteki haritada top düştüğü yerde, zemin adıyla işaretlenir; bölüm sınırları kesik çizgiyle gösterilir.
- Oyun ekranındaki "Topun yeri" kartında sonraki düşüşün olasılık çubuğu (fairway / rough / bunker / su yüzdeleri) görünür. Tutuş yükseltmesinin açıklaması bu yüzdelerin nasıl değişeceğini yazar ("fairway %55 → %64").

### 3.4 Rüzgâr

v4 §4-A ile aynı döngü; 45 s'lik pencereler: %40 durgun (×1.0), %30 karşı (×0.7), %30 arka (×1.4). Delik 10'dan itibaren (delik 9 bitince) gelir.

```
rüzgâr_direnci = min(0.8, 0.2 × Rüzgâr okuma + ekipman rüzgâr)
karşı rüzgâr çarpanı = 1 − 0.3 × (1 − min(0.85, direnç + oto_ek))     oto_ek = min(0.4, Σ vurucu sv / 400), yalnızca otomatik vuruşta
```

Karşı rüzgâr ayrıca rough olasılığını +%8 artırır; arka rüzgârda Power Drive ×1.5 (v4 §17.6). Sahnede rüzgâr çizgileri ve bayrak yönü, oyun ekranında 5 pencerelik tahmin şeridi.

---

## 4. [v5] Ekonomi

### 4.1 Yükseltmeler

Tüm seviyeler **kalıcıdır** (sezon yok).

| Yükseltme | base | growth | maks | Etki | Açılır |
|---|---|---|---|---|---|
| Sopa Başı | 10 | 1.24 | 5000 | Taban `(5 + 2L) × 1.5^floor(L/25)` | Başta |
| Şaft | 60 | 1.28 | 45 | Oto mükemmel `min(0.5, 0.05 + 0.01L + ekipman)` | Başta |
| Tutuş | 150 | **2.2** | 5000 | Zemin olasılığı ve fairway bonusu (§3.3) | Başta |
| Top | 400 | 1.30 | 5000 | `(1 + 0.08L) × 1.5^floor(L/10)` | Delik 6 |
| Duruş | 200 | 1.35 | 30 | Seri tavanı `1 + 0.15L` (yalnızca elle) | Delik 3 |
| Kulüp Evi | 2e7 | 12 | 4 | Çevrimdışı tavanı `4 + 2L` saat | Delik 12 |
| Vurucu i (0–9) | `25 × 1.5^i` | 1.24 | 5000 | `0.4 × L × 1.5^floor(L/25)` vuruş/s | Yuva 1 başta, 2–10 araştırmayla |

- **[v5] Eşik çarpanı:** Sopa Başı ve her vurucu 25 seviyede bir ×1.5 kazanır (sezonsuz uzun oyunda üstel büyüme kaynağı).
- Maliyetler Pazarlık araştırmasıyla `× 0.95^sv` (§5).
- Toplu alım kapalı formla (v4 §3.1).

### 4.2 Formüller

```
delik_uzunluğu(n) = 8 000 × 2.3^(min(n,18) − 1) × 1.5^(max(0, n − 18))      // [v5] Kurs 1'den sonra delik başına ×1.5
delik_çarpanı(n)  = 1.08^(n − 1)                                             // kalıcı, kurslar arasında da birikir
kupa              = 2^floor((n − 1) / 18)                                    // biten kurs başına ×2
M_meta            = kupa × M_yıldız × M_ekipman × M_araştırma × M_rozet
M_araştırma       = 1 + 0.2 × Mesafe çalışması sv
M_rozet           = 1 + 0.01 × min(10, rozet)

taban_mesafe      = (5 + 2·SB) × 1.5^floor(SB/25) × zemin × top × delik_çarpanı × M_meta
mesafe_oto        = taban_mesafe × (1 + 1.5·p_mük) × rüzgâr_oto
gelir_oto/s       = Σ_i 0.4·L_i·1.5^floor(L_i/25) × hız_bonusu × mesafe_oto
hız_bonusu        = (1 + 0.15 × Vurucu antrenmanı) × (Hızlı Tempo ? 3 : 1) × (altın top ? 5 : 1)
```

Elle vuruş ve Power Drive v4 §17.3 ile aynı: `max(v3 formülü × 12, τ_man × gelir_oto/s) × kalite × seri`, `τ_man = 0.75 s`, `T_PD = 30 s + 10 s × araştırma`.

**Kurs adları:** 1 Yerel Kulüp, 2 Bölge Turnuvası, 3 Ulusal Açık, 4 Büyük Final, 5+ "Dünya Turu k". Gökyüzü ve tepe paleti kursla değişir.

### 4.3 Simülasyon sonuçları (prototip 2, açgözlü alım)

Araştırma, ekipman ve turnuva rozeti hariç; yıldızlar dahil. Saat cinsinden kümülatif oynama süresi.

| Delik | Yalnızca idle | Aktif (0.8 vuruş/s, %40 mükemmel) |
|---|---|---|
| 1 | 1 dk | < 1 dk |
| 9 | 6 dk | 1 dk |
| 18 (Kurs 1) | 26 dk | 5 dk |
| 27 | 1.1 sa | 13 dk |
| 36 (Kurs 2) | 3.9 sa | 40 dk |
| 54 (Kurs 3) | 27.2 sa | 4.9 sa |
| 72 (Kurs 4) | > 100 sa | 43.2 sa |

**Okuma**
- Erken oyun hızlı; kurs başına süre ~4–7 kat büyüyor. Kurs 3 → 4 arasındaki sıçrama (idle'da ×4 üstü) araştırma ve ekipmanla kapanmalı. Simülatör bu iki sistemle koşulmadı (TBT).
- **Açık sorun:** Aktif/idle hız oranı ~5×; v4 hedefi 1.5–3×. Sebep τ_man tabanı ve Power Drive (v4 §17.3). Ayar adayları: `T_PD` 30 → 15 s, Power Drive şarjı yarıya, `τ_man` 0.75 → 0.4 (§13).
- Denge parametreleri prototipte "Denge" sekmesinden canlı değiştirilebilir.

---

## 5. [v5] Araştırma (eski adı Akademi)

- Bilgi ile başlatılır, oyun saatiyle ilerler, **kalıcıdır**. Başta 1 laboratuvar yuvası; "İkinci laboratuvar" ile 2.
- Her düğümün seviyeleri var; maliyet ve süre seviyeyle büyür (`l` = mevcut seviye).

| Dal | Düğüm | Maks | Maliyet (Bilgi) | Süre | Etki / seviye |
|---|---|---|---|---|---|
| Vurucular | Vurucu yuvası | 9 | `8 × 1.7^l` | `5 dk × 2^l` | Bir sonraki vurucu yuvası (2…10) |
| Vurucular | Vurucu antrenmanı | 10 | `10 × 1.6^l` | `10 dk × 1.7^l` | Vurucu hızı +%15 |
| Vuruş | Power Drive süresi | 3 | `15 × 2.5^l` | `15 dk × 3^l` | PD +10 s gelir |
| Vuruş | Tatlı nokta | 3 | `12 × 2^l` | `10 dk × 2.5^l` | Mükemmel bölgesi +3° |
| Vuruş | Odak (yetenek) | 1 | 15 | 15 dk | 10 s mükemmel bölgesi ×2, 60 s bekleme |
| Vuruş | Hızlı Tempo (yetenek) | 1 | 30 | 40 dk | 20 s vurucular ×3, 120 s bekleme |
| Saha | Rough ustalığı | 3 | `12 × 2.2^l` | `15 dk × 2.5^l` | Rough çarpanı +0.1 |
| Saha | Bunker çıkışı | 3 | `15 × 2.2^l` | `20 dk × 2.5^l` | Bunker çarpanı +0.12 |
| Saha | Rüzgâr okuma | 3 | `20 × 2^l` | `20 dk × 2.5^l` | Karşı rüzgâr cezası −%20 |
| Ekonomi | Mesafe çalışması | 15 | `10 × 1.8^l` | `20 dk × 1.6^l` | Tüm mesafeler +%20 (toplamsal) |
| Ekonomi | Pazarlık | 5 | `20 × 2^l` | `30 dk × 2^l` | Yükseltme maliyeti ×0.95 |
| Ekonomi | Gece vardiyası | 2 | `30 × 3^l` | `1 sa × 3^l` | Çevrimdışı verim +%10 (60 → 80) |
| Sandık | Sandık rafı | 2 | `12 × 3^l` | `20 dk × 4^l` | Bekleyen sandık kapasitesi +10 |
| Sandık | Şans | 3 | `20 × 2.5^l` | `30 dk × 2.5^l` | Ekipman şansı +%5; nadirlik bir kademe kayar |
| Sandık | Parça ustası | 3 | `15 × 2.2^l` | `25 dk × 2.2^l` | Sandık parçası +%30 |
| Putt | Yeşil okuma | 3 | `10 × 2^l` | `10 dk × 2.5^l` | Okuma çizgisi +%10 uzun |
| Putt | Sakin eller | 3 | `10 × 2^l` | `10 dk × 2.5^l` | Putt süresi +1 s, güç çubuğu %15 yavaş |
| Araştırma | İkinci laboratuvar | 1 | 40 | 1 sa | Aynı anda 2 araştırma |

- Vurucu yuvası 10'a toplam süre ≈ 42 sa (yalnızca zamanlayıcı; v4 hedefi 20–40 sa karma, TBT).
- İlk Bilgi: 2. sandık 12 Bilgi garanti verir; ilk hedef 5 Bilgi. İlk araştırma ilk 5 dakikada başlatılabilir.

---

## 6. [v5] Sandık ve ekipman

### 6.1 Sandık (eski adı Delik çantası)

- Her delik bir sandık düşürür; birdie yapılan delikten İyi sandık. Kapasite `10 + 10 × Sandık rafı`; dolunca yenisi kaybolur ve sayılır.
- **İçerik olasılığı** (ekranda çubuk olarak gösterilir):

| Sonuç | Olasılık | Miktar |
|---|---|---|
| Ekipman | `0.14 + 0.05 × Şans + ekipman sandık şansı` | Nadirlik ağırlıkları `[max(10, 55−15t), 28, 13+8t, 4+5t]`, `t = sandık kademesi + Şans` |
| Efsanevi ekipman | `0.01 × (1 + Şans)` | – |
| Bilgi | 0.22 | `(5 + 10r) × (1 + 0.08n) × (1 + 0.5 × kademe)` |
| Parça | 0.22 | `(10 + 15r) × (1 + 0.5 × kademe) × (1 + 0.3 × Parça ustası)` |
| Yarda | kalan (~%41) | 60–180 s gelir × (1 + 0.5 × kademe) |

- İlk sandık Sıradan bir ekipman, ikincisi 12 Bilgi garanti eder (ilk dakikalarda iki sistemi de tanıtır).
- **Acıma sayacı:** 20 sandıkta en az bir Nadir (%25 Epik).
- **Görünürlük (karar #23):** Açılışta sallanan sandık ve büyük sonuç kartı ("YENİ! Albüme eklendi 5/24 · otomatik takıldı"). Albümde yeni parçada kırmızı "YENİ" rozeti; Ekipman sekmesinde nokta. Oyun ekranının üst şeridinde sandık sayacı.

### 6.2 Ekipman

- 4 yuva (sopa başı, şaft, tutuş, top) × 6 parça = 24 parça. Nadirlik: Sıradan (2), İyi, Nadir, Epik, Efsanevi. Her parçanın mesafe bonusu, bazılarının ek özelliği var (oto mükemmel, PD şarjı, putt süresi, sandık şansı, rüzgâr direnci) ve bir rengi var. Tam katalog: `prototype/js/econ.js` `ITEMS`.
- **Seviye 1–10, parçayla geliştirilir:** `maliyet = 10 × 1.6^(sv−1) × (1 + nadirlik)`; her seviye taban etkinin +%25'i.
- **Kopya** parça seviye vermez; `10 × (nadirlik + 1)` parça verir.
- Yeni parça, takılı olandan güçlüyse otomatik takılır. Albümde parçaya tıklayınca takılır.
- Toplam çarpan `M_ekipman = softcap(Π(1 + bonus), 5, 0.6)`; bir yuvanın 6 parçası tamamlanınca o yuva kalıcı ×1.05.
- **Görünüş:** Sopa başının kenar rengi, şaftın ve sapın rengi takılı ekipmandan gelir; sahnede ve Görünüm önizlemesinde görünür.
- **Turnuvaya etkisi (karar #29):** `v = (nadirlik + 1) × seviye çarpanı`.

| Yuva | Turnuva etkisi |
|---|---|
| Sopa başı | Taşıma +`1.2% × v` |
| Şaft | Sapma −`min(40%, 3% × v)` |
| Tutuş | Zemin cezası −`min(50%, 4% × v)` |
| Top | Yuvarlanma +`4% × v` |

---

## 7. [v5] Hedefler (günlük görevlerin yerine)

- Sıralı, uzun vadeli kilometre taşları. Oyun ekranında her zaman sıradaki 3 hedef görünür; ilki tamamlanınca "Al" düğmesi çıkar, ödül alınca sıradaki açılır.
- Seri cezası, günlük sıfırlama ve "kaçırırsan biter" baskısı yok (v4 §17.7 etik ilkesi korunur).

| Sıra | Hedef | Ödül |
|---|---|---|
| 1 | İlk deliği bitir | 5 Bilgi |
| 2 | 10 elle vuruş yap | 1 sandık |
| 3 | Vurucu 1 sv 5 | 5 Bilgi |
| 4 | Delik 3 (Duruş açılır) | 20 parça |
| 5 | İlk sandığı aç | 8 Bilgi |
| 6 | Bir birdie | 1 sandık |
| 7 | İlk araştırmayı bitir | 25 parça |
| 8 | Delik 6 (Top açılır) | 10 Bilgi |
| 9 | İlk Power Drive | 1 sandık |
| 10 | Tutuş 5 | 10 Bilgi |
| 11 | Delik 9: rüzgâr ve turnuva açılır | 2 sandık |
| 12 | Albümde 4 parça | 40 parça |
| 13 | Günlük deliği oyna | 15 Bilgi |
| 14 | 3 vurucu | 1 sandık |
| 15 | Bir ekipmanı sv 3'e geliştir | 15 Bilgi |
| 16 | Kurs 1'i bitir (kupa ×2) | 3 sandık |
| 17–27 | 20★, albüm 8, 5 vurucu, haftalık tur, delik 27, Kurs 2, 50★, albüm 12, Kurs 3, albüm 24, Kurs 4 | Bilgi, parça, sandık |

---

## 8. [v5] Putt: yön + güç

1. **Yön:** Sarı nişan çizgisi ±(gereken kırılma + 7°) aralığında salınır; okuma çizgisi topun yolunun ilk %40'ını gösterir (Yeşil okuma +%10/sv). Boşluk / tıklama yönü kilitler.
2. **Güç:** Çubuk 0 → 1.4 → 0 salınır (2.2 s, Sakin eller ile %15/sv yavaş). Beyaz çizgi (1.0) **düz zemin** için doğru güçtür. Boşluk / tıklama gücü kilitler.

```
v_düz    = √(2 · F · (d + 1.1 ft))       F = 2.6 ft/s² (hızlı yeşil 2.0)
v0       = v_düz × √güç
eğim     = yan (kırılma) + boy (yokuş); boy eğim gücü değiştirir: yokuş yukarı sert, aşağı yumuşak
deliğe girer: mesafe < 0.42 ft ve hız < 4.4 ft/s; daha hızlıysa delikten seker
```

- Ekranda yan eğim ("sola kırar") ve boy eğim ("yokuş yukarı: sert vur") yazılır; eğim okları eğim büyüklüğüyle koyulaşır.
- Kaçan putt'tan sonra neden yazılır: "Kısa kaldı", "Çok sert: delikten sektü", "Kaçtı".
- Kariyer: en fazla 3 deneme; 3. de kaçarsa 4. otomatik (0.9 ft altı her zaman otomatik sokulur). "Geç" = 3 putt. Süre 6 s + Sakin eller + ekipman; güç aşamasına +2.5 s.
- Yeşil fazında delik dolarsa 8 s beklenir; sonra 3 putt sayılır (zaman atlamada beklemez).

---

## 9. [v5] Görünüm (kostümler)

- Görünüm sekmesinde "Sen" ve her açık vurucu ayrı seçilir; büyük canlı önizleme salınım animasyonu oynatır. Seçim sahnede ve Yükseltme listesindeki vurucu küçük resimlerinde görünür.

| Parça | Seçenekler | Kilitliler (koşul) |
|---|---|---|
| Ten | 4 ton | – |
| Tişört | Kırmızı, mavi, beyaz, yeşil | Sarı (delik 9), mor (albüm 6), siyah (Kurs 1), pembe (5 birdie), ekose (haftalık ilk %25), altın (haftalık ilk %10) |
| Pantolon | Lacivert, bej, beyaz, haki | Kareli (Kurs 1), kırmızı (günlük delikte par veya daha iyi) |
| Şapka | Kep, vizör, şapkasız | Balıkçı (delik 3), kasket (albüm 12), taç (Kurs 2) |
| Şapka rengi | 5 renk | Altın (haftalık ilk %10) |
| Sopa kaplaması | Krom, mat siyah | Karbon (5 araştırma), altın (Kurs 2) |
| Top izi (yalnızca oyuncu) | Beyaz | Altın (5 birdie), alev (25 Power Drive), gökkuşağı (haftalık ilk %10) |

- Kostümler ekonomiye etki etmez (v4 #5: satın alınabilir güç yok). İleride kozmetik DLC bu katalogdan genişler.

---

## 10. [v5] Turnuva modu (gerçek ölçek)

v4 §16'nın yapısı korunur (haftalık, 9 delik, 3 deneme, en iyi tur; deterministik çekirdek ve sunucu doğrulaması). Değişenler:

### 10.1 Modlar

| Mod | Delik | Zorluk | Deneme | Ödül |
|---|---|---|---|---|
| Günlük delik | 1 (par 3/4/5, `daily_seed`) | Zor | 3 / gün | Sıralama yüzdesine göre sandık + 10 Bilgi |
| Haftalık turnuva | 9 (2×par 3, 5×par 4, 2×par 5) | Zor | 3 / hafta | +15 Bilgi, +20 parça; ilk %10 rozet + 20 Bilgi + 40 parça (haftada bir) |
| Antrenman | 1 rastgele | Normal | Sınırsız | Yok |

Turnuva Delik 9'dan sonra açılır; günlük delik ve antrenman baştan açık. Üst şeritte ayrı "Turnuva" düğmesi var.

### 10.2 Zor saha (karar #27)

| Parametre | Normal | Zor |
|---|---|---|
| Uzunluk | par 3: 130–200, par 4: 320–410, par 5: 480–550 yd | par 3: 170–240, par 4: 380–470, par 5: 520–590 yd |
| Fairway genişliği | 30–42 yd | 22–30 yd |
| Yeşil yarıçapı | 12–17 yd | 9–12 yd, bayrak kenara yakın |
| Fairway bunkeri | 1 | 3 (iki yanda) |
| Yeşil bunkeri | 1–2 | 3 |
| Su olasılığı | %35 | %70, fairway'e daha yakın |
| Saha dışı (OB) | merkezden 80 yd | 55 yd |
| Rüzgâr | 0–18 km/s | 12–32 km/s |
| Yeşil eğimi | yan ±0.3, boy ±0.5 | yan ±0.5, boy ±0.7; hızlı yeşil (F = 2.0) |

Delik sınırı par + 4 (v4 ile aynı).

### 10.3 Sopalar ve zemin (karar #29)

**Taşıma (carry):** topun tam vuruşta havada gittiği mesafe. Hedef sopanın menzilinden kısa sürüklenirse yarım vuruş yapılır. Sopa tablosu her sopa için taşıma ve 1σ yana sapmayı (`±yd`) gösterir; değerler G, ekipman ve zeminle canlı güncellenir.

| Sopa | Taşıma | Taban sapma | Yuvarlanma | Kısıt |
|---|---|---|---|---|
| Driver | 250 | 0.075 | 0.12 | Yalnızca tee |
| 3 Wood | 225 | 0.065 | 0.10 | Bunkerden olmaz |
| 5 Demir | 185 | 0.052 | 0.07 | |
| 7 Demir | 160 | 0.046 | 0.05 | |
| 9 Demir | 135 | 0.040 | 0.035 | |
| Pitching W. | 110 | 0.036 | 0.025 | |
| Sand W. | 85 | 0.034 | 0.015 | |

| Zemin | Mesafe | Sapma |
|---|---|---|
| Tee, fairway | ×1.00 | ×1.00 |
| Yeşil kenarı | ×0.95 | ×1.10 |
| Rough | ×0.85 | ×1.35 |
| Ağaç altı | ×0.70 | ×1.80 |
| Bunker | ×0.60 | ×1.60 |

Tutuş ekipmanı zemin cezasını `1 − (1 − m)(1 − g)` formülüyle hafifletir.

### 10.4 Vuruş

```
plan     = min(hedef mesafesi, taşıma × güç(G) × (1 + ekipman taşıma) × zemin_m)
uçuş     = plan × kalite_m + plan × kalite_m × 0.006 × rüzgâr_boyuna(km/s, esinti ±%20)
σ        = uçuş × sapma × (1 − kontrol(G)) × (1 − ekipman isabet) × zemin_sapma × kalite_s
yana     = σ × z  +  rüzgâr_yana × 0.32 × (uçuş / 150) × (1 − rüzgâr_direnci(G))      z ~ N(0,1), ±2.5
kalite_m : ıska 0.75 · iyi 0.95 · mükemmel 1.0      kalite_s : ıska 2.5 · iyi 1.0 · mükemmel 0.3
```

Nişan: hedef sürüklenir (v4 T4 varyant A); haritada menzil yayı ve iyi vuruşun ±2σ elipsi çizilir.

### 10.5 Sapma dökümü (karar #28)

Her vuruştan sonra yan panelde:

| Satır | Örnek |
|---|---|
| Sopa ve kalite | 3 Wood · İYİ ×0.95 |
| Planlanan → uçuş | 215 → 225 yd |
| Rüzgâr (boyuna) | +20 yd |
| Rüzgâr (yana, esinti) | 4 yd sağa (19 km/s) |
| Şans: sapma zarı | +0.6σ (σ = 14.3 yd) → 9 yd sola |
| Yuvarlanma | 19 yd |
| Zemin | Fairway → Rough |

Haritada plan noktası ile topun düştüğü yer arasına "sapma N yd" çizgisi çizilir.

### 10.6 Sonuç ekranları

- **Günlük delik:** aynı deliği oynayan 2 000 oyuncunun skor dağılımı (histogram, senin sütunun kırmızı), yüzdelik ve ödül. Ödül: ilk %10 Epik, %25 Nadir, %50 İyi, gerisi Sıradan sandık. Prototipte alan `N(+1.5, 1.3)` ile simüle edilir; canlıda gerçek gönderimler.
- **Haftalık turnuva:** 50 kişilik grupta sıra; ilk 3 ve senin çevrendeki ±2 oyuncu tabloda. Prototipte rakipler `N(7 − 1.4 × lig, 3)` ile simüle edilir.

### 10.7 Turnuva gücü G [v5]

TP kalktığı için G yeniden tanımlandı:

```
G = 3 × toplam yıldız + 60 × kupa sayısı + 4 × Σ ekipman seviyesi
güç      = 1 + 0.15 × G / (G + 600)
kontrol  =     0.35 × G / (G + 600)
rüzgâr_direnci = 0.30 × G / (G + 800)
```

| Lig | Bronz | Gümüş | Altın | Platin | Elmas | Şampiyon |
|---|---|---|---|---|---|---|
| G | < 150 | 150–400 | 400–900 | 900–1 800 | 1 800–3 500 | ≥ 3 500 |

v4'e göre etkiler küçültüldü (güç +%25 → +%15, kontrol %50 → %35); zor sahada becerinin ağırlığı artsın diye (TBT, `tournament_sim.py` ile doğrulanacak).

---

## 11. Çevrimdışı ve zaman

- v4 §5 ile aynı adımlı simülasyon; verim %60 (+%10 / Gece vardiyası sv), tavan `4 + 2 × Kulüp Evi` saat. Kulüp Evi Anahtarı perk'i kalktı.
- Çevrimdışında vuruş bölümleri ve düşüşler aynı kuralla oluşur; putt 3 sayılır; sandıklar birikir.
- Prototipte test için zaman kontrolü var: ×1 / ×10 / ×100 ve "Zamanı atla" (1 dk – 3 gün; uygulama kapalı / açık ama dokunmadı / aktif profil). Bu bir geliştirme aracıdır, oyuncu sürümünde yoktur.

---

## 12. UI akışı [v5]

```
ANA EKRAN
 ├ üst şerit: yarda, gelir/s, yıldız, Bilgi, parça, sandık · oyun saati · Turnuva düğmesi
 ├ delik başlığı: Delik 4/18 · Par 5 · Vuruş 2 · 2. vuruş (3'te yeşile)
 ├ kurs şeridi: 18 hücre (par, kazanılan yıldız)
 ├ üstten delik haritası: bölüm sınırları, düşüş noktaları ve zeminleri, top
 ├ yandan sahne: oyuncu + vurucular (kostümlü), zemin, rüzgâr, altın top, halka, Putt düğmesi
 ├ ilerleme çubuğu: bölüm işaretleri, yeşil fazı, "sonraki vuruşa ~N sn"
 ├ hedefler: sıradaki 3
 └ kartlar: topun yeri + düşüş olasılıkları · rüzgâr tahmini · gelir kaynağı
PANEL: Yükseltme · Araştırma · Ekipman (sandık, takılı, albüm) · Görünüm · Turnuva · Kariyer (skor kartı, kupalar, çarpanlar, istatistik) · Denge (yalnızca geliştirme)
Bölüm sonu → afiş "2. vuruş: BUNKER!" + sahne zemini değişir
Delik sonu → afiş "BİRDİE ★★★ · 4 vuruş (par 5)" + sandık
Kurs sonu → kupa ekranı (×2), yeni saha
```

**Kayıt şeması:** `saveVersion 3` (v4'te 2). `run`: `n` (global delik), `prog`, `shot {k, strokes, lands[]}`, `up`, `hitters[]`; `meta`: `stars{n}`, `best{n}`, `bilgi`, `parts`, `res {lv, q[]}`, `equip {owned, on, seen}`, `chests[]`, `goals`, `looks`, `trail`, `daily`, `tour`, `badge`, `stats`. Kaldırılan: `course`, `seasonYards`, `tpTotal`, `pp`, `perks`, `coursesUnlocked`, `quests`. Göç `migrate_2_to_3`: TP'yi bir defalık Bilgi ve parçaya çevir (oran TBT), `n = (en derin kurs − 1) × 18 + 1`.

---

## 13. Açık kararlar ve riskler [v5]

| # | Konu | Not |
|---|---|---|
| V5-1 | Aktif/idle oranı ~5× (hedef 1.5–3×) | τ_man ve Power Drive düşürülmeli; simülatör v2'de aktif ve karma profille koşulacak |
| V5-2 | Uzun vade (Kurs 4+) | Prestij olmadan büyüme yalnızca kupa, eşik çarpanı, araştırma ve ekipmandan geliyor. Kurs 3 → 4 duvarı araştırma/ekipman dahil simülasyonla ölçülmeli. Gerekirse `holeGrowth2` 1.5 → 1.45 ya da kupa ×2 → ×3 |
| V5-3 | Efsane, Sonsuz Tur, Meydan okumalar | Sezona bağlıydı. Öneri: Meydan okumaları "kural kartlı kurs tekrarı" olarak, Sonsuz Tur'u Kurs 5+ "Dünya Turu" olarak yeniden tanımla; Efsane'yi kaldır ya da çok geç bir isteğe bağlı sıfırlama yap |
| V5-4 | Başarımlar (v4 §11.5) | Hedefler zincirinin devamı olarak mı, ayrı ekran mı? |
| V5-5 | Delik başına süre üst sınırı | Kurs 3+ deliklerinde bölüm başına süre saatlere çıkıyor; ilerleme hissi için bölüm sayısı uzun deliklerde artabilir |
| V5-6 | Günlük deliğin zorluğu | Gerçek oyuncu verisiyle kalibre edilmeli (hedef medyan par +1 – +2) |
| V5-7 | Birim adları | "Bilgi" ve "Parça" çalışma adı; v4 V2 ve V4 açık |
| V5-8 | Otomatik alım | Perk kalktı; otomatik alım araştırma düğümü mü, baştan ayar mı? |

---

## 14. Kilometre taşları [v5]

v4 §8'deki M0–M6 ve M12a/b geçerli. Değişenler:

| # | Çıktı | Bitti sayılma ölçütü |
|---|---|---|
| M0 (yeniden) | Simülatör v2: vuruş bölümleri, zemin olasılığı, kupa, eşik çarpanı, araştırma ve sandık beklenen değeri | §4.3 tablosu aktif / karma / idle için üretildi; V5-1 kapandı |
| M3 (değişti) | Delikler | Bölümler, düşüş zemini, skor, yıldız, kurs şeridi, iki aşamalı putt |
| M7 (değişti) | ~~Sezon ve TP~~ → Kurslar ve kupa | Kesintisiz kurs geçişi, kupa ekranı, kayıt göçü v2 → v3 |
| M7b (değişti) | Araştırma ve vurucular | 18 düğüm, 2 laboratuvar, yuva 2–10 |
| M7c (değişti) | Sandık, ekipman, görünüm, hedefler | Parça ve geliştirme, albüm, kostüm kataloğu, 27 hedef |
| M12a (ek) | Turnuva | Zor saha üreticisi, sapma dökümü, sonuç ekranları |
