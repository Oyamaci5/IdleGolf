// Kariyer ekonomisi (prototip v2): sezon yok, delikler kurs kurs kesintisiz ilerler.
// Blueprint v4 formüllerinden türetildi; değişiklikler kullanıcı geri bildirimiyle (2026-10-25). Tüm sayılar TBT.
const CFG = {
  up: {
    head:      { name: 'Sopa Başı', base: 10,  g: 1.24, max: 5000, unlock: 0 },
    shaft:     { name: 'Şaft',      base: 60,  g: 1.28, max: 45,   unlock: 0 },
    grip:      { name: 'Tutuş',     base: 150, g: 2.2,  max: 5000, unlock: 0 },
    ball:      { name: 'Top',       base: 400, g: 1.30, max: 5000, unlock: 6 },
    stance:    { name: 'Duruş',     base: 200, g: 1.35, max: 30,   unlock: 3 },
    clubhouse: { name: 'Kulüp Evi', base: 2e7, g: 12,   max: 4,    unlock: 12 },
  },
  hitter: { base: 25, g: 1.24, max: 5000, slotMult: 1.5 },
  milestoneEvery: 25, milestoneMult: 1.5,
  holeBase: 8000, holeGrowth: 2.3, holeGrowth2: 1.5, holeMult: 1.08, trophyMult: 2, diffStep: 0.5,
  manualPower: 12, perfectMult: 2.5, tauMan: 0.75, tPD: 30,
  offlineEff: 0.6, offlineBaseCapH: 4,
  goldMin: 60, goldMax: 180, greenGrace: 8, windFromHole: 10,
  parPattern: [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5],
  courseNames: ['Yerel Kulüp', 'Bölge Turnuvası', 'Ulusal Açık', 'Büyük Final'],
};
const TERRAIN = {
  tee: { name: 'Tee', col: '#8fd36b' }, fairway: { name: 'Fairway', col: '#6db54d' }, rough: { name: 'Rough', col: '#3f7a32' },
  bunker: { name: 'Bunker', col: '#e8d49a' }, water: { name: 'Su', col: '#3d8fd1' }, green: { name: 'Yeşil', col: '#9ddd7a' },
};

// Araştırma ağacı: her düğümün birden fazla seviyesi var. Süre ve maliyet seviyeyle büyür.
const RESEARCH = [
  { id: 'slot', br: 'Vurucular', name: 'Vurucu yuvası', max: 9, cost: l => Math.round(8 * Math.pow(1.7, l)), dur: l => 300 * Math.pow(2, l), desc: l => `${l + 2}. otomatik vurucuyu açar` },
  { id: 'hspeed', br: 'Vurucular', name: 'Vurucu antrenmanı', max: 10, cost: l => Math.round(10 * Math.pow(1.6, l)), dur: l => 600 * Math.pow(1.7, l), desc: () => 'Tüm vurucular +%15 hızlı' },
  { id: 'pd', br: 'Vuruş', name: 'Power Drive süresi', max: 3, cost: l => 15 * Math.pow(2.5, l), dur: l => 900 * Math.pow(3, l), desc: () => 'Power Drive +10 sn gelir değeri' },
  { id: 'sweet', br: 'Vuruş', name: 'Tatlı nokta', max: 3, cost: l => 12 * Math.pow(2, l), dur: l => 600 * Math.pow(2.5, l), desc: () => 'Halkadaki mükemmel bölgesi +3°' },
  { id: 'focus', br: 'Vuruş', name: 'Odak (yetenek)', max: 1, cost: () => 15, dur: () => 900, desc: () => '10 sn boyunca mükemmel bölgesi 2 kat (60 sn bekleme)' },
  { id: 'tempo', br: 'Vuruş', name: 'Hızlı Tempo (yetenek)', max: 1, cost: () => 30, dur: () => 2400, desc: () => '20 sn boyunca vurucular ×3 (120 sn bekleme)' },
  { id: 'rough', br: 'Saha', name: 'Rough ustalığı', max: 3, cost: l => 12 * Math.pow(2.2, l), dur: l => 900 * Math.pow(2.5, l), desc: () => 'Rough cezası azalır (×0.6 → +0.1)' },
  { id: 'bunker', br: 'Saha', name: 'Bunker çıkışı', max: 3, cost: l => 15 * Math.pow(2.2, l), dur: l => 1200 * Math.pow(2.5, l), desc: () => 'Bunker cezası azalır (×0.35 → +0.12)' },
  { id: 'windr', br: 'Saha', name: 'Rüzgâr okuma', max: 3, cost: l => 20 * Math.pow(2, l), dur: l => 1200 * Math.pow(2.5, l), desc: () => 'Karşı rüzgâr cezası −%20' },
  { id: 'dist', br: 'Ekonomi', name: 'Mesafe çalışması', max: 15, cost: l => Math.round(10 * Math.pow(1.8, l)), dur: l => 1200 * Math.pow(1.6, l), desc: () => 'Tüm mesafeler +%20 (kalıcı)' },
  { id: 'discount', br: 'Ekonomi', name: 'Pazarlık', max: 5, cost: l => 20 * Math.pow(2, l), dur: l => 1800 * Math.pow(2, l), desc: () => 'Yükseltme maliyetleri −%5' },
  { id: 'offline', br: 'Ekonomi', name: 'Gece vardiyası', max: 2, cost: l => 30 * Math.pow(3, l), dur: l => 3600 * Math.pow(3, l), desc: () => 'Çevrimdışı verim +%10' },
  { id: 'chestcap', br: 'Sandık', name: 'Sandık rafı', max: 2, cost: l => 12 * Math.pow(3, l), dur: l => 1200 * Math.pow(4, l), desc: () => 'Bekleyen sandık kapasitesi +10' },
  { id: 'luck', br: 'Sandık', name: 'Şans', max: 3, cost: l => 20 * Math.pow(2.5, l), dur: l => 1800 * Math.pow(2.5, l), desc: () => 'Ekipman düşme şansı +%5, nadirlik bir kademe kayar' },
  { id: 'parts', br: 'Sandık', name: 'Parça ustası', max: 3, cost: l => 15 * Math.pow(2.2, l), dur: l => 1500 * Math.pow(2.2, l), desc: () => 'Sandıktan çıkan parça +%30' },
  { id: 'read', br: 'Putt', name: 'Yeşil okuma', max: 3, cost: l => 10 * Math.pow(2, l), dur: l => 600 * Math.pow(2.5, l), desc: () => 'Putt okuma çizgisi uzar' },
  { id: 'calm', br: 'Putt', name: 'Sakin eller', max: 3, cost: l => 10 * Math.pow(2, l), dur: l => 600 * Math.pow(2.5, l), desc: () => 'Putt süresi +1 sn, güç çubuğu yavaşlar' },
  { id: 'lab', br: 'Araştırma', name: 'İkinci laboratuvar', max: 1, cost: () => 40, dur: () => 3600, desc: () => 'Aynı anda 2 araştırma' },
];

// Ekipman: 4 yuva × 6 parça. Seviye parçayla geliştirilir.
const RARITY = [
  { name: 'Sıradan', cls: 'r0', col: '#8a948e' }, { name: 'İyi', cls: 'r1', col: '#3f9a52' }, { name: 'Nadir', cls: 'r2', col: '#3a6ee8' },
  { name: 'Epik', cls: 'r3', col: '#8d4fd1' }, { name: 'Efsanevi', cls: 'r4', col: '#d9a521' },
];
const SLOTS = { head: 'Sopa başı', shaft: 'Şaft', grip: 'Tutuş', ball: 'Top' };
const SLOT_TOUR = { head: 'turnuvada taşıma', shaft: 'turnuvada isabet', grip: 'turnuvada zemin cezası', ball: 'turnuvada yuvarlanma' };
const EXTRA = {
  perfect: { name: 'oto mükemmel', f: v => '+%' + (v * 100).toFixed(1) },
  pdc:     { name: 'PD şarjı',      f: v => '+%' + Math.round(v * 100) },
  putt:    { name: 'putt süresi',  f: v => '+' + v.toFixed(1) + ' sn' },
  chest:   { name: 'sandık şansı', f: v => '+%' + Math.round(v * 100) },
  wind:    { name: 'rüzgâr direnci', f: v => '+%' + Math.round(v * 100) },
};
const ITEMS = [
  ['head', 0, 'Paslı Demir', 0.03, null, 0, '#9aa3a8'], ['head', 0, 'Çelik Kafa', 0.05, null, 0, '#c9ced6'], ['head', 1, 'Dövme 7', 0.09, 'perfect', 0.01, '#6fbf73'],
  ['head', 2, 'Karbon Kafa', 0.13, 'wind', 0.1, '#2b2f36'], ['head', 3, 'Titanyum Driver', 0.22, 'pdc', 0.2, '#9b6fd6'], ['head', 4, 'Yıldırım Kafası', 0.45, 'perfect', 0.03, '#f2c230'],
  ['shaft', 0, 'Ceviz Şaft', 0.03, null, 0, '#8a5a32'], ['shaft', 0, 'Hafif Grafit', 0.05, null, 0, '#3a3f47'], ['shaft', 1, 'Esnek X', 0.08, 'perfect', 0.01, '#4a9a5a'],
  ['shaft', 2, 'Regular Pro', 0.12, 'putt', 0.3, '#3a6ee8'], ['shaft', 3, 'Stiff Tour', 0.2, 'perfect', 0.02, '#8d4fd1'], ['shaft', 4, 'Kristal Şaft', 0.4, 'pdc', 0.25, '#bfe6ff'],
  ['grip', 0, 'Lastik Sap', 0.03, null, 0, '#333'], ['grip', 0, 'Deri Sap', 0.05, null, 0, '#7a4a2a'], ['grip', 1, 'Kadife Sarım', 0.08, 'putt', 0.4, '#2f8f4e'],
  ['grip', 2, 'Yapışkan Pro', 0.12, 'wind', 0.1, '#2f64d6'], ['grip', 3, 'Midsize Elit', 0.18, 'chest', 0.05, '#7d4fa3'], ['grip', 4, 'Altın Sap', 0.4, 'putt', 0.8, '#d9a521'],
  ['ball', 0, 'Antrenman Topu', 0.04, null, 0, '#ffffff'], ['ball', 0, 'İki Parça Top', 0.05, null, 0, '#ffffff'], ['ball', 1, 'Yumuşak Kabuk', 0.08, 'putt', 0.3, '#e7ffe0'],
  ['ball', 2, 'Üç Katman Pro', 0.12, 'perfect', 0.02, '#dfe9ff'], ['ball', 3, 'Gümüş Çekirdek', 0.2, 'pdc', 0.15, '#e6d6ff'], ['ball', 4, 'Kuyrukluyıldız', 0.4, 'chest', 0.1, '#fff2b0'],
].map((a, i) => ({ id: 'i' + i, slot: a[0], rar: a[1], name: a[2], dist: a[3], ex: a[4], exv: a[5], col: a[6] }));

// Görünüm: renkler ve parçalar; bazıları hedeflerle açılır
const LOOKS = {
  skin: [['#f1c7a1', 'Açık'], ['#d9a27a', 'Buğday'], ['#a8714d', 'Esmer'], ['#6e4630', 'Koyu']],
  shirt: [['#c8281e', 'Kırmızı'], ['#2f64d6', 'Mavi'], ['#f4f6f1', 'Beyaz'], ['#2f8f4e', 'Yeşil'], ['#f0c419', 'Sarı', 'h9'], ['#7d4fa3', 'Mor', 'album6'], ['#1d2024', 'Siyah', 'course1'], ['#ff8fb1', 'Pembe', 'birdie5'], ['argyle', 'Ekose', 'tour25'], ['gold', 'Altın', 'tour10']],
  pants: [['#2a2f3a', 'Lacivert'], ['#e9e3d3', 'Bej'], ['#f4f6f1', 'Beyaz'], ['#5b6d62', 'Haki'], ['plaid', 'Kareli', 'course1'], ['#c8281e', 'Kırmızı', 'daily1']],
  hat: [['cap', 'Kep'], ['visor', 'Vizör'], ['bucket', 'Balıkçı', 'h3'], ['none', 'Şapkasız'], ['flat', 'Kasket', 'album12'], ['crown', 'Taç', 'course2']],
  hatColor: [['#f4f6f1', 'Beyaz'], ['#1d2024', 'Siyah'], ['#c8281e', 'Kırmızı'], ['#2f64d6', 'Mavi'], ['#2f8f4e', 'Yeşil'], ['#d9a521', 'Altın', 'tour10']],
  club: [['chrome', 'Krom'], ['black', 'Mat siyah'], ['carbon', 'Karbon', 'res5'], ['gold', 'Altın', 'course2']],
  trail: [['white', 'Beyaz'], ['gold', 'Altın', 'birdie5'], ['fire', 'Alev', 'pd25'], ['rainbow', 'Gökkuşağı', 'tour10']],
};
const UNLOCKS = {
  h3: ['Delik 3\'ü bitir', s => s.run.n > 3], h9: ['Delik 9\'u bitir', s => s.run.n > 9],
  course1: ['Kurs 1\'i bitir', s => s.run.n > 18], course2: ['Kurs 2\'yi bitir', s => s.run.n > 36],
  album6: ['Albümde 6 parça', s => Object.keys(s.meta.equip.owned).length >= 6], album12: ['Albümde 12 parça', s => Object.keys(s.meta.equip.owned).length >= 12],
  birdie5: ['5 birdie yap', s => s.meta.stats.birdies >= 5], pd25: ['25 Power Drive vur', s => s.meta.stats.pds >= 25],
  res5: ['5 araştırma bitir', s => Object.values(s.meta.res.lv).reduce((a, b) => a + b, 0) >= 5],
  daily1: ['Günlük delikte par ya da daha iyisi', s => s.meta.stats.dailyPar >= 1],
  tour25: ['Haftalık turnuvada ilk %25', s => s.meta.stats.tourBest <= 25], tour10: ['Haftalık turnuvada ilk %10', s => s.meta.stats.tourBest <= 10],
};

// Hedefler: sırayla açılan uzun vadeli kilometre taşları
const GOALS = [
  ['İlk deliği bitir', s => s.run.n > 1, { bilgi: 5 }],
  ['10 elle vuruş yap', s => s.meta.stats.swings >= 10, { chest: 1 }],
  ['Vurucu 1\'i 5. seviyeye çıkar', s => s.run.hitters[0] >= 5, { bilgi: 5 }],
  ['Delik 3\'ü bitir (Duruş açılır)', s => s.run.n > 3, { parts: 20 }],
  ['İlk sandığı aç', s => s.meta.chestsOpened >= 1, { bilgi: 8 }],
  ['Bir delikte birdie yap', s => s.meta.stats.birdies >= 1, { chest: 1 }],
  ['İlk araştırmayı bitir', s => Object.values(s.meta.res.lv).reduce((a, b) => a + b, 0) >= 1, { parts: 25 }],
  ['Delik 6\'yı bitir (Top açılır)', s => s.run.n > 6, { bilgi: 10 }],
  ['İlk Power Drive', s => s.meta.stats.pds >= 1, { chest: 1 }],
  ['Tutuş 5', s => s.run.up.grip >= 5, { bilgi: 10 }],
  ['Delik 9: rüzgâr ve turnuva açılır', s => s.run.n > 9, { chest: 2 }],
  ['Albümde 4 parça', s => Object.keys(s.meta.equip.owned).length >= 4, { parts: 40 }],
  ['Günlük deliği oyna', s => s.meta.stats.dailyPlayed >= 1, { bilgi: 15 }],
  ['3 vurucu', s => s.run.hitters.length >= 3, { chest: 1 }],
  ['Bir ekipmanı 3. seviyeye geliştir', s => Object.values(s.meta.equip.owned).some(l => l >= 3), { bilgi: 15 }],
  ['Kurs 1\'i bitir: Kupa ×2', s => s.run.n > 18, { chest: 3 }],
  ['20 yıldız topla', s => E.totalStars() >= 20, { parts: 60 }],
  ['Albümde 8 parça', s => Object.keys(s.meta.equip.owned).length >= 8, { bilgi: 25 }],
  ['5 vurucu', s => s.run.hitters.length >= 5, { chest: 2 }],
  ['Haftalık turnuvada bir tur bitir', s => s.meta.stats.tourPlayed >= 1, { bilgi: 25 }],
  ['Delik 27', s => s.run.n > 27, { chest: 2 }],
  ['Kurs 2\'yi bitir: Kupa ×2', s => s.run.n > 36, { chest: 3 }],
  ['50 yıldız topla', s => E.totalStars() >= 50, { parts: 120 }],
  ['Albümde 12 parça', s => Object.keys(s.meta.equip.owned).length >= 12, { bilgi: 40 }],
  ['Kurs 3\'ü bitir', s => s.run.n > 54, { chest: 4 }],
  ['Albümü tamamla (24)', s => Object.keys(s.meta.equip.owned).length >= 24, { bilgi: 100 }],
  ['Kurs 4: Büyük Final', s => s.run.n > 72, { chest: 5 }],
];

const E = (() => {
  let S = null;
  const hooks = { hole() {}, toast() {}, shot() {}, item() {} };
  const rnd = Math.random;
  let silent = false;   // zaman atlarken görsel kancalar susar

  // ---------- durum ----------
  function defaultLook(i) {
    const r = U.mulberry32(1234 + i * 77);
    const base = k => LOOKS[k].filter(x => !x[2]);
    return {
      skin: U.pick(r, LOOKS.skin)[0], shirt: i < 0 ? '#c8281e' : U.pick(r, base('shirt'))[0], pants: U.pick(r, base('pants'))[0],
      hat: i < 0 ? 'cap' : U.pick(r, base('hat'))[0], hatColor: i < 0 ? '#f4f6f1' : U.pick(r, base('hatColor'))[0], club: 'chrome',
    };
  }
  function newMeta() {
    const looks = { p: defaultLook(-1) };
    for (let i = 0; i < 10; i++) looks['h' + i] = defaultLook(i);
    return {
      stars: {}, best: {}, bilgi: 0, parts: 0,
      res: { lv: {}, q: [] },
      equip: { owned: {}, on: { head: null, shaft: null, grip: null, ball: null }, seen: {} },
      chests: [], chestsLost: 0, pity: 0, chestsOpened: 0,
      goals: 0, looks, trail: 'white',
      daily: { day: -1, tries: 0, best: null }, tour: { week: -1, tries: 0, best: null, rewarded: false },
      badge: 0,
      stats: { swings: 0, perfects: 0, holes: 0, playS: 0, bestSwing: 0, birdies: 0, pds: 0, dailyPlayed: 0, dailyPar: 0, tourPlayed: 0, tourBest: 999 },
      gt: 0, epoch: Math.floor(Date.now() / 1000), windSeed: (Math.random() * 1e9) | 0,
    };
  }
  function newRun() {
    return {
      n: 1, prog: 0, carry: 0, yards: 0, total: 0,
      up: { head: 0, shaft: 0, grip: 0, ball: 0, stance: 0, clubhouse: 0 },
      hitters: [1], streak: 0, streakIdle: 0, pd: 0, greenWait: 0,
      tempoUntil: -1, tempoCd: -1, focusUntil: -1, focusCd: -1, goldUntil: -1,
      shot: { k: 0, strokes: 0, lands: [] },
    };
  }
  function fresh() {
    S = { v: 2, meta: newMeta(), run: newRun(), settings: { autoAll: false, buyAmt: 1 }, cfg: {}, lastSeen: Date.now() };
    syncSlots(); dayCheck();
    return S;
  }
  function attach(s) { S = s; Object.assign(CFG, s.cfg || {}); syncSlots(); dayCheck(); }
  const get = () => S;
  const silence = v => { silent = v; };

  // ---------- yardımcılar ----------
  const res = id => S.meta.res.lv[id] || 0;
  const resDef = id => RESEARCH.find(r => r.id === id);
  function slotsUnlocked() { return 1 + res('slot'); }
  function syncSlots() { while (S.run.hitters.length < slotsUnlocked()) S.run.hitters.push(0); }
  const courseOf = n => Math.ceil(n / 18);
  const holeIn = n => ((n - 1) % 18) + 1;
  const courseName = c => c <= 4 ? CFG.courseNames[c - 1] : 'Dünya Turu ' + (c - 4);
  const parOf = n => CFG.parPattern[(n - 1) % 18];
  const segCount = n => parOf(n) - 2;
  const holeLen = n => CFG.holeBase * Math.pow(CFG.holeGrowth, Math.min(n, 18) - 1) * Math.pow(CFG.holeGrowth2, Math.max(0, n - 18));
  const difficulty = n => Math.floor(CFG.diffStep * n);
  const hasWater = n => U.hashF('water', n) < 0.35;
  const msMult = L => Math.pow(CFG.milestoneMult, Math.floor(L / CFG.milestoneEvery));
  const ballMult = L => (1 + 0.08 * L) * Math.pow(1.5, Math.floor(L / 10));
  const holeMult = (n = S.run.n) => Math.pow(CFG.holeMult, n - 1);
  const pMax = () => 0.5;
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
    for (const slot in S.meta.equip.on) { const id = S.meta.equip.on[slot]; if (id) m *= 1 + itemById(id).dist * lvlMul(S.meta.equip.owned[id]); }
    for (const slot in SLOTS) if (albumDone(slot)) m *= 1.05;
    return m;
  }
  const mEquip = () => U.softcap(mEquipRaw(), 5, 0.6);
  const itemPower = id => itemById(id).dist * lvlMul(S.meta.equip.owned[id] || 1);
  function equip(id) { if (S.meta.equip.owned[id]) S.meta.equip.on[itemById(id).slot] = id; }
  const upgradeCost = id => Math.round(10 * Math.pow(1.6, (S.meta.equip.owned[id] || 1) - 1) * (1 + itemById(id).rar));
  function upgradeItem(id) {
    const lv = S.meta.equip.owned[id];
    if (!lv || lv >= 10) return false;
    const c = upgradeCost(id);
    if (S.meta.parts < c) return false;
    S.meta.parts -= c; S.meta.equip.owned[id] = lv + 1;
    return true;
  }
  // turnuva: takılı ekipman sopa istatistiklerine dönüşür
  function tourGear() {
    const on = S.meta.equip.on, g = { carry: 0, acc: 0, lie: 0, roll: 0 };
    const v = slot => on[slot] ? (itemById(on[slot]).rar + 1) * lvlMul(S.meta.equip.owned[on[slot]]) : 0;
    g.carry = 0.012 * v('head'); g.acc = Math.min(0.4, 0.03 * v('shaft')); g.lie = Math.min(0.5, 0.04 * v('grip')); g.roll = 0.04 * v('ball');
    return g;
  }

  // ---------- çarpanlar ----------
  const totalStars = () => Object.values(S.meta.stars).reduce((a, b) => a + b, 0);
  const trophies = (n = S.run.n) => Math.floor((n - 1) / 18);
  const mTrophy = () => Math.pow(CFG.trophyMult, trophies());
  const mStars = () => 1 + 0.01 * totalStars();
  const mRes = () => 1 + 0.2 * res('dist');
  const mBadge = () => 1 + 0.01 * Math.min(10, S.meta.badge);
  const mMeta = () => mTrophy() * mStars() * mEquip() * mRes() * mBadge();
  function metaParts() {
    return [['Kupalar (×2 / kurs)', mTrophy()], ['Yıldızlar (+%1 / ★)', mStars()], ['Ekipman', mEquip()], ['Araştırma', mRes()], ['Turnuva rozeti', mBadge()]];
  }

  // ---------- rüzgâr ----------
  function windActive() { return S.run.n >= CFG.windFromHole; }
  function windAt(t) {
    const seg = Math.floor(t / 45), r = U.hashF(S.meta.windSeed, seg);
    if (r < 0.4) return { kind: 'calm', m: 1, seg };
    if (r < 0.7) return { kind: 'head', m: 0.7, seg };
    return { kind: 'tail', m: 1.4, seg };
  }
  function wind() { return windActive() ? windAt(S.meta.gt) : { kind: 'none', m: 1 }; }
  function windResist() { return Math.min(0.8, 0.2 * res('windr') + eqStat('wind')); }
  function windMul(auto) {
    const w = wind();
    if (w.m >= 1) return w.m;
    const extra = auto ? Math.min(0.4, S.run.hitters.reduce((a, b) => a + b, 0) / 400) : 0;
    return 1 - (1 - w.m) * (1 - Math.min(0.85, windResist() + extra));
  }

  // ---------- zemin: deliği vuruş bölümlerine ayır ----------
  function terrainMult(t) {
    const d = S.run.up.grip - difficulty(S.run.n);
    switch (t) {
      case 'tee': case 'fairway': case 'green': return 1 + 0.1 * U.clamp(d, 0, 5);
      case 'rough': return Math.min(1, 0.6 + 0.1 * res('rough') + 0.03 * U.clamp(d, 0, 5));
      case 'bunker': return Math.min(1, 0.35 + 0.12 * res('bunker') + 0.03 * U.clamp(d, 0, 5));
      case 'water': return 0.6;
    }
    return 1;
  }
  function landingOdds(n = S.run.n) {
    const d = U.clamp(S.run.up.grip - difficulty(n), -4, 5);
    const w = wind().kind;
    let pB = U.clamp(0.14 - 0.05 * d, 0.02, 0.5);
    let pR = U.clamp(0.36 - 0.09 * d + (w === 'head' ? 0.08 : w === 'tail' ? -0.04 : 0), 0.04, 0.6);
    let pW = hasWater(n) ? (d < 0 ? 0.07 : 0.03) : 0;
    const pF = Math.max(0, 1 - pB - pR - pW);
    return { fairway: pF, rough: pR, bunker: pB, water: pW };
  }
  function curLie(run = S.run) {
    const sh = run.shot;
    if (greenPhase()) return sh.lands.length && sh.lands[sh.lands.length - 1] === 'bunker' && !sh.outOfBunker ? 'bunker' : 'green';
    return sh.k === 0 ? 'tee' : sh.lands[sh.k - 1];
  }
  const lieMult = () => terrainMult(curLie());
  function segBoundary(k, n = S.run.n) { return holeLen(n) * 0.9 * k / segCount(n); }
  function rollLanding(isLast) {
    const o = landingOdds();
    let r = rnd();
    for (const t of ['water', 'bunker', 'rough', 'fairway']) { if ((r -= o[t]) < 0) return t; }
    return isLast ? 'green' : 'fairway';
  }
  function checkSegments() {
    const run = S.run, sh = run.shot, n = run.n, S2 = segCount(n);
    while (sh.k < S2 && run.prog >= segBoundary(sh.k + 1)) {
      const last = sh.k === S2 - 1;
      let land = rollLanding(last);
      if (last && land === 'fairway') land = 'green';
      sh.lands.push(land); sh.k++;
      sh.strokes += 1 + (land === 'bunker' ? 1 : 0) + (land === 'water' ? 1 : 0);
      if (!silent) hooks.shot({ k: sh.k, land, last, n });
    }
  }

  // ---------- mesafe ve gelir ----------
  function baseDist(run = S.run) {
    return (5 + 2 * run.up.head) * msMult(run.up.head) * lieMult() * ballMult(run.up.ball) * holeMult(run.n) * mMeta();
  }
  function hitterBoost(run = S.run) {
    const g = S.meta.gt;
    return (run.tempoUntil > g ? 3 : 1) * (run.goldUntil > g ? 5 : 1) * (1 + 0.15 * res('hspeed'));
  }
  function autoRate(run = S.run) { return 0.4 * run.hitters.reduce((a, L) => a + L * msMult(L), 0) * hitterBoost(run); }
  function autoDist(run = S.run) { return baseDist(run) * (1 + pPerfect(run) * (CFG.perfectMult - 1)) * windMul(true); }
  function autoIncome(run = S.run) { return autoRate(run) * autoDist(run); }
  const manualPower = () => CFG.manualPower;
  function streakMult(run = S.run) { return 1 + Math.min(0.05 * run.streak, 0.15 * run.up.stance); }
  const tPD = () => CFG.tPD + 10 * res('pd');
  function manualValue(qm, sm) {
    return Math.max(baseDist() * qm * sm * manualPower() * windMul(false), CFG.tauMan * autoIncome() * qm * sm);
  }
  function manualEV(rate) {
    if (!rate) return { man: 0, pd: 0 };
    const pm = 0.4, pg = 0.45, ev = 0.15 * 0.5 + pg + pm * CFG.perfectMult;
    const sm = 1 + 0.15 * S.run.up.stance * pm;
    const charge = (pg * 5 + pm * 10) * (1 + eqStat('pdc'));
    return { man: rate * manualValue(ev, sm), pd: rate * charge / 100 * tPD() * autoIncome() * ev };
  }
  function incomeEst(rate) { const m = manualEV(rate); return autoIncome() + m.man + m.pd; }

  // ---------- satın alma ----------
  function unlocked(key) { const u = CFG.up[key].unlock; return !u || S.run.n > u; }
  const discount = () => Math.pow(0.95, res('discount'));
  function item(key) {
    const run = S.run;
    if (/^h\d+$/.test(key)) {
      const i = +key.slice(1);
      return { key, base: CFG.hitter.base * Math.pow(CFG.hitter.slotMult, i) * discount(), g: CFG.hitter.g, get L() { return run.hitters[i]; }, set L(v) { run.hitters[i] = v; }, max: CFG.hitter.max, ok: i < run.hitters.length };
    }
    const u = CFG.up[key];
    return { key, base: u.base * discount(), g: u.g, get L() { return run.up[key]; }, set L(v) { run.up[key] = v; }, max: u.max, ok: unlocked(key) };
  }
  const costAt = (it, L) => it.base * Math.pow(it.g, L);
  const bulkCost = (it, n) => it.base * Math.pow(it.g, it.L) * (Math.pow(it.g, n) - 1) / (it.g - 1);
  function maxAfford(it, Y) {
    const n = Math.floor(Math.log(1 + Y * (it.g - 1) / (it.base * Math.pow(it.g, it.L))) / Math.log(it.g));
    return Math.max(0, Math.min(n, it.max - it.L));
  }
  function quote(key, amt) {
    const it = item(key), room = it.max - it.L;
    let n = amt === 'max' ? Math.max(1, maxAfford(it, S.run.yards)) : Math.min(amt, room);
    n = Math.min(n, room);
    return n <= 0 ? { it, n: 0, cost: Infinity } : { it, n, cost: bulkCost(it, n) };
  }
  function buy(key, amt) {
    const q = quote(key, amt);
    if (!q.it.ok || q.n <= 0 || q.cost > S.run.yards) return false;
    S.run.yards -= q.cost; q.it.L += q.n;
    return true;
  }
  function autoBuy(rate) {
    if (!S.settings.autoAll) return 0;
    const keys = S.run.hitters.map((_, i) => 'h' + i).concat(['head', 'shaft', 'ball', 'grip', 'stance']);
    if (!keys.some(k => { const it = item(k); return it.ok && it.L < it.max && costAt(it, it.L) <= S.run.yards; })) return 0;
    let bought = 0;
    for (let guard = 0; guard < 300; guard++) {
      const inc0 = incomeEst(rate);
      let best = null, bestR = 0;
      for (const k of keys) {
        const it = item(k);
        if (!it.ok || it.L >= it.max) continue;
        const price = costAt(it, it.L);
        if (price > S.run.yards) continue;
        // tutuş: geliri yerine beklenen zemin çarpanıyla değerlendir
        let gain;
        if (k === 'grip') { const e0 = expLie(); it.L++; gain = inc0 * (expLie() / e0 - 1); it.L--; }
        else { it.L++; gain = incomeEst(rate) - inc0; it.L--; }
        if (gain / price > bestR) { bestR = gain / price; best = it; }
      }
      if (!best) break;
      S.run.yards -= costAt(best, best.L); best.L++; bought++;
    }
    return bought;
  }
  function expLie() {
    const o = landingOdds();
    return o.fairway * terrainMult('fairway') + o.rough * terrainMult('rough') + o.bunker * terrainMult('bunker') + o.water * terrainMult('water');
  }

  // ---------- delik akışı ----------
  const stats = { auto: 0, man: 0, pd: 0, gold: 0, chest: 0 };
  function addYards(y, src, o) {
    if (!(y > 0)) return;
    const run = S.run;
    run.yards += y; run.total += y;
    if (!silent) stats[src] = (stats[src] || 0) + y;
    run.prog += y;
    checkSegments();
    checkHole(o || {});
  }
  function greenPhase() { return S.run.prog >= 0.9 * holeLen(S.run.n); }
  function checkHole(o) {
    const run = S.run;
    for (let guard = 0; guard < 40; guard++) {
      const len = holeLen(run.n);
      if (run.prog < len) break;
      if (o.waitPutt && run.greenWait < CFG.greenGrace) { run.carry += run.prog - len; run.prog = len; break; }
      completeHole(3, true, o);
    }
  }
  function starsFor(rel) { return rel <= -1 ? 3 : rel === 0 ? 2 : rel === 1 ? 1 : 0; }
  function completeHole(putts, auto, o = {}) {
    const run = S.run, meta = S.meta, n = run.n, par = parOf(n);
    checkSegments();
    const strokes = run.shot.strokes + putts;
    const rel = strokes - par;
    const stars = starsFor(rel);
    const prevStar = meta.stars[n] || 0;
    meta.stars[n] = Math.max(prevStar, stars);
    meta.best[n] = Math.min(meta.best[n] || 99, strokes);
    if (rel <= -1) meta.stats.birdies++;
    const len = holeLen(n);
    const carry = Math.max(0, run.prog - len) + run.carry;
    run.carry = 0; run.greenWait = 0;
    addChest({ tier: stars === 3 ? 1 : 0, n });
    meta.stats.holes++;
    run.n++;
    run.shot = { k: 0, strokes: 0, lands: [] };
    const nl = holeLen(run.n);
    run.prog = o.waitPutt ? Math.min(carry, segBoundary(1) * 0.98) : carry;
    if (!silent) hooks.hole({ n, par, strokes, rel, stars, auto, newStar: stars > prevStar, courseDone: n % 18 === 0 });
  }
  function puttDone(tries) {
    if (tries === 1) S.meta.stats.oneputts = (S.meta.stats.oneputts || 0) + 1;
    S.run.prog = Math.max(S.run.prog, holeLen(S.run.n));
    completeHole(tries, false, { waitPutt: true });
  }

  // ---------- sandıklar ----------
  const chestCap = () => 10 + 10 * res('chestcap');
  function addChest(b) { if (S.meta.chests.length < chestCap()) S.meta.chests.push(b); else S.meta.chestsLost++; }
  function chestOdds(tier = 0) {
    const eq = 0.14 + 0.05 * res('luck') + eqStat('chest');
    return { item: eq, legend: 0.01 * (1 + res('luck')), bilgi: 0.22, parts: 0.22, yards: Math.max(0, 1 - eq - 0.44 - 0.01 * (1 + res('luck'))) };
  }
  function rollRarity(tier) {
    const t = tier + res('luck');
    const w = [Math.max(10, 55 - 15 * t), 28, 13 + 8 * t, 4 + 5 * t];
    let x = rnd() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < w.length; i++) if ((x -= w[i]) < 0) return i;
    return 0;
  }
  function grantItem(rar) {
    const pool = ITEMS.filter(i => i.rar === rar);
    const it = pool[Math.floor(rnd() * pool.length)];
    const own = S.meta.equip.owned, isNew = !own[it.id];
    let dupParts = 0;
    if (isNew) own[it.id] = 1;
    else { dupParts = 10 * (rar + 1); S.meta.parts += dupParts; }
    const cur = S.meta.equip.on[it.slot];
    let equipped = false;
    if (!cur || itemPower(it.id) > itemPower(cur)) { S.meta.equip.on[it.slot] = it.id; equipped = true; }
    if (rar >= 2) S.meta.pity = 0;
    if (isNew) S.meta.equip.seen[it.id] = false;
    if (!silent) hooks.item({ item: it, isNew });
    return { kind: 'item', item: it, isNew, dupParts, equipped };
  }
  function openChest(idx = 0) {
    const meta = S.meta, c = meta.chests.splice(idx, 1)[0];
    if (!c) return null;
    meta.chestsOpened++; meta.pity++;
    const o = chestOdds(c.tier);
    let res2;
    if (meta.chestsOpened === 1) res2 = grantItem(0);
    else if (meta.chestsOpened === 2) res2 = { kind: 'bilgi', amount: 12 };
    else if (meta.pity >= 20) { res2 = grantItem(2 + (rnd() < 0.25 ? 1 : 0)); res2.pity = true; }
    else {
      const r = rnd();
      if (r < o.legend) res2 = grantItem(4);
      else if (r < o.legend + o.item) res2 = grantItem(rollRarity(c.tier));
      else if (r < o.legend + o.item + o.bilgi) res2 = { kind: 'bilgi', amount: Math.round((5 + rnd() * 10) * (1 + 0.08 * (c.n || 1)) * (1 + 0.5 * c.tier)) };
      else if (r < o.legend + o.item + o.bilgi + o.parts) res2 = { kind: 'parts', amount: Math.round((10 + rnd() * 15) * (1 + 0.5 * c.tier) * (1 + 0.3 * res('parts'))) };
      else { const secs = 60 + rnd() * 120 * (1 + 0.5 * c.tier); res2 = { kind: 'yards', amount: Math.max(50, incomeEst(0) * secs), secs }; }
    }
    if (res2.kind === 'bilgi') meta.bilgi += res2.amount;
    if (res2.kind === 'parts') meta.parts += res2.amount;
    if (res2.kind === 'yards') addYards(res2.amount, 'chest', { waitPutt: true });
    res2.tier = c.tier;
    return res2;
  }

  // ---------- altın top ----------
  function goldReward() {
    const r = rnd();
    if (r < 0.45) { const y = Math.max(30, incomeEst(0) * 60); addYards(y, 'gold', { waitPutt: true }); return { text: '60 saniyelik gelir', y }; }
    if (r < 0.75) { S.run.goldUntil = S.meta.gt + 20; return { text: '20 sn vurucular ×5' }; }
    if (r < 0.9) { addChest({ tier: 1, n: S.run.n }); return { text: 'İyi sandık' }; }
    if (r < 0.99) { S.meta.parts += 15; return { text: '+15 parça' }; }
    S.run.prog += 0.25 * holeLen(S.run.n); checkSegments(); checkHole({ waitPutt: true });
    return { text: 'HOLE-IN-ONE! Deliğin %25\'i tamamlandı' };
  }

  // ---------- yetenekler ve elle vuruş ----------
  function useAbility(id) {
    const r = S.run, g = S.meta.gt;
    if (id === 'tempo' && res('tempo') && r.tempoCd <= g) { r.tempoUntil = g + 20; r.tempoCd = g + 120; return true; }
    if (id === 'focus' && res('focus') && r.focusCd <= g) { r.focusUntil = g + 10; r.focusCd = g + 60; return true; }
    return false;
  }
  function manualSwing(q) {
    const run = S.run, meta = S.meta, qm = [0.5, 1, CFG.perfectMult][q];
    run.streakIdle = 0;
    if (q === 2) run.streak++; else run.streak = 0;
    meta.stats.swings++;
    if (q === 2) meta.stats.perfects++;
    const sm = streakMult();
    let v, pd = false;
    if (run.pd >= 100) {
      pd = true;
      const tail = wind().kind === 'tail' ? 1.5 : 1;
      v = tPD() * Math.max(autoIncome(), baseDist() * 0.4) * qm * tail;
      run.pd = 0; meta.stats.pds++;
      addYards(v, 'pd', { waitPutt: true });
    } else {
      v = manualValue(qm, sm);
      run.pd = Math.min(100, run.pd + [0, 5, 10][q] * (1 + eqStat('pdc')));
      addYards(v, 'man', { waitPutt: true });
    }
    meta.stats.bestSwing = Math.max(meta.stats.bestSwing, v);
    return { v, q, pd, sm };
  }

  // ---------- araştırma ----------
  function resState(r) {
    const lv = res(r.id);
    if (lv >= r.max) return 'max';
    if (S.meta.res.q.some(q => q.id === r.id)) return 'running';
    return 'open';
  }
  const resSlots = () => 1 + res('lab');
  function startResearch(id) {
    const r = resDef(id), A = S.meta.res;
    if (resState(r) !== 'open' || A.q.length >= resSlots()) return false;
    const lv = res(id), c = r.cost(lv);
    if (S.meta.bilgi < c) return false;
    S.meta.bilgi -= c;
    A.q.push({ id, end: S.meta.gt + r.dur(lv), dur: r.dur(lv) });
    return true;
  }
  function researchTick() {
    const A = S.meta.res;
    for (const q of A.q.slice()) {
      if (S.meta.gt >= q.end) {
        A.lv[q.id] = res(q.id) + 1;
        A.q.splice(A.q.indexOf(q), 1);
        syncSlots();
        if (!silent) hooks.toast('Araştırma bitti: ' + resDef(q.id).name + ' ' + A.lv[q.id], 'blue');
      }
    }
  }

  // ---------- hedefler ----------
  function goalState() {
    const i = S.meta.goals;
    return GOALS.slice(i, i + 3).map((g, k) => ({ idx: i + k, text: g[0], done: !!g[1](S), reward: g[2] }));
  }
  function claimGoal() {
    const g = GOALS[S.meta.goals];
    if (!g || !g[1](S)) return null;
    const rw = g[2];
    if (rw.bilgi) S.meta.bilgi += rw.bilgi;
    if (rw.parts) S.meta.parts += rw.parts;
    for (let i = 0; i < (rw.chest || 0); i++) addChest({ tier: 1, n: S.run.n });
    S.meta.goals++;
    return rw;
  }
  const rewardText = rw => [rw.bilgi && rw.bilgi + ' Bilgi', rw.parts && rw.parts + ' parça', rw.chest && rw.chest + ' sandık'].filter(Boolean).join(' + ');

  // ---------- görünüm ----------
  function lookUnlocked(key, val) {
    const e = LOOKS[key].find(x => x[0] === val);
    return !e || !e[2] || UNLOCKS[e[2]][1](S);
  }

  // ---------- gün / hafta ----------
  const dayIndex = () => Math.floor((S.meta.epoch + S.meta.gt) / 86400);
  function dayCheck() {
    const d = dayIndex(), meta = S.meta;
    if (meta.daily.day !== d) meta.daily = { day: d, tries: 0, best: null };
    const w = Math.floor(d / 7);
    if (meta.tour.week !== w) meta.tour = { week: w, tries: 0, best: null, rewarded: false };
  }

  // ---------- zaman ----------
  function step(dt, o = {}) {
    const run = S.run;
    S.meta.gt += dt;
    addYards(autoIncome() * (o.eff == null ? 1 : o.eff) * dt, 'auto', o);
    if (o.manualRate) { const m = manualEV(o.manualRate); addYards(m.man * dt, 'man', o); addYards(m.pd * dt, 'pd', o); }
    if (o.waitPutt && run.prog >= holeLen(run.n)) { run.greenWait += o.dtReal != null ? o.dtReal : dt; checkHole(o); }
    researchTick();
    autoBuy(o.manualRate || 0);
  }
  function tickOnline(dtGame, dtReal) {
    const run = S.run;
    run.streakIdle += dtReal;
    if (run.streakIdle > 3) run.streak = 0;
    S.meta.stats.playS += dtGame;
    const n = Math.max(1, Math.ceil(dtGame));
    for (let i = 0; i < n; i++) step(dtGame / n, { waitPutt: true, dtReal: dtReal / n });
    dayCheck();
  }
  const offlineEff = () => CFG.offlineEff + 0.1 * res('offline');
  const offlineCapS = () => (CFG.offlineBaseCapH + 2 * S.run.up.clubhouse) * 3600;
  function snapshot() {
    const r = S.run, m = S.meta;
    return {
      total: r.total, n: r.n, lv: Object.values(r.up).reduce((a, b) => a + b, 0) + r.hitters.reduce((a, b) => a + b, 0),
      chests: m.chests.length, lost: m.chestsLost, res: Object.values(m.res.lv).reduce((a, b) => a + b, 0), stars: totalStars(),
    };
  }
  function simulate(seconds, profile, autobuy) {
    const before = snapshot();
    let eff = 1, cap = Infinity, rate = 0;
    if (profile === 'offline') { eff = offlineEff(); cap = offlineCapS(); }
    if (profile === 'active') rate = 0.8;
    const used = Math.min(seconds, cap);
    const saveAuto = S.settings.autoAll;
    S.settings.autoAll = autobuy === 'all';
    const n = Math.min(20000, Math.max(1, Math.ceil(used))), dt = used / n;
    const t0 = performance.now();
    silent = true;
    for (let i = 0; i < n; i++) step(dt, { eff, manualRate: rate, waitPutt: false });
    if (used < seconds) { S.meta.gt += seconds - used; researchTick(); }
    silent = false;
    S.settings.autoAll = saveAuto;
    S.run.greenWait = 0; S.run.streak = 0;
    dayCheck();
    return { before, after: snapshot(), seconds, used, capped: used < seconds, profile, ms: performance.now() - t0 };
  }

  // ---------- turnuva gücü ----------
  function tourG() {
    const m = S.meta;
    return 3 * totalStars() + 60 * trophies() + 4 * Object.values(m.equip.owned).reduce((a, b) => a + b, 0);
  }
  const LEAGUES = [['Bronz', 0], ['Gümüş', 150], ['Altın', 400], ['Platin', 900], ['Elmas', 1800], ['Şampiyon', 3500]];
  function league(G = tourG()) { let i = 0; LEAGUES.forEach((l, k) => { if (G >= l[1]) i = k; }); return { i, name: LEAGUES[i][0] }; }
  const sat = (G, Em, K) => Em * G / (G + K);
  function tourEffects(G = tourG()) { return { power: 1 + sat(G, 0.15, 600), control: sat(G, 0.35, 600), windRes: sat(G, 0.3, 800) }; }

  return {
    hooks, fresh, attach, get, silence,
    courseOf, holeIn, courseName, parOf, segCount, holeLen, difficulty, hasWater, msMult, ballMult, holeMult, pPerfect, pMax,
    mMeta, metaParts, mEquip, mEquipRaw, mTrophy, trophies,
    baseDist, autoRate, autoDist, autoIncome, manualValue, streakMult, manualPower, tPD, incomeEst, hitterBoost,
    wind, windAt, windActive, windMul, windResist,
    terrainMult, landingOdds, curLie, lieMult, segBoundary, expLie,
    item, quote, buy, costAt, unlocked,
    greenPhase, puttDone, addYards, stats, starsFor,
    chestCap, chestOdds, openChest, addChest, itemById, itemPower, equip, eqStat, albumDone, lvlMul, upgradeCost, upgradeItem, tourGear,
    goldReward, useAbility, manualSwing,
    res, resState, resSlots, startResearch,
    goalState, claimGoal, rewardText, lookUnlocked,
    dayIndex, dayCheck,
    tickOnline, simulate, offlineCapS, offlineEff, step,
    totalStars, tourG, league, tourEffects, LEAGUES,
  };
})();
