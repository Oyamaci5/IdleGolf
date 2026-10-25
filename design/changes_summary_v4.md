# Değişiklik Özeti: Plan v3 → v4

**Tarih:** 2026-10-24

**Dosyalar**

| Dosya | Durum |
|---|---|
| `design/idle_golf_blueprint_v3.md` | **Değiştirilmedi** |
| `design/idle_golf_blueprint_v4.md` | **[NEW]** v3'ün üstüne ekleme ve düzeltmeler. Değişiklikler `[v4]` etiketli |
| `analysis/idle_golf_competitor_rea_plan.md` | **[NEW]** Rakip "Idle Golf" (Steam) için REA analiz planı |

---

## Bu revizyonu doğuran geri bildirim

Açılış simülasyonu oynandıktan sonra şu sorunlar tespit edildi:

1. Delik geçmenin hissedilir bir ödülü yok.
2. Delikler ilerledikçe elle vuruşun anlamı azalıyor (gelir payı başta ~%95, 18. delikte Duruş ile ~%40, Duruş olmadan < %20).
3. Kariyerde anlamlı bir şans yok; ekonomi beklenen değerle ilerliyor.
4. Günlük kısa bir oturumda (~15 dk) yapılacak iş az; oyun "sadece ilerliyor".
5. Yükseltme çeşitliliği uzun vade için az; araştırma ağacı yok.
6. "Kaddi" metaforu gerçek golfle çelişiyor (kaddi vurmaz).

Ek bulgu (web araştırması): Steam'de "Idle Golf" adlı doğrudan bir rakip var (Jesse Pletcher, 2026): otomatik vuruş, top açma, koşuyu emekliye ayırıp madalya kazanma. Çalışma adı "Par Fabrikası" korunmalı; farklılaşma delik/kurs yapısı, turnuva ve §17 sistemleriyle sağlanır.

## Kararlar

| # | Karar |
|---|---|
| 12 | Delik çantası + ekipman koleksiyonu |
| 13 | Ölçeklenen elle vuruş + aktif yetenekler (Power Drive) |
| 14 | İki katmanlı araştırma (sezon + kalıcı akademi) |
| 15 | Rastgele anlar + günlük delik ve görevler |
| 16 | Otomatik vurucu sayısı 10'a kadar; yuvalar araştırmayla açılır |

## Değişiklik listesi

| # | v4 § | Değişiklik |
|---|---|---|
| 1 | Başlık | v4 sürüm notu |
| 2 | §1 | Çekirdek döngüye "Gün" katmanı; yeni birim Bilgi |
| 3 | §2 | Kaddi satırı → otomatik vurucular (§17.5) |
| 4 | §3.1 | `M_meta`'ya `M_ekipman × M_akademi`; koşu içi `M_antrenman`; elle vuruş alt sınırı ve vurucu toplamı için §17'ye atıf |
| 5 | §7 | MVP'ye Power Drive, τ_man, basit çanta ve altın top |
| 6 | §8 | M7b (akademi ve vurucular), M7c (ekipman ve günlük) |
| 7 | §13 | UI: Akademi, Ekipman, Günlük menüleri; çanta animasyonu |
| 8 | §15 | Karar 12–16; açık kararlar V1–V4 |
| 9 | §17 | **[NEW]** Etkileşim ve meta sistemleri: çanta, ekipman, elle vuruş ve yetenekler, araştırma, vurucular, rastgele anlar, günlük, ekonomi etkisi ve yeni kabul pencereleri, UI, telemetri |

## Açık işler

- V1–V4 isim ve katkı kararları (§15).
- Simülatör v2: §17 sistemleri eklenip Büyük Şampiyon (25–45 sa) ve §17.8 pencereleri yeniden ayarlanacak. **Yeni sistemler v3'teki tüm süre tahminlerini geçersiz kılar.**
- T4 nişan varyantı (M12a prototipi).
- Rakip analizi (REA planı).
