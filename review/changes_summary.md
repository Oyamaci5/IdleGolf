# Değişiklik Özeti: Plan v1 → v2

**Tarih:** 2026-10-17

**Dosyalar**

| Dosya | Durum |
|---|---|
| `backup/idle_golf_blueprint.original.md` | **[NEW]** v1'in birebir yedeği (SHA-256 `74e5473f…a4e63d`, doğrulandı) |
| `design/idle_golf_blueprint.md` | **Değiştirilmedi** (v1) |
| `design/idle_golf_blueprint_v2.md` | **[NEW]** Yeni sürüm. Tüm değişiklikler `[UPDATED]` / `[NEW]` etiketli |
| `analysis/melvor_reference.md` | **[NEW]** Melvor Idle analizi (Adım 2) |
| `review/plan_review.md` | **[NEW]** v1 incelemesi (Adım 1) |
| `design/economy_simulator_spec.md` | **Değiştirilmedi.** v2 uzantısı plan §12'de tanımlı; spec'in güncellenmesi M0 işi |
| Melvor Idle kurulum klasörü | **Değiştirilmedi.** Yalnızca okundu |

---

## Değişiklik listesi

| # | v2 § | Değişiklik | Neden (inceleme no.) |
|---|---|---|---|
| 1 | Başlık | Sürüm notu, Melvor referansı, Büyük Şampiyon hedefi | Sürüm takibi; A-12 |
| 2 | §1 | "Kedi" yazım hatası düzeltildi; kaddi hızı "seviye başına +0.4/s" diye netleşti | B-6 |
| 3 | §1 | ×1.08 çarpanı "koşu boyunca, sezon sıfırlamada silinir" | B-7 |
| 4 | §1 | Sezon bitirme koşulu: ilk sezon delik 18, sonra ≥ 9 delik | Kurs modeliyle uyum |
| 5 | §1 | Yeni katmanlar: Kurs/Bant, Efsane; yeni birimler PP ve EP; TP harcanmaz | B-10, A-1, A-2 |
| 6 | §2 | Grip zorluğu kurs içinde: `floor(0.75·h) + 4·(c−1)` | B-3 |
| 7 | §2 | Shaft `p_max` (perk ile en fazla 0.75); kaddi görsel tavanı 20/s | Yumuşak tavanlar (A-3) |
| 8 | §2 | Stance için simülatör yaklaşıklığı açıkça yazıldı | B-5 |
| 9 | §2 | Kulüp Evi yükseltme satırı | A-4, B-11 |
| 10 | §3.1 | Kurs ölçekli delik uzunluğu (`× D^(c−1)`) | B-2 (delik 18 sonrası duvar) |
| 11 | §3.1 | Manuel beklenen değere ıska eklendi | B-4 |
| 12 | §3.1 | `M_meta` zinciri (TP, EP, yıldız, eşik, kart, başarım) | Tüm çarpanlar tek yerde |
| 13 | §3.1 | `M_TP` doğrusaldan kare yasasına: `(1+TP_eff/10)^2` + yumuşak tavan | B-1, B-2 |
| 14 | §3.1 | Toplu alım ve maks-alım kapalı formülleri | Büyük sayılarda hassasiyet |
| 15 | §3.2–3.3 | Simülasyon tablosu "doğrulandı" notu; geçerlilik kapsamı; %30 aktif koşusunun yapılmadığı | B-9, B-13 |
| 16 | §3.4 | Konsolide ekonomi tablosu: başlangıç, maliyet büyümesi, perk'ler, prestij parametreleri (tümü TBT) | A-4, B-14 (1 ücretsiz kaddi) |
| 17 | §4-B | Par tanımı (putt denemesi, 1/2/3★), en iyi sonuç saklanır, kurs yıldız eşikleri | B-8 |
| 18 | §4-A/C | Rüzgâr Sonsuz Tur modifiyesine, kartlar Meydan Okuma'ya bağlandı | A-11 |
| 19 | §5 | Çevrimdışı: 60 s alt sınır, adımlı simülasyon, otomatik alım kuralı, saat geri/ileri kuralı, mutlak tavan 18 saat | A-7, B-15, B-16 |
| 20 | §6.1 | `Num` sarmalayıcısı; Melvor yığını notu | A-3, B-17 |
| 21 | §6.2 | Kayıt şeması v2, göç zinciri, daha yeni kayıt reddi, checksum, atomik yazım, dışa aktarım, 30 s otomatik kayıt | A-6 |
| 22 | §7 | MVP: "Ön Eleme Tamamlandı" sonu, yerel telemetri, şema v1 | B-12, A-9 |
| 23 | §8 | M9–M12 eklendi; M0/M2/M4/M6/M7/M8 güncellendi | Yeni kapsam |
| 24 | §9 | Melvor için kopyalanmaması gerekenler | A-12 |
| 25 | §10 | Referans oyunlardan tasarım dersleri özeti | Adım 2 bağlantısı |
| 26 | §11 | **Endgame:** 4 kurs, Büyük Şampiyon sonu, Efsane katmanı ve formülü, Sonsuz Tur bantları ve açılma kuralı, yumuşak tavanlar, geç oyun hedefleri, büyük sayı planı | Zorunlu gereksinim (A-1, A-3, A-11) |
| 27 | §12 | Simülatör v2 spesifikasyonu, 3 oyuncu profili, metrik ve kabul pencereleri, telemetri, prototip notu | A-5, A-9 |
| 28 | §13 | UI akışı | A-8 |
| 29 | §14 | Para kazanma önerisi | A-10 |
| 30 | §15 | Açık kararlar listesi | Adım 4 |

---

## Bu revizyonda yapılan doğrulamalar

- v1 simülatörü bağımsız koşuldu. §3.3 tablosu birebir tuttu.
- Çok-sezonlu prototip iki yapısal sorun buldu:
  1. Mevcut TP formülüyle optimal oyun her sezonu 18. delikte bitirmek. Sezon süresi 4–6 dakikaya iniyor.
  2. Tek merdivenli delik eğrisi 18'den sonra duvara çarpıyor.
- Kurs modeli (`D = 1000`, kare yasası, yumuşak tavan 1e5/0.85) Kurs 4'e 13.7 saatte ulaştı. Bu hedeften hızlı.
- Kurs 8–9 civarında yumuşak tavan duvarı oluşuyor; Efsane katmanı bunun için.
- Prototip kodu yalnızca scratchpad'de (proje klasörüne eklenmedi). İsterseniz `tools/` altına taşıyabilirim.

---

## Kararınızı gerektirenler (öncelik sırasıyla)

1. ~~**Büyük Şampiyon hedef süresi.**~~ **KARAR (2026-10-17): karma profilde 25–45 saat.**
   - Uygulama: `M_TP` üssü 2 → 1.8.
   - Prototip (aktif): Kurs 2 9.1 sa, Kurs 3 15.6 sa, Kurs 4 24.7 sa.
   - `D = 3000` alternatifi, Kurs 1→2 arasında 12.6 saatlik duvar yarattığı için reddedildi.
   - Yeni risk: Kurs 4→5 arası 18.7 saat. Efsane katmanı simülatörde modellenince ölçülecek.
   - v2 §3.1, §3.4, §11.1, §11.2, §12.3, §15 güncellendi.
2. ~~**Çevrimdışı verimi.**~~ **KARAR (2026-10-17): %60 sabit.** v1 ile aynı; v2 §5 ve §15'e işlendi. Simülasyon varsayımları değişmedi.
3. ~~**Efsane'de açık kurslar sıfırlansın mı?**~~ **KARAR (2026-10-17): Evet, Kurs 1'e dönülür.** Yıldızlar ve Otomatik Alım korunur. v2 §11.2 ve §15'e işlendi.
4. ~~**`BigNum` ne zaman?**~~ **KARAR (2026-10-17): M10'da.** MVP'de `double` kullanılır ama `Num` sarmalayıcısı zorunlu. v2 §11.6 ve §15'e işlendi.
5. ~~**Para kazanma modeli.**~~ **KARAR (2026-10-17): Tek seferlik ücretli**; reklam yok, IAP yok. Yalnızca kozmetik DLC daha sonra eklenebilir. v2 §14 ve §15'e işlendi.
6. ~~**Sezon alt sınırı.**~~ **KARAR (2026-10-17): Her zaman 18 delik.**
   - Eklenenler: kilitlenmeye karşı TP vermeyen **"Sezondan Çekil"**, ve kurs seçiminde tahmini bitiş süresi gösteren **kurs tahmincisi**. v2 §1, §11.2, §12.1, §13 ve §15'e işlendi.
   - **Yan etki:** Karar #1 için bulunan ayar (üs 1.8 → Kurs 4'e 24.7 sa) geçersiz oldu. Yeni kuralla oyuncu önceki kursu kısa sezonlarla farm ediyor; Kurs 4'e 10.5–14.4 saatte ulaşılıyor. Üs (1.5–2.0) ve `D` (1000–10 000) bunu değiştirmedi.
   - Hedef (25–45 sa) korunuyor. Ayar simülatör v2'ye kaldı: TP/saat'e göre kurs seçen politika ve sezon ek yükü modellenecek. Ardından kaldıraçlar denenecek: sezon süresi tabanı, tekrar oynanan kurslarda azalan TP, `D` ve üs. Ayrıntı v2 §11.1.
7. ~~**Meydan okumalar v1.0 için zorunlu mu?**~~ **KARAR (2026-10-17): Zorunlu, 8 kart** (M11). v2 §11.5'e işlendi.

**Durum:** Tüm kararlar verildi. Açık kalan tek iş, karar #6 sonrası Büyük Şampiyon süresinin hedefe (25–45 sa) çekilmesi. Bu iş simülatör v2'ye bağlı (v2 §11.1, §12).
