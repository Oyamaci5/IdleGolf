// Kariyer ekonomisi: blueprint v4 §2, §3, §5, §11, §17 formülleri. Tüm sayılar TBT.
const CFG = {
  up: {
    head:      { name: 'Sopa Başı', base: 10,  g: 1.24, max: 300, unlock: 0 },
    shaft:     { name: 'Şaft',      base: 60,  g: 1.28, max: 45,  unlock: 0 },
    grip:      { name: 'Tutuş',     base: 150, g: 3.0,  max: 40,  unlock: 0 },
    ball:      { name: 'Top',       base: 400, g: 1.30, max: 200, unlock: 6 },
    stance:    { name: 'Duruş',     base: 200, g: 1.35, max: 30,  unlock: 3 },
    clubhouse: { name: 'Kulüp Evi', base: 2e7, g: 12,   max: 4,   unlock: 12 },
  },
  hitter: { base: 25, g: 1.24, max: 250, slotMult: 1.5 },
  lieTable: [0.35, 0.6, 1.0, 1.35, 1.7],
  lieNames: ['Bunker', 'Rough', 'Fairway', 'Kısa çim', 'Mükemmel zemin'],
  holeBase: 8000, holeGrowth: 2.3, D: 1000, holeMult: 1.08,
  manualPower: 12, perfectMult: 2.5, tauMan: 0.75, tPD: 30,
  offlineEff: 0.6, offlineBaseCapH: 4,
  goldMin: 60, goldMax: 180,
  greenGrace: 8,          // delik dolunca putt için bekleme (sn, yalnızca açık oyunda)
  windFromHole: 10,       // delik 9 temizlenince rüzgâr gelir
  parPattern: [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5],
  courseNames: ['Yerel Kulüp', 'Bölge Turnuvası', 'Ulusal Açık', 'Büyük Final'],
};

const PERKS = [
  { id: 'quick',    name: 'Hızlı Başlangıç',    base: 5,   max: 10, desc: 'Sezona +5 Sopa Başı seviyesiyle başla' },
  { id: 'caddy',    name: 'Kaddi Akademisi',    base: 10,  max: 10, desc: 'Sezona 1. vurucu +2 seviyeyle başlar' },
  { id: 'shaftm',   name: 'Şaft Uzmanı',        base: 50,  max: 5,  desc: 'Şaft maks +5, mükemmel tavanı +%5' },
  { id: 'clubkey',  name: 'Kulüp Evi Anahtarı', base: 25,  max: 6,  desc: 'Çevrimdışı tavanı +1 saat' },
  { id: 'starhunt', name: 'Yıldız Avcısı',      base: 20,  max: 4,  desc: 'Putt süresi +0.5 sn' },
  { id: 'autobuy',  name: 'Otomatik Alım',      base: 15,  max: 6,  desc: 'Her seviye bir kategoriyi otomatik alır' },
  { id: 'long',     name: 'Uzun Vuruş',         base: 30,  max: 8,  desc: 'Elle vuruş gücü +1 (12 → 20)' },
  { id: 'warmup',   name: 'Erken Isınma',       base: 100, max: 5,  desc: 'Sezona delik çarpanı ×1.08² ile başla' },
];
const AUTOBUY_ORDER = ['hitters', 'head', 'shaft', 'ball', 'grip', 'stance'];

// §17.4 akademi düğümleri (Bilgi + zamanlayıcı)
const ACAD = (() => {
  const a = [];
  for (let k = 2; k <= 10; k++) a.push({
    id: 'slot' + k, group: 'Vurucu yuvaları', name: 'Vurucu Yuvası ' + k,
    desc: k + '. otomatik vurucuyu açar', cost: Math.round(8 * Math.pow(1.7, k - 2)),
    dur: 600 * Math.pow(2, k - 2), req: k > 2 ? 'slot' + (k - 1) : null,
  });
  a.push({ id: 'focus', group: 'Aktif yetenekler', name: 'Odak', desc: '10 sn boyunca mükemmel bölgesi 2 kat geniş (60 sn bekleme)', cost: 15, dur: 900, req: null });
  a.push({ id: 'tempo', group: 'Aktif yetenekler', name: 'Hızlı Tempo', desc: '20 sn boyunca vurucular ×3 hızlı (120 sn bekleme)', cost: 30, dur: 2400, req: null });
  [1, 2, 3].forEach(i => a.push({ id: 'pd' + i, group: 'Aktif yetenekler', name: 'Power Drive Süresi ' + 'I'.repeat(i), desc: 'Power Drive +10 sn gelir değeri', cost: 15 * Math.pow(2.5, i - 1), dur: 900 * Math.pow(3, i - 1), req: i > 1 ? 'pd' + (i - 1) : null }));
  [1, 2].forEach(i => a.push({ id: 'bag' + i, group: 'Kalıcı güç', name: 'Çanta Rafı ' + 'I'.repeat(i), desc: 'Bekleyen çanta kapasitesi +10', cost: 12 * Math.pow(3, i - 1), dur: 1200 * Math.pow(4, i - 1), req: i > 1 ? 'bag1' : null }));
  [1, 2, 3, 4, 5].forEach(i => a.push({ id: 'dist' + i, group: 'Kalıcı güç', name: 'Akademi Antrenmanı ' + ['I', 'II', 'III', 'IV', 'V'][i - 1], desc: 'Tüm mesafeler +%10 (kalıcı)', cost: 10 * Math.pow(2, i - 1), dur: 1200 * Math.pow(2, i - 1), req: i > 1 ? 'dist' + (i - 1) : null }));
  return a;
})();

// §17.2 ekipman kataloğu: 4 yuva × 6 parça
const RARITY = [
  { name: 'Sıradan', cls: 'r0' }, { name: 'İyi', cls: 'r1' }, { name: 'Nadir', cls: 'r2' },
  { name: 'Epik', cls: 'r3' }, { name: 'Efsanevi', cls: 'r4' },
];
const SLOTS = { ball: 'Top', head: 'Sopa başı', shaft: 'Şaft', grip: 'Tutuş' };
const EXTRA = {
  perfect: { name: 'oto mükemmel', f: v => '+%' + (v * 100).toFixed(1) },
  pdc:     { name: 'PD şarjı',      f: v => '+%' + Math.round(v * 100) },
  putt:    { name: 'putt süresi',  f: v => '+' + v.toFixed(1) + ' sn' },
  bag:     { name: 'çanta şansı',  f: v => '+%' + Math.round(v * 100) },
  wind:    { name: 'rüzgâr direnci', f: v => '+%' + Math.round(v * 100) },
};
const ITEMS = [
  ['ball', 0, 'Antrenman Topu', 0.04], ['ball', 0, 'İki Parça Top', 0.05], ['ball', 1, 'Yumuşak Kabuk', 0.08, 'putt', 0.3],
  ['ball', 2, 'Üç Katman Pro', 0.12, 'perfect', 0.02], ['ball', 3, 'Gümüş Çekirdek', 0.2, 'pdc', 0.15], ['ball', 4, 'Kuyrukluyıldız', 0.4, 'bag', 0.1],
  ['head', 0, 'Paslı Demir', 0.03], ['head', 0, 'Çelik Kafa', 0.05], ['head', 1, 'Dövme 7', 0.09, 'perfect', 0.01],
  ['head', 2, 'Karbon Kafa', 0.13, 'wind', 0.1], ['head', 3, 'Titanyum Driver', 0.22, 'pdc', 0.2], ['head', 4, 'Yıldırım Kafası', 0.45, 'perfect', 0.03],
  ['shaft', 0, 'Ceviz Şaft', 0.03], ['shaft', 0, 'Hafif Grafit', 0.05], ['shaft', 1, 'Esnek X', 0.08, 'perfect', 0.01],
  ['shaft', 2, 'Regular Pro', 0.12, 'putt', 0.3], ['shaft', 3, 'Stiff Tour', 0.2, 'perfect', 0.02], ['shaft', 4, 'Kristal Şaft', 0.4, 'pdc', 0.25],
  ['grip', 0, 'Lastik Sap', 0.03], ['grip', 0, 'Deri Sap', 0.05], ['grip', 1, 'Kadife Sarım', 0.08, 'putt', 0.4],
  ['grip', 2, 'Yapışkan Pro', 0.12, 'wind', 0.1], ['grip', 3, 'Midsize Elit', 0.18, 'bag', 0.05], ['grip', 4, 'Altın Sap', 0.4, 'putt', 0.8],
].map((a, i) => ({ id: 'i' + i, slot: a[0], rar: a[1], name: a[2], dist: a[3], ex: a[4] || null, exv: a[5] || 0 }));

const QUESTS = [
  { id: 'perf', text: '20 mükemmel vuruş yap', goal: 20, ev: 'perfect' },
  { id: 'holes', text: '2 delik geç', goal: 2, ev: 'hole' },
  { id: 'research', text: '1 akademi araştırması başlat', goal: 1, ev: 'research' },
  { id: 'gold', text: '1 altın top yakala', goal: 1, ev: 'gold' },
  { id: 'pd', text: '2 kez Power Drive vur', goal: 2, ev: 'pd' },
  { id: 'birdie', text: "Bir putt'u ilk denemede sok", goal: 1, ev: 'birdie' },
  { id: 'bags', text: '3 çanta aç', goal: 3, ev: 'bag' },
  { id: 'daily', text: 'Günlük deliği oyna', goal: 1, ev: 'dailyhole' },
];

const E = (() => {
  let S = null;
  const hooks = { hole() {}, toast() {}, season() {} };
  const rnd = Math.random;

  // ---------- durum ----------
  function newMeta() {
    return {
      stars: {}, coursesUnlocked: 1, tpTotal: 0, tpPeak: 0, pp: 0, perks: {},
      bilgi: 0, academy: { done: {}, q: null },
      equip: { owned: {}, on: { ball: null, head: null, shaft: null, grip: null } },
      bags: [], bagsLost: 0, pity: 0, bagsOpened: 0,
      quests: null, daily: { day: -1, tries: 0, best: null }, tour: { week: -1, tries: 0, best: null, badgeWeek: -1 },
      badge: 0, stats: { swings: 0, perfects: 0, holes: 0, seasons: 0, playS: 0, bestSwing: 0 },
      gt: 0, epoch: Math.floor(Date.now() / 1000), windSeed: (Math.random() * 1e9) | 0,
    };
  }
  function newRun(meta, course) {
    const lv = k => meta.perks[k] || 0;
    const r = {
      course, hole: 1, prog: 0, carry: 0, yards: 0, seasonYards: 0, seasonDone: false,
      up: { head: 5 * lv('quick'), shaft: 0, grip: 0, ball: 0, stance: 0, clubhouse: 0 },
      hitters: [1 + 2 * lv('caddy')], streak: 0, streakIdle: 0, pd: 0, greenWait: 0,
      tempoUntil: -1, tempoCd: -1, focusUntil: -1, focusCd: -1, goldUntil: -1,
      t0: meta.gt,
    };
    return r;
  }
  function fresh() {
    const meta = newMeta();
    S = { v: 1, meta, run: newRun(meta, 1), settings: { autoAll: false, buyAmt: 1 }, cfg: {}, lastSeen: Date.now() };
    syncSlots();
    questDayCheck();
    return S;
  }
  function attach(s) {
    S = s;
    Object.assign(CFG, s.cfg || {});
    syncSlots(); questDayCheck();
  }
  const get = () => S;

  // ---------- yardımcılar ----------
  const perk = id => S.meta.perks[id] || 0;
  const acad = id => !!S.meta.academy.done[id];
  function slotsUnlocked() { let n = 1; for (let k = 2; k <= 10; k++) { if (acad('slot' + k)) n = k; else break; } return n; }
  function syncSlots() { while (S.run.hitters.length < slotsUnlocked()) S.run.hitters.push(0); }
  const holeLen = (c, h) => CFG.holeBase * Math.pow(CFG.holeGrowth, h - 1) * Math.pow(CFG.D, c - 1);
  const difficulty = (c, h) => Math.floor(0.75 * h) + 4 * (c - 1);
  function lieIdx(run = S.run) { return U.clamp(run.up.grip - difficulty(run.course, run.hole), -2, 2) + 2; }
  const ballMult = L => (1 + 0.08 * L) * Math.pow(1.5, Math.floor(L / 10));
  const holeMult = run => Math.pow(CFG.holeMult, run.hole - 1 + 2 * perk('warmup'));
  function pMax() { return Math.min(0.75, 0.5 + 0.05 * perk('shaftm')); }
  function pPerfect(run = S.run) { return Math.min(pMax(), 0.05 + 0.01 * run.up.shaft + eqStat('perfect')); }

  // ---------- ekipman ----------
  const itemById = id => ITEMS.find(i => i.id === id);
  const lvlMul = lvl => 1 + 0.25 * (lvl - 1);
  function eqStat(type) {
    let s = 0;
    for (const slot in S.meta.equip.on) {
      const id = S.meta.equip.on[slot]; if (!id) continue;
      const it = itemById(id); if (it.ex === type) s += it.exv * lvlMul(S.meta.equip.owned[id]);
    }
    return s;
  }
  function albumDone(slot) { return ITEMS.filter(i => i.slot === slot).every(i => S.meta.equip.owned[i.id]); }
  function mEquipRaw() {
    let m = 1;
    for (const slot in S.meta.equip.on) {
      const id = S.meta.equip.on[slot]; if (!id) continue;
      m *= 1 + itemById(id).dist * lvlMul(S.meta.equip.owned[id]);
    }
    for (const slot in SLOTS) if (albumDone(slot)) m *= 1.05;
    return m;
  }
  const mEquip = () => U.softcap(mEquipRaw(), 5, 0.6);
  function itemPower(id) { const it = itemById(id); return it.dist * lvlMul(S.meta.equip.owned[id] || 1); }
  function equip(id) { const it = itemById(id); S.meta.equip.on[it.slot] = id; }

  // ---------- çarpanlar ----------
  function starsOf(c) { return S.meta.stars[c] || (S.meta.stars[c] = Array(18).fill(0)); }
  function courseStars(c) { return starsOf(c).reduce((a, b) => a + b, 0); }
  function totalStars() { let t = 0; for (const c in S.meta.stars) t += courseStars(+c); return t; }
  function mTP() { return Math.pow(1 + U.softcap(S.meta.tpTotal, 1e5, 0.85) / 10, 1.8); }
  function mStar(run = S.run) { return 1 + 0.03 * starsOf(run.course)[run.hole - 1]; }
  function mThreshold(c) { const s = courseStars(c); return 1 + 0.1 * ((s >= 18) + (s >= 36) + (s >= 54)); }
  function mAcad() { let n = 0; for (let i = 1; i <= 5; i++) if (acad('dist' + i)) n++; return 1 + 0.1 * n; }
  function mBadge() { return 1 + 0.01 * Math.min(10, S.meta.badge); }
  function mMeta(run = S.run) { return mTP() * mStar(run) * mThreshold(run.course) * mEquip() * mAcad() * mBadge(); }
  function metaParts() {
    return [
      ['Tur Puanı (TP)', mTP()], ['Delik yıldızı', mStar()], ['Kurs yıldız eşiği', mThreshold(S.run.course)],
      ['Ekipman', mEquip()], ['Akademi', mAcad()], ['Turnuva rozeti', mBadge()],
    ];
  }

  // ---------- rüzgâr (§4-A, §17.6) ----------
  function windActive(run = S.run) { return run.course > 1 || run.hole >= CFG.windFromHole; }
  function windAt(t) {
    const seg = Math.floor(t / 45);
    const r = U.hashF(S.meta.windSeed, seg);
    if (r < 0.4) return { kind: 'calm', m: 1, seg };
    if (r < 0.7) return { kind: 'head', m: 0.7, seg };
    return { kind: 'tail', m: 1.4, seg };
  }
  function wind() { return windActive() ? windAt(S.meta.gt) : { kind: 'none', m: 1 }; }
  function windAutoReduce() { return Math.min(0.6, S.run.hitters.reduce((a, b) => a + b, 0) / 250 + eqStat('wind')); }
  function windAuto() { const w = wind(); return w.m >= 1 ? w.m : 1 - (1 - w.m) * (1 - windAutoReduce()); }
  function windMan() { const w = wind(); return w.m >= 1 ? w.m : 1 - (1 - w.m) * (1 - Math.min(0.6, eqStat('wind'))); }

  // ---------- mesafe ve gelir (§3.1) ----------
  function baseDist(run = S.run) {
    return (5 + 2 * run.up.head) * CFG.lieTable[lieIdx(run)] * ballMult(run.up.ball) * holeMult(run) * mMeta(run);
  }
  function hitterBoost(run = S.run) {
    const g = S.meta.gt;
    return (run.tempoUntil > g ? 3 : 1) * (run.goldUntil > g ? 5 : 1);
  }
  function autoRate(run = S.run) { return 0.4 * run.hitters.reduce((a, b) => a + b, 0) * hitterBoost(run); }
  function autoDist(run = S.run) { return baseDist(run) * (1 + pPerfect(run) * (CFG.perfectMult - 1)) * windAuto(); }
  function autoIncome(run = S.run) { return autoRate(run) * autoDist(run); }
  function manualPower() { return CFG.manualPower + perk('long'); }
  function streakMult(run = S.run) { return 1 + Math.min(0.05 * run.streak, 0.15 * run.up.stance); }
  function tPD() { let t = CFG.tPD; for (let i = 1; i <= 3; i++) if (acad('pd' + i)) t += 10; return t; }
  function manualValue(qm, sm, run = S.run) {
    const v3 = baseDist(run) * qm * sm * manualPower() * windMan();
    const floor = CFG.tauMan * autoIncome(run) * qm * sm;
    return Math.max(v3, floor);
  }
  // simülasyon için beklenen elle gelir (0.8 vuruş/s, %40 mük, %15 ıska)
  function manualEV(rate, run = S.run) {
    if (!rate) return { man: 0, pd: 0 };
    const pm = 0.4, pg = 0.45, pmiss = 0.15;
    const ev = pmiss * 0.5 + pg * 1 + pm * CFG.perfectMult;
    const sm = 1 + 0.15 * run.up.stance * pm;
    const man = rate * manualValue(ev, sm, run);
    const charge = (pg * 5 + pm * 10) * (1 + eqStat('pdc'));
    const pdPerS = rate * charge / 100;
    const pd = pdPerS * tPD() * autoIncome(run) * ev;
    return { man, pd };
  }
  function incomeEst(rate, run = S.run) { const m = manualEV(rate, run); return autoIncome(run) + m.man + m.pd; }

  // ---------- satın alma ----------
  function maxLvl(key, run = S.run) {
    const c = run.course;
    switch (key) {
      case 'head': return 300 * c;
      case 'ball': return 200 * c;
      case 'grip': return 40 + 4 * (c - 1);
      case 'shaft': return 45 + 5 * perk('shaftm');
      default: return CFG.up[key].max;
    }
  }
  function unlocked(key, run = S.run) {
    const u = CFG.up[key].unlock;
    return !u || run.hole > u || run.seasonDone;
  }
  // tüm alınabilir kalemler: kategori anahtarı veya vurucu indeksi
  function item(key) {
    const run = S.run;
    if (key[0] === 'h' && key.length <= 3 && /^h\d+$/.test(key)) {
      const i = +key.slice(1);
      return {
        key, base: CFG.hitter.base * Math.pow(CFG.hitter.slotMult, i), g: CFG.hitter.g,
        get L() { return run.hitters[i]; }, set L(v) { run.hitters[i] = v; },
        max: CFG.hitter.max * run.course, ok: i < run.hitters.length,
      };
    }
    const u = CFG.up[key];
    return {
      key, base: u.base, g: u.g, get L() { return run.up[key]; }, set L(v) { run.up[key] = v; },
      max: maxLvl(key), ok: unlocked(key),
    };
  }
  const costAt = (it, L) => it.base * Math.pow(it.g, L);
  const bulkCost = (it, n) => it.base * Math.pow(it.g, it.L) * (Math.pow(it.g, n) - 1) / (it.g - 1);
  function maxAfford(it, Y) {
    const n = Math.floor(Math.log(1 + Y * (it.g - 1) / (it.base * Math.pow(it.g, it.L))) / Math.log(it.g));
    return Math.max(0, Math.min(n, it.max - it.L));
  }
  function quote(key, amt) {
    const it = item(key);
    const room = it.max - it.L;
    let n = amt === 'max' ? Math.max(1, maxAfford(it, S.run.yards)) : Math.min(amt, room);
    n = Math.min(n, room);
    if (n <= 0) return { it, n: 0, cost: Infinity };
    return { it, n, cost: bulkCost(it, n) };
  }
  function buy(key, amt) {
    const q = quote(key, amt);
    if (!q.it.ok || q.n <= 0 || q.cost > S.run.yards) return false;
    S.run.yards -= q.cost; q.it.L += q.n;
    return true;
  }
  function allowedAuto() {
    if (S.settings.autoAll) return new Set(AUTOBUY_ORDER);
    return new Set(AUTOBUY_ORDER.slice(0, perk('autobuy')));
  }
  function autoBuy(rate) {
    const allow = allowedAuto();
    if (!allow.size) return 0;
    const keys = [];
    if (allow.has('hitters')) S.run.hitters.forEach((_, i) => keys.push('h' + i));
    for (const k of ['head', 'shaft', 'ball', 'grip', 'stance']) if (allow.has(k)) keys.push(k);
    // ucuz ön kontrol: alınabilir bir şey yoksa gelir hesabına girme
    if (!keys.some(k => { const it = item(k); return it.ok && it.L < it.max && costAt(it, it.L) <= S.run.yards; })) return 0;
    let bought = 0;
    for (let guard = 0; guard < 300; guard++) {
      const inc0 = incomeEst(rate);
      let best = null, bestR = 0, bestIt = null;
      for (const k of keys) {
        const it = item(k);
        if (!it.ok || it.L >= it.max) continue;
        const price = costAt(it, it.L);
        if (price > S.run.yards) continue;
        it.L += 1; const gain = incomeEst(rate) - inc0; it.L -= 1;
        const r = gain / price;
        if (r > bestR) { bestR = r; best = k; bestIt = it; }
      }
      if (!best) break;
      S.run.yards -= costAt(bestIt, bestIt.L); bestIt.L += 1; bought++;
    }
    return bought;
  }

  // ---------- delik akışı ----------
  const stats = { auto: 0, man: 0, pd: 0, gold: 0, bag: 0 };
  let statsOn = true;     // zaman atlarken kapanır
  function addYards(y, src, o) {
    if (!(y > 0)) return;
    const run = S.run;
    run.yards += y; run.seasonYards += y;
    if (statsOn) stats[src] = (stats[src] || 0) + y;
    if (!run.seasonDone) { run.prog += y; checkHole(o || {}); }
  }
  function greenPhase() { const r = S.run; return !r.seasonDone && r.prog >= 0.9 * holeLen(r.course, r.hole); }
  function checkHole(o) {
    const run = S.run;
    for (let guard = 0; guard < 40 && !run.seasonDone; guard++) {
      const len = holeLen(run.course, run.hole);
      if (run.prog < len) break;
      if (o.waitPutt && run.greenWait < CFG.greenGrace) {
        run.carry += run.prog - len; run.prog = len; break;
      }
      completeHole(0, true, o);
    }
  }
  function completeHole(stars, auto, o = {}) {
    const run = S.run, meta = S.meta;
    const c = run.course, h = run.hole, len = holeLen(c, h);
    const st = starsOf(c);
    const prevStar = st[h - 1];
    st[h - 1] = Math.max(st[h - 1], stars);
    const carry = Math.max(0, run.prog - len) + run.carry;
    run.carry = 0; run.greenWait = 0;
    addBag({ tier: stars === 3 ? 1 : 0, c, h });
    meta.stats.holes++;
    questEv('hole');
    if (h === 18) {
      run.seasonDone = true; run.prog = len;
      if (c < 4 && meta.coursesUnlocked < c + 1) { meta.coursesUnlocked = c + 1; hooks.toast(`Kurs ${c + 1} açıldı: ${CFG.courseNames[c]}`, 'gold'); }
    } else {
      run.hole++;
      const nl = holeLen(c, run.hole);
      run.prog = o.waitPutt ? Math.min(carry, nl * 0.89) : carry;
    }
    hooks.hole({ c, h, stars, auto, newStar: stars > prevStar });
  }
  function puttDone(tries) {
    const stars = [0, 3, 2, 1, 0][Math.min(tries, 4)];
    if (tries === 1) questEv('birdie');
    S.run.prog = Math.max(S.run.prog, holeLen(S.run.course, S.run.hole));
    completeHole(stars, false, { waitPutt: true });
    return stars;
  }

  // ---------- çantalar (§17.1) ----------
  function bagCap() { return 10 + (acad('bag1') ? 10 : 0) + (acad('bag2') ? 10 : 0); }
  function addBag(b) {
    if (S.meta.bags.length < bagCap()) S.meta.bags.push(b); else S.meta.bagsLost++;
  }
  function rollRarity(tier) {
    const w = [Math.max(10, 55 - 15 * tier), 28, 13 + 8 * tier, 4 + 5 * tier];
    let t = rnd() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) { if ((t -= w[i]) < 0) return i; }
    return 0;
  }
  function grantItem(rar) {
    const pool = ITEMS.filter(i => i.rar === rar);
    const it = pool[Math.floor(rnd() * pool.length)];
    const own = S.meta.equip.owned;
    const isNew = !own[it.id];
    own[it.id] = (own[it.id] || 0) + 1;
    const cur = S.meta.equip.on[it.slot];
    let equipped = false;
    if (!cur || itemPower(it.id) > itemPower(cur)) { S.meta.equip.on[it.slot] = it.id; equipped = true; }
    if (rar >= 2) S.meta.pity = 0;
    return { kind: 'item', item: it, isNew, lvl: own[it.id], equipped };
  }
  function openBag(idx = 0) {
    const meta = S.meta;
    const bag = meta.bags.splice(idx, 1)[0];
    if (!bag) return null;
    meta.bagsOpened++; meta.pity++;
    questEv('bag');
    const h = bag.h || S.run.hole;
    let res;
    if (meta.bagsOpened === 1) {
      res = { kind: 'bilgi', amount: 12 };
    } else if (meta.pity >= 25) {
      res = grantItem(2 + (rnd() < 0.25 ? 1 : 0)); res.pity = true;
    } else {
      const r = rnd();
      const legend = 0.01 * (1 + eqStat('bag'));
      if (r < legend) res = grantItem(4);
      else if (r < legend + 0.14 * (1 + eqStat('bag'))) res = grantItem(rollRarity(bag.tier));
      else if (r < 0.40) res = { kind: 'bilgi', amount: Math.round((5 + rnd() * 10) * (1 + 0.15 * (h - 1)) * (1 + 0.5 * bag.tier)) };
      else {
        const secs = 60 + rnd() * 120 * (1 + 0.5 * bag.tier);
        res = { kind: 'yards', amount: Math.max(50, incomeEst(0) * secs), secs };
      }
    }
    if (res.kind === 'bilgi') meta.bilgi += res.amount;
    if (res.kind === 'yards') addYards(res.amount, 'bag', { waitPutt: true });
    res.tier = bag.tier;
    return res;
  }

  // ---------- altın top (§17.6) ----------
  function goldReward() {
    questEv('gold');
    const r = rnd();
    if (r < 0.5) { const y = Math.max(30, incomeEst(0) * 60); addYards(y, 'gold', { waitPutt: true }); return { text: '60 saniyelik gelir', y }; }
    if (r < 0.85) { S.run.goldUntil = S.meta.gt + 20; return { text: '20 sn vurucular ×5' }; }
    if (r < 0.99) { addBag({ tier: 1, c: S.run.course, h: S.run.hole }); return { text: 'Delik çantası (İyi)' }; }
    const len = holeLen(S.run.course, S.run.hole);
    if (!S.run.seasonDone) { S.run.prog += 0.25 * len; checkHole({ waitPutt: true }); }
    return { text: 'HOLE-IN-ONE! Deliğin %25\'i tamamlandı' };
  }

  // ---------- yetenekler ----------
  function useAbility(id) {
    const r = S.run, g = S.meta.gt;
    if (id === 'tempo' && acad('tempo') && r.tempoCd <= g) { r.tempoUntil = g + 20; r.tempoCd = g + 120; return true; }
    if (id === 'focus' && acad('focus') && r.focusCd <= g) { r.focusUntil = g + 10; r.focusCd = g + 60; return true; }
    return false;
  }

  // ---------- elle vuruş (§17.3) ----------
  function manualSwing(q) {
    const run = S.run, meta = S.meta;
    const qm = [0.5, 1, CFG.perfectMult][q];
    run.streakIdle = 0;
    if (q === 2) run.streak++; else run.streak = 0;
    meta.stats.swings++;
    if (q === 2) { meta.stats.perfects++; questEv('perfect'); }
    const sm = streakMult();
    let v, pd = false;
    if (run.pd >= 100) {
      pd = true;
      const tail = wind().kind === 'tail' ? 1.5 : 1;
      v = tPD() * Math.max(autoIncome(), baseDist() * 0.4) * qm * tail;
      run.pd = 0; questEv('pd');
      addYards(v, 'pd', { waitPutt: true });
    } else {
      v = manualValue(qm, sm);
      run.pd = Math.min(100, run.pd + [0, 5, 10][q] * (1 + eqStat('pdc')));
      addYards(v, 'man', { waitPutt: true });
    }
    meta.stats.bestSwing = Math.max(meta.stats.bestSwing, v);
    return { v, q, pd, sm };
  }

  // ---------- akademi ----------
  function acadState(n) {
    const A = S.meta.academy;
    if (A.done[n.id]) return 'done';
    if (A.q && A.q.id === n.id) return 'running';
    if (n.req && !A.done[n.req]) return 'locked';
    return 'open';
  }
  function startResearch(id) {
    const A = S.meta.academy, n = ACAD.find(x => x.id === id);
    if (A.q || acadState(n) !== 'open' || S.meta.bilgi < n.cost) return false;
    S.meta.bilgi -= n.cost;
    A.q = { id, end: S.meta.gt + n.dur, dur: n.dur };
    questEv('research');
    return true;
  }
  function academyTick() {
    const A = S.meta.academy;
    if (A.q && S.meta.gt >= A.q.end) {
      const n = ACAD.find(x => x.id === A.q.id);
      A.done[A.q.id] = true; A.q = null;
      syncSlots();
      hooks.toast('Akademi: ' + n.name + ' tamamlandı', 'blue');
    }
  }

  // ---------- günlük görevler (§17.7) ----------
  const dayIndex = () => Math.floor((S.meta.epoch + S.meta.gt) / 86400);
  function questDayCheck() {
    const d = dayIndex(), meta = S.meta;
    if (!meta.quests || meta.quests.day !== d) {
      const r = U.rngOf('q', d, meta.windSeed);
      const pool = QUESTS.slice();
      const list = [];
      while (list.length < 3) list.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
      meta.quests = { day: d, list: list.map(q => ({ id: q.id, prog: 0, claimed: false })) };
    }
    if (meta.daily.day !== d) meta.daily = { day: d, tries: 0, best: null };
    const w = Math.floor(d / 7);
    if (meta.tour.week !== w) meta.tour = { week: w, tries: 0, best: null, badgeWeek: meta.tour.badgeWeek };
  }
  function questEv(ev, n = 1) {
    if (!S.meta.quests) return;
    for (const q of S.meta.quests.list) {
      const def = QUESTS.find(x => x.id === q.id);
      if (def.ev === ev && !q.claimed) q.prog = Math.min(def.goal, q.prog + n);
    }
  }
  function claimQuest(i) {
    const q = S.meta.quests.list[i], def = QUESTS.find(x => x.id === q.id);
    if (q.claimed || q.prog < def.goal) return false;
    q.claimed = true; S.meta.bilgi += 10; addBag({ tier: 1, c: S.run.course, h: S.run.hole });
    return true;
  }

  // ---------- zaman adımı ----------
  function step(dt, o = {}) {
    const run = S.run, meta = S.meta;
    meta.gt += dt;
    const eff = o.eff == null ? 1 : o.eff;
    addYards(autoIncome() * eff * dt, 'auto', o);
    if (o.manualRate) {
      const m = manualEV(o.manualRate);
      addYards(m.man * dt, 'man', o);
      addYards(m.pd * dt, 'pd', o);
    }
    if (o.waitPutt && !run.seasonDone && run.prog >= holeLen(run.course, run.hole)) {
      run.greenWait += o.dtReal != null ? o.dtReal : dt;
      checkHole(o);
    }
    academyTick();
    if (o.autobuy !== false) autoBuy(o.manualRate || 0);
  }
  // açık oyun: kare başına
  function tickOnline(dtGame, dtReal) {
    const run = S.run;
    run.streakIdle += dtReal;
    if (run.streakIdle > 3) run.streak = 0;
    S.meta.stats.playS += dtGame;
    const n = Math.max(1, Math.ceil(dtGame / 1));
    for (let i = 0; i < n; i++) step(dtGame / n, { waitPutt: true, dtReal: dtReal / n });
    questDayCheck();
  }
  function offlineCapS() {
    return (CFG.offlineBaseCapH + 2 * S.run.up.clubhouse + perk('clubkey')) * 3600;
  }
  function snapshot() {
    const r = S.run, m = S.meta;
    return {
      yards: r.yards, season: r.seasonYards, course: r.course, hole: r.hole, done: r.seasonDone,
      lv: Object.values(r.up).reduce((a, b) => a + b, 0) + r.hitters.reduce((a, b) => a + b, 0),
      bags: m.bags.length, lost: m.bagsLost, acad: Object.keys(m.academy.done).length, holes: m.stats.holes,
    };
  }
  // zaman atlama / çevrimdışı (§5): adımlı simülasyon
  function simulate(seconds, profile, autobuy) {
    const before = snapshot();
    let eff = 1, cap = Infinity, rate = 0;
    if (profile === 'offline') { eff = CFG.offlineEff; cap = offlineCapS(); }
    if (profile === 'active') rate = 0.8;
    const used = Math.min(seconds, cap);
    const saveAuto = S.settings.autoAll;
    if (autobuy === 'all') S.settings.autoAll = true;
    const n = Math.min(20000, Math.max(1, Math.ceil(used)));
    const dt = used / n;
    const t0 = performance.now();
    statsOn = false;
    for (let i = 0; i < n; i++) step(dt, { eff, manualRate: rate, autobuy: autobuy !== 'none', waitPutt: false });
    statsOn = true;
    S.settings.autoAll = saveAuto;
    if (used < seconds) { S.meta.gt += seconds - used; academyTick(); }
    S.run.greenWait = 0; S.run.streak = 0;
    questDayCheck();
    const after = snapshot();
    return { before, after, seconds, used, capped: used < seconds, profile, ms: performance.now() - t0 };
  }

  // ---------- sezon (§11.2) ----------
  const tpPreview = () => Math.floor(Math.sqrt(S.run.seasonYards / 1e8));
  function endSeason(course, withdraw) {
    const meta = S.meta;
    let tp = 0;
    if (!withdraw && S.run.seasonDone) {
      tp = tpPreview();
      meta.tpTotal += tp; meta.pp += tp; meta.tpPeak = Math.max(meta.tpPeak, meta.tpTotal);
      meta.bilgi += 5 + tp; meta.stats.seasons++;
    }
    S.run = newRun(meta, course);
    syncSlots();
    hooks.season({ tp, course });
    return tp;
  }
  const perkCost = p => p.base * Math.pow(10, perk(p.id));
  function buyPerk(id) {
    const p = PERKS.find(x => x.id === id);
    if (perk(id) >= p.max || S.meta.pp < perkCost(p)) return false;
    S.meta.pp -= perkCost(p); S.meta.perks[id] = perk(id) + 1;
    return true;
  }

  // ---------- turnuva gücü (§16.5) ----------
  function tourG() {
    const m = S.meta;
    return 100 * Math.log10(1 + m.tpPeak) + totalStars() + 25 * m.coursesUnlocked + 5 * Object.keys(m.equip.owned).length;
  }
  const LEAGUES = [['Bronz', 0], ['Gümüş', 200], ['Altın', 500], ['Platin', 1000], ['Elmas', 2000], ['Şampiyon', 4000]];
  function league(G = tourG()) { let i = 0; LEAGUES.forEach((l, k) => { if (G >= l[1]) i = k; }); return { i, name: LEAGUES[i][0] }; }
  const sat = (G, E, K) => E * G / (G + K);
  function tourEffects(G = tourG()) { return { power: 1 + sat(G, 0.25, 600), control: sat(G, 0.5, 600), windRes: sat(G, 0.4, 800) }; }

  return {
    hooks, fresh, attach, get, newRun,
    holeLen, difficulty, lieIdx, pPerfect, pMax, ballMult, holeMult, mMeta, metaParts, mEquip, mEquipRaw, mTP, mAcad,
    baseDist, autoRate, autoDist, autoIncome, manualValue, streakMult, manualPower, tPD, incomeEst, hitterBoost,
    wind, windAt, windActive, windAuto, windMan,
    item, quote, buy, maxLvl, unlocked, autoBuy, allowedAuto, costAt,
    greenPhase, puttDone, completeHole, addYards, stats,
    bagCap, openBag, addBag, itemById, itemPower, equip, eqStat, albumDone, lvlMul,
    goldReward, useAbility, manualSwing,
    acadState, startResearch, slotsUnlocked, acad,
    questDayCheck, questEv, claimQuest, dayIndex,
    tickOnline, simulate, offlineCapS, step,
    tpPreview, endSeason, perkCost, buyPerk, perk,
    starsOf, courseStars, totalStars, mThreshold,
    tourG, league, tourEffects, LEAGUES,
  };
})();
