# Plan İncelemesi: `design/idle_golf_blueprint.md` (orijinal)

> İncelenen dosya: `design/idle_golf_blueprint.md`, 235 satır, SHA-256 `74e5473f…a4e63d`.
> Yedeği: `backup/idle_golf_blueprint.original.md` (birebir aynı, doğrulandı).
> Satır numaraları orijinal dosyaya göre verildi (`L22` = 22. satır).
>
> **Doğrulama.** `economy_simulator_spec.md` §6'daki kod scratchpad'de aynen çalıştırıldı.
> - §3.3 tablosundaki tüm delik süreleri **birebir aynı** çıktı (aktif 1:46:40, idle 3:16:52).
> - Ek olarak, plana uzantı önerirken çok-sezonlu bir prototip koşuldu. Bulguları §B-1 ve §B-2'de.

---

## A. Eksik bölümler

| # | Eksik | Neden önemli? | v2'deki yeri |
|---|---|---|---|
| A-1 | **Endgame ve sonsuz ilerleme.** Delik 18 ve tek sezondan sonrası tanımsız. Bir "son" yok. MVP 9 delikle bitiyor, dolayısıyla MVP'de bir hedef yok | Zorunlu gereksinim. İlk tam koşudan sonra oyuncuyu tutacak bir şey yok | §11 [NEW] |
| A-2 | **Prestij ödül ve etki modeli.** TP'nin harcanıp harcanmadığı, perk ağacı, sezon sıfırlama kapsamı (ne kalır, ne gider) tanımlı değil | Prestij döngüsü dengelenemez | §11.2 [NEW] |
| A-3 | **Yumuşak tavanlar ve büyük sayı planı.** Yalnızca "K, M, B, T, aa…" var (L197). Eşikler, hassasiyet sınırı ve 1e308 sonrası yok | Sonsuz ilerleme için gerekli | §11.4, §11.6 [NEW] |
| A-4 | **Konsolide ekonomi tablosu.** Kulüp Evi'nin maliyeti yok (L46, L157). Başlangıç kaynakları (0 yarda mı, 1 kaddi mi?) yalnızca simülatörde örtük | Simülatör ile oyun ayrışır | §3.4 [NEW] |
| A-5 | **Dengeleme planı.** Simülatör yalnızca 18 deliği ölçüyor. Prestij sonrası, bant süreleri, saatlik yükseltme sayısı ve "ölü süre" metriği yok | İstenen metrikler ölçülemiyor | §12 [NEW] |
| A-6 | **Kayıt şeması ve sürümleme.** Yalnızca "`saveVersion` alanı ile göç" var (L183). Alanlar, göç zinciri, bozuk kayıt ve daha yeni kayıt davranışı yok | Güncelleme sonrası kayıt kaybı riski | §6.2 [NEW] |
| A-7 | **Çevrimdışı ayrıntıları.** Otomatik satın alma çevrimdışında çalışıyor mu? Minimum süre? İleri alınmış saat? Hesaplama yöntemi (tek formül mü, adımlı mı)? | Delik çevrimdışında tamamlanınca gelir değişir; tek çarpma yanlış sonuç verir | §5 [UPDATED] |
| A-8 | **UI akışı.** Ekranlar, geçişler ve modallar tanımsız | Uygulama sırasında belirsizlik | §13 [NEW] |
| A-9 | **Telemetri.** Gerçek oyuncu sürelerini simülasyonla karşılaştırmak için ne kaydedileceği tanımsız (M6 bunu istiyor, L214) | M6'nın ölçütü ölçülemez | §12.4 [NEW] |
| A-10 | **Para kazanma modeli.** Yalnızca "reklam yerine günlük ücretsiz buton" (L165) var. Model kararı yok | Kapsamı ve dengeyi etkiliyor | §14 [NEW] (karar sizde) |
| A-11 | **Geç oyun hedefleri.** Başarımlar MVP dışı (L200); meydan okuma ve liderlik tablosu hiç yok | İlk koşudan sonra tutunma | §11.5 [NEW] |
| A-12 | **Melvor referansı.** Belge yalnızca Scritchy Scratchy analizine atıf yapıyor (L7, L146, L178, L223) | Yeni referans oyun eklendi | Başlık notu ve §9 [UPDATED] |

---

## B. Yanlış, belirsiz veya çelişkili kısımlar

| # | Yer | Sorun | Tür | Öneri / v2 |
|---|---|---|---|---|
| B-1 | §3.1 L63–64, §1 L25 | **TP formülü prestijde "her zaman 18'de sıfırla" stratejisini optimal yapıyor.** `TP = floor(sqrt(yarda/1e8))` ile bir delik daha oynamak TP'yi yalnızca ×√2.3 ≈ ×1.52 artırıyor, ama süreyi ~%65 uzatıyor (17→18 adımı 42 dk). Prototip: 40 sezon boyunca bakış-ileri (lookahead) politika daima 18. delikte sıfırladı. Sezon süresi 1.78 saatten 0.10 saate düşüyor. Oyuncu hiç derine inmiyor | **Yanlış** (tasarım hedefiyle çelişiyor) | §11.2: TP kurs katsayısıyla ölçeklenir; derinlik kurslarla ödüllenir |
| B-2 | §3.1 L62, §2 L40–45 | **Delik eğrisi 18'den sonra duvara çarpıyor.** Delik uzunluğu ×2.3/delik büyüyor. Koşu içi gelir ise yalnızca ×1.08/delik (üstel) ve doğrusal etkiler × üstel maliyet (≈ log(yarda)) ile artıyor. Prototipte TP çarpanı ×24 iken bile 30 saatlik sezonlar delik 29–43'te takıldı. Tek bir sürekli delik merdiveni 72 deliğe uzatılamaz | **Yanlış** (endgame için) | §11.1: her kurs 18 delik, kendi eğrisi × `D^(kurs−1)` |
| B-3 | §2 L42, §3.2 L75 | Grip `maks = 40`, ama `zorluk = floor(0.75·delik)` delik 54'te 40'a ulaşıyor. Sonrasında lie kalıcı olarak düşer. Tek kurs (18 delik) için sorun yok; uzatma için var | Çelişki (gelecek için) | §11.1: zorluk kurs içinde hesaplanır (`delik_kurs`), üst sınır sorunu kalkar |
| B-4 | §1 L22 vs §3.1 L58–60 ve spec §1 | Manuel vuruş "Iska ×0.5, İyi ×1, Mükemmel ×2.5" diye tanımlı, ama formülde ve simülatörde **ıska yok**. Simülatör mükemmel olmayan her vuruşu ×1 sayıyor; manuel geliri biraz şişiriyor | Çelişki | §3.1: beklenen değer `0.5·p_ıska + 1·p_iyi + 2.5·p_mük`; varsayılan oranlar §3.4'te |
| B-5 | §2 L45 vs spec §1 L16 | Duruş (Stance): plan "art arda mükemmel başına +%5, tavan 1+0.15·L, 3 s'de sıfırlanır" diyor. Simülatör `1 + 0.15·L·p` kullanıyor, yani +%5 birikimi değil "tavan × p". İkisi farklı sayılar üretir | Çelişki | §3.1: simülatördeki yaklaşık modelin hangi kural için geçerli olduğu yazıldı; Monte Carlo ile doğrulanacak |
| B-6 | §1 L22 | "Kedi/kaddi'ler (Caddy)": "Kedi" yazım hatası. Ayrıca "saniyede 0.4 vuruş" kaddi başına mı, seviye başına mı belirsiz. Formül `0.4·L` diyor | Belirsiz | §1: "her Kaddi seviyesi +0.4 otomatik vuruş/s" |
| B-7 | §1 L24 | "bu koşu için kalıcı ×1.08 çarpan": "kalıcı" ile "bu koşu için" çelişkili okunuyor | Belirsiz | "koşu boyunca geçerli, sezon sıfırlamada silinir" |
| B-8 | §1 L24, §4-B L128–129 | **Par tanımı yok.** "Par içinde bitirirse 1–3 yıldız" deniyor ama putt mini oyununda par neye göre ölçülüyor (vuruş sayısı, süre)? 1, 2 ve 3 yıldızın ölçütü yok | Belirsiz | §4-B: par = putt denemesi sayısı; ★ eşikleri tanımlandı |
| B-9 | §4-B L129 vs §3.3 | "Her ★ o deliğin mesafesine +%3", ama simülasyon yıldızları modellemiyor ve §3.2 "simülatörle ayarlandı" diyor. 2. sezondan itibaren süreler kısalır; tablo yalnızca 1. sezon için geçerli | Belirsiz | §3.3 notu; §12 yıldızları modelliyor |
| B-10 | §3.1 L64 | "TP etkisi +%5/TP (kalıcı) **ve** perk ağacında harcanabilir": TP harcanınca %5 bonus gidiyor mu? İkisi aynı anda mümkün değil | Çelişki | §11.2: **toplam kazanılan** TP bonusu verir (harcanmaz). Perk'ler ayrı bir puanla alınır: her sezon kazanılan TP kadar (1:1) "Perk Puanı" (PP) |
| B-11 | §1 L46 vs §7 L191 | "Delik 12: Kulüp Evi (çevrimdışı tavanı)" ama MVP 9 delik. MVP'de Kulüp Evi hiç açılmıyor; bu yüzden MVP çevrimdışı tavanı sabit 4 saat. Tutarlı ama örtük; ayrıca Kulüp Evi maliyeti yok | Belirsiz | §3.4: Kulüp Evi satırı; §7'de not |
| B-12 | §7 L191 + L200 | MVP'de sezon ve prestij yok, 9 delik var. Delik 9'dan sonra oyuncunun ne yapacağı tanımsız; MVP "bitiş ekranı" yok | Eksik | §7: MVP sonu = "Ön Eleme Tamamlandı" kilometre taşı ekranı ve 9 delik yıldız avı |
| B-13 | §3.3 L107 | `manual_swings_per_s = 0.25` (%30 aktif) ile yeniden koşu **önerilmiş ama yapılmamış**. Kabul ölçütleri hâlâ 0.8 vuruş/s varsayımına dayanıyor | Açık iş | §12: üç oyuncu profili (aktif 0.8 / karma 0.25 / idle 0) zorunlu |
| B-14 | spec §1 L22 vs plan | Simülatörde idle mod **1 kaddi ile başlıyor**, aktif mod 0 ile. Planda başlangıç kaddisi yok | Çelişki | §3.4: her iki mod 1 ücretsiz kaddi ile başlar (yeniden koşu gerekli) |
| B-15 | §5 L156 | Çevrimdışı gelir `gelir_otomatik/s × Δt × 0.6` tek çarpma ama L158 "delik tamamlama çevrimdışında olabilir" diyor. Delik tamamlanınca ×1.08 ve lie değişir; tek çarpma tutarsız. Otomatik alım da belirsiz | Çelişki | §5: adımlı çevrimdışı simülasyonu (Melvor'un tick tekrarı kalıbının kaba hali) |
| B-16 | §5 L155 | Yalnızca negatif saat korunuyor. İleri alınmış saat (ör. +12 saat) tavana kadar ödül verir; bu tek oyunculu oyunda kabul edilebilir ama yazılmalı | Belirsiz | §5: bilinçli karar olarak yazıldı |
| B-17 | §6 L178 | "Analiz edilen oyun da bu yığınla yapılmış (Unity 6)": artık iki referans var. Melvor NW.js + JS kullanıyor | Güncel değil | §6 notu |
| B-18 | spec §7 | "final levels" satırları spec'teki sayılarla eşleşmiyor (ör. aktif head 96 diyor; 2.5 saatlik koşuda 90). Değerler `--hours`'a bağlı; spec hangi süreyle koşulduğunu yazmıyor | Küçük | Spec'e not (bu turda spec değiştirilmedi) |
| B-19 | §0 L3 | Başlık "Faz 4". Sürüm numarası ve değişiklik günlüğü yok | Küçük | v2 başlığı ve değişiklik notu |

---

## C. İyi olan ve kalması gerekenler

1. **Altı farklı matematiksel eksen** (§2): toplamsal, olasılık, göreli kademe, kademeli çarpan, hız ve yalnızca-manuel. Düz çarpan yığınından kaçınmak doğru karar.
2. **Göreli kademe (Grip ve zorluk).** Melvor'daki "içerikle kayan hedef" kalıbıyla da uyumlu. Kurs bazlı uzatmada daha da işe yarıyor.
3. **Simülatör önce yaklaşımı ve kabul pencereleri.** Sonuçlar bağımsız koşuda birebir doğrulandı.
4. **Aktif/idle oranı ~1.85×.** Aktif oyunu ödüllendiriyor ama zorunlu kılmıyor.
5. **Kilometre taşı açılımları.** Sistemlerin sırayla gelmesi (Delik 3, 6, 9, 12, 18) menü yükünü azaltıyor.
6. **B seçeneği** (delik + Par/Yıldız) ve A/C'nin sonraya bırakılması. C (Sezon kartları) endgame'de meydan okuma katmanı olarak çok iyi bir yere oturuyor.
7. **Çevrimdışı tavan, `clamp` ve "Siz yokken" özeti.**
8. **`run`/`meta` ayrımı** ve dönen yedekler.
9. **§9 kopyalanmaması gerekenler listesi.** Genişletilerek kalmalı.
10. **Kilometre taşı tablosu** (§8) ve ölçülebilir "bitti" ölçütleri.

---

## D. Doğrulama kaydı (scratchpad, oyun klasörü dışı)

| Koşu | Sonuç |
|---|---|
| `idle_golf_sim.py --mode active --hours 2.5` | Delik 1/9/18: 0:10 / 3:49 / 1:46:40 (plan ile aynı) |
| `idle_golf_sim.py --mode idle --hours 4` | Delik 1/9/18: 1:15 / 10:01 / 3:16:52 (plan ile aynı) |
| Çok-sezonlu prototip, mevcut TP formülü, lookahead politika | 40 sezonun tamamı 18. delikte bitti; sezon süresi 1.78 saatten 0.10 saate indi (B-1) |
| Tek merdiven, derinlik çarpanı ×1.5/delik | TP 1e11'e patladı, sezonlar 30 saat sürdü, delik 43'te takıldı (B-2) |
| Kurs modeli D=1000, `(1+TP/10)^2`, yumuşak tavan yok | Kurs 4'e 13.7 saatte ulaşıldı, sonra kaçak büyüme: kurs başına ~26 dk, çarpan 25 saatte 1e69 |
| Kurs modeli, yumuşak tavan (1e5, 0.85) | Kurs 4 13.7 sa, kurs 7 37.8 sa, kurs 9 164.5 sa. Kurs 8–9'da 60–100 dk'lık "ölü" delik aralıkları var; 2. katman gerekli |

Bu prototipler **tasarım keşfi** içindir. Sayılar v2'de "test edilecek varsayım" olarak işaretlendi.
