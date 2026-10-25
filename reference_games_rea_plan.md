# Referans Oyun Analiz Planı (REA)

**Tarih:** 2026-10-24
**Bağlı belgeler:** `design/idle_golf_blueprint_v4.md` (§16, §17), `analysis/idle_golf_competitor_rea_plan.md` (rakip için ayrıntılı plan)

Her oyun, blueprint'teki belirli bir açığı kapatmak için seçildi. Analiz sırası önceliğe göredir.

---

## 0. Ortak kurallar

- Yalnızca yasal olarak sahip olunan veya ücretsiz indirilen kopyalar, **salt-okunur** incelenir. Dosya değiştirme, yama, kopyalama, dağıtım yok.
- Koruma, şifreleme veya anti-hile mekanizmaları **aşılmaz**. Böyle bir şeyle karşılaşılırsa o kısım atlanır ve oyun gözlemiyle devam edilir. Ücretsiz oyunların kullanım koşulları ayrıca okunur.
- Çıkarılan şey **genel tasarım kalıbıdır**. İsim, varlık, kod, veri tablosu ve sabitler alınmaz (blueprint §9).
- Bulgular **confirmed / likely / hypothesis** olarak işaretlenir (`analysis/tech_stack.md` formatı).

## 1. Kurulum listesi ve öncelik

| Öncelik | Oyun | Platform ve edinim | Kapattığı açık |
|---|---|---|---|
| 1 | **Idle Golf** (Jesse Pletcher) | Steam (fiyatı mağazadan kontrol et) | Doğrudan rakip; farklılaşma matrisi |
| 2 | **PegIdle** | Steam, ücretli; **önce demo** yeterli olabilir | Nişan + fizik + şans + idle (§16.4, §17.6) |
| 3 | **Idle Slayer** | Steam, ücretsiz | Rastgele kutular, bonus mini oyun, aktif/idle dengesi (§17.3, §17.6) |
| 4 | **PlinkIdle** | Steam'de demo; tam sürüm itch.io'da erken erişim | Şanslı buff ve düşüşler, elle/pasif dengesi (§17.1, §17.3) |
| 5 | **Farmer Against Potatoes Idle** | Steam, ücretsiz | Çok sistemli hibrit; sistem açılım temposu (§17 geneli) |
| 6 | **NGU Idle** | Steam, ücretsiz | Paralel sistemler ve uzun vade (§11, §17.4) |
| – | **Egg, Inc.** | Mobil (yalnızca gözlem) | İki katmanlı araştırma, süreli co-op kontratlar (§17.4, §16) |
| – | **Golf Clash** | Mobil (yalnızca gözlem) | Top koleksiyonu, rüzgâr, online turnuvada şans/beceri (§16, §17.2) |
| – | **Idle Golf Tycoon** | Mobil (yalnızca gözlem) | Golf temalı idle'ın tema dili ve otomasyon sunumu |

Mobil oyunlar REA ile değil, oynanış gözlemi ve mağaza sayfasıyla incelenir. İlk tur için **1–3** yeterli; 4–6 ikinci tur.

## 2. Oyun başına odak soruları

### 2.1 Idle Golf (rakip)
Ayrıntılı plan: `analysis/idle_golf_competitor_rea_plan.md`.

### 2.2 PegIdle
1. Nişan ve fizik: oyuncu tam olarak neyi kontrol ediyor (açı, güç, zamanlama)?
2. Otomatik top bırakma ile elle atış arasındaki değer oranı, oyun ilerledikçe nasıl değişiyor?
3. Şans nerede: fizik saçılması mı, rastgele altın hedefler mi, düşüşler mi?
4. Top çeşitleri ve top yükseltmeleri nasıl yapılandırılmış (yalnızca yapı)?
5. Fizik deterministik mi (seed'li tekrar mümkün mü)?

### 2.3 Idle Slayer
1. Rastgele kutuların çıkma aralığı ve olay türleri; sonuç dağılımının yapısı.
2. Bonus bölümün (mini oyun) ekonomideki payı ve oyuncu becerisinin etkisi.
3. Elle oyun ile idle arasındaki oran: oyunun geç safhasında ne kadarı aktif oyundan geliyor? (Steam topluluğundaki "ilerleme şansa bağımlı" şikâyetini doğrulamak.)
4. Görevler (quest), başarımlar ve günlük içerik yapısı.
5. Prestige katmanları ve kalıcı yükseltme ağacının biçimi.

### 2.4 PlinkIdle
1. Elle bırakmanın pasiften neden çok daha hızlı ölçeklendiği (bizdeki sorunun tersi): hangi formül veya yükseltme bunu yaratıyor?
2. "Şanslı buff ve düşüş" sisteminin yapısı; efsanevi topun jackpot etkisi.
3. Prestige ve aşama yapısı.

### 2.5 Farmer Against Potatoes Idle
1. Kaç ayrı sistem var ve hangi sırayla, ne zaman açılıyor? (İlk 1, 5, 20 saat)
2. Günlük/zamanlayıcılı içerik var mı?
3. Ekipman veya koleksiyon katmanı nasıl kurulmuş?

### 2.6 NGU Idle
1. Paralel sistemlerin birbirini besleme biçimi (ör. bir sistemin çıktısı diğerinin girdisi).
2. Uzun vadeli hedefler ve oyunun saat ölçeğinde tempo yapısı.
3. Zamanlayıcılı veya kuyruklu sistemler.

## 3. Yöntem (her oyun için)

1. REA ile PE/kaynak incelemesi ve motor tespiti (`tech_stack.md` §2–§5'teki gibi).
2. Motora göre veri dosyalarının **yapısını** çıkar (alan adları, eğri türleri). Sayılar yalnızca biçim olarak özetlenir.
3. İlk 30–60 dakikayı oyna ve sistem açılım zaman çizelgesini çıkar.
4. Steam yorumlarında en sık övgü ve şikâyeti not et.

## 4. Çıktılar

- Oyun başına: `analysis/<oyun>_reference.md`. Bölümler: teknoloji yığını (kısa), odak sorularının cevapları, açılım zaman çizelgesi, öğrenilecek kalıplar, kaçınılacak hatalar.
- Sonunda tek bir sentez: `analysis/reference_synthesis.md`. Her bulgu blueprint'te bir bölüme bağlanır ve şu üç sınıftan birine girer:
  - **Al (kalıp olarak):** blueprint'e eklenecek öneri
  - **Kaçın:** blueprint'e risk notu
  - **Zaten var:** blueprint'te karşılığı var, doğrulama notu
- Blueprint v5, bu sentezden ve simülatör v2 sonuçlarından çıkar.
