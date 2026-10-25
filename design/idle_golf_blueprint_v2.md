# Idle Golf: Tasarım Planı (Faz 4, **v2**) [UPDATED]

> **[NEW] Sürüm notu**
> - v2, 2026-10-17. Önceki sürüm `design/idle_golf_blueprint.md` (v1) olduğu gibi duruyor. Birebir yedeği `backup/idle_golf_blueprint.original.md`.
> - Değişiklikler `[UPDATED]` (v1'deki bir şeyi düzeltir) ve `[NEW]` (v1'de yoktu) etiketleriyle işaretli.
> - Gerekçeler: `review/plan_review.md` ve `review/changes_summary.md`.
> - **TBT** = "test edilecek varsayım". Sayı simülatörle doğrulanana kadar kesin değildir.

**Çalışma adı:** *Par Fabrikası* (geçici; mağaza öncesi ad ve marka kontrolü yapılmalı)
**Tür:** Golf temalı incremental/idle. Tek oyunculu, 2D.
**Hedef:** Kısa oturumlarda aktif vuruş ve uzun süreli otomasyon.
- İlk "sezon" (prestij): aktif oyunda ~1h45m, yalnızca idle oynayınca ~3h15m (simülasyon, bkz. `economy_simulator_spec.md`; v2'de bağımsız koşuyla doğrulandı).
- **[NEW]** İlk "son" kilometre taşı **Büyük Şampiyon** (Kurs 4, delik 18): karma oyuncu için **25–45 saat oynama** (TBT, §12.3). Sonrasında Efsane katmanı ve sonsuz Tur bantları gelir (§11).

> Bu belge **özgün** bir tasarımdır. İki referans oyundan yalnızca genel incremental kalıplar alındı.
>
> Scritchy Scratchy analizinden (`analysis/progression.md`):
> - üstel maliyet,
> - göreli kademe farkı,
> - kademeli otomasyon açılımı,
> - sık küçük hedefler,
> - iki katmanlı kayıt.
>
> **[NEW]** Melvor Idle analizinden (`analysis/melvor_reference.md`):
> - içerik tamamlamayla açılan tavan bantları,
> - hız ve maliyet için sert taban/tavan,
> - eşik bonusları,
> - çevrimdışını aynı simülasyonla hesaplama,
> - sıralı kayıt göçü.
>
> İsim, varlık, kod, veri tablosu ve seviye düzeni alınmadı. Ayrıntılar §9'da.

---

## 1. Çekirdek döngü

| Katman | Oyuncu ne yapar? | Ne otomatik çalışır? | Yükseltmeler neyi değiştirir? |
|---|---|---|---|
| **Saniyeler** | **Manuel vuruş:** güç/zamanlama göstergesi. Iska ×0.5, İyi ×1, Mükemmel ×2.5. Manuel vuruş otomatik vuruştan **12 kat** değerli ("power drive") | **[UPDATED]** Kaddiler (Caddy) otomatik vuruş atar: **her Kaddi seviyesi +0.4 otomatik vuruş/s** | Vuruş mesafesi, mükemmel olasılığı, zemin (lie) kalitesi, otomatik vuruş hızı |
| **Dakikalar** | Yarda harcayıp yükseltme alır. Seri (streak) tutturmaya çalışır | Yarda birikir. Delik ilerleme çubuğu dolar | Seri çarpanı tavanı, top yuvarlanması |
| **Delik (milestone)** | Deliğe yaklaşınca **yeşil faz:** kısa bir putt mini oyunu. **[UPDATED]** Par içinde bitirirse yıldız kazanır (par tanımı §4-B) | **[UPDATED]** Delik tamamlanınca ×1.08 çarpan gelir. Bu çarpan **koşu boyunca** geçerlidir ve sezon sıfırlamada silinir. Ayrıca yeni yükseltme veya özellik açılır | Yeni sahalar ve zorluk |
| **Sezon (prestij 1)** | **[UPDATED]** Seçilen kursun 18. deliğinden sonra "Sezonu Bitir": yarda ve yükseltmeler sıfırlanır (karar #6: her zaman 18 delik). Takılan oyuncu için "Sezondan Çekil": koşu sıfırlanır, TP/PP verilmez | Tur Puanı (TP) ve Perk Puanı (PP) kazanılır; kalıcı bonuslar | Kurs seçimi, perk'ler, kural kartları (§4-C, §11) |
| **[NEW] Kurs / Bant** | Açık kurslar arasından sezonun kursunu seçer | – | Her kurs ×`D` daha uzun; daha yüksek TP (§11.1) |
| **[NEW] Efsane (prestij 2)** | Büyük Şampiyon sonrası "Efsane Ol": TP, PP, perk'ler ve kurs kilitleri sıfırlanır | Efsane Puanı (EP) | Kalıcı ×`1.5^EP` ve meydan okuma yuvaları (§11.2) |

**Para birimleri:**
- **Yarda (yd):** ana birim. **[UPDATED]** `Num` tipi: MVP'de `double`, sonsuz modda `BigNum` (§11.6). Kazanılan mesafenin kendisi.
- **Yıldız (★):** delik başına 0–3, kalıcı (Efsane'de de korunur).
- **Tur Puanı (TP):** prestij birimi. **[UPDATED]** Harcanmaz; toplam kazanılan TP çarpan verir (§11.2).
- **[NEW] Perk Puanı (PP):** her sezon kazanılan TP kadar PP eklenir. Perk ağacında harcanır.
- **[NEW] Efsane Puanı (EP):** 2. prestij birimi. Harcanmaz.

---

## 2. Yükseltme ağacı

Altı kategori var ve her biri **farklı bir matematiksel eksen** üzerinde çalışıyor. Hiçbiri "düz çarpan" değil.

| Kategori | Etki türü | Formül (seviye L) | Neden farklı hissettiriyor? |
|---|---|---|---|
| **Sopa Başı (Head)** | Toplamsal taban mesafe | `taban = 5 + 2·L` yd | Erken oyunun güvenilir, sıkıcı ama sağlam omurgası |
| **Şaft (Shaft)** | Olasılık (kritik) | Otomatik mükemmel şansı `p = min(p_max, 0.05 + 0.01·L)`; **[UPDATED]** `p_max = 0.5` (perk ile en fazla 0.75, §11.4); mükemmel = ×2.5 | Beklenen değeri artırır; ekranda daha çok "MÜKEMMEL!" görünür |
| **Tutuş (Grip)** | **Göreli kademe** (zemin) | `lie = tablo[clamp(L − zorluk(c, h), −2, +2) + 2]`, tablo `[0.35, 0.6, 1.0, 1.35, 1.7]`. **[UPDATED]** `zorluk(c, h) = floor(0.75·h) + 4·(c−1)`; h = kurs içindeki delik (1–18), c = kurs | Her yeni delik ve kurs daha zor zemin getirir. Grip seviyesi delikle yarışır; geride kalınca vuruşlar rough/bunker'a düşer |
| **Top (Ball)** | Çarpımsal ve kademeli | `top = (1 + 0.08·L) × 1.5^floor(L/10)`; her 10 seviyede yeni top modeli | Doğrusal artış ve belirli eşiklerde büyük sıçrama. "10'a bir kala" motivasyonu yaratır |
| **Kaddi (Caddy)** | Hız (otomasyon) | `otomatikVuruş/s = 0.4·L`. **[NEW]** Görsel tavan 20 vuruş/s; fazlası vuruş değerine çarpan olarak eklenir (§11.4) | Idle kısmın ana motoru |
| **Duruş (Stance)** | **Yalnızca manuel** seri | Art arda mükemmel vuruş başına +%5; tavan `1 + 0.15·L`; 3 s vuruşsuz kalınca sıfırlanır. **[UPDATED]** Simülatör bunu `1 + 0.15·L·p_mük` ile yaklaşıklıyor; Monte Carlo ile doğrulanacak (§12.1) | Aktif oyunu ödüllendirir; idle oyuncuyu cezalandırmaz |
| **[NEW] Kulüp Evi** | Çevrimdışı tavanı | `cap = 4 h + 2 h·L` (maks 4 seviye); maliyet §3.4 | Uzun ara veren oyuncuyu ödüllendirir |
| *Saha açılımları* | Kilometre taşı | Delik 3: Duruş açılır. Delik 6: Top. Delik 9: Rüzgâr göstergesi (MVP+). Delik 12: Kulüp Evi. Delik 18: Sezon. **[NEW]** Kurs 2 ilk açılış: Perk ağacı. Kurs 4 sonu: Efsane, Sonsuz Tur, Meydan okumalar | Yeni sistemler sırayla gelir; oyuncu menüye boğulmaz |

**Tasarım notu.** Grip'in göreli kademe mantığı analizdeki "göreli şans" bulgusundan ilham alan **genel** bir kalıptır: zorluk farkına göre katman seçmek. Burada farklı bir boyutta (zemin/arazi), farklı bir tabloyla ve 5 katmanla uygulanıyor.

**[UPDATED]** Zorluk artık kurs içinde hesaplanıyor (`h` 1–18). v1'deki `floor(0.75·delik)` sürekli merdivende delik 54'te Grip `maks = 40`'ı aşıyordu (inceleme B-3).

---

## 3. Ekonomi

### 3.1 Formüller [UPDATED]

```
maliyet(k, L)     = base_k × growth_k ^ L
toplu_maliyet(k, L, n) = base_k × growth_k^L × (growth_k^n − 1) / (growth_k − 1)     // [NEW] kapalı form
maks_alım(k, L, Y)     = floor( log_g( 1 + Y·(g − 1) / (base_k·g^L) ) )                // [NEW] g = growth_k

delik_uzunluğu(c, h) = 8 000 × 2.3^(h−1) × D^(c−1) yd        // [UPDATED] kurs c, kurs içi delik h; D = 1000 (TBT)

mesafe_oto(vuruş)  = taban(Head) × lie(Grip, c, h) × top(Ball) × 1.08^(h−1)
                     × (1 + p·(2.5 − 1)) × M_meta
mesafe_man(vuruş)  = taban(Head) × lie(Grip, c, h) × top(Ball) × 1.08^(h−1)
                     × EV_man × seri(Stance) × 12 × M_meta
EV_man             = 0.5·p_ıska + 1.0·p_iyi + 2.5·p_mük           // [UPDATED] ıska artık hesapta (inceleme B-4)
M_meta             = M_TP × M_EP × M_yıldız(c, h) × M_eşik(c) × M_kart × M_başarım   // [NEW] §11.2, §11.5
M_yıldız(c, h)     = 1 + 0.03 × yıldız(c, h)                      // o deliğin yıldızı (0–3)
M_eşik(c)          = 1 + 0.10 × (kursta geçilen 18/36/54★ eşik sayısı)              // en fazla ×1.3 (§4-B)
M_kart             = aktif meydan okuma kartının çarpanı (kart yoksa 1)              // §11.5
M_başarım          = 1 + 0.01 × min(10, floor(başarım / 10))                        // §11.5

gelir/s           = 0.4·L_caddy · mesafe_oto + manuelVuruş/s · mesafe_man

TP (sezon sonu)   = floor( sqrt( sezon_toplam_yarda / 1e8 ) )      // v1 ile aynı; Kurs 1 / delik 18'de ≈ 14 TP
                                                                 // ham yarda kurs ölçeğini içerdiği için kurs başına ≈ ×√D ≈ ×31.6
M_TP              = (1 + TP_eff / 10)^1.8,  TP_eff = softcap(TP_toplam, 1e5, 0.85) // [UPDATED] §11.2 (üs 1.8: karar #1)
PP (sezon sonu)   = TP (1:1)                                     // [NEW] harcanabilir
softcap(x, s, e)  = x            (x ≤ s ise)
                  = s·(x/s)^e    (x > s ise)                     // [NEW] §11.4
```

> **[UPDATED] v1'den fark.** v1'deki `TP etkisi = +%5/TP ve perk ağacında harcanabilir` iki şeyi aynı anda söylüyordu (inceleme B-10). Yeni modelde:
> - TP hiç harcanmaz; toplam TP çarpan verir.
> - Perk'ler ayrı bir puan olan PP ile alınır.
> - Doğrusal `+%5/TP` kurs başına ×1000 uzunluğa yetişemiyor (inceleme B-2). Bu yüzden kareye yakın bir üs (1.8) kullanılıyor.

### 3.2 Başlangıç sayıları

Bu sayılar simülatörle ayarlandı (Kurs 1, 1. sezon).

| Yükseltme | base | growth | maks | L=0 | L=10 | L=25 | L=50 |
|---|---|---|---|---|---|---|---|
| Head | 10 | 1.24 | 300 | 10 | 86 | 2.2e3 | 4.7e5 |
| Shaft | 60 | 1.28 | 45 | 60 | 708 | 2.9e4 | – |
| Grip | 150 | 3.0 | 40 | 150 | 8.9e6 | 1.3e14 | – |
| Ball | 400 | 1.30 | 200 | 400 | 5.5e3 | 2.8e5 | 2.0e8 |
| Caddy | 25 | 1.24 | 250 | 25 | 215 | 5.4e3 | 1.2e6 |
| Stance | 200 | 1.35 | 30 | 200 | 4.0e3 | 3.6e5 | – |

| Parametre | Değer |
|---|---|
| Manuel vuruş hızı (aktif oyuncu varsayımı) | 0.8 vuruş/s |
| Manuel mükemmel oranı (beceri varsayımı) | %40 |
| **[NEW]** Manuel ıska / iyi oranı | %15 / %45 (TBT) |
| Delik çarpanı | ×1.08 / delik |
| Delik 1 / 9 / 18 uzunluğu (Kurs 1) | 8 000 / 6.3e6 / 1.1e10 yd |

**[UPDATED] Maks seviyeler.** Kurs 2+'da TP çarpanı büyüdükçe Head, Ball ve Caddy `maks` değerleri (300/200/250) sınır olur.
- Prototipte bu maks'lar 10 000'e yükseltildi.
- Karar: Kurs 2'den itibaren maks'lar `maks × c` olur (TBT, §12).

### 3.3 Simülasyon sonuçları

Simülatörün greedy satın alma politikasıyla ürettiği sonuçlar. **[UPDATED]** v2'de bağımsız koşuyla birebir doğrulandı.

| Delik | Aktif oyun | Yalnızca idle |
|---|---|---|
| 1 | 0:10 | 1:15 |
| 3 | 0:31 | 2:14 |
| 6 | 2:15 | 6:28 |
| 9 | 3:49 | 10:01 |
| 12 | 9:20 | 21:23 |
| 15 | 28:02 | 56:57 |
| 18 (sezon) | **1:46:40** | **3:16:52** |

*Stance delik 3'ten, Ball delik 6'dan sonra açılır.*

**Okuma:**
- İlk dakikalar çok hızlı geçiyor; bu kanca etkisi istenen bir şey.
- Delik 12'den sonra her deliğin süresi bir öncekine göre ×1.1–2.0 uzuyor; en dik adım 17→18. Doğal "prestij zamanı" baskısı burada oluşuyor.
- Aktif oyun idle'a göre yaklaşık 1.85 kat hızlı. Aktif oyun ödüllendiriliyor ama zorunlu değil.
- **Ayar önerisi:** Aktif oyuncunun 1h45m boyunca kesintisiz vuruş yapmayacağı açık. Gerçekçi bir karışım (%30 aktif) için `manual_swings_per_s = 0.25` ile tekrar koşun. **[UPDATED]** Bu koşu henüz yapılmadı. §12.2'de "Karma" profil olarak zorunlu hale getirildi.
- **[NEW] Geçerlilik.** Tablo yalnızca **Kurs 1 / 1. sezon** içindir: yıldız, TP, ıska ve ücretsiz başlangıç kaddisi (§3.4) hariç.
  - Ücretsiz kaddi ve ıska değişikliklerinden sonra tablo yeniden üretilmeli.
  - Beklenen etki: aktif biraz yavaşlar (manuel EV 1.6 → 1.525, −%4.7), aktif başlangıç biraz hızlanır (TBT).

Ayrıntılı spesifikasyon ve kod `design/economy_simulator_spec.md` dosyasında. **[NEW]** v2 uzantısı §12'de.

### 3.4 [NEW] Ekonomi tablosu (tek yerde, tümü TBT)

**Başlangıç durumu**

| Öğe | Değer | Not |
|---|---|---|
| Yarda | 0 | |
| Kaddi | **1 seviye ücretsiz** (her iki modda) | Simülatörde idle mod zaten 1 ile başlıyordu (inceleme B-14). Aktif modu da hizalar |
| Diğer yükseltmeler | 0 | |
| Açık kurs | Kurs 1 | |
| Çevrimdışı tavanı | 4 saat | |

**Yükseltmeler: maliyet büyümesi ve etki**

| Kategori | base (yd) | growth/seviye | maks | Etki/seviye | Açılır |
|---|---|---|---|---|---|
| Head | 10 | ×1.24 | 300 (Kurs c: 300·c) | +2 yd taban | Başta |
| Shaft | 60 | ×1.28 | 45 (+5/perk) | +%1 oto mükemmel (≤ p_max) | Başta |
| Grip | 150 | ×3.0 | 40 + 4·(c−1) | +1 zemin kademesi | Başta |
| Ball | 400 | ×1.30 | 200 (·c) | +%8, her 10'da ×1.5 | Delik 6 |
| Caddy | 25 | ×1.24 | 250 (·c) | +0.4 vuruş/s | Başta |
| Stance | 200 | ×1.35 | 30 | Seri tavanı +0.15 | Delik 3 |
| Kulüp Evi | 2e7 | ×12 | 4 | Çevrimdışı tavanı +2 saat | Delik 12 |

**Perk ağacı (PP ile; maliyet = base × 10^seviye)**

| Perk | base PP | maks | Etki/seviye |
|---|---|---|---|
| Hızlı Başlangıç | 5 | 10 | Sezona +5 Head seviyesiyle başla |
| Kaddi Akademisi | 10 | 10 | Sezona +2 Caddy seviyesiyle başla |
| Şaft Uzmanı | 50 | 5 | Shaft maks +5 ve `p_max` +0.05 (0.75'te durur) |
| Kulüp Evi Anahtarı | 25 | 6 | Çevrimdışı tavanı +1 saat |
| Yıldız Avcısı | 20 | 4 | Putt zaman penceresi +0.5 s |
| Otomatik Alım | 15 | 6 | Her seviye bir kategoriyi otomatik alıma açar (QoL; Efsane'de korunur) |
| Uzun Vuruş | 30 | 8 | `manual_power` +1 (12 → 20) |
| Erken Isınma | 100 | 5 | Sezona delik çarpanı `1.08^(2·seviye)` ile başla |

**Prestij ve kurs**

| Parametre | Değer |
|---|---|
| Kurs ölçeği `D` | 1000 |
| TP | `floor(sqrt(Y/1e8))` |
| `M_TP` | `(1 + TP_eff/10)^1.8` (karar #1 sonrası; ilk taslakta ^2) |
| TP yumuşak tavanı | başlangıç 1e5, üs 0.85 |
| EP | `max(5, floor(5·log10(TP_toplam / 1e4)))` (yalnızca Büyük Şampiyon sonrası) |
| `M_EP` | `1.5^EP_eff`, `EP_eff = softcap(EP_toplam, 50, 0.7)` |
| Sonsuz Tur modifiye ödülü | Modifiye başına TP ×(1 + 0.25) |

**Gelir formülü:** §3.1'deki `gelir/s`. Kısaca:
`gelir/s = (0.4·L_caddy·mesafe_oto + manuel/s·mesafe_man)` ve iki mesafe de `M_meta = M_TP·M_EP·M_yıldız·M_eşik·M_kart·M_başarım` ile çarpılır.

---

## 4. Standart tıklayıcıdan ayıran mekanik seçenekleri

### A) Rüzgâr ve zemin hava durumu

- Her delikte 30–90 s'lik rüzgâr döngüleri var.
- Karşı rüzgâr ×0.7, arka rüzgâr ×1.4.
- Önceden görünen bir "tahmin şeridi" var. Oyuncu Power Drive'ı doğru ana saklar.
- Kaddi seviyesi otomatik vuruşların rüzgâr cezasını azaltır.

**Artıları:** Zamanlama kararı ekler; idle'ı bozmadan aktif oyuna derinlik verir.
**Eksileri:** Tek başına delik ilerlemesi kadar güçlü bir kimlik vermez. Dengelemesi değişkenli.

**[NEW]** Sonsuz Tur'da bir bant modifiyesi olarak geri gelir (§11.3).

### B) Delikler kilometre taşı ve Par/Yıldız sistemi (**ÖNERİLEN**)

- Her delik bir ilerleme kapısı. Tamamlanınca koşu çarpanı ve yeni sistem açılır.
- Deliğin son %10'unda kısa bir putt mini oyunu var (2–5 s).
- **[UPDATED] Par tanımı:**
  - Putt mini oyununda her deneme bir "vuruş"tur. Par = 2 deneme.
  - 1 denemede sokmak: 3★ ("birdie"). 2 denemede: 2★ ("par"). 3 denemede: 1★ ("bogey"). Daha fazlası: 0★.
  - Putt'a girilmezse (idle) delik 0★ ile otomatik tamamlanır.
- Par içinde bitirmek 1–3 yıldız verir. **Yıldızlar sezonlar arasında kalıcı.** Her ★ o deliğin mesafesine +%3.
- Yıldızsız geçilen delik bir sonraki sezonda tekrar denenebilir. **[UPDATED]** Bir delik için en iyi sonuç saklanır; yıldız kaybedilmez.
- **[NEW]** Kurs başına yıldız eşikleri: 18★ / 36★ / 54★. Her eşik o kursta kalıcı olarak +%10 mesafe verir (`M_eşik`, en fazla +%30). Bu, Melvor'un havuz eşiği kalıbının golf karşılığı.

### C) Kural değiştiren Sezon kartları (prestij katmanı)

- Her sezon başında 3 karttan biri seçilir. Örnekler:
  - "Links Sahası": rüzgâr ×2, yuvarlanma ×3
  - "Gece Turu": manuel ×2, kaddi ×0.5
  - "Çöl": grip zorluğu +2, top ×2
- TP kartın zorluğuna göre çarpılır.

**Artıları:** Prestijin tekrarını kırar.
**Eksileri:** İçerik ve denge maliyeti yüksek; MVP için ağır.

**[UPDATED]** C, Büyük Şampiyon sonrası **Meydan Okuma** sistemi olarak uygulanır (§11.5). Kart yuvaları EP ile açılır.

**Neden B?**

1. **Tema kimliği.** Delik, par ve yıldız golfün kendi dili. Oyunu ilk bakışta "golf" yapan şey bu, sıradan bir sayı tıklayıcısı değil.
2. **Tempo aracı.** Analizde en güçlü yavaşlama önleyicisinin sık ve küçük hedefler olduğu görüldü (33 hedef). Delikler bunu doğal olarak sağlıyor ve simülatörde doğrudan ayarlanabiliyor (`hole_len_growth`). **[NEW]** Melvor'da da benzer bir rol oynayan şeyler var: ustalık havuzu eşikleri ve içerik kapılı tavanlar (`analysis/melvor_reference.md` §3).
3. **Aktif/idle dengesi.** Putt mini oyunu kısa ve isteğe bağlı. Idle oyuncu yine ilerliyor; aktif oyuncu yıldız topluyor.
4. **Solo geliştirici maliyeti düşük.** Tek bir mini oyun ve bir ilerleme çubuğu yeterli. A ve C, MVP sonrasında B'nin üstüne eklenebilir: rüzgâr delik 9'da, kartlar 2. sezonda. **[UPDATED]** Kartlar artık Büyük Şampiyon sonrasında geliyor.

---

## 5. Çevrimdışı ilerleme [UPDATED]

```
Δt_ham   = now_utc − lastSeen_utc
Δt_ham < 60 s ise       → çevrimdışı modu yok; normal döngü yakalar          // [NEW]
Δt       = clamp(Δt_ham, 0, cap)                                              // negatif saat oynamasına karşı 0
cap      = 4 h + 2 h × KulüpEvi_L (maks 4) + 1 h × KulüpEviAnahtarı_L (maks 6)  // [UPDATED] mutlak maks 18 saat
verim    = 0.6                                                                // manuel, seri ve putt dahil değil

// [UPDATED] Tek çarpma yerine adımlı simülasyon:
adım     = max(1 s, Δt / 2000)                // en fazla 2000 adım; mobilde bile < 50 ms (TBT)
her adımda:
    gelir = gelir_oto/s(durum) × verim × adım
    yarda += gelir; delik ilerlemesi güncellenir; delik bitince ×1.08 ve lie yeniden hesaplanır
    Otomatik Alım perk'i açık kategoriler satın alınır (greedy, oyun içi kuralla aynı)
Delik tamamlama çevrimdışıyken gerçekleşebilir ama yıldız verilmez.
Sezon ve Efsane çevrimdışında asla otomatik bitmez; kursun 18. deliğinden sonra yarda yalnızca birikir.
```

- `lastSeen` her kayıtta yazılır (unix ms). **[NEW]** Saat geri alınırsa (`now < lastSeen`), `lastSeen` geri çekilmez: `lastSeen = max(lastSeen, now)`. Böylece aynı aralık iki kez ödüllendirilmez.
- **[NEW] İleri alınmış saat.** Tek oyunculu oyunda bilinçli olarak tavana kadar kabul edilir; ceza yok. `now − lastSeen > 30 gün` ise telemetriye `clock_jump` yazılır.
- Dönüşte "Siz yokken: +X yd, N delik" özeti gösterilir. **[NEW]** Ek olarak satın alınan yükseltmeler ve tavana takılıp takılmadığı ("tavan doldu, 3 saat boşa gitti") gösterilir.
- %60 verimlilik, idle oyuncuyu ödüllendirirken açık oyunu teşvik eder. **[NEW]** Karşılaştırma: Melvor çevrimdışında aynı tick'leri %100 verimle ve 24 saat tavanla yeniden oynatıyor (`game.js` `Game.loopOffline`, confirmed). Bizim %60 seçimimiz bilinçli. **[UPDATED] Karar #2 (2026-10-17):** %60 sabit verim onaylandı.
- Analizdeki "süre deltasını sınırlama" kalıbı (genel bir saat-hilesi önlemi) üst sınır olarak uygulanır.
- İsteğe bağlı: ilk açılışta 2× "dönüş bonusu" için reklam yerine **günlük ücretsiz** bir buton.

---

## 6. Motor ve dil önerisi (solo geliştirici)

### 6.1 Motor

**Öneri: Godot 4.x + GDScript.**

- 2D ve UI ağırlıklı bir oyun için hafif, ücretsiz ve lisans derdi yok.
- PC, Mac, Linux, Web ve mobil dışa aktarımı var.
- GDScript `float` 64-bit; `1e308`'e kadar yeterli. Analizdeki oyun da parayı `double` olarak tutuyor.
- **[UPDATED]** Tüm para benzeri değerler baştan `Num` sarmalayıcısı üzerinden yazılır. MVP'de `Num` = `float`. Sonsuz Tur'dan (M10) önce mantis/üs yapısında `BigNum` ile değiştirilir (§11.6).

**Alternatif:** C# biliyorsanız Unity 6 + C#. Scritchy Scratchy bu yığınla yapılmış. Daha ağır ama mağaza ve SDK eklentileri hazır.

**[NEW]** İkinci referans Melvor Idle ise NW.js 0.82 + tarayıcıda çalışan JavaScript kullanıyor (`analysis/melvor_reference.md` §1). Web öncelikli bir sürüm düşünülürse bu da geçerli bir yol. Ancak Godot'un Web dışa aktarımı bu ihtiyacı zaten karşılıyor.

### 6.2 Kayıt [UPDATED]

**Temel kurallar (v1'den):**
- `user://save.json` (JSON).
- Dönen 3–5 yedek (`autosave_YYYYMMDD_HHMMSS.json`).
- Koşu verisi (`run`) ve kalıcı veri (`meta`) iki ayrı nesne. Prestij = `run`'ı yeniden oluşturmak.

**[UPDATED] Kayıt sıklığı**
- 30 s'de bir otomatik kayıt. v1'de 60–120 s idi; Melvor 10 s kullanıyor (`game.js` `AUTO_SAVE_INTERVAL`, confirmed).
- Ek tetikleyiciler: sezon sonu, Efsane, perk alımı, uygulama arka plana geçince ya da kapanırken.
- Yedekler 10 dakikada bir döner.

**[NEW] Şema (saveVersion 2)**

```json
{
  "format": "idlegolf-save",
  "saveVersion": 2,
  "gameVersion": "0.2.0",
  "createdUtc": 1760000000000,
  "savedUtc": 1760000300000,
  "lastSeenUtc": 1760000300000,
  "checksum": "crc32:1a2b3c4d",
  "meta": {
    "stars": { "1": [3, 2, 0, "..."] },
    "coursesUnlocked": 1,
    "tpTotal": "1.4e1",
    "pp": "9",
    "perks": { "quick_start": 1 },
    "legacy": { "count": 0, "epTotal": 0 },
    "endless": { "bestBand": 0, "seed": 123456789 },
    "achievements": [],
    "challenges": {},
    "stats": { "playMs": 0, "offlineMs": 0, "swings": 0 }
  },
  "run": {
    "course": 1, "hole": 4, "holeProgress": "1.2e4",
    "yards": "3.4e5", "seasonYards": "9.1e5",
    "upgrades": { "head": 12, "shaft": 5, "grip": 3, "ball": 0, "caddy": 9, "stance": 2, "clubhouse": 0 },
    "seasonStartUtc": 1760000000000, "seasonPlayMs": 300000,
    "card": null
  },
  "settings": { "notation": "suffix", "offlineSummary": true, "telemetry": false }
}
```

**[NEW] Kurallar**

1. **Sayılar** metin olarak saklanır.
   - `double` için 17 anlamlı basamaklı `repr` (ör. `"3.4000000000000001e5"`).
   - `BigNum` için `"m|e"` biçimi (ör. `"1.2345|1520"`).
   - Okuyucu iki biçimi de tanır. Tamsayı sayaçlar (yıldız, seviye) JSON sayısıdır.
2. **Sürüm göçü.** `saveVersion` tek artan bir tamsayıdır.
   - Yüklemede `migrate_1_to_2`, `migrate_2_to_3`… sırayla uygulanır. Her biri saf bir `Dictionary → Dictionary` fonksiyonudur ve her birinin bir test kaydı vardır.
   - Melvor'daki kalıp da aynı: her sürümde eklenen anahtarlar sırayla varsayılanla dolduruluyor (`serializeSave.js` göç döngüsü, confirmed).
3. **Göç öncesi yedek:** `pre_migration_v{N}.json`.
4. **Daha yeni kayıt reddi.** `saveVersion > desteklenen` ise kayıt yüklenmez ve üzerine yazılmaz; oyuncuya "oyunu güncelleyin" mesajı gösterilir. Melvor'da da aynı kontrol var (`game.js` `getHeaderFromSaveString`, confirmed).
5. **Bozuk kayıt.** `checksum` tutmazsa ya da JSON okunamazsa yedekler yeniden eskiye doğru denenir. Hiçbiri olmazsa "yine de yükle / yeni oyun" seçeneği sunulur.
6. **Atomik yazım:** `save.tmp` yazılır, sonra `save.json` adına taşınır (rename).
7. **Dışa ve içe aktarım:** `IGS2:` + Base64(gzip(JSON)). Kullanıcı panoya kopyalayabilir.
8. **v1 → v2 göçü.** v1 = MVP şeması (`meta.stars`, `run` temel alanları). v2'de eklenenler: `coursesUnlocked = 1`, `tpTotal = 0`, `pp = 0`, `legacy`, `endless`, `run.course = 1`, `upgrades.clubhouse = 0`.

---

## 7. MVP kapsamı

**Dahil:**
- 1 saha, 9 delik.
- 4 yükseltme kategorisi: Head, Shaft, Grip, Caddy.
- Manuel vuruş göstergesi.
- Delik ilerleme çubuğu ve putt mini oyunu (Par/Yıldız).
- Kayıt ve otomatik kayıt. **[UPDATED]** Şema v1, `saveVersion`, checksum ve atomik yazım (§6.2).
- 4 saatlik çevrimdışı tavan. **[UPDATED]** Adımlı çevrimdışı hesap (§5). Kulüp Evi MVP'de açılmaz.
- Büyük sayı biçimlendirme (K, M, B, T, aa…). **[UPDATED]** §11.6'daki kurallarla; `Num` sarmalayıcısı.
- Temel ses ve "juice" efektleri: mükemmel vuruşta ekran sarsıntısı, sayı uçuşması.
- **[NEW]** MVP sonu ekranı "Ön Eleme Tamamlandı". Delik 9'dan sonra gösterilir: toplam süre, yıldızlar, "tam sürümde Kurs 1'in 18 deliği ve sezonlar" bilgisi. Oyuncu bundan sonra eksik yıldızların peşine düşebilir (inceleme B-12).
- **[NEW]** Yerel telemetri günlüğü (açık rıza ile, §12.4). M6 oyuncu testleri için gerekli.

**Hariç:** Sezon/prestij, rüzgâr, Ball ve Stance, kozmetik, başarımlar, bulut kayıt, mobil. **[NEW]** Ayrıca kurslar 2–4, Efsane, Sonsuz Tur, meydan okumalar ve `BigNum`.

---

## 8. Kilometre taşları [UPDATED]

| # | Süre (tahmini) | Çıktı | Bitti sayılma ölçütü |
|---|---|---|---|
| M0 | 3–5 gün | Simülatör ve ilk ayar | `idle_golf_sim.py` delik 1/9 sürelerini hedef aralığında veriyor. **[UPDATED]** Ücretsiz kaddi, ıska ve "Karma" profil ile yeniden koşuldu |
| M1 | 1–2 hafta | Çekirdek döngü | Vuruş göstergesi, yarda sayacı, 1 kaddi, 1 yükseltme |
| M2 | 1–2 hafta | Ekonomi | 4 kategori, üstel maliyet, toplu alım (×1/×10/maks). **[UPDATED]** Kapalı form toplu maliyet ve `Num` |
| M3 | 1–2 hafta | Delikler | 9 delik, ilerleme, putt, yıldızlar |
| M4 | 1 hafta | Kalıcılık | JSON kayıt, otomatik kayıt, yedek, çevrimdışı özet. **[UPDATED]** Şema v1, göç altyapısı, checksum |
| M5 | 1 hafta | Cila | Ses, parçacıklar, sayı biçimleri, ayarlar menüsü |
| M6 | 1 hafta | Test ve ayar | 5+ oyuncu testi; gerçek süreler simülasyonla karşılaştırılır. **[UPDATED]** Telemetri dışa aktarımıyla |
| M7 | 2 hafta (MVP sonrası) | Sezon ve TP | 18 delik, TP formülü, perk ağacı (8 perk, §3.4), PP |
| M8 | MVP sonrası | A ve C | Rüzgâr (delik 9+). **[UPDATED]** Kartlar M11'e taşındı |
| **M9 [NEW]** | 2–3 hafta | Kurslar 2–4 ve Büyük Şampiyon | Kurs seçimi, `D` ölçeği, bitiş sinematiği/ekranı, Efsane katmanı. §12.3 pencereleri tutuyor |
| **M10 [NEW]** | 2 hafta | Sonsuz Tur ve BigNum | Seed'li bant üretimi, modifiyeler, açılma kuralı, `BigNum` geçişi ve kayıt göçü v2→v3 |
| **M11 [NEW]** | 2 hafta | Geç oyun hedefleri | ≥ 60 başarım, 8 meydan okuma (Sezon kartları), istatistik/kariyer ekranı |
| **M12 [NEW]** | İsteğe bağlı | Haftalık turnuva ve liderlik tablosu | Steam leaderboard veya yerel tablo |

---

## 9. Kopyalanmaması gerekenler ve öğrenilebilecekler

**Kesinlikle kopyalamayın:**
- **İsimler:** "Scritchy Scratchy", karakter ve gadget adları (Mundo, Scratch Bot, The Machine, Egg Timer, Night Market, Spell Book…), bilet adları (Day Job, Two Win, Lucky Cat, Final Chance…), para birimi adları (JP / Jack Points, Souls), perk adları ve açıklamaları, diyalog metinleri.
  - **[NEW]** "Melvor Idle" ve tüm adları: beceri, eşya, bölge, canavar ve evcil hayvan adları; "Mastery", "Mastery Pool", "Golbin", "Township", "Ancient Relics", "Throne of the Herald", "Atlas of Discovery", "Into the Abyss"; para birimi adları (GP, Slayer Coins, Abyssal Pieces); oyun modu adları ("Hardcore", "Adventure" mod tasarımları).
- **Varlıklar:** sprite'lar, animasyonlar, ses/müzik, fontlar, UI düzeni ve ikonlar. **[NEW]** Melvor'un `assets/media` içeriği de dahil.
- **Kod:** decompile ya da disassemble edilmiş hiçbir rutin. Bu analizde çıkarılan fonksiyonların C# karşılıkları yazılmamalı; formüller kendi tasarımınızdan türetilmeli. **[NEW]** Melvor'un JS kaynağı (`ExperienceCalculator`, `SaveWriter`, `formatNumber`…) okunmak dışında kullanılmaz.
- **Veri tabloları:** `UpgradeData`, `TicketData`, `PerkData`, `ProgressionGoalData`, `MachineTiersData` ve diğer sayı dizileri. Örneğin şans fiyatı 200×5^n, bilet değer çarpanı 1.3, `5^(katalog−1)` JP ve hedef eşikleri birebir alınmamalı.
  - **[NEW]** Melvor sabitleri: `floor(L + 300·2^(L/7))/4` XP eğrisi, `500 000` havuz sabiti, banka yuvası formülü sabitleri, `skillUnlockCost` dizisi, ağaç XP ve süre tabloları, havuz eşik yüzdeleri.
  - Not: §4-B'deki 18/36/54★ eşikleri Melvor'un %10/25/50/95'inden farklıdır ve kalıp olarak alınmıştır.
- **Seviye ve yapı düzeni:** perde/ölüm ("Final Chance") anlatı yapısı, kredi/iflas sisteminin özgün tasarımı, meydan okuma kural setleri. **[NEW]** Melvor'un genişleme/zindan tavan yapısının birebir eşlemesi (21 set, +5/+15 gibi).

**Öğrenilmesi adil olan genel kalıplar** (oyun tasarımında yaygın ve korunmayan fikirler):
- Üstel maliyet ile toplamsal ve üstel etkilerin karıştırılması.
- Hedefin oyuncuyla birlikte kaydığı "göreli kademe" fikri (RPG'lerdeki seviye farkı gibi).
- Otomasyonun duvar noktalarında kademeli açılması.
- Sık, küçük ve açıkça görünen hedefler.
- Koşu ve kalıcı veri ayrımı; prestij birimini ilerlemenin derinliğine göre ölçekleme.
- Otomatik kayıt, dönen yedekler ve süre deltasını sınırlama gibi teknik iyi uygulamalar.
- **[NEW]** İçerik tamamlamayla açılan tavan bantları.
- **[NEW]** Hız ve maliyetler için sert taban ve tavanlar.
- **[NEW]** Eşik bonusları.
- **[NEW]** Çevrimdışını oyun içi simülasyonla hesaplama.
- **[NEW]** Sıralı kayıt göçü ve gelecek sürüm koruması.

---

## 10. [NEW] Referans oyunlardan çıkan tasarım dersleri (özet)

| Ders | Kaynak (güven) | Idle Golf kararı |
|---|---|---|
| Uzun vadeyi taşıyan şey paralel hatlar ve eşikler; tek bir sayı değil | Melvor `skill.js` ustalık/havuz (confirmed), ~29 beceri (likely) | Kurs × delik × yıldız matrisi, perk ağacı, meydan okumalar |
| "Son" yerine içerik kapılı yeni tavan bandı | Melvor `skillLevelCapIncreases` (likely) | Büyük Şampiyon → Sonsuz Tur bantları (§11.3) |
| Sayılar küçük tutulursa gösterim basit kalır (≥1e15 → ">999T") | Melvor `utils.js` `formatNumber` (confirmed) | Biz sonsuz ölçek istiyoruz; bu yüzden `BigNum` ve bilimsel gösterim (§11.6) |
| Çevrimdışı hesap aynı kuralla yapılmalı | Melvor `Game.loopOffline` (confirmed) | Adımlı çevrimdışı simülasyonu (§5) |
| Prestij ödülü derinliği ödüllendirmezse oyuncu sığda kalır | Bu projenin prototipi (`review/plan_review.md` B-1) | TP ham yardaya bağlı, kurslar ×D; Efsane katmanı |

---

## 11. [NEW] Endgame ve sonsuz ilerleme

### 11.1 Kurs yapısı ve "son"

- **Kurs 1–4 elle tasarlanır.** Her biri 18 deliktir:
  1. Yerel Kulüp
  2. Bölge Turnuvası
  3. Ulusal Açık
  4. **Büyük Final**
- Uzunluk `L(c, h) = 8 000 × 2.3^(h−1) × D^(c−1)`, `D = 1000` (TBT).
- **Sezon = tek kurs.** Sezon başında açık kurslardan biri seçilir. Delik çarpanı `1.08^(h−1)` kurs içinde birikir.
- **Kurs açılma kuralı:** Kurs c'nin 18. deliği herhangi bir sezonda bir kez temizlenirse kurs c+1 kalıcı olarak açılır. Yıldız şartı yoktur; idle oyuncu da ilerleyebilmelidir.
- **Tanımlı "son": Büyük Şampiyon.** Kurs 4 / delik 18 ilk kez temizlenince:
  1. Kupa töreni ekranı gösterilir. Kariyer kartı: toplam süre, sezon sayısı, yıldızlar, en iyi vuruş.
  2. Kısa jenerik oynatılır.
  3. Kalıcı bir **altın bayrak** kozmetiği verilir.
  4. Üç yeni sistem açılır: **Efsane** (§11.2), **Sonsuz Tur** (§11.3) ve **Meydan Okumalar** (§11.5).
- **Sert durma yoktur.** Tören sonunda oyuncuya iki düğme sunulur: "Sonsuz Tur'a devam et" ve "Efsane ol". İkisi de daha sonra da seçilebilir.
- **Hedef süre** (TBT, §12.3): Karma profilde Büyük Şampiyon 25–45 saat oynamada.
  - **[UPDATED] Karar #1 (2026-10-17):** Hedef 25–45 saat (karma) onaylandı. **Ayar henüz tutmuyor.**
  - Prototip ayrıntıları (aktif profil; perk, yıldız ve Grip ofseti yok):
    - Yarım sezonlara izin veren eski kuralla: üs 2 → Kurs 4'e 13.7 sa; üs 1.8 → 24.7 sa (Kurs 2 9.1, Kurs 3 15.6). `D = 3000` 23.9 sa verdi ama Kurs 1→2 arasında 12.6 saatlik duvar yarattı.
    - **Karar #6 (yalnızca 18 delik) sonrası** oyuncu yeni kursu bitiremeyeceğini görünce önceki kursu kısa sezonlarla "farm" ediyor. Bu politikayla Kurs 4 süreleri: üs 1.5–2.0 ve `D` 1000–10000 aralığında hep **10.5–14.4 sa**. Yani hedeften hızlı ve parametreye duyarsız.
  - **Sonuç:** Süre esas olarak **oyuncu politikasına ve sezon başı ek yüküne** bağlı. Düz çarpan ayarı tek başına yetmiyor.
  - **Yapılacak (M0/M7):** Simülatör v2'de TP/saat'i en üst düzeye çıkaran kurs seçimi politikası ve sezon başına 60–120 s ek yük modellenecek. Ardından şu kaldıraçlar sırayla denenecek:
    1. TP'ye sezon süresi tabanı: `TP × min(1, t_sezon / 15 dk)`.
    2. Daha önce temizlenmiş kurslardan azalan TP: kurs c'yi tekrar oynamak TP × `0.5^(en_derin − c)`.
    3. `D` ve üs.
  - Not: Basit politikayla denenen 1. kaldıraç, politika uyum sağlayamadığı için anlamlı sonuç vermedi.
  - Karma profil henüz koşulmadı.

### 11.2 Prestij katmanları ve ödül formülleri

**Katman 1: Sezon (TP)**

| | Kural |
|---|---|
| Ne zaman? | **[UPDATED] Karar #6:** Her sezon, seçilen kursun 18. deliği temizlendikten sonra. Takılan oyuncu için "Sezondan Çekil" var: koşu sıfırlanır ama TP/PP verilmez. Bu, kilitlenmeyi önler |
| Ödül | `TP = floor(sqrt(Y_sezon / 1e8))`, `PP += TP` |
| Kalıcı bonus | `M_TP = (1 + TP_eff/10)^1.8`, `TP_eff = softcap(TP_toplam, 1e5, 0.85)` |
| Sıfırlanan | Yarda, 6 yükseltme, Kulüp Evi, delik ilerlemesi, delik çarpanı, aktif kart |
| Kalan | TP_toplam, PP ve perk'ler, yıldızlar, açık kurslar, başarımlar, istatistikler, EP |

- **Neden kareye yakın bir üs?** `TP ∝ sqrt(Y)` ve `M_TP ∝ TP^1.8`. Bir kurs derine inmek (Y ×1000) TP'yi ×31.6, çarpanı ≈ ×500 artırır.
  - Çarpan, bir sonraki kursun ×1000 uzunluğunun büyük kısmını karşılar. Farkı birkaç sezon kapatır.
  - Üs 2 (×1000) prototipte fazla hızlıydı: Kurs 4'e 13.7 saat.
- **Neden yumuşak tavan?** Tavansız modelde TP toplandıkça çarpan `D`'yi geçiyor ve kaçak büyüme başlıyor: Kurs 5'ten sonra kurs başına ~26 dk ve 25 saatte ×1e69.

**Katman 2: Efsane (EP)**

| | Kural |
|---|---|
| Ne zaman? | Büyük Şampiyon (Kurs 4 temizlendi) sonrası, istenen zaman |
| Ödül | `EP_kazanç = max(5, floor(5 × log10(TP_toplam / 1e4)))` |
| Kalıcı bonus | `M_EP = 1.5^EP_eff`, `EP_eff = softcap(EP_toplam, 50, 0.7)`. Ayrıca her 10 EP'de +1 meydan okuma kartı yuvası (maks 3) |
| Sıfırlanan | Katman 1'deki her şey + TP_toplam, PP, perk'ler (Otomatik Alım hariç), açık kurslar (Kurs 1'e döner; **[UPDATED] karar #3**), Sonsuz Tur ilerlemesi |
| Kalan | Yıldızlar, EP_toplam, Otomatik Alım perk'i, başarımlar, kozmetikler, meydan okuma sonuçları, en iyi bant rekoru |

- **Okuma.** `M_EP = 1.5^(5·log10(TP/1e4)) = (TP/1e4)^0.88`. Önceki efsane koşusunun derinliğinin bir kısmı kalıcı olarak taşınır.
- **Hedef** (TBT): 2. efsane koşusunda Kurs 1–4, ilk koşu süresinin ≤ %50'sinde biter.

**Katman 3 (isteğe bağlı, gerekirse):** Aynı aile kuralı ile eklenebilir:
- Katman k+1, katman k'nın toplam biriminin `log10`'una bağlı bir puan verir.
- Etkisi `taban^puan` şeklindedir ve kendi yumuşak tavanı vardır.
- Yalnızca simülasyon, Sonsuz Tur'da bant süresinin 2 saati aştığı kalıcı bir duvar gösterirse eklenir.

### 11.3 Sonsuz Tur: hiç durmayan ölçek

- **Bant b = Kurs (4 + b), b = 1, 2, 3, …** Her bant 18 delik.
- Delikler, `hash(meta.endless.seed, b, h)` ile **prosedürel** üretilir: görsel düzen, engel yerleri, rüzgâr deseni ve yeşil eğimi.
- **Uzunluk:** `L(4+b, h) = 8 000 × 2.3^(h−1) × D^(3+b)`. Kurs formülü aynen sürer.
- **Açılma kuralı (tek ve net):** Bant b, bant b−1'in 18. deliği herhangi bir sezonda temizlenince açılır. Bant 1 için ön koşul Büyük Şampiyon'dur.
- **Zorluk bantları (modifiyeler):** Her bant, bant tohumundan seçilen modifiyeler taşır. Modifiye başına TP ×1.25.

  | Bant aralığı | Zorunlu modifiye sayısı | Havuz örnekleri |
  |---|---|---|
  | 1–9 | 1 | Rüzgârlı (§4-A), Hızlı Yeşil (putt penceresi −%20), Islak Çim (top ×0.8) |
  | 10–24 | 2 | + Dar Fairway (lie tablosu bir kademe aşağı), Su Engeli (her 3. delik +%25 uzunluk) |
  | 25–49 | 3 | + Gece (manuel ×2, kaddi ×0.5), Çöl (Grip zorluğu +2) |
  | 50+ | 3 + floor((b−50)/25) | Tüm havuz; aynı modifiye iki kez gelirse etkisi ikiye katlanır |

- **Kilometre taşı bantları:** Her 10. bant (10, 20, 30, …) elle tasarlanmış bir "Davet Turnuvası"dır. Sabit kuralı, kozmetik ödülü ve başarımı vardır.
- **Bitmeyen hedef:** Bant numarası sınırsızdır. Ölçek her zaman ×D/bant büyür. İlerlemeyi yumuşak tavanlar yavaşlatır, Efsane katmanı ise yeniden hızlandırır (§12.3'te ölçülür).

### 11.4 Yumuşak tavanlar ve azalan getiri

Genel fonksiyon: `softcap(x, s, e) = x ≤ s ? x : s·(x/s)^e` (`0 < e < 1`).

| Ne? | Kural | Neden? |
|---|---|---|
| TP çarpanı | `softcap(TP_toplam, 1e5, 0.85)` | Kaçak büyümeyi keser. Prototip: 0.7 çok sert (Kurs 5–6'da 100 saat duvar), 1.0 çok gevşek |
| EP çarpanı | `softcap(EP_toplam, 50, 0.7)` | Çok sayıda efsane koşusu sonrası çarpanı sınırlar |
| Mükemmel şansı | Sert tavan 0.5; perk ile en fazla 0.75 | Kritik oranı anlamını korur |
| Kaddi hızı | Görsel olarak en fazla 20 vuruş/s (L = 50). `L > 50` iken vuruş değeri ×(0.4·L / 20) | Animasyon ve çevrimdışı hesap ucuz kalır. Melvor da 250 ms taban kullanıyor (`skill.js` `Skill.modifyInterval`, confirmed) |
| Yükseltme maliyetleri | Üstel (×1.24–×3.0) ve doğrusal etkiler | Doğal azalan getiri |
| Delik çarpanı | `1.08^(h−1)`, h ≤ 18 → en fazla ×3.7 | Kurs içinde sınırlı |
| Yıldız bonusu | Delik başına en fazla +%9; kurs eşikleri en fazla +%30 | Aktif oyuncu avantajı sınırlı kalır |
| Çevrimdışı | Sert tavan 18 saat | §5 |
| QoL perk maliyetleri | Sabit (×10/seviye) | Melvor'daki banka yuvası tavanına benzer. Konfor yükseltmeleri sonsuza pahalanmaz |

### 11.5 Geç oyun hedefleri

| Sistem | Durum | Ayrıntı |
|---|---|---|
| **Başarımlar** | **Gerekli** (v1.0) | ≥ 60 adet. Kategoriler: delik/kurs, yıldız, sezon, efsane, bant, meydan okuma, gizli. Ödül: kozmetik; her 10 başarım için +%1 global mesafe (en fazla +%10) |
| **Meydan okumalar** (Sezon kartları, §4-C) | **Gerekli** (v1.0; **[UPDATED] karar #7**) | 8 kart. Kart seçildiğinde sezon kurala bağlanır. İlk tamamlama kalıcı bir ödül verir (ör. "Gece Turu" → manuel güç +1). Tekrar oynamak için TP ×(1 + 0.25·zorluk). Yuvalar EP ile açılır |
| **Kariyer ve istatistik ekranı** | Gerekli | Kurs başına en iyi süre, toplam yıldız, en uzun seri, çevrimdışı toplamı |
| **Haftalık Davet** | İsteğe bağlı | Haftanın seed'iyle aynı bant, herkese aynı. Yerel en iyi süre kaydı tutulur |
| **Liderlik tablosu** | İsteğe bağlı, sunucu veya Steam gerekir | Haftalık Davet süresi, en derin bant |
| **Kozmetikler** | İsteğe bağlı | Top izi, bayrak, sopa görünümü. Ekonomiye etkisi yok |

### 11.6 Çok büyük sayılar: gösterim ve hassasiyet

**`Num` sarmalayıcısı.** Kod yalnızca `Num.add/mul/div/pow/cmp/log10/format` çağırır.

**MVP: `Num` = IEEE-754 `double`**
- En büyük değer ~1.797e308. Hassasiyet 15–17 anlamlı basamak. Tamsayılar 2^53 ≈ 9.007e15'e kadar kesin.
- Sayaçlar (seviye, yıldız) `int` tutulur.

**M10: `BigNum` = (mantis `double` [1, 10), üs `int64`)** **[UPDATED] Karar #4:** M10'da gelir; MVP'de `Num` sarmalayıcısı zorunlu.
- Pratik sınır ~10^(9.2e18).
- Hassasiyet mantis kadardır (≈ 15 basamak). Daha küçük terimler toplamda kaybolur; bu tasarımda kabul edilir.

**Hassasiyet kuralları**
1. Maliyetler `exp(L·ln g + ln base)` ile hesaplanır. Döngüyle çarpılmaz.
2. Toplu alım §3.1'deki kapalı formla yapılır.
3. `Y > 1e15 × maliyet` ise satın alma `Y`'yi değiştirmeyebilir. Bu kabul edilir; sayaçlar etkilenmez.
4. Karşılaştırmalar `cmp` ile yapılır. Delik tamamlama için göreli tolerans `1e-12` kullanılır.

**`double` taşma bekçisi**
- Herhangi bir değer 1e300'ü geçerse oyun `BigNum` modunu açar ve kayıt göçü v2→v3 çalışır.
- Kurs ölçeği ×1e3/kurs ile Kurs ~100 (bant ~96) 1e300'e ulaşır. Bu yüzden `BigNum` M10'da, Sonsuz Tur ile birlikte gelir.

**Gösterim (ayarlardan seçilir)**

| Aralık | `suffix` (varsayılan) | `scientific` | `engineering` |
|---|---|---|---|
| < 1e3 | `987` | `987` | `987` |
| 1e3 – 1e33 | 3 anlamlı basamak + K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, Dc (`12.3Qa`) | `1.23e16` | `12.3e15` |
| 1e33 – 1e1e6 | `1.23e45` | `1.23e45` | `123e43` |
| ≥ 1e1e6 (üs ≥ 1e6) | `e1.23e6` (çift üs) | aynı | aynı |

- "aa, ab, …" harf gösterimi isteğe bağlı bir dördüncü seçenek olarak kalır.
- **Karşılaştırma:** Melvor ≥ 1e15'i ">999T" diye gösteriyor (`utils.js` `formatNumber`, confirmed). O oyunun ekonomisi küçük; bizimkisi değil.

---

## 12. [NEW] Dengeleme planı

### 12.1 Simülatör v2 spesifikasyonu

`tools/idle_golf_sim.py` (v1) korunur. Üstüne `tools/idle_golf_sim2.py` eklenir; aynı çekirdek fonksiyonları içe aktarır.

| Modül | Tanım |
|---|---|
| Çekirdek | v1'in `income/cost/hole_len` fonksiyonları. §3.1'e göre güncellenir: kurs `c`, `D`, ıska, `M_meta` |
| Sezon döngüsü | **[UPDATED]** Sezon her zaman kursun 18. deliğinde biter (karar #6). Kurs seçim politikası, açık kurslar arasından **tahmini TP/saati en yüksek** olanı seçer. Tahmin, oyun içi kurs tahmincisiyle aynı kuralla yapılır (§13). `max_season_h` (vars. 3 saat) içinde bitmeyecek kurs seçilmez. "Sezondan Çekil" yalnızca hata durumunda kullanılır. Sezon başına `season_overhead_s` (vars. 90 s) ek yük eklenir |
| Perk politikası | Sezon sonunda PP ile en ucuz alınabilir perk, ödeme gücü bitene kadar |
| Efsane politikası | Büyük Şampiyon sonrası `EP_kazanç ≥ 5` ve son 3 sezonun TP/saati, efsane boyunca görülen en iyinin %50'sinin altına düştüyse |
| Oyuncu profilleri | §12.2 |
| Çevrimdışı | Profilin çevrimdışı dilimleri §5 kuralıyla (verim 0.6, tavan, adımlı) |
| Rastgelelik | `--mc N`: vuruş kalitesi ve putt sonucu örneklenir. Delik/kurs sürelerinin P10/P50/P90 değerleri raporlanır |
| Çıktılar | `milestones.csv` (zaman, olay, kurs, delik, sezon, efsane), `minute.csv` (t, gelir, yarda, TP_toplam, en büyük değer), konsol özeti, §12.3 kabul tablosu ✔/✘ |

### 12.2 Oyuncu profilleri

| Profil | Çevrimiçi | Manuel | Çevrimdışı |
|---|---|---|---|
| Aktif | Kesintisiz | 0.8 vuruş/s, %40 mükemmel, %15 ıska, putt %50 birdie / %35 par | Yok |
| **Karma** (varsayılan hedef) | Günde 3 × 20 dk | 0.25 vuruş/s, %35 mükemmel | Kalan süre, tavanla |
| Idle | Günde 2 × 5 dk (yalnızca satın alma) | Yok | Kalan süre, tavanla |

### 12.3 Metrikler ve kabul pencereleri (TBT)

| Metrik | Aktif | Karma | Idle | Prototip (aktif, yaklaşık) |
|---|---|---|---|---|
| İlk prestije süre (oynama) | 1.5–2.5 sa | 2–4 sa | 2.5–4 sa | 1.78 sa ✔ |
| Kurs 2 temizlendi (toplam) | 5–10 sa | 8–15 sa | 10–20 sa | 18-delik kuralı: 5.0 sa ✔ |
| Kurs 3 temizlendi | 10–20 sa | 15–30 sa | 20–40 sa | 18-delik kuralı: 7.6 sa ✘ (hızlı) |
| **Büyük Şampiyon** (Kurs 4) | 20–35 sa | 25–45 sa (karar #1) | 35–70 sa | 18-delik kuralı + önceki kursu farm: 10.6 sa ✘ (hızlı; politikaya duyarlı, §11.1) |
| Sonsuz Tur bant süresi (ilk efsane) | 30–120 dk | 45–150 dk | ≤ 2× karma | üs 1.8: Kurs 4→5 18.7 sa ✘ (duvar; Efsane katmanı modellenmedi) |
| Ardışık bant süre oranı | ≤ 1.3× | ≤ 1.3× | ≤ 1.3× | ölçülmedi |
| 2. efsanede Kurs 4 süresi | ≤ %50 × 1. | ≤ %50 × 1. | ≤ %50 × 1. | ölçülmedi |
| Saatlik yükseltme: erken (ilk 30 dk) | ≥ 150 | ≥ 60 | ≥ 30 | ~180 ✔ |
| Saatlik yükseltme: orta (Kurs 1, delik 9–18) | 60–250 | 30–150 | 15–80 | 160–180 ✔ |
| Saatlik yükseltme: geç (Kurs 3+) | ≥ 30 ve ≤ 600 | ≥ 15 | ≥ 5 | 130–4 600 ✘ (hızlı sezonlarda çok fazla; maks-alım UI'ı şart) |
| En uzun "ölü süre" (ne alım ne delik) | ≤ 10 dk | ≤ 20 dk (çevrimiçi) | – | ölçülmedi (en uzun delik aralığı 42–100 dk) |
| En kısa ortalama sezon (kalıcı durum) | ≥ 10 dk | ≥ 10 dk | ≥ 10 dk | 4 dk ✘ (prestij spam'i riski) |
| Aktif/idle hız oranı | 1.5–3× | – | – | ≈1.85× ✔ |
| İlk 200 saatte en büyük değer | < 1e300 (yoksa BigNum öne çekilir) | | | ~1e34 ✔ |

**Ayar kuralları** (v1'e ek):
- Büyük Şampiyon çok hızlı ya da yavaşsa önce `M_TP` üssünü ayarlayın (şu an 1.8; ±0.1 adım). Erken kurslar arasında duvar oluşturduğu için `D`'yi büyütmek ikinci seçenek.
- Kurs 4 sonrası duvar (şu an 18.7 sa): önce Efsane katmanı modellenip ölçülür. Duvar sürerse Sonsuz Tur bantları için ayrı bir `D_bant` (ör. 300) değerlendirilir.
- Bant duvarı varsa önce yumuşak tavan üssünü artırın (0.85 → 0.9), sonra Efsane hedefini kontrol edin.
- Sezon 10 dk'nın altına iniyorsa "Erken Isınma" ve "Hızlı Başlangıç" perk'lerini zayıflatın. Ya da `TP`'ye sezon süresi tabanı ekleyin: `TP × min(1, t_sezon / 10 dk)`.

### 12.4 Telemetri

- **Yerel ve açık rızalı** (`settings.telemetry`). `user://telemetry/*.jsonl`, satır başına bir olay. Ağ yoktur; "Dışa aktar" düğmesi dosyayı oyuncu testinde paylaşılabilir hale getirir.
- **Olaylar:**
  - `session_start/end`
  - `hole_cleared {c, h, t_run, t_total, stars, manual_share}`
  - `purchase {cat, lvl, cost, yards_after, bulk}`
  - `season_end {c, holes, tp, t}`
  - `legacy_end {ep, t}`
  - `offline_return {dt_raw, dt_used, capped, gain, holes}`
  - `putt {tries}`
  - `setting_changed`
  - `clock_jump`
- **Karşılaştırma:** Aynı profil için simülatör çıktısı ile telemetri arasındaki fark yüzde olarak raporlanır. Kabul: P50 sürelerde ±%30. Melvor da çevrimdışı dönüşte telemetri gönderiyor (`game.js` `Game.trackOfflineTelemetry`, confirmed); bizimki yalnızca yerel.

### 12.5 Prototip notu

Yukarıdaki "prototip" sütunu bu revizyonda scratchpad'de koşulan hızlı bir modelden alındı:
- yalnızca aktif profil,
- perk, yıldız ve çevrimdışı yok,
- Grip kurs ofseti yok,
- sezon tavanı 3 saat.

Kesin sonuç değildir; simülatör v2 (M0/M7) ile yeniden üretilmelidir.

---

## 13. [NEW] UI akışı

```
Açılış → Kayıt yuvası (3 yuva, içe/dışa aktar)
   └→ [Çevrimdışı özeti modalı] (Δt ≥ 60 s ise)
        └→ ANA EKRAN
             ├ üst şerit: yarda (Num.format), gelir/s, TP_toplam, ★
             ├ orta: delik görünümü + vuruş göstergesi (dokun/boşluk)
             ├ alt: delik ilerleme çubuğu (kalan süre tahmini ile)
             ├ sağ panel: Yükseltmeler (sekme/kategori, ×1/×10/×100/maks)
             └ menü: Perk ağacı · Kurslar · Başarımlar · İstatistik · Ayarlar
   Delik son %10 → PUTT OVERLAY (2–5 s) → sonuç rozeti (★)
   Delik 18 → "Sezonu Bitir?" modalı (TP önizleme, ne sıfırlanır listesi) → SEZON ÖZETİ → Perk ağacı → Kurs seçimi → yeni sezon
   [NEW] Kurs seçimi: her açık kurs için "mevcut çarpanlarla tahmini bitiş süresi" ve "tahmini TP" gösterilir (hızlı simülasyon, §12.1)
   [NEW] Menü → "Sezondan Çekil" (onaylı; TP/PP verilmez) → Kurs seçimi
   Kurs 4/18 → KUPA TÖRENİ → jenerik → [Sonsuz Tur'a devam] | [Efsane ol (EP önizleme)]
   Ayarlar: sayı gösterimi (§11.6), çevrimdışı özeti, ses, ekran sarsıntısı aç/kapa, renk körlüğü modu, telemetri
```

- Her sıfırlama modalı **neyin kalıp neyin gideceğini** iki sütunda gösterir.
- Sıfırlama modallarında onay gerekir: ilk 3 kez zorunlu, sonra ayardan kapatılabilir.

---

## 14. [NEW] Para kazanma

- **Önerilen:** Tek seferlik ücretli sürüm (Steam/itch). Reklam yok. Ekonomiyi etkileyen satın alma (IAP) yok.
- "Günlük ücretsiz 2× dönüş bonusu" (§5) reklam yerine kalır.
- **İsteğe bağlı sonra:** Yalnızca kozmetik DLC (top izleri, sopa görünümleri). Ekonomi tablosunu etkilemez.
- **[UPDATED] Karar #5 (2026-10-17):** Tek seferlik ücretli model onaylandı. Mobil sürüm gündeme gelirse ayrıca yeniden değerlendirilir.

---

## 15. [NEW] Açık kararlar

Ayrıntı ve öneriler `review/changes_summary.md` içinde. **[UPDATED]** 2026-10-17 itibarıyla 7 kararın hepsi verildi. Açık kalan tek iş, Büyük Şampiyon süresinin ayarı (§11.1, simülatör v2). Kısaca:

1. ~~Para kazanma modeli~~ **Karar verildi:** tek seferlik ücretli; reklam yok, IAP yok (§14).
2. ~~Çevrimdışı verimi~~ **Karar verildi:** %60 sabit (§5).
3. ~~Efsane'de açık kurslar~~ **Karar verildi:** sıfırlanır, Kurs 1'e dönülür. Yıldızlar ve Otomatik Alım korunur (§11.2).
4. ~~`BigNum` zamanlaması~~ **Karar verildi:** MVP'de `double` ama tüm kod `Num` sarmalayıcısı üzerinden yazılır. `BigNum` M10'da, kayıt göçü v2→v3 ile gelir (§11.6).
5. ~~Büyük Şampiyon hedef süresi~~ **Karar verildi:** karma profilde 25–45 saat; `M_TP` üssü 1.8 (§11.1).
6. ~~Sezon alt sınırı~~ **Karar verildi:** her zaman 18 delik ve TP vermeyen "Sezondan Çekil" (§1, §11.2). Karar #1'in ayarını yeniden açtı (§11.1).
