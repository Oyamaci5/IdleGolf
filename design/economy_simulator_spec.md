# Idle Golf: Ekonomi Simülatörü Spesifikasyonu

**Amaç:** Oyun yazılmadan önce maliyet ve gelir sayılarını ayarlamak. Her kilometre taşına (delik 1…18 ve ilk sezon) **ne kadar sürede** ulaşılacağını tahmin etmek. Aktif ve idle oyun arasındaki farkı ölçmek.

**Bağlı belge:** `design/idle_golf_blueprint.md` §2–§3. Formüller ve başlangıç sayıları birebir aynı.

---

## 1. Model

| Öğe | Tanım |
|---|---|
| Zaman adımı | 1 s, deterministik **beklenen değer** modeli (rastgelelik yok) |
| Durum | `head, shaft, grip, ball, caddy, stance` seviyeleri; `hole` (şu anki delik); `yards` (harcanabilir); `run_yards` (bu delik için birikmiş) |
| Gelir/s | `0.4·caddy · mesafe(otomatik) + manuel_vuruş/s · mesafe(manuel)`; idle modda manuel = 0 |
| Mesafe | `(5+2·head) × lie × top × 1.08^(delik−1) × (1+p·1.5) × [manuel: (1+0.15·stance·p_manuel) × 12]` |
| Lie (Grip) | `tablo[clamp(grip − floor(0.75·delik), −2, 2) + 2]`, tablo `[0.35, 0.6, 1.0, 1.35, 1.7]` |
| Top | `(1 + 0.08·ball) × 1.5^floor(ball/10)` |
| Delik | `run_yards ≥ 8000 × 2.3^(n−1)` olunca delik tamamlanır; artan yarda sonraki deliğe aktarılır |
| Satın alma politikası | **Greedy:** her adımda alınabilecek yükseltmeler arasından `Δgelir / fiyat` oranı en yüksek olan alınır; para bitene kadar tekrarlanır |
| Kilitler | Stance delik 3'ten, Ball delik 6'dan sonra alınabilir. Idle modda Stance hiç alınmaz |
| Mod farkı | `active`: 0.8 manuel vuruş/s, %40 mükemmel. `idle`: 1 kaddi ile başlar, manuel yok |

**Bilinen sadeleştirmeler** (ayar yaparken akılda tutun):

1. Seri (Stance), beklenen değer olarak `1 + 0.15·L·p` ile yaklaşıklanıyor. Gerçek seri birikip sıfırlandığı için daha "dalgalı".
2. Putt, yıldız, rüzgâr ve çevrimdışı modellenmedi. Uzantılar §5'te.
3. Greedy politika gerçek oyuncudan biraz daha verimli. Gerçek süreler muhtemelen %10–30 daha uzun çıkar (hypothesis).

## 2. Girdiler (`CONFIG`)

| Anahtar | Anlamı | Başlangıç değeri |
|---|---|---|
| `head/shaft/grip/ball/caddy/stance` | `base`, `growth`, `max` | Planın §3.2 tablosu |
| `manual_swings_per_s` | Aktif oyuncunun vuruş hızı | 0.8 |
| `manual_perfect_rate` | Oyuncu becerisi | 0.40 |
| `perfect_mult` | Mükemmel vuruş çarpanı | 2.5 |
| `manual_power` | Manuel vuruşun otomatik vuruşa oranı | 12 |
| `lie_table` | Zemin katman çarpanları | `[0.35, 0.6, 1.0, 1.35, 1.7]` |
| `hole_base_len`, `hole_len_growth` | Delik uzunluğu | 8000, 2.3 |
| `hole_mult` | Delik başına koşu çarpanı | 1.08 |
| `hole_difficulty_step` | Grip zorluk artışı | 0.75 |
| `unlock_hole` | Kategori kilitleri | `{stance: 3, ball: 6}` |

## 3. Çıktılar

- Konsola her deliğin tamamlanma zamanı yazılır (`hole N cleared at HhMMmSSs`). Delik 18'de "Season reset available" işareti çıkar.
- Sonda yükseltme seviyeleri yazılır.
- `--csv out.csv` verilirse dakikada bir `t, hole, income` satırı yazılır. Bu dosya gelir eğrisini çizmek için kullanılır.

## 4. Kabul ölçütleri (hedef pencereler)

| Kilometre taşı | Aktif hedef | Idle hedef | Mevcut sonuç (aktif / idle) |
|---|---|---|---|
| Delik 1 | 5–30 s | ≤ 90 s | 0:10 / 1:15 ✔ |
| Delik 9 | 3–10 dk | 8–20 dk | 3:49 / 10:01 ✔ |
| Delik 18 (sezon) | 1.5–2.5 sa | 2.5–4 sa | 1:46:40 / 3:16:52 ✔ |
| Aktif/idle hız oranı | 1.5×–3× | – | ≈ 1.85× ✔ |
| Ardışık delik süre oranı (12→18) | ≤ 2.2× | ≤ 2.2× | ≈ 1.1–2.0× ✔ (17→18 en dik: ~1.95×) |

**Ayar kuralları:**
- Bir değeri değiştirdikten sonra iki modu da koşun.
- Tablo dışına çıkan ilk satırı düzeltin.
- **Hızlandırmak için:** `hole_len_growth` değerini 0.05 düşürün ya da `hole_mult` değerini 0.02 artırın.
- **Yavaşlatmak için:** tersini yapın.
- **Aktif oyunu daha anlamlı yapmak için:** `manual_power` değerini artırın.

## 5. Uzantılar (MVP sonrası)

```python
# Çevrimdışı: Δt saniye boyunca yalnızca otomatik gelir, %60 verim, tavan ile
def offline(s, dt, cap_h=4):
    dt = max(0, min(dt, cap_h * 3600))
    auto = 0.4 * s["caddy"] * distance_per_swing(s, False)
    return auto * dt * 0.6

# Sezon: delik 18 sonrası TP
def season_points(total_run_yards):
    return math.floor(math.sqrt(total_run_yards / 1e8))   # 18. delikte ≈ 14 TP
# TP etkisi: distance_per_swing(...) sonucunu (1 + 0.05*TP) ile çarpın,
# sonra simulate()'i sıfır seviyelerle yeniden başlatın ve 2. sezonun sürelerini karşılaştırın.

# Monte Carlo: vuruş kalitesini random.random() < p ile örnekleyin,
# 200 koşu yapın, delik sürelerinin P10/P50/P90 değerlerini raporlayın.
```

## 6. Kod

Yalnızca Python 3 standart kütüphanesi kullanılıyor. Dosyayı `tools/idle_golf_sim.py` olarak kaydedin. Kullanım:

```
python tools/idle_golf_sim.py --mode active --hours 4
python tools/idle_golf_sim.py --mode idle   --hours 4 --csv idle.csv
```

```python
"""Idle Golf economy simulator (expected-value, deterministic).

Usage:  python idle_golf_sim.py [--mode active|idle] [--hours 6] [--csv out.csv]
Only the standard library is used. All tunable numbers live in CONFIG.
"""
import argparse, math

CONFIG = {
    # upgrade: base cost, growth per level, max level
    "head":   {"base": 10,   "growth": 1.24, "max": 300},   # +2 yd base distance per level
    "shaft":  {"base": 60,   "growth": 1.28, "max": 45},    # +1% perfect chance (auto swings)
    "grip":   {"base": 150,  "growth": 3.0,  "max": 40},    # lie shift vs. hole difficulty
    "ball":   {"base": 400,  "growth": 1.30, "max": 200},   # +8% roll, x1.5 every 10 levels
    "caddy":  {"base": 25,   "growth": 1.24, "max": 250},   # +0.4 auto swings / s each
    "stance": {"base": 200,  "growth": 1.35, "max": 30},    # manual streak cap +0.15 each
    "start_yards": 0,
    "manual_swings_per_s": 0.8,      # active mode only
    "manual_perfect_rate": 0.40,     # share of manual swings that are "perfect"
    "perfect_mult": 2.5,
    "manual_power": 12,             # a manual drive is worth 12 auto swings
    "lie_table": [0.35, 0.6, 1.0, 1.35, 1.7],   # index = clamp(grip - difficulty, -2, 2) + 2
    "hole_base_len": 8000, "hole_len_growth": 2.3,   # yards needed for hole n (this run)
    "hole_mult": 1.08,               # permanent x per cleared hole (this run)
    "hole_difficulty_step": 0.75,    # difficulty = floor(n * step)
    "season_holes": 18,              # clearing hole 18 opens the first Season reset
    "unlock_hole": {"stance": 3, "ball": 6},   # category becomes buyable after this hole
}

def hole_len(n, c=CONFIG):
    return c["hole_base_len"] * c["hole_len_growth"] ** (n - 1)

def cost(key, lvl, c=CONFIG):
    u = c[key]
    return u["base"] * u["growth"] ** lvl

def distance_per_swing(s, manual, c=CONFIG):
    head = 5 + 2 * s["head"]
    diff = math.floor(s["hole"] * c["hole_difficulty_step"])
    lie = c["lie_table"][max(-2, min(2, s["grip"] - diff)) + 2]
    ball = (1 + 0.08 * s["ball"]) * 1.5 ** (s["ball"] // 10)
    holes = c["hole_mult"] ** (s["hole"] - 1)
    if manual:
        p = c["manual_perfect_rate"]
        streak = (1 + 0.15 * s["stance"] * p) * c["manual_power"]  # streak + power drive
    else:
        p = min(0.5, 0.05 + 0.01 * s["shaft"])
        streak = 1.0
    crit = 1 + p * (c["perfect_mult"] - 1)
    return head * lie * ball * holes * crit * streak

def income(s, mode, c=CONFIG):
    auto = 0.4 * s["caddy"] * distance_per_swing(s, False)
    man = c["manual_swings_per_s"] * distance_per_swing(s, True) if mode == "active" else 0
    return auto + man

def simulate(mode="active", hours=6.0, c=CONFIG, log=None):
    s = {k: 0 for k in ("head", "shaft", "grip", "ball", "caddy", "stance")}
    s.update(hole=1, yards=c["start_yards"], run_yards=0.0)
    if mode == "idle":
        s["caddy"] = 1                                 # idle runs start with one caddy
    milestones, t = [], 0
    while t < hours * 3600:
        inc = income(s, mode)
        if inc <= 0:
            inc = 1.0                                  # first manual tap in idle mode
        s["yards"] += inc; s["run_yards"] += inc; t += 1
        while s["run_yards"] >= hole_len(s["hole"]):  # hole cleared
            s["run_yards"] -= hole_len(s["hole"])
            milestones.append((s["hole"], t))
            s["hole"] += 1
        # greedy purchase: best income gain per yard spent
        while True:
            best, best_ratio = None, 0
            for k in ("head", "shaft", "grip", "ball", "caddy", "stance"):
                if s[k] >= c[k]["max"] or (mode == "idle" and k == "stance"):
                    continue
                if s["hole"] <= c["unlock_hole"].get(k, 0):
                    continue
                price = cost(k, s[k])
                if price > s["yards"]:
                    continue
                s[k] += 1; gain = income(s, mode) - inc; s[k] -= 1
                if gain / price > best_ratio:
                    best, best_ratio = k, gain / price
            if not best:
                break
            s["yards"] -= cost(best, s[best]); s[best] += 1; inc = income(s, mode)
        if log is not None and t % 60 == 0:
            log.append((t, s["hole"], inc, dict(s)))
    return milestones, s

def fmt(sec):
    h, r = divmod(int(sec), 3600); m, s = divmod(r, 60)
    return f"{h}h{m:02d}m{s:02d}s"

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", default="active", choices=["active", "idle"])
    ap.add_argument("--hours", type=float, default=6)
    ap.add_argument("--csv")
    a = ap.parse_args()
    log = [] if a.csv else None
    ms, st = simulate(a.mode, a.hours, log=log)
    print(f"mode={a.mode}")
    for hole, t in ms:
        flag = "  <- Season reset available" if hole == CONFIG["season_holes"] else ""
        print(f"hole {hole:2d} cleared at {fmt(t)}  (len {hole_len(hole):.3g} yd){flag}")
    print("final levels:", {k: st[k] for k in ("head", "shaft", "grip", "ball", "caddy", "stance")})
    if a.csv:
        with open(a.csv, "w") as f:
            f.write("t,hole,income\n")
            for t, h, inc, _ in log:
                f.write(f"{t},{h},{inc:.4g}\n")
```

## 7. Örnek çıktı (doğrulandı, bu sürümle koşuldu)

```
mode=active                                   mode=idle
hole  1 cleared at 0h00m10s                   hole  1 cleared at 0h01m15s
hole  3 cleared at 0h00m31s                   hole  3 cleared at 0h02m14s
hole  6 cleared at 0h02m15s                   hole  6 cleared at 0h06m28s
hole  9 cleared at 0h03m49s                   hole  9 cleared at 0h10m01s
hole 12 cleared at 0h09m20s                   hole 12 cleared at 0h21m23s
hole 15 cleared at 0h28m02s                   hole 15 cleared at 0h56m57s
hole 18 cleared at 1h46m40s  <- Season        hole 18 cleared at 3h16m52s  <- Season
final: head 96, shaft 45, grip 17,            final: head 91, shaft 45, grip 16,
       ball 64, caddy 91, stance 30                  ball 60, caddy 87, stance 0
```

**Gözlem:** Shaft iki modda da maksimuma (45) ulaşıyor. 2. sezonda Shaft'ın tavanını yükselten bir TP perk'i eklemek, yeni bir hedef yaratmak için iyi bir aday.
