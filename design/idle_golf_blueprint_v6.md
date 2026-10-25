# Idle Golf: Tasarım Planı (**v6**)

> **[v6] Sürüm notu**
> - v6, 2026-10-25. v5 (`design/idle_golf_blueprint_v5.md`) olduğu gibi duruyor. Bu belge v5'in üstüne yazılır: değişen sistemleri baştan tanımlar, değişmeyenler için v5'e (o da gerekirse v4'e) atıf yapar.
> - Kaynak: prototip 2 oynandıktan sonra gelen kullanıcı geri bildirimi. Kararların hepsi prototip 3'te (`prototype/`, kayıt anahtarı `parfabrikasi-proto-v3`) uygulandı. Sayılar o koddan alınmıştır: `js/data.js` (dünyalar, nadirlikler, ekipman, araştırma, başarımlar, kostümler), `js/econ.js` (ekonomi), `js/art.js` ve `js/scene.js` (görseller).
> - Değişiklikler `[v6]` etiketli. **TBT** = test edilecek varsayım.
> - **[v6.1]** Prototip 3.1 düzeltmeleri §16'da. Çeliştiği yerde §16 geçerlidir: Replay putt kaldırıldı, seviye tavanları kalktı, turnuva sadeleşti.
> - **[v6] Dil kuralı:** Oyunun asıl dili **İngilizce**, ikinci dili Türkçe. Bu belge Türkçe yazılır ama her oyun kavramının **asıl adı İngilizcedir** ve ilk geçtiği yerde `English (Türkçe)` biçiminde verilir. Kod, veri anahtarları ve arayüz kopyası İngilizce kavramı kullanır; Türkçe yalnızca çeviridir. İki dilde aynı kavram tek bir terimle anılır.

**Çalışma adı:** *Par Factory* (TR: Par Fabrikası; geçici)
**Tür:** Golf temalı incremental/idle, 2D. Tek oyunculu, sezonsuz kariyer; 24 delikte bir değişen dünyalar; zor günlük delik ve haftalık asenkron turnuva.

---

## 0. Bu sürümü doğuran geri bildirim

1. Ekipman seviyeleri, günlük kazanılan ödüllerle açılan **çantalardan** düşmeli. Nadirlik Common, Uncommon, Rare, Epic, Legendary diye başlayıp "uzay üstü"ne kadar **10 kategori** olmalı ve bunlar **araştırılarak** açılmalı.
2. Birden fazla **para birimi** olmalı: araştırma, yetenekler ve yardımcılar bunlarla geliştirilmeli. Bu birimler günlük kazanılabilmeli ve ödüllerle desteklenmeli.
3. Bazı deliklerde **rüzgâr yenilememeli**; araştırma ve geliştirmenin anlamı olsun.
4. "22. delikte kaldım" yerine **harita her 24 delikte değişmeli**. Haritalarda zemin ve rüzgâr şiddeti artmalı, arka plan mekâna göre değişmeli: yağmur, fırtına, kar, çöl, buz, orman, ay, uzay (yerçekimi), Merkür (güneşe yakınlık). Her harita **yıldız puanıyla** açılmalı.
5. Hepsini geçerken **sopa etkili** olmalı; sopa dışında **kendi gücümüz** de olmalı.
6. Uzayda kask, çölde farklı kıyafet olmalı; **kostümler** dünyaya göre değişmeli ve ileride genişletilebilmeli.
7. Tasarım **İngilizce**, ama iki dilli olmalı (İngilizce öncelikli, kavramlar karışmasın).
8. **Yardımcı** seçimi kendi zayıflığımıza göre olmalı: Accurate, Power, Fast; geliştirilebilmeli.
9. **Başarımlar** mantıklı.
10. İki farklı görüntü test edilmeli: mevcut yandan görünüm ve driving range görünümü (kullanıcının paylaştığı referans: sırada golfçüler, renkli top yayları, BALL SPEED / CARRY / TOTAL / HEIGHT etiketleri).

---

## 1. [v6] Kararlar

| # | Karar | Geri bildirim | Ayrıntı |
|---|---|---|---|
| 30 | Oyunun asıl dili İngilizce, Türkçe ikinci dil; arayüzde EN/TR seçici | 7 | §2 |
| 31 | Kurs (18 delik) yerine **World (Dünya)**: 24 delik, 10 dünya, her biri yıldızla açılır | 4 | §4 |
| 32 | **Wind gate (Rüzgâr kapısı)**: Wind control (Rüzgâr kontrolü) yetmezse top ilk vuruşu geçemez | 3 | §5.3 |
| 33 | Oyuncu istatistikleri: **Power, Accuracy, Wind control, Tempo**. Kendi gücün antrenmandan, sopanın gücü ekipmandan | 5 | §5 |
| 34 | **Helper (Yardımcı)** uzmanlığı: Power hitter, Accurate hitter, Fast hitter; Medals ile rütbe | 8 | §6 |
| 35 | Para birimleri: **Yards, Stars, Data, Shards, Medals, Gear Bags** | 2 | §3 |
| 36 | **Gear Bag (Ekipman Çantası)** her zaman ekipman içerir; 5 kademe; 10 nadirlik; Epic ve üstü **Rarity research** ile açılır | 1 | §7 |
| 37 | **Daily rewards (Günlük ödüller)**: 7 günlük takvim, kaçırınca kayıp yok | 2 | §8 |
| 38 | Araştırma çok birimli; 22 düğüm; 2 ek laboratuvar masası | 1, 2 | §9 |
| 39 | **Skills (Yetenekler)** Medals ile geliştirilir; yeni yetenek Wind Shield | 2 | §6.3 |
| 40 | **World outfit (Dünya kıyafeti)**: dünyaya göre otomatik; uzay ve ısı giysisi zorunlu | 6 | §10 |
| 41 | **Achievements (Başarımlar)**, v5'teki hedefler zincirinin yerine; her 10 başarım +%1 mesafe | 9 | §11 |
| 42 | İki görünüm: **View A (Side)** ve **View B (Range)**, karşılaştırma için **A\|B** | 10 | §12 |
| 43 | Otomatik putt 3 → **2**; geçmiş deliklerde **Replay putt** ile yıldız artırma | 4 | §4.3 |

**v5'ten değişenler:** kurs → dünya; Grip (Tutuş) yükseltmesi → Accuracy training; v5 hedef zinciri → başarımlar; Bilgi → Data; Parça → Shards; Sandık → Gear Bag; v5 araştırma ağacındaki Power Drive / Odak / Hızlı Tempo düğümleri → Skills; v5'in 4 yuva × 6 parçalık ekipmanı → 4 yuva × 10 nadirlik.

**v5'ten aynen kalan:** sezonsuz yapı (#17), vuruş bölümleri ve par (#19), zeminin bölüm bölüm belirlenmesi (#20), yön + güç putt (#21), zor günlük delik ve haftalık turnuva (#27), sapma dökümü (#28), sopa tablosu (#29). Ayrıca v4'ten: motor (Unity 6 + C#), kayıt kuralları, kopyalama kuralları, para kazanma kararı #5.

---

## 2. [v6] Dil ve terimler

- Varsayılan dil İngilizce. Üst şeritteki `EN | TR` seçici tüm arayüzü, veri adlarını (dünya, ekipman, araştırma, başarım) ve süre birimlerini değiştirir. Seçim kayda yazılır.
- Kodda her metin `L('English', 'Türkçe')`, her veri adı `{ en, tr }` çiftidir. Yeni metin eklerken önce İngilizce yazılır.
- **Terim sözlüğü** (asıl ad → Türkçe):

| English | Türkçe | Not |
|---|---|---|
| Yards | Yarda | Ana birim |
| Stars | Yıldız | Dünya açar |
| Data | Veri | Araştırma birimi (v5: Bilgi) |
| Shards | Parça | Ekipman geliştirme (v5: Parça) |
| Medals | Madalya | Yardımcı ve yetenek |
| Gear Bag | Ekipman Çantası | v5: Sandık |
| World | Dünya | 24 delik (v5: Kurs, 18 delik) |
| Wind gate | Rüzgâr kapısı | |
| Wind control | Rüzgâr kontrolü | |
| Accuracy | İsabet | |
| Power | Güç | |
| Tempo | Tempo | |
| Helper | Yardımcı | v4: Kaddi/vurucu (V1 açık kararı kapandı) |
| Power hitter / Accurate hitter / Fast hitter | Güçlü / İsabetli / Hızlı vurucu | |
| Skill | Yetenek | |
| Research | Araştırma | |
| Achievement | Başarım | |
| World outfit | Dünya kıyafeti | |
| Rarity | Nadirlik | §7.1 |

- v4'ün açık kararları V1 (vurucu adı), V2 (araştırma birimi adı) ve V4 (para birimi adı) bu sözlükle kapanır: **Helper**, **Data**, **Yards**.

---

## 3. [v6] Para birimleri

| Birim | Ne işe yarar? | Nereden gelir? |
|---|---|---|
| Yards | Antrenman ve yardımcı seviyeleri | Vuruşlar, altın top |
| Stars | Dünya kilidi; kalıcı +%1 mesafe / ★ | Delik skoru, Replay putt |
| Data | Araştırma | Her delik (`1 + dünya sırası`), günlük ödül, başarım, turnuva, altın top |
| Shards | Ekipman geliştirme; ileri araştırmalar | Çanta (her çantada), kopya ekipman, günlük ödül, başarım |
| Medals | Yardımcı rütbesi ve uzmanlık değişimi, yetenekler, ileri araştırmalar | Rüzgâr kapısı geçmek (+5), günlük ödül, günlük delik, turnuva, başarım, altın top |
| Gear Bags | Ekipman | Günlük ödül, her 6. delik, dünya sonu, günlük delik, turnuva, başarım, altın top |

Hiçbiri satın alınamaz (v4 kararı #5).

---

## 4. [v6] Dünyalar

### 4.1 Yapı

- Delik `n` global sıradır. **Dünya** `w = floor((n − 1) / 24)`, dünya içi delik `h = (n − 1) mod 24 + 1`.
- Par deseni (24 delik): `4 4 3 5 4 4 3 4 5 4 3 4 5 4 4 3 4 5 4 3 5 4 4 5`. Vuruş bölümü sayısı `par − 2` (v5 §3).
- Biten her dünya kalıcı **×2 kupa** verir (v5'te kurs başınaydı).
- Delik uzunluğu v5 ile aynı formül: `8 000 × 2.3^(min(n,18) − 1) × 1.5^(max(0, n − 18))` (TBT).

### 4.2 Dünya listesi

| # | World (Dünya) | ★ gerekli | Rüzgâr adı | Taban rüzgâr (km/h) | Kapı artışı | Kapı delikleri | Zemin + | Özel | Kıyafet |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Green Meadows (Yeşil Çayırlar) | 0 | Wind | 3 | 6 | 16, 24 | 0 | – | – |
| 2 | Rainy Links (Yağmurlu Kıyı) | 40 | Wind | 10 | 6 | 8, 16, 24 | 2 | Rough +%6, yağmur | Yağmurluk + balıkçı şapka |
| 3 | Storm Coast (Fırtına Burnu) | 80 | Gale | 22 | 8 | 8, 16, 24 | 2 | Fırtına, şimşek | Rüzgârlık + bere |
| 4 | Deep Forest (Derin Orman) | 120 | Wind | 12 | 8 | 8, 16, 24 | 4 | Rough +%8, sis | Korucu şapkası + yelek |
| 5 | Dune Desert (Kum Çölü) | 165 | Sandstorm | 20 | 10 | 8, 16, 24 | 3 | Bunker ×2, sıcak ×0.85 | Hasır şapka + gözlük |
| 6 | Snow Peaks (Karlı Zirveler) | 210 | Blizzard | 24 | 10 | 8, 16, 24 | 4 | Kar | Şişme mont + bere + atkı |
| 7 | Frozen Glacier (Buzul) | 255 | Polar wind | 30 | 12 | 8, 16, 24 | 5 | Kutup ışıkları | Kürk kapüşon + kar gözlüğü |
| 8 | Lunar Base (Ay Üssü) | 300 | Low-gravity drift | 30 | 12 | 8, 16, 24 | 6 | 0.17 g, gökyüzünde Dünya | **Uzay giysisi + kask (zorunlu)** |
| 9 | Orbital Station (Yörünge İstasyonu) | 345 | Solar wind | 45 | 14 | 8, 16, 24 | 6 | 0.05 g, istasyon güvertesi | **Uzay giysisi + kask (zorunlu)** |
| 10 | Mercury (Merkür) | 390 | Solar wind | 60 | 15 | 8, 16, 24 | 8 | Sıcak ×0.55, dev güneş | **Isı giysisi + altın vizör (zorunlu)** |

- **Yerçekimi** yalnızca görsel ve uçuş hissidir (daha yüksek, daha uzun süren yaylar; range görünümünde daha uzun taşıma). Ekonomide nötrdür.
- **Sıcak (heat):** yardımcı hızı `× min(1, heat + 0.1 × Cooling)`.
- Her dünyanın kendi gökyüzü, tepe, ağaç/kaktüs/krater/direk silüeti, çim, rough, kum ve yeşil rengi ile hava efekti vardır: yağmur, fırtına (şimşek), sis, kum tozu, kar, kutup ışıkları, yıldızlar, uzay tozu, ısı dalgası.

### 4.3 Dünya kilidi ve yıldız

- Bir dünyanın son deliği bitince sıradakine geçmek için toplam yıldız ≥ eşik olmalı. Değilse ilerleme durur (yarda kazanılmaya devam eder, yükseltme alınabilir) ve ekranda "World locked" görünür.
- **Replay putt (Putt'u tekrar oyna):** Dünyalar sekmesinde, geçilmiş ve 3★'tan az olan deliklerde yalnızca putt yeniden oynanır. Skor = o deliğin kaydedilmiş yeşile kadar vuruşları + yeni putt sayısı; daha iyiyse yıldız güncellenir.
- **[v6] Otomatik putt = 2** (v5: 3). Temiz oynanan idle delik par (2★), bunkerli delik bogey (1★) olur. Böylece idle oyuncu ortalama ~1.7★/delik toplar; eşikler ~1.7★ × 24 × (dünya − 1) civarındadır (TBT).

---

## 5. [v6] Oyuncu istatistikleri ve rüzgâr

### 5.1 Dört istatistik

| İstatistik | Formül | Kaynaklar |
|---|---|---|
| **Power** (Güç) | `(5 + 2·L_power) × 1.5^floor(L_power/25) × top × ekipman gücü × araştırma` | Power training (kendi gücün), Ball tech, ekipman (Club Head, Ball), Distance study |
| **Accuracy** (İsabet) | `L_accuracy + ekipman isabeti + Σ Accurate hitter (2 + rütbe) + 3 × Accuracy drills` | Accuracy training (v5 Tutuş), Grip ekipmanı, Accurate hitters, araştırma |
| **Wind control** (Rüzgâr kontrolü) | `5 + 0.5 × Accuracy + 6 × Wind reading + ekipman rüzgâr kontrolü` | Accuracy, araştırma, Ball ekipmanı |
| **Tempo** | Takımın toplam vuruş/s | Yardımcı seviyeleri, Fast hitters, Shaft ekipmanı, Helper conditioning |

- Takım sekmesi bu dört değeri deliğin gereksinimleriyle çubuklarla karşılaştırır: Accuracy ↔ terrain difficulty, Wind control ↔ bu deliğin rüzgârı ↔ sıradaki rüzgâr kapısı.

### 5.2 Zemin

v5 §3.3 ile aynı, iki farkla:
- `δ = Accuracy − terrainDiff(n)`, `terrainDiff(n) = floor(0.5·n) + dünya.terrain`.
- Dünya etkisi: rough olasılığına `roughBias` eklenir, bunker olasılığı `bunkerX` ile çarpılır.

### 5.3 Rüzgâr ve rüzgâr kapısı (karar #32)

```
deliğin rüzgârı  W(n) = dünya.wind + 0.4 × (h − 1)                        (kapı değilse)
kapı rüzgârı     W(n) = dünya.wind + dünya.step × (kapı sırası)           (h ∈ dünya.gates)
anlık rüzgâr     = W(n) × döngü     döngü 45 s'de bir: sakin ×0.7 (%40), karşı ×1.3 (%30), arka ×0.9 (%30)
ceza             = anlık > WC ve kalkan yoksa max(0.25, (WC / anlık)^1.5), değilse 1;  arka rüzgârda ×1.2
kapı             = h kapı deliğiyse ve WC < W(n): ilerleme 1. vuruş sınırının %99.5'inde durur
```

- Kapı geçilince +5 Medals ve başarım sayacı.
- Ekranda: delik başlığında "WIND GATE" etiketi, haritada kapı rüzgârı, sahnede rüzgâr duvarı katmanı. Gereksinim satırında "Wind gate: 15 km/h · your wind control 14" ve Takım sekmesine düğme var.
- **Simülasyon (açgözlü alım, idle, ekipman yok):**
  - Araştırma yoksa delik 24'teki kapıda takılır: WC 14, kapı 15.
  - Araştırma botuyla (Wind reading, Accuracy drills, slot, Distance study; günlük ödüller alınıyor) dünya 2'ye ~48 dk, dünya 3'e ~5.3 sa, dünya 4'e ~68 sa.
  - Ekipmanla yeniden ölçülmeli (§14).

---

## 6. [v6] Takım: yardımcılar ve yetenekler

### 6.1 Uzmanlık (karar #34)

| Helper | Vuruş değeri | Vuruş hızı | İsabet |
|---|---|---|---|
| Power hitter (Güçlü) | `× (1.6 + 0.15 × rütbe)` | × 0.85 | – |
| Accurate hitter (İsabetli) | × 1 | × 1 | `+ (2 + rütbe)` takıma |
| Fast hitter (Hızlı) | × 0.85 | `× (1.6 + 0.15 × rütbe)` | – |

- Yardımcı yuvası açıldığında uzmanlık seçilir; ilk seçim ücretsiz, sonraki değişim **15 Medals**. 1. yardımcı Fast ile başlar.
- **Rütbe** 0–10, maliyet `8 × 1.7^rütbe` Medals.
- Seviye (Yards ile) v5 ile aynıdır: `25 × 1.24^L × 1.5^i`, her 25 seviyede ×1.5.
- Oyuncuya önerilen düşünce: isabet zayıfsa Accurate, mesafe zayıfsa Power, takım yavaşsa Fast. Sahnede her yardımcının başının üstünde uzmanlık rengi (kırmızı / mavi / yeşil) vardır.

### 6.2 Kendi gücün

Yards ile alınan **training** yükseltmeleri oyuncunun kendisidir: Power training, Accuracy training, Timing (v5 Şaft: oto mükemmel şansı), Ball tech, Stance, Clubhouse. Sayılar v5 §4.1 ile aynı (Accuracy training = v5 Tutuş: base 150, growth 2.2).

### 6.3 Skills (Medals ile, karar #39)

| Skill | Seviye | Etki | Bekleme |
|---|---|---|---|
| Power Drive | 1 (başta) – 5 | Dolu elle vuruş `20 + 10 × sv` sn otomatik gelir; şarj `+%10 × (sv − 1)` hızlı | – |
| Focus | 0 – 5 | Mükemmel bölgesi ×2, `8 + 2 × sv` sn | 60 s |
| Tempo Rush | 0 – 5 | Yardımcılar ×3, `16 + 4 × sv` sn | 120 s |
| **Wind Shield** [v6] | 0 – 5 | Rüzgâr cezası yok, `8 + 3 × sv` sn. **Rüzgâr kapısını açmaz** | 90 s |

Maliyet `10 × 1.8^sv` Medals.

---

## 7. [v6] Ekipman ve Gear Bags

### 7.1 Nadirlik (10 kademe, karar #36)

| # | Rarity | Türkçe | Renk | Taban ağırlık | Açılış |
|---|---|---|---|---|---|
| 0 | Common | Sıradan | gri | 500 | Başta |
| 1 | Uncommon | Seçkin | yeşil | 300 | Başta |
| 2 | Rare | Nadir | mavi | 150 | Başta |
| 3 | Epic | Epik | mor | 60 | Araştırma |
| 4 | Legendary | Efsanevi | turuncu | 25 | Araştırma |
| 5 | Mythic | Mitik | kırmızı | 10 | Araştırma |
| 6 | Ancient | Kadim | camgöbeği | 4 | Araştırma |
| 7 | Celestial | Göksel | açık mavi | 1.5 | Araştırma |
| 8 | Cosmic | Kozmik | mor-pembe | 0.5 | Araştırma |
| 9 | Transcendent | Uzay Ötesi | pembe | 0.12 | Araştırma |

```
ağırlık(r) = taban(r) × (1 + 0.8 × çanta kademesi + 0.3 × Lucky finds)^r      (yalnızca açılmış nadirlikler)
```

Ekipman sekmesi her nadirliğin Bronze ve Gold çantadaki yüzdesini gösterir; açılmamış olanlar "research" diye işaretlenir.

### 7.2 Parçalar

- 4 yuva × 10 nadirlik = **40 parça** (albüm). Tam liste: `js/data.js` `ITEM_NAMES`.

| Yuva | Ana istatistik (sv 1) |
|---|---|
| Club Head (Sopa Başı) | Power `+5% × 1.6^r` |
| Shaft (Şaft) | Tempo `+4% × 1.55^r` |
| Grip (Sap) | Accuracy `+round(2 × 1.5^r)` |
| Ball (Top) | Power `+3% × 1.6^r` ve Wind control `+round(1.5 × 1.45^r)` |

- Seviye tavanı `5 + r`; her seviye tabanın +%25'i. Geliştirme maliyeti `round(8 × 1.45^(sv−1) × (1 + r)^1.3)` Shards.
- Kopya: `5 × 2^r` Shards. Yeni parça, takılı olandan güçlüyse otomatik takılır.
- Toplam güç çarpanı `softcap(Π(1 + power), 10, 0.5)` (TBT).
- Görünüş: sopa başının kenarı, şaft ve sap rengi takılı parçanın nadirlik rengindedir.
- Turnuvaya etkisi: taşıma `min(25%, …)`, sapma `−min(45%, acc / (acc + 60))`, zemin cezası `−min(50%, acc / (acc + 80))`, yuvarlanma `min(50%, wc / (wc + 40))`.

### 7.3 Gear Bags

| Bag | Parça sayısı | Shards (±%20) |
|---|---|---|
| Bronze Bag (Bronz) | 1 | 10 |
| Silver Bag (Gümüş) | 2 | 25 |
| Gold Bag (Altın) | 2 | 60 |
| Platinum Bag (Platin) | 3 | 120 |
| Diamond Bag (Elmas) | 3 | 250 |

- Kapasite `10 + 10 × Bag rack`; dolunca yenisi kaybolur. Acıma: 15 çantada bir en az Rare.
- Kaynaklar: her 6. delik Bronze, dünya sonu Gold, günlük ödül takvimi, günlük delik (sıralamaya göre Bronze–Diamond), turnuva, başarımlar, altın top (%12 Bronze).
- Açılışta çanta sallanır, parçalar sırayla nadirlik rengindeki kartlarla açılır ("NEW · added to album · equipped" ya da "Duplicate → +N shards").

---

## 8. [v6] Daily rewards

7 günlük takvim, oyun günü başına bir kez alınır. Gün kaçırılırsa sıra bekler, ödül kaybolmaz (v4 §17.7 etik ilkesi).

| Gün | Ödül |
|---|---|
| 1 | Bronze Bag + 10 Data |
| 2 | 30 Data + 20 Shards |
| 3 | 20 Medals |
| 4 | Silver Bag + 20 Data |
| 5 | 100 Shards |
| 6 | 40 Medals + 30 Data |
| 7 | Gold Bag + 30 Medals |

Hazır olduğunda üst şeritte "Daily reward!" düğmesi ve Compete sekmesinde nokta görünür.

---

## 9. [v6] Research (çok birimli)

Laboratuvar 1 masa, **Extra lab bench** ile 3'e kadar. Maliyet `{Data, Shards, Medals}` karışımıdır.

| Dal | Düğüm | Maks | Maliyet | Süre | Etki / sv |
|---|---|---|---|---|---|
| Helpers | Helper slot | 9 | `8 × 1.7^l` Data | `5 dk × 2^l` | Yuva 2–10 |
| Helpers | Helper conditioning | 10 | `10 × 1.6^l` Data | `10 dk × 1.7^l` | Yardımcı hızı +%15 |
| Course | Accuracy drills | 10 | `10 × 1.6^l` Data | `10 dk × 1.8^l` | +3 Accuracy |
| Course | Wind reading | 10 | `12 × 1.6^l` Data + (l ≥ 3) `5l` Medals | `15 dk × 1.8^l` | +6 Wind control |
| Course | Rough mastery | 3 | `12 × 2.2^l` Data | `15 dk × 2.5^l` | Rough cezası +0.1 |
| Course | Bunker escape | 3 | `15 × 2.2^l` Data | `20 dk × 2.5^l` | Bunker cezası +0.12 |
| Course | Cooling | 5 | `40 × 2^l` Data + `50 × 2^l` Shards | `1 sa × 2^l` | Sıcak cezası −%10 |
| Economy | Distance study | 15 | `10 × 1.8^l` Data | `20 dk × 1.6^l` | Mesafe +%20 |
| Economy | Bargaining | 5 | `20 × 2^l` Data | `30 dk × 2^l` | Yükseltme maliyeti −%5 |
| Economy | Night shift | 2 | `30 × 3^l` Data | `1 sa × 3^l` | Çevrimdışı verim +%10 |
| Gear | Bag rack | 2 | `12 × 3^l` Data + `30(l+1)` Shards | `20 dk × 4^l` | +10 çanta yeri |
| Gear | Lucky finds | 5 | `20 × 2.2^l` Data + `40 × 2^l` Shards | `30 dk × 2.3^l` | Yüksek nadirlik ağırlığı |
| Putting | Green reading | 3 | `10 × 2^l` Data | `10 dk × 2.5^l` | Okuma çizgisi uzar |
| Putting | Steady hands | 3 | `10 × 2^l` Data | `10 dk × 2.5^l` | Putt +1 s, güç çubuğu yavaş |
| Lab | Extra lab bench | 2 | `40 × 4^l` Data + `20(l+1)` Medals | `1 sa × 4^l` | +1 eşzamanlı araştırma |
| Rarity research | Epic … Transcendent gear | 1 her biri, sıralı | `30 × 2.6^k` Data + `60 × 2.8^k` Shards (+ k ≥ 2 için `20 × 2^(k−2)` Medals) | `30 dk × 2.4^k` | O nadirlik çantadan düşebilir (`k = r − 3`) |

Transcendent araştırması tek başına ~96 saat, ~9 300 Data, ~29 000 Shards ve 320 Medals ister (TBT).

---

## 10. [v6] Görünüm ve World outfit (karar #40)

- **World outfit** açıkken oyuncu ve tüm yardımcılar dünyanın kıyafetini giyer (§4.2 tablosu). Ay, uzay ve Merkür'de giysi her zaman zorunludur: kask balonu, sırt çantası, gri eldiven ve botlar; Merkür'de gümüş ısı giysisi ve altın vizör.
- Kıyafet kapalıyken oyuncunun kendi seçimi görünür.
- Kişisel seçimler (oyuncu ve her yardımcı ayrı): ten, tişört, pantolon, şapka (Cap, Visor, No hat, Bucket, Beanie, Sun hat, Ranger hat, Crown), şapka rengi, sopa kaplaması, oyuncuya özel top izi.
- Açılmalar dünyalara ve başarımlara bağlıdır (örneğin Beanie → Snow Peaks'e ulaş, Crown → 200★, Rainbow trail → haftalık ilk %10). Tam tablo: `js/data.js` `LOOKS`, `UNLOCKS`.
- Görünüm sekmesinde herhangi bir dünya seçilip o dünyanın kıyafeti ve havasıyla canlı önizleme yapılabilir.
- **Genişletilebilirlik:** yeni dünya = `WORLDS` dizisine bir kayıt ve `Art.dress` içinde bir `suit` dalı. Yeni kostüm = `LOOKS` içine bir satır ve `Art.hat` içinde bir çizim. Ekonomiye etkisi yoktur (v4 #5).

---

## 11. [v6] Achievements

- Yaklaşık 45 başarım; ödüller otomatik verilir, bildirim çıkar. Her 10 başarım +%1 mesafe (en fazla +%10, v4 §11.5).
- Gruplar:

| Grup | Eşikler | Ödül tipi |
|---|---|---|
| Holes | 10, 24, 48, 72, 120, 168, 240 | Data / Bag |
| Stars | 25, 50, 100, 200, 400 | Medals |
| Gear bags opened | 5, 25, 100 | Shards |
| Rarity found | Rare … Transcendent (8) | Data + Medals |
| Birdies | 1, 10, 50 | Medals |
| Power Drives | 1, 25, 100 | Data |
| Wind gates beaten | 1, 5, 15 | Medals |
| Worlds reached | 2 … 10 (9) | Bag |
| Team | 3 helpers, rank 5 | Medals / Data |
| Daily hole | play, par or better | Medals / Bag |
| Tournament | play, top %25 | Medals / Bag |
| Research | 5, 25 levels | Shards |

- v5'in sıralı hedefler zinciri kaldırıldı; aynı işlevi başarımlar ve günlük ödüller görür.

---

## 12. [v6] İki görünüm (karar #42)

| | **View A · Side** | **View B · Range** |
|---|---|---|
| Kamera | Yandan, kayan arka plan | Tee hattının arkasından perspektif |
| Golfçüler | Oyuncu önde, yardımcılar arkada | Hepsi bir sırada; oyuncu ortada, "YOU" etiketi; her birinde çanta, mat, top yığını, ölçüm cihazı |
| Toplar | Beyaz yaylar; elle vuruşta renkli iz | Her golfçünün kendi renginde 3B yay; düşüş ve yuvarlanma çizgisi |
| Bilgi | Zemin etiketi (ör. BUNKER ×0.35), sayı uçuşması | Oyuncu vuruşunda BALL SPEED (mph), HEIGHT (ft), CARRY (yds), TOTAL (yds) |
| Saha | Topun bulunduğu zemin karakterlerin altına çizilir | 55–320 yd'de bayraklı hedef yeşiller, mesafe numaraları |
| Ortak | Dünya teması, hava, rüzgâr, rüzgâr kapısı katmanı, altın top | Aynı |

- **A|B** modu ikisini yan yana gösterir (A · SIDE, B · RANGE etiketli). Hangi görünümün seçileceği oyuncu testiyle belirlenecek (§14).
- Range görünümündeki sayılar görseldir: `speed = clamp(88 + 18 × log10(Power), 80, 205) × kalite`, `carry = clamp(1.65 × speed − 20, 35, 340) × (1 + 0.6 × (1 − yerçekimi))`, `total = carry × 1.06–1.14`, `height = carry × 0.33 × (1/yerçekimi)^0.35`. Ekonomiyi etkilemez, gücün hissini verir.

---

## 13. [v6] Arayüz

```
ÜST ŞERİT: Yards · Per sec · Stars · Data · Shards · Medals · Gear bags | oyun saati · Daily reward! | Pause ×1 ×10 ×100 Skip time ? | A B A|B | EN TR
OYUN: World N · ad | Hole h/24 · Par · [WIND GATE] | 24 hücrelik şerit (kapılar kırmızı) | delik haritası | sahne (A/B/A|B) + halka + yetenekler + Putt
      ilerleme çubuğu | gereksinim satırı (rüzgâr ↔ wind control; kapı/kilit uyarısı + kısayol) | zemin olasılıkları · gelir kaynağı
PANEL: Upgrades · Team · Research · Gear · Look · Worlds · Compete · Awards · Dev
```

- **Kayıt şeması:** `v: 3`. Yeni alanlar: `meta.shots{n}` (yeşile kadar vuruş, Replay için), `data`, `shards`, `medals`, `skills`, `bags[]` (kademe listesi), `ach`, `rewards {last, idx}`, `worldOutfit`, `settings.view`, `settings.lang`; `run.hitters[i] = {L, type, rank}`, `run.locked`, `run.shieldUntil/Cd`. Kaldırılan: `bilgi`, `parts`, `chests`, `goals`, `pity` tipi değişti. Göç `migrate_3_to_4` (TBT): Bilgi → Data, Parça → Shards, sandık → Bronze Bag, eski ekipman → aynı yuva ve nadirlikte yeni parça.

---

## 14. Açık kararlar ve testler [v6]

| # | Konu | Not |
|---|---|---|
| V6-1 | View A mı, B mi? | A\|B moduyla oyuncu testi: okunabilirlik, "gücümü hissediyorum" puanı, mobilde performans |
| V6-2 | Ekipmanlı denge | Simülatöre çanta beklenen değeri ve rarity araştırması eklenmeli; dünya 4+ süreleri (şu an idle ~68 sa) ekipmanla ölçülmeli |
| V6-3 | Aktif/idle oranı | v5 V5-1 sürüyor (~5×) |
| V6-4 | Yıldız eşikleri | Idle ~1.7★/delik varsayımı ölçülmeli; Replay putt'un yıldız enflasyonu yaratıp yaratmadığına bakılmalı |
| V6-5 | Kapı zorluğu | İlk kapı (delik 16) yeni oyuncuyu araştırmaya yönlendiriyor mu, yoksa duvar gibi mi hissediliyor? |
| V6-6 | Nadirlik üst ucu | Transcendent'in ~96 saatlik araştırması ve %0.0x düşme şansı hedef mi? |
| V6-7 | Turnuva ve dünyalar | Günlük delik o anki dünyanın temasında mı oynansın? |
| V6-8 | Görsel dil | Uzay/Merkür kıyafeti dışındaki dünya kıyafetleri zorunlu mu kalsın, isteğe bağlı mı? |

---

## 15. Kilometre taşları [v6]

v5 §14 geçerli. Değişen ve eklenenler:

| # | Çıktı | Bitti sayılma ölçütü |
|---|---|---|
| M0 (yeniden) | Simülatör: dünyalar, kapılar, uzmanlıklar, çanta ve rarity araştırması | §5.3 ve V6-2 tabloları idle/karma/aktif için üretildi |
| M3 (değişti) | Dünya yapısı | 24 delik, dünya kilidi, kapılar, Replay putt |
| M5 (değişti) | Cila | 10 dünya teması ve hava efekti; World outfit; iki görünüm; EN/TR |
| M7b (değişti) | Takım ve araştırma | Helper uzmanlık ve rütbesi, Skills, 22 araştırma düğümü |
| M7c (değişti) | Ekipman ve günlük | 10 nadirlik, 40 parça, 5 çanta, günlük ödül takvimi, ~45 başarım |
| M6 (ek) | Görünüm testi | V6-1 kararı verildi |

---

## 16. [v6.1] Prototip 3.1 değişiklikleri (2026-10-25)

> Prototip 3 oynandıktan sonraki geri bildirimle yapılan düzeltmeler. Bu bölüm önceki bölümlerle çeliştiği yerde **geçerlidir**. Kod: `prototype/` (aynı kayıt anahtarı `parfabrikasi-proto-v3`).

### 16.1 Geri bildirim

1. View B çok karmaşık; yalnızca en son toplar görünmeli.
2. Turnuva ve günlük delikte sopa listesi anlamsız ("hep D seçili"), ayrıntı çok. Daha rekabetçi ama daha az karmaşık olmalı.
3. 9. dünyada neden ilerlenemediği anlaşılmadı; "Next shot in: çok uzun" yazıyor. Geliştirilmesi gereken yer ipucu olarak gösterilmeli; ekranda yüzde ve "ünlü yüzler" olabilir.
4. Worlds sekmesinde par ve skor neden var? Oyuncu yıldız kasmak için geri dönmemeli; bir sonraki delikte uzun zaman geçirmek ödül verebilir.
5. Sekmelerde uzun açıklama yerine yerinde, kısa açıklama (mobil oyuncu okumaz).
6. "TEE ×1.5" ne demek?
7. Bunker, su, çamur gibi alanlara düşen toplar için mini oyun olmalı; oyunda değilken süre uzamalı.
8. Clubhouse ve Stance'te neden seviye tavanı var?

### 16.2 Kararlar

| # | Karar | Geri bildirim | Önceki kuralın yerine |
|---|---|---|---|
| 44 | **View B sade:** golfçü başına yalnızca son top; yardımcı izleri ince ve soluk; ölçüm cihazı ve top yığını yok | 1 | §12 |
| 45 | **Turnuva sade:** sopa listesi yok, sopa otomatik ve yalnızca adı görünür; sapma tablosu yerine tek satır sonuç; yan panelde 3 büyük sayı (bayrağa, rüzgâr, skor), mini skor kartı ve **tahmini sıra** | 2 | v5 #28–#29, §10 |
| 46 | **Coach tips (Koç ipuçları):** ana ekranda tek satır, kurgusal koç yüzüyle; en büyük darboğazı bulur ve tek eylem önerir (Go/Buy düğmesi) | 3 | – |
| 47 | Sahne üstünde durum etiketi: `HOLE 4 · 34%` ve zemin `TEE +50%` / `BUNKER −65%` | 3, 6 | "TEE ×1.50" etiketi |
| 48 | **Geri dönüş yok:** Replay putt kaldırıldı; Worlds sekmesinde skor kartı yok, yalnızca dünya ilerlemesi ve yıldız çubuğu | 4 | #43'ün Replay kısmı, §4.3 |
| 49 | **Patience bonus (Sabır ödülü):** bir delikte geçen her 10 dk +1 Medal; 20. ve 60. dakikada +1 bonus ★ (delik başına en fazla 2) | 4 | – |
| 50 | **Hazard escape (Tehlike kaçışı):** bunker/su düşüşünde oyuncu aktifse mini oyun; başarı ceza vuruşunu siler ve topu dışarı çıkarır. Oyuncu yoksa ceza ve yavaşlama aynen | 7 | §3.3'ün cezası (yalnızca oyuncu yokken) |
| 51 | Dünyaya göre tehlike adları (Mud pit, Dune, Snow drift, Crater, Debris field, Lava pool…) | 7 | TERRAIN adları |
| 52 | **Seviye tavanı yok:** Timing, Stance, Clubhouse sınırsız; Timing 45'ten sonra mükemmel çarpanını büyütür | 8 | v5 §4.1 maks sütunu |
| 53 | Sekmelerdeki açıklama paragrafları kaldırıldı; bağlamsal bilgi koç satırında | 5 | – |
| 54 | Test aracı "dünyaya atla" oynanabilir bir kurulum yapar (ilk vuruş ~5 dk) | 3 | §15 Dev |

### 16.3 Coach tips

- Koçlar **kurgusal** karakterlerdir. Gerçek golfçülerin adı ya da görünüşü lisans gerektirir; v1.0'da lisanslı bir "efsane" karakter düşünülürse ayrıca değerlendirilir.

| Coach | Konu |
|---|---|
| Coach Ada | Accuracy, wind, zemin |
| Big Bruno | Power, en iyi yükseltme |
| Swift Sam | Yardımcılar, yıldız, dünya kilidi |
| Prof. Iris | Araştırma, ekipman, günlük ödül |

- **Öncelik sırası** (ilk tutan gösterilir):
  1. World locked → kaç ★ eksik, sabır ödülü.
  2. Wind gate → eksik rüzgâr kontrolü ve en hızlı çözüm: Wind reading araştırması, Accuracy training, Accurate yardımcı, çanta, Compete; hangisi mümkünse.
  3. Günlük ödül hazır.
  4. Uzmanlığı seçilmemiş yardımcı.
  5. Açılmamış çanta.
  6. Rüzgâr cezası > %20.
  7. Sıcak ve Cooling.
  8. Zemin kaybı > %20.
  9. Boş laboratuvar.
  10. Rütbe atlatılabilir yardımcı.
  11. Gelir/yarda oranı en iyi yükseltme (alınabilirse "Buy", değilse kaç dakika sonra).
- Sonraki vuruş tahmini 3 günü aşarsa sayı yerine "Very slow here: follow the coach tip" yazılır.

### 16.4 Hazard escape

```
tetik      : bunker ya da su düşüşü, son 60 s içinde dokunma/tuş, hız ≤ ×10, açık pencere/modal yok
mekanik    : işaretçi 0↔1 salınır (0.9–1.2 /s), 4 s süre, yeşil bölgede durdur
bölge      : clamp(0.14 + 0.012 × (Accuracy − terrainDiff), 0.07, 0.32)
başarı     : bunker → fairway (son bölümse yeşil), su → rough; ceza vuruşu silinir
başarısız  : ceza ve zemin çarpanı aynen
oyuncu yok : mini oyun yok; ceza ve yavaşlama aynen (süre uzar)
```

**Dünyaya göre adlar:**

| Dünya | Bunker | Su |
|---|---|---|
| Rainy Links | Mud pit | Puddle |
| Storm Coast | Mud pit | Surf |
| Deep Forest | Mud pit | Creek |
| Dune Desert | Dune | Oasis |
| Snow Peaks | Snow drift | Frozen pond |
| Frozen Glacier | Ice crevasse | Thin ice |
| Lunar Base | Crater | Dust pit |
| Orbital Station | Debris field | Airlock gap |
| Mercury | Slag | Lava pool |

### 16.5 Patience bonus

- `run.holeTime` delikte geçen oyun süresidir (çevrimdışı ve zaman atlama dahil); delik bitince sıfırlanır.
- Her 600 s'de +1 Medal. 1 200 s ve 3 600 s'de o deliğe +1 bonus ★ (`meta.bonusStars[n]`, en fazla 2). Bonus yıldızlar toplam yıldıza ve dünya kilidine sayılır.
- Delik başlığında `⏱ 12m (+★ in 8m)` gösterilir.
- Simülasyon: araştırma yapmayan idle oyuncu delik 24'teki kapıda takılırken 2 bonus ★ alır. Toplam yıldızda ~%2–5 artış beklenir (TBT).

### 16.6 Turnuva yan paneli

| Alan | İçerik |
|---|---|
| Başlık | Mod, `Hole i/n`, `PAR p` |
| Büyük sayılar | To pin (yd) · Wind (yön oku + km/h) · Score (par'a göre) |
| Sopa | Otomatik seçilen sopanın adı ve zemin (ör. `Driver · Tee`) |
| Rekabet | Turnuva: `Projected #k of 50`; günlük delik: günün ortalaması |
| Skor kartı | Tek satır, birdie daire / bogey kare |
| Sonuç satırı | `Good · 225 yd · 9 yd left (wind 2, luck 7) → Rough` |

Tahmini sıra: `proj = rel + kalan_delik × (μ/9)`, `μ = 7 − 1.4 × lig`, `sıra ≈ 1 + 49 × Φ((proj − μ) / 3)`.

### 16.7 Açık konular (v6.1)

| # | Konu |
|---|---|
| V6-9 | Hazard escape sıklığı: geç dünyalarda bunker olasılığı yüksek; mini oyun yorucu olursa delik başına 1 ile sınırla |
| V6-10 | Sabır ödülü kapıda takılmayı fazla ödüllendiriyor mu? |
| V6-11 | Koç ipuçlarının sırası oyuncu testinde doğrulanmalı (en çok tıklanan / göz ardı edilen) |
| V6-12 | Sopa seçimi tamamen otomatik kaldı; ileri ligde "lay-up / go for it" gibi tek bir seçim eklenebilir |
