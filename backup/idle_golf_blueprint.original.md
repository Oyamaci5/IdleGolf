# Idle Golf: Tasarım Planı (Faz 4)

**Çalışma adı:** *Par Fabrikası* (geçici; mağaza öncesi ad ve marka kontrolü yapılmalı)
**Tür:** Golf temalı incremental/idle. Tek oyunculu, 2D.
**Hedef:** Kısa oturumlarda aktif vuruş ve uzun süreli otomasyon. İlk "sezon" (prestij) aktif oyunda ~1h45m, yalnızca idle oynayınca ~3h15m (simülasyon, bkz. `economy_simulator_spec.md`).

> Bu belge **özgün** bir tasarımdır. Scritchy Scratchy analizinden (`analysis/progression.md`) yalnızca genel incremental kalıplar alındı:
> - üstel maliyet,
> - göreli kademe farkı,
> - kademeli otomasyon açılımı,
> - sık küçük hedefler,
> - iki katmanlı kayıt.
>
> İsim, varlık, kod, veri tablosu ve seviye düzeni alınmadı. Ayrıntılar §9'da.

---

## 1. Çekirdek döngü

| Katman | Oyuncu ne yapar? | Ne otomatik çalışır? | Yükseltmeler neyi değiştirir? |
|---|---|---|---|
| **Saniyeler** | **Manuel vuruş:** güç/zamanlama göstergesi. Iska ×0.5, İyi ×1, Mükemmel ×2.5. Manuel vuruş otomatik vuruştan **12 kat** değerli ("power drive") | Kedi/kaddi'ler (Caddy) saniyede 0.4 vuruş atar | Vuruş mesafesi, mükemmel olasılığı, zemin (lie) kalitesi, otomatik vuruş hızı |
| **Dakikalar** | Yarda harcayıp yükseltme alır. Seri (streak) tutturmaya çalışır | Yarda birikir. Delik ilerleme çubuğu dolar | Seri çarpanı tavanı, top yuvarlanması |
| **Delik (milestone)** | Deliğe yaklaşınca **yeşil faz:** kısa bir putt mini oyunu. Par içinde bitirirse yıldız kazanır | Delik tamamlanınca bu koşu için kalıcı ×1.08 çarpan ve yeni yükseltme veya özellik | Yeni sahalar ve zorluk |
| **Sezon (prestij)** | 18. delikten sonra "Sezonu Bitir": yarda ve yükseltmeler sıfırlanır | Tur Puanı (TP) kazanılır; kalıcı bonuslar | Kural değiştiren sezon kartları (bkz. §4-C) |

**Para birimleri:**
- **Yarda (yd):** ana birim, `double`. Kazanılan mesafenin kendisi.
- **Yıldız (★):** delik başına 0–3, kalıcı.
- **Tur Puanı (TP):** prestij birimi.

---

## 2. Yükseltme ağacı

Altı kategori var ve her biri **farklı bir matematiksel eksen** üzerinde çalışıyor. Hiçbiri "düz çarpan" değil.

| Kategori | Etki türü | Formül (seviye L) | Neden farklı hissettiriyor? |
|---|---|---|---|
| **Sopa Başı (Head)** | Toplamsal taban mesafe | `taban = 5 + 2·L` yd | Erken oyunun güvenilir, sıkıcı ama sağlam omurgası |
| **Şaft (Shaft)** | Olasılık (kritik) | Otomatik mükemmel şansı `p = min(0.5, 0.05 + 0.01·L)`; mükemmel = ×2.5 | Beklenen değeri artırır; ekranda daha çok "MÜKEMMEL!" görünür |
| **Tutuş (Grip)** | **Göreli kademe** (zemin) | `lie = tablo[clamp(L − zorluk(delik), −2, +2) + 2]`, tablo `[0.35, 0.6, 1.0, 1.35, 1.7]`, `zorluk = floor(0.75·delik)` | Her yeni delik daha zor zemin getirir. Grip seviyesi delikle yarışır; geride kalınca vuruşlar rough/bunker'a düşer |
| **Top (Ball)** | Çarpımsal ve kademeli | `top = (1 + 0.08·L) × 1.5^floor(L/10)`; her 10 seviyede yeni top modeli | Doğrusal artış ve belirli eşiklerde büyük sıçrama. "10'a bir kala" motivasyonu yaratır |
| **Kaddi (Caddy)** | Hız (otomasyon) | `otomatikVuruş/s = 0.4·L` | Idle kısmın ana motoru |
| **Duruş (Stance)** | **Yalnızca manuel** seri | Art arda mükemmel vuruş başına +%5; tavan `1 + 0.15·L`; 3 s vuruşsuz kalınca sıfırlanır | Aktif oyunu ödüllendirir; idle oyuncuyu cezalandırmaz |
| *Saha açılımları* | Kilometre taşı | Delik 3: Duruş açılır. Delik 6: Top. Delik 9: Rüzgâr göstergesi (MVP+). Delik 12: Kulüp Evi (çevrimdışı tavanı). Delik 18: Sezon | Yeni sistemler sırayla gelir; oyuncu menüye boğulmaz |

**Tasarım notu.** Grip'in göreli kademe mantığı analizdeki "göreli şans" bulgusundan ilham alan **genel** bir kalıptır: zorluk farkına göre katman seçmek. Burada farklı bir boyutta (zemin/arazi), farklı bir tabloyla ve 5 katmanla uygulanıyor.

---

## 3. Ekonomi

### 3.1 Formüller

```
maliyet(k, L)   = base_k × growth_k ^ L
mesafe(vuruş)   = taban(Head) × lie(Grip, delik) × top(Ball) × 1.08^(delik−1)
                  × (1 + p·(2.5 − 1))
                  × [manuel ise: seri(Stance) × 12]
gelir/s         = 0.4·L_caddy · mesafe(otomatik) + manuelVuruş/s · mesafe(manuel)
delik_uzunluğu(n) = 8 000 × 2.3^(n−1) yd           // bu koşuda toplanması gereken yarda
TP (sezon sonu)  = floor( sqrt( koşu_toplam_yarda / 1e8 ) )   // 18. delikte ≈ 14 TP
TP etkisi        = +%5 tüm mesafe / TP (kalıcı) ve perk ağacında harcanabilir
```

### 3.2 Başlangıç sayıları

Bu sayılar simülatörle ayarlandı.

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
| Delik çarpanı | ×1.08 / delik |
| Delik 1 / 9 / 18 uzunluğu | 8 000 / 6.3e6 / 1.1e10 yd |

### 3.3 Simülasyon sonuçları

Simülatörün greedy satın alma politikasıyla ürettiği sonuçlar:

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
- **Ayar önerisi:** Aktif oyuncunun 1h45m boyunca kesintisiz vuruş yapmayacağı açık. Gerçekçi bir karışım (%30 aktif) için `manual_swings_per_s = 0.25` ile tekrar koşun.

Ayrıntılı spesifikasyon ve kod `design/economy_simulator_spec.md` dosyasında.

---

## 4. Standart tıklayıcıdan ayıran mekanik seçenekleri

### A) Rüzgâr ve zemin hava durumu

- Her delikte 30–90 s'lik rüzgâr döngüleri var.
- Karşı rüzgâr ×0.7, arka rüzgâr ×1.4.
- Önceden görünen bir "tahmin şeridi" var. Oyuncu Power Drive'ı doğru ana saklar.
- Kaddi seviyesi otomatik vuruşların rüzgâr cezasını azaltır.

**Artıları:** Zamanlama kararı ekler; idle'ı bozmadan aktif oyuna derinlik verir.
**Eksileri:** Tek başına delik ilerlemesi kadar güçlü bir kimlik vermez. Dengelemesi değişkenli.

### B) Delikler kilometre taşı ve Par/Yıldız sistemi (**ÖNERİLEN**)

- Her delik bir ilerleme kapısı. Tamamlanınca koşu çarpanı ve yeni sistem açılır.
- Deliğin son %10'unda kısa bir putt mini oyunu var (2–5 s).
- Par içinde bitirmek 1–3 yıldız verir. **Yıldızlar sezonlar arasında kalıcı.** Her ★ o deliğin mesafesine +%3.
- Yıldızsız geçilen delik bir sonraki sezonda tekrar denenebilir.

### C) Kural değiştiren Sezon kartları (prestij katmanı)

- Her sezon başında 3 karttan biri seçilir. Örnekler:
  - "Links Sahası": rüzgâr ×2, yuvarlanma ×3
  - "Gece Turu": manuel ×2, kaddi ×0.5
  - "Çöl": grip zorluğu +2, top ×2
- TP kartın zorluğuna göre çarpılır.

**Artıları:** Prestijin tekrarını kırar.
**Eksileri:** İçerik ve denge maliyeti yüksek; MVP için ağır.

**Neden B?**

1. **Tema kimliği.** Delik, par ve yıldız golfün kendi dili. Oyunu ilk bakışta "golf" yapan şey bu, sıradan bir sayı tıklayıcısı değil.
2. **Tempo aracı.** Analizde en güçlü yavaşlama önleyicisinin sık ve küçük hedefler olduğu görüldü (33 hedef). Delikler bunu doğal olarak sağlıyor ve simülatörde doğrudan ayarlanabiliyor (`hole_len_growth`).
3. **Aktif/idle dengesi.** Putt mini oyunu kısa ve isteğe bağlı. Idle oyuncu yine ilerliyor; aktif oyuncu yıldız topluyor.
4. **Solo geliştirici maliyeti düşük.** Tek bir mini oyun ve bir ilerleme çubuğu yeterli. A ve C, MVP sonrasında B'nin üstüne eklenebilir: rüzgâr delik 9'da, kartlar 2. sezonda.

---

## 5. Çevrimdışı ilerleme

```
Δt        = clamp(now_utc − lastSeen_utc, 0, cap)       // negatif saat oynamasına karşı 0
kazanç    = gelir_otomatik/s × Δt × 0.6                  // manuel, seri ve putt dahil değil
cap       = 4 saat (başlangıç) + 2 saat × KulüpEvi_L (maks 4 seviye → 12 saat)
Delik tamamlama çevrimdışıyken gerçekleşebilir ama yıldız verilmez
```

- `lastSeen` her kayıtta yazılır (unix ms).
- Dönüşte "Siz yokken: +X yd, N delik" özeti gösterilir.
- %60 verimlilik, idle oyuncuyu ödüllendirirken açık oyunu teşvik eder.
- Analizdeki "süre deltasını sınırlama" kalıbı (genel bir saat-hilesi önlemi) üst sınır olarak uygulanır.
- İsteğe bağlı: ilk açılışta 2× "dönüş bonusu" için reklam yerine **günlük ücretsiz** bir buton.

---

## 6. Motor ve dil önerisi (solo geliştirici)

**Öneri: Godot 4.x + GDScript.**

- 2D ve UI ağırlıklı bir oyun için hafif, ücretsiz ve lisans derdi yok.
- PC, Mac, Linux, Web ve mobil dışa aktarımı var.
- GDScript `float` 64-bit; `1e308`'e kadar yeterli. Analizdeki oyun da parayı `double` olarak tutuyor.
- Daha büyük sayı gerekirse mantis/üs yapısında basit bir `BigNum` sınıfı yazılabilir.

**Alternatif:** C# biliyorsanız Unity 6 + C#. Analiz edilen oyun da bu yığınla yapılmış. Daha ağır ama mağaza ve SDK eklentileri hazır.

**Kayıt:**
- `user://save.json` (JSON).
- 60–120 s'de bir otomatik kayıt, dönen 3–5 yedek (`autosave_YYYYMMDD_HHMMSS.json`).
- `saveVersion` alanı ile göç (migration).
- Koşu verisi (`run`) ve kalıcı veri (`meta`) iki ayrı nesne. Prestij = `run`'ı yeniden oluşturmak.

---

## 7. MVP kapsamı

**Dahil:**
- 1 saha, 9 delik.
- 4 yükseltme kategorisi: Head, Shaft, Grip, Caddy.
- Manuel vuruş göstergesi.
- Delik ilerleme çubuğu ve putt mini oyunu (Par/Yıldız).
- Kayıt ve otomatik kayıt.
- 4 saatlik çevrimdışı tavan.
- Büyük sayı biçimlendirme (K, M, B, T, aa…).
- Temel ses ve "juice" efektleri: mükemmel vuruşta ekran sarsıntısı, sayı uçuşması.

**Hariç:** Sezon/prestij, rüzgâr, Ball ve Stance, kozmetik, başarımlar, bulut kayıt, mobil.

---

## 8. Kilometre taşları

| # | Süre (tahmini) | Çıktı | Bitti sayılma ölçütü |
|---|---|---|---|
| M0 | 3–5 gün | Simülatör ve ilk ayar | `idle_golf_sim.py` delik 1/9 sürelerini hedef aralığında veriyor |
| M1 | 1–2 hafta | Çekirdek döngü | Vuruş göstergesi, yarda sayacı, 1 kaddi, 1 yükseltme |
| M2 | 1–2 hafta | Ekonomi | 4 kategori, üstel maliyet, toplu alım (×1/×10/maks) |
| M3 | 1–2 hafta | Delikler | 9 delik, ilerleme, putt, yıldızlar |
| M4 | 1 hafta | Kalıcılık | JSON kayıt, otomatik kayıt, yedek, çevrimdışı özet |
| M5 | 1 hafta | Cila | Ses, parçacıklar, sayı biçimleri, ayarlar menüsü |
| M6 | 1 hafta | Test ve ayar | 5+ oyuncu testi; gerçek süreler simülasyonla karşılaştırılır |
| M7 | 2 hafta (MVP sonrası) | Sezon ve TP | 18 delik, TP formülü, perk ağacı (6–8 perk) |
| M8 | MVP sonrası | A ve C | Rüzgâr (delik 9+), Sezon kartları |

---

## 9. Kopyalanmaması gerekenler ve öğrenilebilecekler

**Kesinlikle kopyalamayın:**
- **İsimler:** "Scritchy Scratchy", karakter ve gadget adları (Mundo, Scratch Bot, The Machine, Egg Timer, Night Market, Spell Book…), bilet adları (Day Job, Two Win, Lucky Cat, Final Chance…), para birimi adları (JP / Jack Points, Souls), perk adları ve açıklamaları, diyalog metinleri.
- **Varlıklar:** sprite'lar, animasyonlar, ses/müzik, fontlar, UI düzeni ve ikonlar.
- **Kod:** decompile ya da disassemble edilmiş hiçbir rutin. Bu analizde çıkarılan fonksiyonların C# karşılıkları yazılmamalı; formüller kendi tasarımınızdan türetilmeli.
- **Veri tabloları:** `UpgradeData`, `TicketData`, `PerkData`, `ProgressionGoalData`, `MachineTiersData` ve diğer sayı dizileri. Örneğin şans fiyatı 200×5^n, bilet değer çarpanı 1.3, `5^(katalog−1)` JP ve hedef eşikleri birebir alınmamalı.
- **Seviye ve yapı düzeni:** perde/ölüm ("Final Chance") anlatı yapısı, kredi/iflas sisteminin özgün tasarımı, meydan okuma kural setleri.

**Öğrenilmesi adil olan genel kalıplar** (oyun tasarımında yaygın ve korunmayan fikirler):
- Üstel maliyet ile toplamsal ve üstel etkilerin karıştırılması.
- Hedefin oyuncuyla birlikte kaydığı "göreli kademe" fikri (RPG'lerdeki seviye farkı gibi).
- Otomasyonun duvar noktalarında kademeli açılması.
- Sık, küçük ve açıkça görünen hedefler.
- Koşu ve kalıcı veri ayrımı; prestij birimini ilerlemenin derinliğine göre ölçekleme.
- Otomatik kayıt, dönen yedekler ve süre deltasını sınırlama gibi teknik iyi uygulamalar.
