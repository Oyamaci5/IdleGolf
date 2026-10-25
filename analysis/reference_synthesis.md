# Referans Oyun Sentezi (REA turu 1 + 2)

> **Tarih:** 2026-10-24 · **Plan:** `reference_games_rea_plan.md` §4 · **Bağlandığı belge:** `design/idle_golf_blueprint_v2.md`
>
> **Sürüm uyumsuzluğu.** Plan `blueprint_v4 §16/§17`'ye atıf yapıyor; bu bölümler v2'de **yok**. Kullanıcı isteği üzerine bulgular **v2 bölümlerine** bağlandı. Plandaki §16.4/§17.x açıklarının v2 karşılıkları:
> - nişan/fizik/şans → §1, §4
> - şanslı buff'lar → §4-A, §11.5
> - paralel sistemler ve uzun vade → §11
> - zamanlayıcılı içerik → §5, §11.5, §14
>
> Oyun başına belgeler:
> - `analysis/idle_golf_reference.md`
> - `analysis/pegidle_reference.md`
> - `analysis/idle_slayer_reference.md`
> - `analysis/fapi_reference.md`
> - `analysis/ngu_idle_reference.md`

## 0. Kapsam durumu

| Öncelik | Oyun | Durum | Not |
|---|---|---|---|
| 1 | Idle Golf (demo) | **Tamam** | Godot 4.6 PCK; tüm betik token akışı okundu. Ayrıntılı rakip planı dosyası (`idle_golf_competitor_rea_plan.md`) diskte yok |
| 2 | PegIdle (demo) | **Tamam** | REA managed + CIL sabitleri |
| 3 | Idle Slayer | **Kısmi** | IL2CPP v39. Yalnızca tanımlayıcı adlar. Native decompiler yok; oran ve olasılık çıkarılamadı. Odak sorusu 3 Steam yorumlarıyla doğrulandı |
| 4 | PlinkIdle | **Yapılmadı** | Kurulu değil |
| 5 | Farmer Against Potatoes Idle | **Tamam** | REA (tip seçimli) + kendi metadata okuyucu |
| 6 | NGU Idle | **Tamam** | REA (tip seçimli) + CIL sabitleri |
| – | "Egg Surprise" klasörü | **Atlandı** | Oyun dosyası yok; yalnızca boş bir `%USERPROFILE%\Documents\My Games\YourGameName` klasörü var. Plandaki Egg, Inc. mobil (yalnızca gözlem) |
| – | Golf Clash, Idle Golf Tycoon | Kapsam dışı | Mobil gözlem |

**Yapılmayan plan adımları.**
- §3 adım 3 (30–60 dakika oynama ve açılım çizelgesi): oyunlar çalıştırılmadı. Açılım sıraları **statik** koddan çıkarıldı (FAPI'de koşullar confirmed, saat dilimleri hypothesis).
- §0 kullanım koşulları: oyun klasörlerinde EULA/terms dosyası yok, çevrimiçi metinler okunmadı.
- Koruma veya şifreleme aşılmadı; hiçbiri ile karşılaşılmadı (Godot PCK ve IL2CPP metadata şifresiz).

## 1. Al (kalıp olarak): blueprint'e öneri

| # | Bulgu (kaynak, güven) | Blueprint v2 | Öneri |
|---|---|---|---|
| A1 | Prestij ödülü **yalnızca kişisel en iyiyi aşma oranına** bağlı; tekrar aynı seviyede 0; tek prestij ödülü doymalı tavanlı (Idle Golf, confirmed) | §11.1 "Yapılacak", §11.2 Katman 1 | §11.1'deki "önceki kursu farm etme" sorunu için **4. kaldıraç**. Kurs c'de sezon TP'si, o kursun en iyi sezon yardasını aşan kısımdan hesaplansın (ör. `TP_c ∝ sqrt(max(0, Y − Y_en_iyi(c)))` ya da log oranı). İlk temizlemede bugünkü formül kalsın. Simülatör v2'de mevcut kaldıraç 2 (`0.5^(derinlik farkı)`) ile karşılaştırın |
| A2 | Seed'li çevrimdışı RNG + adım sayısına göre kademeli doğruluk + ~10 gün sert tavan (FAPI, confirmed) | §5 | `meta.offlineSeed` ekleyin. Çevrimdışı hesap aynı seed'le tekrar üretilebilir olsun (test ve hata ayıklama). 2000 adımı aşan uzun aralıklar için "toplu yaklaşım" yolunu açıkça tanımlayın |
| A3 | Sistem başına analitik çevrimdışı özet (NGU, confirmed) | §5, §11.3 | Sonsuz Tur ve meydan okumalar eklendikçe, her alt sistem kendi `offline_summary(dt)` fonksiyonunu sağlasın. Özet ekranı mesajları birleştirsin |
| A4 | Günlük ödül duvar saatine değil **biriken, tavanlı zaman bankasına** bağlı (NGU, confirmed) | §5 son madde, §14 | "Günlük ücretsiz 2× dönüş bonusu" oynama ve çevrimdışı süreyle dolan, 24 saatte hazır olan, en fazla ~1.5 gün biriken bir banka olsun. Saat değiştirme hilesine de dayanıklı |
| A5 | Tek merkezî açılım tablosu; her açılım bir öğretici adımı ve başarım tetikliyor; geç içerik **prestij sayacıyla** açılıyor (FAPI, confirmed) | §2 "Saha açılımları", §11.1, §13 | Açılımları veri tablosuna taşıyın: `{id, koşul, öğretici_id, başarım_id}`. Kurs ve Efsane açılımları da aynı tabloda olsun |
| A6 | Rastgele zamanlı **geçici bonus hedefi** (Idle Golf altın bayrak; PegIdle Gold Rush; Idle Slayer kutuları; confirmed/likely) | §4-A, §1 | MVP+ seçeneği: delik sırasında kısa süreli bir "fırsat bölgesi". Manuel vuruş isabet ettirirse bonus verir. Idle oyuncu hiçbir şey kaybetmez. Ad ve görsel özgün olmalı |
| A7 | Rastgele ödülde **pity sayacı** ve deterministik garanti takvimi (FAPI, NGU, confirmed) | §11.5 | Herhangi bir rastgele kozmetik veya ödül düşüşü eklenirse en kötü durum garantisi zorunlu olsun |
| A8 | Formüllerin oyun içi yardımda açıkça gösterilmesi (Idle Golf, confirmed) | §13 | Yükseltme tooltip'lerinde "sonraki seviye etkisi + formül" ve sezon modalında TP formülü önizlemesi |
| A9 | Yüklemede değer temizliği: negatif, maks üstü ve geçersiz kuşanılmış öğe (Idle Golf, confirmed) | §6.2 Kurallar | 9. kural: `sanitize()` göçten sonra, oyuna girmeden önce çalışsın. Düzeltmeler telemetriye yazılsın |
| A10 | Manuel atış için ayrı çarpan hattı ve dalı; değer oranı oyuncu seçimine bağlı (PegIdle, confirmed) | §1, §3.4 perk'ler | "Uzun Vuruş" tek perk yerine 2–3 perk'lik küçük bir **aktif dal** olabilir (manuel güç, seri tavanı, putt penceresi). Aktif/idle oranı §12.3 penceresinde kalacak şekilde tavanlanmalı |

## 2. Kaçın: blueprint'e risk notu

| # | Bulgu (kaynak) | Blueprint v2 | Risk notu |
|---|---|---|---|
| K1 | "Idle" vaadine rağmen idle gelirin önemsizleşmesi; ilerlemenin aktif ve RNG'ye bağlanması. En sık olumsuz yorum teması (Idle Slayer: %78, diğerleri %94–95) | §12.3 aktif/idle oranı | Oran **yalnızca Kurs 1 için** ölçülüyor (≈1.85×). Kurs 3+ ve Sonsuz Tur için de "aktif/idle ≤ 3×" metriği ekleyin. Manuel ×12 ve perk'ler geç oyunda bu oranı patlatmamalı |
| K2 | Kritik ilerlemenin çok aşamalı RNG zincirine bağlanması (Idle Slayer armory) | §11.5 | Yıldız, kurs ve Efsane hiçbir zaman rastgele düşüşe bağlanmamalı. Rastgelelik yalnızca kozmetik veya kısa süreli bonus olsun |
| K3 | Zorunlu hissettiren, kısa bekleme süreli aktif mini oyun (FAPI whack-a-potato) | §4-B putt, §11.5 | Putt **isteğe bağlı** kalmalı. "Her N dakikada gel" bekleme süreli bir mekanik eklenmemeli |
| K4 | Yayın sonrası çevrimdışı ve idle nerf'ü (Idle Slayer yorumları) | §5 karar #2 | %60 verim ve tavanlar 1.0 öncesi kilitlenmeli. Sonradan düşürmek güveni bozar; ayarı yalnızca yukarı yönlü yapın |
| K5 | Tür başına kopyalanmış kod (PegIdle'da 22 top için 22 coroutine) | §2, §3.4 | Kategoriler, toplar ve modifiyeler veri tablosuyla tanımlanmalı (Godot `Resource` ya da JSON) |
| K6 | Sistem sayısının UI'ı ve dikkati aşması; mikro yönetim yorgunluğu (FAPI, NGU) | §13 | Yeni sistem ancak mevcut panellerden birine sığıyorsa eklenmeli. Prestij sonrası elle yeniden kurulum gerektiren hiçbir ayar olmamalı (Otomatik Alım doğru yön) |
| K7 | Geç oyunda haftalarca değişmeyen durum (FAPI yükseliş 12+) | §11.3, §12.3 | "Ardışık bant süre oranı ≤ 1.3×" ve "ölü süre" metrikleri M10'da **zorunlu kabul ölçütü** olsun |
| K8 | Rakip Steam'de **"Idle Golf"** adıyla yayında (demo, 2026) | Başlık, §9 | Proje ve dosya adlarında kalabilir ama **mağaza adı, logo ve anahtar sözcük olarak kullanılmamalı**. "Retire", "Medal" ve rakibin top adları da §9 listesine eklenmeli |

## 3. Zaten var: doğrulama notu

| # | Bulgu (kaynak) | Blueprint v2 karşılığı | Doğrulama |
|---|---|---|---|
| Z1 | Kısa prestijleri süreye bağlı çarpanla cezalandırma ve asgari prestij süresi (NGU, confirmed) | §11.1 kaldıraç 1 `TP × min(1, t/15 dk)`, §12.3 "en kısa sezon ≥ 10 dk" | Uzun ömürlü bir oyunda aynı kalıp kullanılıyor. Kaldıraç 1 öncelikli tutulmalı |
| Z2 | Katmanlı prestij: 2–3 katman yaygın (Idle Slayer Ascension/Ultra; FAPI Reenkarnasyon/Yükseliş/Transcendence; NGU zorlukları) | §11.2 Katman 1–2 + isteğe bağlı 3 | Tasarım tür normlarıyla uyumlu |
| Z3 | Kısa, başarısız olunabilen beceri mini oyunu (Idle Slayer bonus aşamaları) | §4-B putt | Aynı aile. Bizimki daha kısa ve isteğe bağlı, bu doğru |
| Z4 | Ekonomik etkisi olmayan combo görmezden gelinir (Idle Golf) | §1 Duruş/Stance serisi çarpan veriyor | Bizde seri ekonomik; doğru |
| Z5 | Çevrimdışı tavan ve saat koruması eksik olan oyunlar (PegIdle yerel saat metni, tavansız; Idle Golf çevrimdışı yok) | §5 tavan, `max(lastSeen, now)`, UTC ms | Bizim kural seti daha sağlam |
| Z6 | Sürümsüz kayıt (Idle Golf ConfigFile) | §6.2 şema, göç, checksum, atomik yazım | Bizde var |
| Z7 | Büyük sayı kütüphanesi (FAPI `BreakInfinity.BigDouble`) | §11.6 `Num`/`BigNum` | Aynı yaklaşım |
| Z8 | Olasılıkları yatırım eksenine çevirmek (PegIdle ağaç dalları, Idle Slayer kutu ve olay yükseltmeleri) | §2 Shaft (mükemmel şansı) | Bizde Shaft bu rolü üstleniyor |
| Z9 | Reklamla ödül çarpanı ve P2W liderlik tablosu en sert yorumlara yol açıyor (Idle Slayer, FAPI) | §14 karar #5 (reklamsız, IAP'sız) | Karar doğrulandı |

## 4. Blueprint v5 için öncelik önerisi

1. **A1** (en iyiyi aşma TP'si) ve **Z1** (süre tabanı): simülatör v2'de §11.1 kaldıraçlarıyla birlikte koşulsun. Hedef: farm politikasının avantajını yok etmek ve Büyük Şampiyon'u 25–45 saat penceresine sokmak.
2. **K1:** §12.3'e geç oyun aktif/idle oranı metriği.
3. **A2 + A4:** §5'e seed ve zaman bankası; §6.2 şemasına `offlineSeed` ve `dailyBank` alanları (saveVersion göçü).
4. **A5 + K5:** açılım ve içerik tanımlarını veri tablosuna taşıma (M2–M3 sırasında, sonradan pahalı).
5. **K8:** §9'a rakip adları; mağaza adı kararı.
6. **A6, A10:** MVP sonrası (M8) değerlendirilecek aktif-oyun derinliği seçenekleri.

## 5. Yöntem ve kanıt özeti

| Oyun | Motor / arka uç | REA Evidence | Ek araç (scratchpad, salt-okunur) |
|---|---|---|---|
| Idle Golf demo | Godot 4.6 / GDScript (ikili token) | `inspect_pe_resources` reddedildi (gömülü PCK) | PCK dizin okuyucu, GDSC v101 token okuyucu |
| PegIdle demo | Unity 2021.3.19f1 / Mono | `ev_8f4798ed…`, `ev_6b10e456…`, `ev_dab8112e…` | CIL sabit çözücü |
| Idle Slayer | Unity 6000.3.14f1 / IL2CPP (metadata v39) | `ev_1e16aeab…` | metadata dizge okuyucu |
| FAPI | Unity 2022.3.62f3 / Mono | `ev_a5504a3a…`, `ev_b53669d0…` (bütçe aşımı), `ev_2f31441b…` | ECMA-335 tablo okuyucu, CIL çözücü |
| NGU Idle | Unity 2019.4.22f1 / Mono | `ev_82dfabc5…`, `ev_85171caf…` (bütçe aşımı), `ev_f9b12f58…` | aynı |

- Bu makinede REA native decompiler sağlayıcıları (Ghidra, IDA) yok. Çıkarımlar decompile değil, metadata ve IL operand düzeyindedir.
- Hiçbir kod, veri tablosu, ad veya varlık blueprint'e taşınmadı (§9). Yukarıdaki öneriler genel kalıplardır.
- Steam yorumları: mağaza özeti + topluluk "en faydalı" 10 olumlu ve 10 olumsuz yorum (Idle Slayer, FAPI, NGU). Demoların yorum sayısı yetersiz.
