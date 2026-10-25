// Career economy (prototype 3): seasonless, 24-hole worlds, wind gates, helper specialties, multi-currency.
// All numbers are assumptions to test (TBT).
const CFG = {
  up: {
    power:     { name: { en: 'Power training', tr: 'Güç antrenmanı' }, base: 10, g: 1.24, max: 5000, unlock: 0 },
    // no level caps: past their soft limit timing raises the perfect multiplier, stance and clubhouse keep growing
    timing:    { name: { en: 'Timing', tr: 'Zamanlama' }, base: 60, g: 1.28, max: 5000, unlock: 0 },
    accuracy:  { name: { en: 'Accuracy training', tr: 'İsabet antrenmanı' }, base: 150, g: 2.2, max: 5000, unlock: 0 },
    ball:      { name: { en: 'Ball tech', tr: 'Top teknolojisi' }, base: 400, g: 1.30, max: 5000, unlock: 6 },
    stance:    { name: { en: 'Stance', tr: 'Duruş' }, base: 200, g: 1.35, max: 5000, unlock: 3 },
    clubhouse: { name: { en: 'Clubhouse', tr: 'Kulüp evi' }, base: 2e7, g: 12, max: 5000, unlock: 12 },
  },
  hitter: { base: 25, g: 1.24, max: 5000, slotMult: 1.5 },
  milestoneEvery: 25, milestoneMult: 1.5,
  holeBase: 8000, holeGrowth: 2.3, holeGrowth2: 1.5, holeMult: 1.08, trophyMult: 2, diffStep: 0.5,
  manualPower: 12, perfectMult: 2.5, tauMan: 0.75,
  offlineEff: 0.6, offlineBaseCapH: 4, goldMin: 60, goldMax: 180, greenGrace: 8, autoPutts: 2,
  parPattern: [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 3, 4, 5, 4, 4, 3, 4, 5, 4, 3, 5, 4, 4, 5],
};

const E = (() => {
  let S = null;
  const hooks = { hole() {}, toast() {}, shot() {}, item() {}, ach() {}, gate() {}, world() {}, hazard: null, patience() {} };
  const rnd = Math.random;
  let silent = false;

  // ---------- state ----------
  function defaultLook(i) {
    const r = U.mulberry32(1234 + i * 77), base = k => LOOKS[k].filter(x => !x[2]);
    return { skin: U.pick(r, LOOKS.skin)[0], shirt: i < 0 ? '#c8281e' : U.pick(r, base('shirt'))[0], pants: U.pick(r, base('pants'))[0], hat: i < 0 ? 'cap' : U.pick(r, base('hat'))[0], hatColor: i < 0 ? '#f4f6f1' : U.pick(r, base('hatColor'))[0], club: 'chrome' };
  }
  function newMeta() {
    const looks = { p: defaultLook(-1) };
    for (let i = 0; i < 10; i++) looks['h' + i] = defaultLook(i);
    return {
      stars: {}, bonusStars: {}, best: {}, shots: {}, data: 0, shards: 0, medals: 0,
      res: { lv: {}, q: [] }, skills: { pd: 1, focus: 0, tempo: 0, shield: 0 },
      equip: { owned: {}, on: { head: null, shaft: null, grip: null, ball: null }, seen: {} },
      bags: [0], bagsLost: 0, pity: 0, ach: {}, looks, worldOutfit: true, trail: 'white',
      daily: { day: -1, tries: 0, best: null }, tour: { week: -1, tries: 0, best: null, rewarded: false }, rewards: { last: -1, idx: 0 },
      badge: 0,
      stats: { swings: 0, perfects: 0, holes: 0, playS: 0, bestSwing: 0, birdies: 0, pds: 0, gates: 0, bags: 0, bestRar: -1, dailyPlayed: 0, dailyPar: 0, tourPlayed: 0, tourBest: 999 },
      gt: 0, epoch: Math.floor(Date.now() / 1000), windSeed: (Math.random() * 1e9) | 0,
    };
  }
  function newRun() {
    return {
      n: 1, prog: 0, carry: 0, yards: 0, total: 0, locked: false,
      up: { power: 0, timing: 0, accuracy: 0, ball: 0, stance: 0, clubhouse: 0 },
      hitters: [{ L: 1, type: 'fast', rank: 0 }], streak: 0, streakIdle: 0, pd: 0, greenWait: 0,
      tempoUntil: -1, tempoCd: -1, focusUntil: -1, focusCd: -1, shieldUntil: -1, shieldCd: -1, goldUntil: -1,
      shot: { k: 0, strokes: 0, lands: [] }, holeTime: 0, hazard: null,
    };
  }
  function fresh() {
    S = { v: 3, meta: newMeta(), run: newRun(), settings: { autoAll: false, buyAmt: 1, view: 'side', lang: 'en' }, cfg: {}, lastSeen: Date.now() };
    syncSlots(); dayCheck(); return S;
  }
  function attach(s) { S = s; Object.assign(CFG, s.cfg || {}); syncSlots(); dayCheck(); }
  const get = () => S;
  const silence = v => { silent = v; };

  // ---------- helpers ----------
  const res = id => S.meta.res.lv[id] || 0;
  const resDef = id => RESEARCH.find(r => r.id === id);
  const resTotal = () => Object.values(S.meta.res.lv).reduce((a, b) => a + b, 0);
  const skill = id => S.meta.skills[id] || 0;
  function syncSlots() { while (S.run.hitters.length < 1 + res('slot')) S.run.hitters.push({ L: 0, type: null, rank: 0 }); }
  const worldOf = n => Math.min(WORLDS.length - 1, Math.floor((n - 1) / WORLD_HOLES));
  const world = (n = S.run.n) => WORLDS[worldOf(n)];
  const holeIn = n => ((n - 1) % WORLD_HOLES) + 1;
  const parOf = n => CFG.parPattern[(n - 1) % WORLD_HOLES];
  const segCount = n => parOf(n) - 2;
  const holeLen = n => CFG.holeBase * Math.pow(CFG.holeGrowth, Math.min(n, 18) - 1) * Math.pow(CFG.holeGrowth2, Math.max(0, n - 18));
  const terrainDiff = (n = S.run.n) => Math.floor(CFG.diffStep * n) + world(n).terrain;
  const hasWater = n => U.hashF('water', n) < 0.35;
  const msMult = L => Math.pow(CFG.milestoneMult, Math.floor(L / CFG.milestoneEvery));
  const ballMult = L => (1 + 0.08 * L) * Math.pow(1.5, Math.floor(L / 10));
  const holeMult = (n = S.run.n) => Math.pow(CFG.holeMult, n - 1);
  const pPerfect = () => Math.min(0.5, 0.05 + 0.01 * S.run.up.timing);
  // timing past 45 levels keeps paying off through a bigger perfect multiplier
  const critMult = () => CFG.perfectMult + 0.02 * Math.max(0, S.run.up.timing - 45);

  // ---------- gear ----------
  const itemById = id => ITEMS.find(i => i.id === id);
  function gearSum() {
    const g = { power: 0, tempo: 0, acc: 0, wc: 0, mult: 1 };
    for (const slot in S.meta.equip.on) {
      const id = S.meta.equip.on[slot]; if (!id) continue;
      const st = itemStats(itemById(id), S.meta.equip.owned[id]);
      g.power += st.power || 0; g.tempo += st.tempo || 0; g.acc += st.acc || 0; g.wc += st.wc || 0;
      g.mult *= 1 + (st.power || 0);
    }
    g.mult = U.softcap(g.mult, 10, 0.5);
    return g;
  }
  function itemScore(id) { const st = itemStats(itemById(id), S.meta.equip.owned[id] || 1); return (st.power || 0) * 100 + (st.tempo || 0) * 100 + (st.acc || 0) + (st.wc || 0); }
  function equip(id) { if (S.meta.equip.owned[id]) S.meta.equip.on[itemById(id).slot] = id; }
  function upgradeItem(id) {
    const it = itemById(id), lv = S.meta.equip.owned[id];
    if (!lv || lv >= levelCap(it)) return false;
    const c = upgradeShards(it, lv);
    if (S.meta.shards < c) return false;
    S.meta.shards -= c; S.meta.equip.owned[id] = lv + 1; return true;
  }
  const unlockedRarities = () => { let m = 2; for (let r = 3; r < 10; r++) if (res('rar' + r)) m = r; else break; return m; };
  function tourGear() {
    const g = gearSum();
    return { carry: Math.min(0.25, g.power * 0.25 / (1 + g.power)), acc: Math.min(0.45, g.acc / (g.acc + 60)), lie: Math.min(0.5, g.acc / (g.acc + 80)), roll: Math.min(0.5, g.wc / (g.wc + 40)) };
  }

  // ---------- team stats ----------
  function helperAcc() { return S.run.hitters.reduce((a, h) => a + (h.L > 0 && h.type ? helperMods(h).acc : 0), 0); }
  const accuracy = () => S.run.up.accuracy + gearSum().acc + helperAcc() + 3 * res('acc');
  const windControl = () => Math.round(5 + 0.5 * accuracy() + 6 * res('windr') + gearSum().wc);
  const totalStars = () => Object.values(S.meta.stars).reduce((a, b) => a + b, 0) + Object.values(S.meta.bonusStars || {}).reduce((a, b) => a + b, 0);
  const trophies = (n = S.run.n) => worldOf(n);
  const achCount = () => Object.keys(S.meta.ach).length;
  const mTrophy = () => Math.pow(CFG.trophyMult, trophies());
  const mStars = () => 1 + 0.01 * totalStars();
  const mRes = () => 1 + 0.2 * res('dist');
  const mAch = () => 1 + 0.01 * Math.min(10, Math.floor(achCount() / 10));
  const mBadge = () => 1 + 0.01 * Math.min(10, S.meta.badge);
  const mMeta = () => mTrophy() * mStars() * gearSum().mult * mRes() * mAch() * mBadge();
  function metaParts() {
    return [[L('World trophies (×2 each)', 'Dünya kupaları (her biri ×2)'), mTrophy()], [L('Stars (+1% each)', 'Yıldızlar (her biri +%1)'), mStars()], [L('Gear power', 'Ekipman gücü'), gearSum().mult],
      [L('Research', 'Araştırma'), mRes()], [L('Achievements', 'Başarımlar'), mAch()], [L('Tournament badge', 'Turnuva rozeti'), mBadge()]];
  }

  // ---------- wind and gates ----------
  function gateIdx(n = S.run.n) { return world(n).gates.indexOf(holeIn(n)); }
  function holeWind(n = S.run.n) {
    const w = world(n), gi = gateIdx(n);
    return gi >= 0 ? w.wind + w.step * (gi + 1) : Math.round(w.wind + 0.4 * (holeIn(n) - 1));
  }
  function windCycle(t) {
    const r = U.hashF(S.meta.windSeed, Math.floor(t / 45));
    return r < 0.4 ? { kind: 'calm', f: 0.7 } : r < 0.7 ? { kind: 'head', f: 1.3 } : { kind: 'tail', f: 0.9 };
  }
  function wind() {
    const c = windCycle(S.meta.gt), base = holeWind();
    return { kind: c.kind, kmh: Math.round(base * c.f), base, gate: gateIdx() >= 0 };
  }
  const shieldOn = () => S.run.shieldUntil > S.meta.gt;
  function windMul() {
    const w = wind(), wc = windControl();
    let m = w.kmh > wc && !shieldOn() ? Math.max(0.25, Math.pow(wc / w.kmh, 1.5)) : 1;
    if (w.kind === 'tail') m *= 1.2;
    return m;
  }
  const gateBlocked = (n = S.run.n) => gateIdx(n) >= 0 && windControl() < holeWind(n);

  // ---------- terrain ----------
  function terrainMult(t) {
    const d = U.clamp(accuracy() - terrainDiff(), 0, 5);
    switch (t) {
      case 'tee': case 'fairway': case 'green': return 1 + 0.1 * d;
      case 'rough': return Math.min(1, 0.6 + 0.1 * res('rough') + 0.03 * d);
      case 'bunker': return Math.min(1, 0.35 + 0.12 * res('bunker') + 0.03 * d);
      case 'water': return 0.6;
    }
    return 1;
  }
  function landingOdds(n = S.run.n) {
    const w = world(n), d = U.clamp(accuracy() - terrainDiff(n), -4, 5), wk = windCycle(S.meta.gt).kind;
    let pB = U.clamp((0.14 - 0.05 * d) * (w.bunkerX || 1), 0.02, 0.55);
    let pR = U.clamp(0.36 - 0.09 * d + (w.roughBias || 0) + (wk === 'head' ? 0.08 : wk === 'tail' ? -0.04 : 0), 0.04, 0.6);
    const pW = hasWater(n) ? (d < 0 ? 0.07 : 0.03) : 0;
    return { fairway: Math.max(0, 1 - pB - pR - pW), rough: pR, bunker: pB, water: pW };
  }
  function curLie() {
    const sh = S.run.shot;
    if (greenPhase()) return sh.lands.length && sh.lands[sh.lands.length - 1] === 'bunker' ? 'bunker' : 'green';
    return sh.k === 0 ? 'tee' : sh.lands[sh.k - 1];
  }
  const lieMult = () => terrainMult(curLie());
  const segBoundary = (k, n = S.run.n) => holeLen(n) * 0.9 * k / segCount(n);
  function rollLanding() {
    const o = landingOdds(); let r = rnd();
    for (const t of ['water', 'bunker', 'rough', 'fairway']) if ((r -= o[t]) < 0) return t;
    return 'fairway';
  }
  function checkSegments() {
    const run = S.run, sh = run.shot, S2 = segCount(run.n);
    while (sh.k < S2 && run.prog >= segBoundary(sh.k + 1)) {
      const last = sh.k === S2 - 1;
      let land = rollLanding();
      if (last && land === 'fairway') land = 'green';
      sh.lands.push(land); sh.k++;
      sh.strokes += 1 + (land === 'bunker' || land === 'water' ? 1 : 0);
      if (!silent) hooks.shot({ k: sh.k, land, last, n: run.n });
      // an active player gets an escape mini game; away from the game the penalty simply applies
      if (!silent && (land === 'bunker' || land === 'water') && hooks.hazard && hooks.hazard({ k: sh.k, land })) run.hazard = { k: sh.k, land, n: run.n };
    }
  }

  // ---------- distance and income ----------
  const powerBase = () => (5 + 2 * S.run.up.power) * msMult(S.run.up.power);
  function baseDist() { return powerBase() * lieMult() * ballMult(S.run.up.ball) * holeMult() * mMeta(); }
  const heatF = () => Math.min(1, world().heat + 0.1 * res('cool'));
  function rateBoost() {
    const g = S.meta.gt, r = S.run;
    return (r.tempoUntil > g ? 3 : 1) * (r.goldUntil > g ? 5 : 1) * (1 + 0.15 * res('hspeed')) * (1 + gearSum().tempo) * heatF();
  }
  function helperRate(h) { if (!h.L) return 0; const m = h.type ? helperMods(h) : { rate: 1 }; return 0.4 * h.L * msMult(h.L) * m.rate * rateBoost(); }
  function helperValue(h) { return h.type ? helperMods(h).value : 1; }
  const autoRate = () => S.run.hitters.reduce((a, h) => a + helperRate(h), 0);
  const swingDist = () => baseDist() * (1 + pPerfect() * (critMult() - 1)) * windMul();
  // escape mini game result: success removes the penalty stroke and moves the ball out
  function resolveHazard(ok) {
    const h = S.run.hazard; S.run.hazard = null;
    if (!h || !ok) return;
    const sh = S.run.shot;
    if (h.n !== S.run.n || sh.lands[h.k - 1] !== h.land) return;
    sh.lands[h.k - 1] = h.land === 'water' ? 'rough' : (h.k === segCount(S.run.n) ? 'green' : 'fairway');
    sh.strokes = Math.max(0, sh.strokes - 1);
  }
  function hazardName(t, n = S.run.n) { const w = world(n); return t === 'bunker' && w.hazard ? w.hazard : t === 'water' && w.water ? w.water : TERRAIN[t]; }
  function autoIncome() { const d = swingDist(); return S.run.hitters.reduce((a, h) => a + helperRate(h) * helperValue(h) * d, 0); }
  function streakMult() { return 1 + Math.min(0.05 * S.run.streak, 0.15 * S.run.up.stance); }
  const tPD = () => 20 + 10 * skill('pd');
  function manualValue(qm, sm) { return Math.max(baseDist() * qm * sm * CFG.manualPower * windMul(), CFG.tauMan * autoIncome() * qm * sm); }
  function manualEV(rate) {
    if (!rate) return { man: 0, pd: 0 };
    const pm = 0.4, pg = 0.45, ev = 0.075 + pg + pm * CFG.perfectMult, sm = 1 + 0.15 * S.run.up.stance * pm;
    const charge = (pg * 5 + pm * 10) * (1 + 0.1 * (skill('pd') - 1));
    return { man: rate * manualValue(ev, sm), pd: rate * charge / 100 * tPD() * autoIncome() * ev };
  }
  const incomeEst = rate => { const m = manualEV(rate); return autoIncome() + m.man + m.pd; };
  function profile() {
    return { power: powerBase() * ballMult(S.run.up.ball) * gearSum().mult * mRes(), acc: accuracy(), wc: windControl(), tempo: autoRate(), need: terrainDiff() };
  }
  // cosmetic range numbers for the driving-range view
  function rangeShot(q, pd) {
    const pr = Math.log10(Math.max(1, profile().power)), qf = [0.7, 0.92, 1][q];
    const speed = Math.round(U.clamp(88 + 18 * pr, 80, 205) * qf * (pd ? 1.12 : 1));
    const carry = Math.round(U.clamp(1.65 * speed - 20, 35, 340) * (1 + (1 - world().gravity) * 0.6));
    return { speed, carry, total: Math.round(carry * (1.06 + rnd() * 0.08)), height: Math.round(carry * 0.33 * Math.pow(1 / world().gravity, 0.35)) };
  }

  // ---------- purchases ----------
  const unlocked = key => { const u = CFG.up[key].unlock; return !u || S.run.n > u; };
  const discount = () => Math.pow(0.95, res('discount'));
  function item(key) {
    const run = S.run;
    if (/^h\d+$/.test(key)) {
      const i = +key.slice(1), h = run.hitters[i];
      return { key, base: CFG.hitter.base * Math.pow(CFG.hitter.slotMult, i) * discount(), g: CFG.hitter.g, get L() { return h.L; }, set L(v) { h.L = v; }, max: CFG.hitter.max, ok: !!h };
    }
    const u = CFG.up[key];
    return { key, base: u.base * discount(), g: u.g, get L() { return run.up[key]; }, set L(v) { run.up[key] = v; }, max: u.max, ok: unlocked(key) };
  }
  const costAt = (it, L) => it.base * Math.pow(it.g, L);
  const bulkCost = (it, n) => it.base * Math.pow(it.g, it.L) * (Math.pow(it.g, n) - 1) / (it.g - 1);
  function maxAfford(it, Y) { const n = Math.floor(Math.log(1 + Y * (it.g - 1) / (it.base * Math.pow(it.g, it.L))) / Math.log(it.g)); return Math.max(0, Math.min(n, it.max - it.L)); }
  function quote(key, amt) {
    const it = item(key), room = it.max - it.L;
    let n = amt === 'max' ? Math.max(1, maxAfford(it, S.run.yards)) : Math.min(amt, room);
    n = Math.min(n, room);
    return n <= 0 ? { it, n: 0, cost: Infinity } : { it, n, cost: bulkCost(it, n) };
  }
  function buy(key, amt) { const q = quote(key, amt); if (!q.it.ok || q.n <= 0 || q.cost > S.run.yards) return false; S.run.yards -= q.cost; q.it.L += q.n; return true; }
  function expLie() { const o = landingOdds(); return o.fairway * terrainMult('fairway') + o.rough * terrainMult('rough') + o.bunker * terrainMult('bunker') + o.water * terrainMult('water'); }
  function autoBuy(rate) {
    if (!S.settings.autoAll) return 0;
    const keys = S.run.hitters.map((_, i) => 'h' + i).concat(['power', 'timing', 'ball', 'accuracy', 'stance']);
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
        let gain;
        if (k === 'accuracy') {
          const e0 = expLie(), w0 = windMul(), blocked0 = gateBlocked();
          it.L++; gain = inc0 * (expLie() * windMul() / (e0 * w0) - 1) + (blocked0 && !gateBlocked() ? inc0 * 10 : 0); it.L--;
        } else { it.L++; gain = incomeEst(rate) - inc0; it.L--; }
        if (gain / price > bestR) { bestR = gain / price; best = it; }
      }
      if (!best) break;
      S.run.yards -= costAt(best, best.L); best.L++; bought++;
    }
    return bought;
  }

  // ---------- hole flow ----------
  const stats = { auto: 0, man: 0, pd: 0, gold: 0, bag: 0 };
  function addYards(y, src, o) {
    if (!(y > 0)) return;
    const run = S.run;
    run.yards += y; run.total += y;
    if (!silent) stats[src] = (stats[src] || 0) + y;
    if (run.locked) return;
    run.prog += y;
    // wind gate: the ball cannot get past the first shot until wind control is high enough
    if (gateBlocked()) { const cap = segBoundary(1) * 0.995; if (run.prog > cap) run.prog = cap; return; }
    checkSegments(); checkHole(o || {});
  }
  const greenPhase = () => S.run.prog >= 0.9 * holeLen(S.run.n);
  function checkHole(o) {
    const run = S.run;
    for (let guard = 0; guard < 40 && !run.locked; guard++) {
      const len = holeLen(run.n);
      if (run.prog < len) break;
      if (o.waitPutt && run.greenWait < CFG.greenGrace) { run.carry += run.prog - len; run.prog = len; break; }
      completeHole(CFG.autoPutts, true, o);
    }
  }
  const starsFor = rel => rel <= -1 ? 3 : rel === 0 ? 2 : rel === 1 ? 1 : 0;
  function scoreHole(n, nonPutt, putts) {
    const meta = S.meta, par = parOf(n), strokes = nonPutt + putts, rel = strokes - par, stars = starsFor(rel), prev = meta.stars[n] || 0;
    meta.stars[n] = Math.max(prev, stars); meta.best[n] = Math.min(meta.best[n] || 99, strokes);
    if (rel <= -1) meta.stats.birdies++;
    return { par, strokes, rel, stars, newStar: stars > prev };
  }
  function completeHole(putts, auto, o = {}) {
    const run = S.run, meta = S.meta, n = run.n;
    checkSegments();
    meta.shots[n] = run.shot.strokes;
    const sc = scoreHole(n, run.shot.strokes, putts);
    if (gateIdx(n) >= 0) { meta.stats.gates++; meta.medals += 5; }
    meta.data += 1 + worldOf(n);
    if (n % 6 === 0) addBag(n % WORLD_HOLES === 0 ? 2 : 0);
    meta.stats.holes++;
    const carry = Math.max(0, run.prog - holeLen(n)) + run.carry;
    run.carry = 0; run.greenWait = 0;
    run.n++; run.shot = { k: 0, strokes: 0, lands: [] }; run.holeTime = 0; run.hazard = null;
    run.prog = o.waitPutt ? Math.min(carry, segBoundary(1) * 0.98) : carry;
    if (!silent) hooks.hole(Object.assign({ n, auto, worldDone: n % WORLD_HOLES === 0 }, sc));
    checkWorldLock();
  }
  // world gate: the next world opens only with enough stars
  function checkWorldLock() {
    const run = S.run, w = worldOf(run.n), need = WORLDS[w].stars;
    const atStart = holeIn(run.n) === 1;
    const was = run.locked;
    run.locked = atStart && w > 0 && totalStars() < need;
    if (run.locked) run.prog = 0;
    if (was && !run.locked && !silent) hooks.world({ w });
  }
  function puttDone(tries) { S.run.prog = Math.max(S.run.prog, holeLen(S.run.n)); completeHole(tries, false, { waitPutt: true }); }
  function replayDone(n, putts) { const r = scoreHole(n, S.meta.shots[n] != null ? S.meta.shots[n] : segCount(n), putts); checkWorldLock(); return r; }

  // ---------- gear bags ----------
  const bagCap = () => 10 + 10 * res('bagcap');
  function addBag(tier) { if (S.meta.bags.length < bagCap()) S.meta.bags.push(tier); else S.meta.bagsLost++; }
  function rarityWeights(tier) {
    const maxR = unlockedRarities(), k = 1 + 0.8 * tier + 0.3 * res('luck');
    return RARITY_BASE_W.map((w, r) => r <= maxR ? w * Math.pow(k, r) : 0);
  }
  function rollRarity(tier) {
    const w = rarityWeights(tier); let x = rnd() * w.reduce((a, b) => a + b, 0);
    for (let r = 0; r < w.length; r++) if ((x -= w[r]) < 0) return r;
    return 0;
  }
  function grantItem(rar) {
    const pool = ITEMS.filter(i => i.rar === rar), it = pool[Math.floor(rnd() * pool.length)], own = S.meta.equip.owned;
    const isNew = !own[it.id];
    let dup = 0;
    if (isNew) { own[it.id] = 1; S.meta.equip.seen[it.id] = false; } else { dup = dupShards(it); S.meta.shards += dup; }
    const cur = S.meta.equip.on[it.slot];
    let equipped = false;
    if (!cur || itemScore(it.id) > itemScore(cur)) { S.meta.equip.on[it.slot] = it.id; equipped = true; }
    S.meta.stats.bestRar = Math.max(S.meta.stats.bestRar, rar);
    if (rar >= 2) S.meta.pity = 0;
    return { item: it, isNew, dup, equipped };
  }
  function openBag(idx = 0) {
    const meta = S.meta, tier = meta.bags.splice(idx, 1)[0];
    if (tier == null) return null;
    meta.stats.bags++; meta.pity++;
    const def = BAGS[tier], items = [];
    for (let i = 0; i < def.items; i++) {
      let r = rollRarity(tier);
      if (i === 0 && meta.pity >= 15) r = Math.max(r, Math.min(unlockedRarities(), 2));
      items.push(grantItem(r));
    }
    const shards = Math.round(def.shards * (0.8 + rnd() * 0.4));
    meta.shards += shards;
    return { tier, items, shards };
  }

  // ---------- currencies ----------
  function grant(rw) {
    const m = S.meta;
    if (rw.data) m.data += rw.data;
    if (rw.shards) m.shards += rw.shards;
    if (rw.medals) m.medals += rw.medals;
    if (rw.bag != null) addBag(rw.bag);
  }
  function rewardText(rw) {
    const p = [];
    if (rw.bag != null) p.push(N(BAGS[rw.bag]));
    if (rw.data) p.push(rw.data + ' ' + N(CUR.data));
    if (rw.shards) p.push(rw.shards + ' ' + N(CUR.shards));
    if (rw.medals) p.push(rw.medals + ' ' + N(CUR.medals));
    return p.join(' + ');
  }
  const dayIndex = () => Math.floor((S.meta.epoch + S.meta.gt) / 86400);
  function dayCheck() {
    const d = dayIndex(), meta = S.meta;
    if (meta.daily.day !== d) meta.daily = { day: d, tries: 0, best: null };
    const w = Math.floor(d / 7);
    if (meta.tour.week !== w) meta.tour = { week: w, tries: 0, best: null, rewarded: false };
  }
  const dailyReady = () => S.meta.rewards.last < dayIndex();
  function claimDaily() {
    if (!dailyReady()) return null;
    const rw = DAILY[S.meta.rewards.idx % DAILY.length];
    grant(rw); S.meta.rewards.last = dayIndex(); S.meta.rewards.idx++;
    return rw;
  }

  // ---------- achievements ----------
  function checkAch() {
    for (const a of ACH) {
      if (S.meta.ach[a.id]) continue;
      if (a.check(S)) { S.meta.ach[a.id] = true; grant(a.reward); if (!silent) hooks.ach(a); }
    }
  }

  // ---------- golden ball ----------
  function goldReward() {
    const r = rnd();
    if (r < 0.45) { const y = Math.max(30, incomeEst(0) * 60); addYards(y, 'gold', { waitPutt: true }); return { text: L('60 seconds of income', '60 saniyelik gelir'), y }; }
    if (r < 0.7) { S.run.goldUntil = S.meta.gt + 20; return { text: L('Helpers ×5 for 20s', 'Yardımcılar 20 sn ×5') }; }
    if (r < 0.82) { addBag(0); return { text: N(BAGS[0]) }; }
    if (r < 0.92) { S.meta.medals += 5; return { text: '+5 ' + N(CUR.medals) }; }
    if (r < 0.99) { S.meta.data += 8; return { text: '+8 ' + N(CUR.data) }; }
    S.run.prog += 0.25 * holeLen(S.run.n); addYards(1, 'gold', { waitPutt: true });
    return { text: L('HOLE-IN-ONE! 25% of the hole done', 'HOLE-IN-ONE! Deliğin %25\'i tamam') };
  }

  // ---------- skills and manual swing ----------
  function useAbility(id) {
    const r = S.run, g = S.meta.gt;
    if (id === 'tempo' && skill('tempo') && r.tempoCd <= g) { r.tempoUntil = g + 16 + 4 * skill('tempo'); r.tempoCd = g + 120; return true; }
    if (id === 'focus' && skill('focus') && r.focusCd <= g) { r.focusUntil = g + 8 + 2 * skill('focus'); r.focusCd = g + 60; return true; }
    if (id === 'shield' && skill('shield') && r.shieldCd <= g) { r.shieldUntil = g + 8 + 3 * skill('shield'); r.shieldCd = g + 90; return true; }
    return false;
  }
  function upgradeSkill(id) {
    const sk = SKILLS.find(x => x.id === id), l = skill(id);
    if (l >= sk.max) return false;
    const c = skillCost(l);
    if (S.meta.medals < c) return false;
    S.meta.medals -= c; S.meta.skills[id] = l + 1; return true;
  }
  function manualSwing(q) {
    const run = S.run, meta = S.meta, qm = [0.5, 1, critMult()][q];
    run.streakIdle = 0;
    if (q === 2) run.streak++; else run.streak = 0;
    meta.stats.swings++; if (q === 2) meta.stats.perfects++;
    const sm = streakMult();
    let v, pd = false;
    if (run.pd >= 100) {
      pd = true;
      v = tPD() * Math.max(autoIncome(), baseDist() * 0.4) * qm * (wind().kind === 'tail' ? 1.5 : 1);
      run.pd = 0; meta.stats.pds++;
      addYards(v, 'pd', { waitPutt: true });
    } else {
      v = manualValue(qm, sm);
      run.pd = Math.min(100, run.pd + [0, 5, 10][q] * (1 + 0.1 * (skill('pd') - 1)));
      addYards(v, 'man', { waitPutt: true });
    }
    meta.stats.bestSwing = Math.max(meta.stats.bestSwing, v);
    return { v, q, pd, sm, range: rangeShot(q, pd) };
  }

  // ---------- helpers: specialty and rank ----------
  function setHelperType(i, type) {
    const h = S.run.hitters[i]; if (!h || h.type === type) return false;
    if (h.type) { if (S.meta.medals < HELPER_SWITCH_COST) return false; S.meta.medals -= HELPER_SWITCH_COST; }
    h.type = type; return true;
  }
  function rankHelper(i) {
    const h = S.run.hitters[i]; if (!h || !h.type || h.rank >= HELPER_RANK_MAX) return false;
    const c = helperRankCost(h.rank); if (S.meta.medals < c) return false;
    S.meta.medals -= c; h.rank++; return true;
  }

  // ---------- research ----------
  function resState(r) {
    if (res(r.id) >= r.max) return 'max';
    if (S.meta.res.q.some(q => q.id === r.id)) return 'running';
    if (r.req && !res(r.req)) return 'locked';
    return 'open';
  }
  const resSlots = () => 1 + res('lab');
  function canPay(c) { const m = S.meta; return (c.data || 0) <= m.data && (c.shards || 0) <= m.shards && (c.medals || 0) <= m.medals; }
  function pay(c) { const m = S.meta; m.data -= c.data || 0; m.shards -= c.shards || 0; m.medals -= c.medals || 0; }
  function startResearch(id) {
    const r = resDef(id), A = S.meta.res;
    if (resState(r) !== 'open' || A.q.length >= resSlots()) return false;
    const c = r.cost(res(id));
    if (!canPay(c)) return false;
    pay(c); A.q.push({ id, end: S.meta.gt + r.dur(res(id)), dur: r.dur(res(id)) });
    return true;
  }
  function researchTick() {
    const A = S.meta.res;
    for (const q of A.q.slice()) if (S.meta.gt >= q.end) {
      A.lv[q.id] = res(q.id) + 1; A.q.splice(A.q.indexOf(q), 1); syncSlots();
      if (!silent) hooks.toast(L('Research complete: ', 'Araştırma bitti: ') + N(resDef(q.id).name), 'blue');
    }
  }

  // ---------- looks ----------
  function lookUnlocked(key, val) { const e = LOOKS[key].find(x => x[0] === val); return !e || !e[2] || UNLOCKS[e[2]][1](S); }

  // ---------- time ----------
  let achTimer = 0;
  function step(dt, o = {}) {
    const run = S.run;
    S.meta.gt += dt;
    addYards(autoIncome() * (o.eff == null ? 1 : o.eff) * dt, 'auto', o);
    if (o.manualRate) { const m = manualEV(o.manualRate); addYards(m.man * dt, 'man', o); addYards(m.pd * dt, 'pd', o); }
    if (o.waitPutt && !run.locked && run.prog >= holeLen(run.n)) { run.greenWait += o.dtReal != null ? o.dtReal : dt; checkHole(o); }
    researchTick();
    autoBuy(o.manualRate || 0);
    if (run.locked) checkWorldLock();
    achTimer += dt; if (achTimer > 1) { achTimer = 0; checkAch(); }
    patienceTick(dt);
  }
  function tickOnline(dtGame, dtReal) {
    const run = S.run;
    run.streakIdle += dtReal; if (run.streakIdle > 3) run.streak = 0;
    S.meta.stats.playS += dtGame;
    const n = Math.max(1, Math.ceil(dtGame));
    for (let i = 0; i < n; i++) step(dtGame / n, { waitPutt: true, dtReal: dtReal / n });
    dayCheck();
  }
  const offlineEff = () => CFG.offlineEff + 0.1 * res('offline');
  const offlineCapS = () => (CFG.offlineBaseCapH + 2 * S.run.up.clubhouse) * 3600;
  function snapshot() {
    const r = S.run, m = S.meta;
    return { total: r.total, n: r.n, lv: Object.values(r.up).reduce((a, b) => a + b, 0) + r.hitters.reduce((a, h) => a + h.L, 0), bags: m.bags.length, lost: m.bagsLost, res: resTotal(), stars: totalStars(), data: m.data, medals: m.medals, ach: achCount() };
  }
  function simulate(seconds, profileName, autobuy) {
    const before = snapshot();
    let eff = 1, cap = Infinity, rate = 0;
    if (profileName === 'offline') { eff = offlineEff(); cap = offlineCapS(); }
    if (profileName === 'active') rate = 0.8;
    const used = Math.min(seconds, cap), saveAuto = S.settings.autoAll;
    S.settings.autoAll = autobuy === 'all';
    const n = Math.min(20000, Math.max(1, Math.ceil(used))), dt = used / n, t0 = performance.now();
    silent = true;
    for (let i = 0; i < n; i++) step(dt, { eff, manualRate: rate, waitPutt: false });
    if (used < seconds) { S.meta.gt += seconds - used; researchTick(); }
    checkAch();
    silent = false;
    S.settings.autoAll = saveAuto; S.run.greenWait = 0; S.run.streak = 0;
    dayCheck();
    return { before, after: snapshot(), seconds, used, capped: used < seconds, profile: profileName, ms: performance.now() - t0, locked: S.run.locked, gate: gateBlocked() };
  }
  // patience: staying long on one hole pays Medals and up to 2 bonus stars, so nobody has to go back and farm
  function patienceTick(dt) {
    const run = S.run, before = run.holeTime;
    run.holeTime += dt;
    const crossed = t => before < t && run.holeTime >= t;
    for (let t = 600; t <= run.holeTime + 1e-9 && t <= 86400; t += 600) if (crossed(t)) { S.meta.medals += 1; }
    for (const t of PATIENCE_STARS) if (crossed(t)) {
      const b = S.meta.bonusStars || (S.meta.bonusStars = {});
      b[run.n] = (b[run.n] || 0) + 1;
      if (!silent) hooks.patience({ star: true, n: run.n });
      checkWorldLock();
    }
  }
  const PATIENCE_STARS = [1200, 3600];
  function patienceNext() { const t = S.run.holeTime; const nx = PATIENCE_STARS.find(x => x > t); return nx == null ? null : nx - t; }
  // the single upgrade that raises income the most per yard (also used by coach tips)
  function bestUpgrade() {
    const keys = S.run.hitters.map((_, i) => 'h' + i).concat(['power', 'timing', 'ball', 'accuracy', 'stance']);
    const inc0 = incomeEst(0) || 1e-9;
    let best = null;
    for (const k of keys) {
      const it = item(k); if (!it.ok || it.L >= it.max) continue;
      const price = costAt(it, it.L);
      let gain;
      if (k === 'accuracy') { const e0 = expLie() * windMul(), b0 = gateBlocked(); it.L++; gain = inc0 * (expLie() * windMul() / e0 - 1) + (b0 && !gateBlocked() ? inc0 * 50 : 0); it.L--; }
      else { it.L++; gain = incomeEst(0) - inc0; it.L--; }
      const r = gain / price;
      if (!best || r > best.r) best = { key: k, r, gainPct: gain / inc0, cost: price, ok: price <= S.run.yards };
    }
    return best;
  }
  // test tool: jump to the start of a world with a build that can actually play there
  function teleport(w) {
    const n = w * WORLD_HOLES + 1, run = S.run;
    run.n = n; run.prog = 0; run.shot = { k: 0, strokes: 0, lands: [] }; run.locked = false; run.holeTime = 0;
    for (let k = 1; k < n; k++) if (!S.meta.stars[k]) { S.meta.stars[k] = 2; S.meta.best[k] = parOf(k); S.meta.shots[k] = segCount(k); }
    run.up.power = Math.max(run.up.power, Math.round(n * 1.6)); run.up.accuracy = Math.max(run.up.accuracy, Math.round(n * 0.55));
    run.up.ball = Math.max(run.up.ball, Math.round(n * 0.7)); run.up.timing = Math.max(run.up.timing, Math.min(45, n));
    run.hitters.forEach(h => { if (h.L < n) h.L = Math.round(n * 1.4); if (!h.type) h.type = 'pow'; });
    for (let g = 0; g < 400 && windControl() < world().wind + 2; g++) run.up.accuracy++;
    // grow the build until the first shot of the hole takes about five minutes
    for (let g = 0; g < 4000 && autoIncome() * 300 < segBoundary(1); g++) { run.up.power += 3; run.up.ball += 1; run.hitters.forEach(h => { h.L += 3; }); }
    if (!silent) hooks.world({ w });
  }

  // ---------- tournament power ----------
  function tourG() { let lv = 0; for (const id in S.meta.equip.owned) lv += S.meta.equip.owned[id] * (1 + itemById(id).rar); return 3 * totalStars() + 80 * worldOf(S.run.n) + 2 * lv; }
  const LEAGUES = [['Bronze', 'Bronz', 0], ['Silver', 'Gümüş', 150], ['Gold', 'Altın', 400], ['Platinum', 'Platin', 900], ['Diamond', 'Elmas', 1800], ['Champion', 'Şampiyon', 3500]];
  function league(G = tourG()) { let i = 0; LEAGUES.forEach((l, k) => { if (G >= l[2]) i = k; }); return { i, name: L(LEAGUES[i][0], LEAGUES[i][1]) }; }
  const sat = (G, Em, K) => Em * G / (G + K);
  const tourEffects = (G = tourG()) => ({ power: 1 + sat(G, 0.15, 600), control: sat(G, 0.35, 600), windRes: sat(G, 0.3, 800) });

  return {
    hooks, fresh, attach, get, silence,
    worldOf, world, holeIn, parOf, segCount, holeLen, terrainDiff, hasWater, msMult, ballMult, holeMult, pPerfect, critMult,
    resolveHazard, hazardName, patienceNext, bestUpgrade, expLie,
    mMeta, metaParts, mTrophy, trophies, gearSum, itemScore,
    accuracy, windControl, holeWind, wind, windMul, windCycle, gateIdx, gateBlocked, shieldOn, heatF,
    terrainMult, landingOdds, curLie, lieMult, segBoundary,
    powerBase, baseDist, autoRate, swingDist, autoIncome, helperRate, helperValue, manualValue, streakMult, tPD, incomeEst, profile, rangeShot, rateBoost,
    item, quote, buy, costAt, unlocked,
    greenPhase, puttDone, replayDone, addYards, stats, starsFor, checkWorldLock,
    bagCap, rarityWeights, unlockedRarities, openBag, addBag, itemById, equip, upgradeItem, tourGear,
    grant, rewardText, dailyReady, claimDaily,
    goldReward, useAbility, upgradeSkill, manualSwing, skill, setHelperType, rankHelper,
    res, resTotal, resState, resSlots, canPay, startResearch,
    lookUnlocked, dayIndex, dayCheck, achCount,
    tickOnline, simulate, offlineCapS, offlineEff, step, teleport,
    totalStars, tourG, league, tourEffects, LEAGUES,
  };
})();
