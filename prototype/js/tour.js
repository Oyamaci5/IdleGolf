// Gerçek ölçekli golf: günlük delik, haftalık turnuva ve antrenman.
// Sopa → nişan → halka. Her vuruştan sonra rastgeleliğin (sapma, rüzgâr, zemin) dökümü gösterilir.
const CLUBS = [
  { id: 'D', name: 'Driver', carry: 250, dev: 0.075, roll: 0.12, apex: 0.10, note: { en: 'Longest, least accurate. Tee only.', tr: 'En uzun, en az isabetli. Yalnızca tee\'den.' } },
  { id: '3W', name: '3 Wood', carry: 225, dev: 0.065, roll: 0.10, apex: 0.11, note: { en: 'Long and rolls out. Not from bunkers.', tr: 'Uzun ve yuvarlanır. Bunkerden olmaz.' } },
  { id: '5i', name: '5 Iron', carry: 185, dev: 0.052, roll: 0.07, apex: 0.13, note: { en: 'Long approach.', tr: 'Uzun yaklaşma.' } },
  { id: '7i', name: '7 Iron', carry: 160, dev: 0.046, roll: 0.05, apex: 0.15, note: { en: 'Mid approach.', tr: 'Orta yaklaşma.' } },
  { id: '9i', name: '9 Iron', carry: 135, dev: 0.04, roll: 0.035, apex: 0.18, note: { en: 'High and accurate.', tr: 'Yüksek ve isabetli.' } },
  { id: 'PW', name: 'Pitching W.', carry: 110, dev: 0.036, roll: 0.025, apex: 0.2, note: { en: 'Short shot to the green, little roll.', tr: 'Yeşile kısa vuruş, az yuvarlanır.' } },
  { id: 'SW', name: 'Sand W.', carry: 85, dev: 0.034, roll: 0.015, apex: 0.22, note: { en: 'Bunker escapes, almost no roll.', tr: 'Bunkerden çıkış, neredeyse hiç yuvarlanmaz.' } },
];
const LIE = {
  tee: { name: { en: 'Tee', tr: 'Tee' }, m: 1, dev: 1 }, fairway: { name: { en: 'Fairway', tr: 'Fairway' }, m: 1, dev: 1 }, fringe: { name: { en: 'Fringe', tr: 'Yeşil kenarı' }, m: 0.95, dev: 1.1 },
  rough: { name: { en: 'Rough', tr: 'Rough' }, m: 0.85, dev: 1.35 }, trees: { name: { en: 'Under trees', tr: 'Ağaç altı' }, m: 0.7, dev: 1.8 }, bunker: { name: { en: 'Bunker', tr: 'Bunker' }, m: 0.6, dev: 1.6 },
  green: { name: { en: 'Green', tr: 'Yeşil' }, m: 1, dev: 1 },
};

const Tour = (() => {
  let ov, cv, ctx, bg, side, ring, ringCv, msgEl;
  let T = null, raf = 0, last = 0;
  const CW = 560, CH = 700;

  // ---------- delik üretimi ----------
  function crSample(pts, n) {
    const ext = [pts[0], ...pts, pts[pts.length - 1]], out = [];
    for (let i = 1; i < ext.length - 2; i++) for (let s = 0; s < n; s++) {
      const t = s / n, t2 = t * t, t3 = t2 * t, p0 = ext[i - 1], p1 = ext[i], p2 = ext[i + 1], p3 = ext[i + 2];
      out.push([0, 1].map(k => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function genHole(seed, par, hard) {
    const r = U.mulberry32(seed);
    const len = Math.round(par === 3 ? (hard ? 170 : 130) + r() * 70 : par === 4 ? (hard ? 380 : 320) + r() * 90 : (hard ? 520 : 480) + r() * 70);
    const dog = (r() < 0.5 ? -1 : 1) * ((hard ? 22 : 12) + r() * 28);
    let pts;
    if (par === 3) pts = [[0, 0], [(r() - 0.5) * 16, len]];
    else if (par === 4) pts = [[0, 0], [0, 40], [dog * 0.3, len * 0.55], [dog, len * 0.85], [dog * 0.9, len]];
    else pts = [[0, 0], [0, 40], [dog * 0.5, len * 0.4], [-dog * 0.4, len * 0.72], [-dog * 0.2, len]];
    const path = crSample(pts, 16);
    const pin = { x: pts[pts.length - 1][0], y: len };
    const gr = hard ? 9 + r() * 3 : 12 + r() * 5;
    const green = { x: pin.x + (r() - 0.5) * gr * (hard ? 1.2 : 0.6), y: pin.y + (r() - 0.5) * gr * 0.6, r: gr };
    const w = hard ? 22 + r() * 8 : 30 + r() * 12;
    const H = { seed, par, len, path, pin, green, w, hard, ob: hard ? 55 : 80, fwStart: par === 3 ? len + 999 : 55, fwEnd: len - gr - 6, bunkers: [], water: null, trees: [] };
    const px = y => pathX(H, y);
    if (par > 3) {
      const nb = hard ? 3 : 1;
      for (let i = 0; i < nb; i++) {
        const by = 215 + r() * 50 + i * 15;
        if (by < len - 60) H.bunkers.push({ x: px(by) + (i % 2 ? -1 : 1) * (w / 2 + 5), y: by, rx: 10, ry: 7 });
      }
    }
    const ng = hard ? 3 : 1 + Math.floor(r() * 2);
    for (let i = 0; i < ng; i++) {
      const a = Math.PI * 1.5 + (i - (ng - 1) / 2) * 1.1 + (r() - 0.5) * 0.4;
      H.bunkers.push({ x: green.x + Math.cos(a) * (gr + 5), y: green.y + Math.sin(a) * (gr + 5), rx: 7, ry: 5 });
    }
    if (r() < (hard ? 0.7 : 0.35)) {
      if (par === 3) H.water = { x: (r() - 0.5) * 20, y: len - gr - 28, rx: 42, ry: 12 };
      else { const wy = 150 + r() * (len - 240); H.water = { x: px(wy) + (r() < 0.5 ? -1 : 1) * (w / 2 + (hard ? 8 : 16)), y: wy, rx: 15, ry: 45 }; }
    }
    for (let y = 20; y < len + 20; y += 16) for (const sd of [-1, 1]) {
      if (r() < 0.75) H.trees.push({ x: px(y) + sd * (w / 2 + (hard ? 14 : 24) + r() * 22), y: y + (r() - 0.5) * 8, r: 4 + r() * 4 });
    }
    H.slope = { x: (r() - 0.5) * (hard ? 1.0 : 0.6), y: (r() - 0.5) * (hard ? 1.4 : 1.0) };
    H.wind = { ang: r() * Math.PI * 2, kmh: Math.round(hard ? 12 + r() * 20 : r() * 18) };
    return H;
  }
  function pathX(H, y) {
    const p = H.path;
    if (y <= p[0][1]) return p[0][0];
    for (let i = 1; i < p.length; i++) if (p[i][1] >= y) { const u = (y - p[i - 1][1]) / Math.max(1e-6, p[i][1] - p[i - 1][1]); return U.lerp(p[i - 1][0], p[i][0], u); }
    return p[p.length - 1][0];
  }
  const inEll = (o, x, y) => ((x - o.x) / o.rx) ** 2 + ((y - o.y) / o.ry) ** 2 <= 1;
  function surfaceAt(H, x, y) {
    if (H.water && inEll(H.water, x, y)) return 'water';
    const dg = Math.hypot(x - H.green.x, y - H.green.y);
    if (dg < H.green.r) return 'green';
    for (const b of H.bunkers) if (inEll(b, x, y)) return 'bunker';
    if (dg < H.green.r + 3) return 'fringe';
    const cx = pathX(H, y);
    if (Math.abs(x - cx) > H.ob || y < -25 || y > H.len + 45) return 'ob';
    if (y >= H.fwStart && y <= H.fwEnd && Math.abs(x - cx) < H.w / 2) return 'fairway';
    if (y < 8 && Math.abs(x) < 8) return 'tee';
    for (const t of H.trees) if (Math.hypot(x - t.x, y - t.y) < t.r) return 'trees';
    return 'rough';
  }

  // ---------- oturum ----------
  function init() {
    ov = document.getElementById('tourOverlay');
    cv = document.getElementById('tourCanvas');
    ctx = cv.getContext('2d');
    side = document.getElementById('tourSide');
    msgEl = document.getElementById('tourMsg');
    ringCv = document.getElementById('tourRing');
    ring = new Ring(ringCv);
    const dpr = window.devicePixelRatio || 1;
    cv.width = CW * dpr; cv.height = CH * dpr;
    bg = document.createElement('canvas'); bg.width = CW * dpr; bg.height = CH * dpr;
    const drag = e => {
      if (!T || T.phase !== 'aim' || Putt.isOpen()) return;
      const r = cv.getBoundingClientRect(), k = Math.min(r.width / CW, r.height / CH);
      const sx = (e.clientX - r.left - (r.width - CW * k) / 2) / k, sy = (e.clientY - r.top - (r.height - CH * k) / 2) / k;
      setTarget(toWorld(sx, sy), true);
    };
    let down = false;
    cv.addEventListener('pointerdown', e => { down = true; cv.setPointerCapture(e.pointerId); drag(e); });
    cv.addEventListener('pointermove', e => { if (down) drag(e); });
    cv.addEventListener('pointerup', () => { down = false; });
    ringCv.addEventListener('pointerdown', e => { e.preventDefault(); press(); });
    document.getElementById('tourClose').addEventListener('click', close);
  }
  const isOpen = () => !!T;
  const dailySeed = d => U.hash('daily', d);
  const weekSeed = w => U.hash('week', w);
  function dailyHole(day) { const s = dailySeed(day); return genHole(s, [4, 4, 5, 3][s % 4], true); }
  function weekHoles(week) {
    const s = weekSeed(week), r = U.mulberry32(s), pars = [3, 3, 4, 4, 4, 4, 4, 5, 5];
    for (let i = pars.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pars[i], pars[j]] = [pars[j], pars[i]]; }
    return pars.map((p, i) => genHole(U.hash(s, i), p, true));
  }

  function start(mode) {
    const meta = E.get().meta;
    E.dayCheck();
    let holes, title, seedBase;
    if (mode === 'daily') {
      if (meta.daily.tries >= 3) return false;
      meta.daily.tries++;
      seedBase = dailySeed(meta.daily.day); holes = [dailyHole(meta.daily.day)];
      title = L('Daily Hole · Try ', 'Günlük Delik · Deneme ') + meta.daily.tries + '/3';
    } else if (mode === 'tour') {
      if (meta.tour.tries >= 3) return false;
      meta.tour.tries++;
      seedBase = weekSeed(meta.tour.week); holes = weekHoles(meta.tour.week);
      title = L('Weekly Tournament · Round ', 'Haftalık Turnuva · Tur ') + meta.tour.tries + '/3';
    } else {
      seedBase = (Math.random() * 1e9) | 0;
      holes = [genHole(seedBase, [3, 4, 4, 5][seedBase % 4], false)];
      title = L('Practice range (normal difficulty)', 'Antrenman sahası (normal zorluk)');
    }
    const G = E.tourG();
    T = { mode, title, holes, idx: 0, scores: [], G, eff: E.tourEffects(G), gear: E.tourGear(), lg: E.league(G), rng: U.mulberry32((seedBase ^ (Date.now() & 0xffff)) >>> 0), anim: null, flash: null, report: null };
    ov.hidden = false;
    startHole();
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    return true;
  }
  function close() {
    if (Putt.isOpen()) Putt.cancel();
    T = null; ov.hidden = true; cancelAnimationFrame(raf);
    UI.refreshAll();
  }
  function startHole() {
    const H = T.holes[T.idx];
    T.H = H; T.ball = { x: 0, y: 0 }; T.lie = 'tee'; T.strokes = 0; T.trail = []; T.phase = 'aim'; T.manualClub = false; T.report = null; T.ghost = null;
    T.last = { x: 0, y: 0, lie: 'tee' };
    renderBg();
    defaultTarget();
    say(T.idx === 0 && T.strokes === 0 ? L(`Drag to aim, then tap the ring in the yellow.`, `Nişan için sürükle, sonra sarıda halkaya dokun.`) : `${L('Hole', 'Delik')} ${T.idx + 1} · Par ${H.par} · ${H.len} yd`);
    renderSide();
  }
  function say(t) { msgEl.textContent = t; }

  // ---------- koordinatlar ----------
  function view() {
    const H = T.H, s = Math.min((CH - 70) / (H.len + 45), (CW - 20) / 200);
    const xs = H.path.map(p => p[0]);
    return { s, cx: (Math.min(...xs) + Math.max(...xs)) / 2 };
  }
  const toScreen = p => [CW / 2 + (p.x - T.view.cx) * T.view.s, CH - 34 - p.y * T.view.s];
  const toWorld = (sx, sy) => ({ x: (sx - CW / 2) / T.view.s + T.view.cx, y: (CH - 34 - sy) / T.view.s });

  // ---------- sopa ve nişan ----------
  function lieInfo(l = T.lie) {
    const b = LIE[l] || LIE.rough, g = T.gear.lie;
    return { name: b.name, m: 1 - (1 - b.m) * (1 - g), dev: 1 + (b.dev - 1) * (1 - g) };
  }
  const clubOk = c => !((c.id === 'D' && T.lie !== 'tee') || (c.id === '3W' && T.lie === 'bunker'));
  const reach = c => c.carry * T.eff.power * (1 + T.gear.carry) * lieInfo().m;
  const devOf = c => c.dev * (1 - T.eff.control) * (1 - T.gear.acc) * lieInfo().dev;
  function clubFor(d) {
    const usable = CLUBS.filter(clubOk);
    for (let i = usable.length - 1; i >= 0; i--) if (reach(usable[i]) >= d * 0.98) return usable[i];
    return usable[0];
  }
  function defaultTarget() {
    const H = T.H, b = T.ball, dPin = Math.hypot(H.pin.x - b.x, H.pin.y - b.y), maxR = reach(clubFor(9999));
    if (dPin <= maxR) { T.club = clubFor(dPin); T.target = { x: H.pin.x, y: H.pin.y }; }
    else {
      let tgt = null;
      for (const p of H.path) { if (p[1] <= b.y) continue; if (Math.hypot(p[0] - b.x, p[1] - b.y) <= maxR * 0.96) tgt = { x: p[0], y: p[1] }; }
      T.target = tgt || { x: H.pin.x, y: H.pin.y };
      T.club = clubFor(Math.hypot(T.target.x - b.x, T.target.y - b.y));
    }
    T.manualClub = false;
  }
  function setTarget(p, fromDrag) {
    const b = T.ball, d = Math.hypot(p.x - b.x, p.y - b.y);
    if (!T.manualClub) T.club = clubFor(d);
    const mx = reach(T.club);
    if (d > mx) { const k = mx / d; p = { x: b.x + (p.x - b.x) * k, y: b.y + (p.y - b.y) * k }; }
    T.target = p;
    if (fromDrag) renderSide();
  }
  // ---------- vuruş ----------
  function press() {
    if (!T || T.phase !== 'aim' || Putt.isOpen()) return;
    const q = ring.press(false);
    if (q == null) return;
    shoot(q);
  }
  function shoot(q) {
    const b = T.ball, tg = T.target, club = T.club, H = T.H;
    const want = Math.hypot(tg.x - b.x, tg.y - b.y), ang = Math.atan2(tg.y - b.y, tg.x - b.x);
    const ux = Math.cos(ang), uy = Math.sin(ang), lx = -uy, ly = ux;
    const plan = Math.min(want, reach(club));
    const qm = [0.75, 0.95, 1][q], qs = [2.5, 1, 0.3][q];
    const gust = 0.8 + 0.4 * T.rng();
    const wk = H.wind.kmh * gust, wvx = Math.cos(H.wind.ang) * wk, wvy = Math.sin(H.wind.ang) * wk;
    const along = wvx * ux + wvy * uy, cross = wvx * lx + wvy * ly;
    const windLong = plan * qm * 0.006 * along;
    const carry = plan * qm + windLong;
    const z = U.clamp(U.normal(T.rng), -2.5, 2.5);
    const sigma = carry * devOf(club) * qs;
    const devLat = sigma * z;
    const windLat = cross * 0.32 * (carry / 150) * (1 - T.eff.windRes);
    const lat = devLat + windLat;
    const land = { x: b.x + ux * carry + lx * lat, y: b.y + uy * carry + ly * lat };
    const s1 = surfaceAt(H, land.x, land.y);
    const rollK = { fairway: 1, rough: 0.3, trees: 0.15, bunker: 0, green: 0.5, fringe: 0.6, water: 0, ob: 0, tee: 1 }[s1];
    const roll = carry * club.roll * (1 + T.gear.roll) * rollK * (q === 2 ? 1 : 0.8);
    const rdir = Math.atan2(land.y - b.y, land.x - b.x);
    const fin = { x: land.x + Math.cos(rdir) * roll, y: land.y + Math.sin(rdir) * roll };
    let holed = false;
    for (let i = 0; i <= 20; i++) {
      const p = { x: U.lerp(land.x, fin.x, i / 20), y: U.lerp(land.y, fin.y, i / 20) };
      if (Math.hypot(p.x - H.pin.x, p.y - H.pin.y) < 0.6) { holed = true; fin.x = H.pin.x; fin.y = H.pin.y; break; }
    }
    const s2 = holed ? 'green' : surfaceAt(H, fin.x, fin.y);
    T.strokes++;
    T.last = { x: b.x, y: b.y, lie: T.lie };
    T.ghost = { from: { ...b }, plan: { x: b.x + ux * plan, y: b.y + uy * plan }, land, fin };
    T.report = {
      club: club.name, q, plan: Math.round(plan), carry: Math.round(carry), windLong: Math.round(windLong), windLat: windLat, devLat, z, sigma,
      roll: Math.round(roll), from: T.lie, to: s2, gust: wk,
    };
    T.phase = 'fly';
    T.anim = { from: { ...b }, land, fin, apex: carry * club.apex, t: 0, T: 0.8 + carry / 170, rollT: roll > 0.5 ? 0.6 : 0, s2, holed, q, lat };
    T.trail = [];
    T.flash = { text: [L('MISS', 'ISKA'), L('GOOD', 'İYİ'), L('PERFECT', 'MÜKEMMEL')][q], t: 1 };
    renderSide();
    say('');
  }
  function afterShot() {
    const a = T.anim, H = T.H, sess = T, live = () => T === sess;
    T.anim = null;
    if (a.holed) {
      const rel = T.strokes - H.par;
      say(T.strokes === 1 ? 'HOLE-IN-ONE!' : L('Holed out! ', 'Deliğe girdi! ') + scoreName(rel));
      T.flash = { text: T.strokes === 1 ? 'HOLE-IN-ONE!' : scoreName(rel).toUpperCase(), t: 2 };
      T.phase = 'done';
      setTimeout(() => live() && finishHole(T.strokes), 1400);
      return;
    }
    if (a.s2 === 'water' || a.s2 === 'ob') {
      T.strokes++;
      T.ball = { x: T.last.x, y: T.last.y }; T.lie = T.last.lie || 'rough';
      say((a.s2 === 'water' ? L('Water', 'Su engeli') : L('Out of bounds', 'Saha dışı')) + L('! +1 penalty stroke, replay from the last safe spot.', '! +1 ceza vuruşu, son güvenli noktadan devam.'));
      T.flash = { text: a.s2 === 'water' ? L('WATER! +1', 'SU! +1') : 'OB! +1', t: 1.4 };
      T.report.penalty = true;
    } else { T.ball = { x: a.fin.x, y: a.fin.y }; T.lie = a.s2; say(shotLine()); }
    if (T.strokes >= H.par + 4) { say(L('Hole limit (par + 4): ball picked up.', 'Delik sınırı (par + 4): top kaldırıldı.')); T.phase = 'done'; setTimeout(() => live() && finishHole(H.par + 4), 1000); renderSide(); return; }
    if (T.lie === 'green') {
      T.phase = 'putt';
      const ft = Math.hypot(H.pin.x - T.ball.x, H.pin.y - T.ball.y) * 3;
      renderSide();
      setTimeout(() => {
        if (!live()) return;
        Putt.open({
          distFt: Math.max(2, ft), slope: H.slope, fast: H.hard, title: L(`Hole ${T.idx + 1} · On the green`, `Delik ${T.idx + 1} · Yeşilde`),
          sub: L(`Stroke ${T.strokes} · Par ${H.par}`, `Vuruş ${T.strokes} · Par ${H.par}`) + (H.hard ? L(' · fast green', ' · hızlı yeşil') : ''), maxTries: H.par + 4 - T.strokes, noSkip: true,
          tapMsg: L('Ball picked up', 'Top kaldırıldı'), pickOnMax: true, calm: E.res('putt_calm'),
          window: 6 + E.res('putt_calm'), guide: 0.4 + 0.1 * E.res('putt_read'),
          onDone: (tries, info) => { if (!live()) return; T.strokes += tries; finishHole(info && info.picked ? H.par + 4 : T.strokes); },
        });
      }, 700);
      return;
    }
    T.phase = 'aim';
    defaultTarget();
    renderSide();
  }
  function scoreName(rel) {
    return { '-3': 'Albatros', '-2': 'Eagle', '-1': 'Birdie', '0': 'Par', '1': 'Bogey', '2': 'Double bogey', '3': 'Triple bogey' }[rel] || (rel < -3 ? L('Unreal', 'İnanılmaz') : '+' + rel);
  }
  function finishHole(score) {
    if (!T) return;
    T.scores.push(score);
    if (T.idx < T.holes.length - 1) { T.idx++; startHole(); return; }
    renderSide();
    finishRound();
  }

  // ---------- sonuçlar ----------
  const RIVALS = ['Deniz K.', 'Ayşe T.', 'Mert A.', 'Elif S.', 'Can Y.', 'Zeynep D.', 'Burak Ö.', 'Selin E.', 'Emre B.', 'Ece G.', 'Kaan M.', 'Derya U.'];
  function histogram(field, mine) {
    const lo = -3, hi = 6, buckets = [];
    for (let s = lo; s <= hi; s++) buckets.push({ s, n: field.filter(x => (s === lo ? x <= lo : s === hi ? x >= hi : x === s)).length });
    const mx = Math.max(...buckets.map(b => b.n));
    return `<div class="hist">${buckets.map(b => `<div class="${b.s === U.clamp(mine, lo, hi) ? 'me' : ''}"><i style="height:${(b.n / mx * 100).toFixed(0)}%"></i><span>${b.s === 0 ? 'E' : b.s > 0 ? '+' + b.s : b.s}${b.s === hi ? '+' : ''}</span></div>`).join('')}</div>`;
  }
  function finishRound() {
    const S = E.get(), meta = S.meta;
    const par = T.holes.reduce((a, h) => a + h.par, 0), tot = T.scores.reduce((a, b) => a + b, 0), rel = tot - par;
    const fmtRel = x => x === 0 ? 'E' : x > 0 ? '+' + x : '' + x;
    let html = `<h3>${T.title}</h3><p class="big-score ${rel < 0 ? 'under' : ''}">${fmtRel(rel)}</p><p>${tot} ${L('strokes', 'vuruş')} · par ${par}</p>`;
    if (T.mode === 'daily') {
      meta.stats.dailyPlayed++;
      if (rel <= 0) meta.stats.dailyPar++;
      if (meta.daily.best == null || rel < meta.daily.best) meta.daily.best = rel;
      const r = U.rngOf('dfield', meta.daily.day);
      const field = Array.from({ length: 2000 }, () => Math.round(1.5 + U.normal(r) * 1.3));
      const better = field.filter(x => x < rel).length, ties = field.filter(x => x === rel).length;
      const pct = Math.max(1, Math.round((better + ties / 2) / field.length * 100));
      const tier = pct <= 5 ? 4 : pct <= 10 ? 3 : pct <= 25 ? 2 : pct <= 50 ? 1 : 0;
      E.addBag(tier); meta.data += 10; meta.medals += 5;
      html += `<p>${L(`2,000 players played this hole today. You are in the <b>top ${pct}%</b>.`, `Bugün 2 000 oyuncu aynı deliği oynadı. Sen <b>ilk %${pct}</b> içindesin.`)}</p>${histogram(field, rel)}
        <p>${L('Reward', 'Ödül')}: <b>${N(BAGS[tier])}</b> + 10 ${N(CUR.data)} + 5 ${N(CUR.medals)} <span class="note">${L('(top 5% Diamond, 10% Platinum, 25% Gold, 50% Silver, rest Bronze)', '(ilk %5 Elmas, %10 Platin, %25 Altın, %50 Gümüş, gerisi Bronz)')}</span></p>`;
    } else if (T.mode === 'tour') {
      meta.stats.tourPlayed++;
      if (meta.tour.best == null || rel < meta.tour.best) meta.tour.best = rel;
      const r = U.rngOf('riv', meta.tour.week, T.lg.i);
      const mu = 7 - 1.4 * T.lg.i;
      const rivals = RIVALS.concat(Array.from({ length: 37 }, (_, i) => L('Player ', 'Oyuncu ') + (i + 13))).map(n => ({ n, s: Math.round(mu + U.normal(r) * 3) }));
      const all = rivals.concat([{ n: L('You', 'Sen'), s: meta.tour.best, me: true }]).sort((a, b) => a.s - b.s || (a.me ? -1 : b.me ? 1 : 0));
      const rank = all.findIndex(x => x.me) + 1, pct = Math.round(rank / 50 * 100);
      meta.stats.tourBest = Math.min(meta.stats.tourBest, pct);
      const show = all.filter((x, i) => i < 3 || Math.abs(i + 1 - rank) <= 2);
      html += `<p>${L(`${T.lg.name} league · group of 50 · your best round this week (${fmtRel(meta.tour.best)}) ranks <b>#${rank}</b> (top ${pct}%).`, `${T.lg.name} ligi · 50 kişilik grup · bu haftaki en iyi turun (${fmtRel(meta.tour.best)}) ile <b>${rank}. sıra</b> (ilk %${pct}).`)}</p>
        <table class="sumtable">${show.map(x => `<tr class="${x.me ? 'me' : ''}"><td>${all.indexOf(x) + 1}. ${x.n}</td><td>${fmtRel(x.s)}</td></tr>`).join('')}</table>`;
      meta.data += 15; meta.medals += 20;
      html += `<p>+15 ${N(CUR.data)}, +20 ${N(CUR.medals)}.</p>`;
      if (pct <= 10 && !meta.tour.rewarded) { meta.tour.rewarded = true; meta.badge = Math.min(10, meta.badge + 1); meta.medals += 40; E.addBag(2); html += `<p class="gold">${L('Top 10%: Tournament badge (+1% career distance), Gold Bag, +40 Medals.', 'İlk %10: Turnuva Rozeti (kariyer mesafesi +%1), Altın Çanta, +40 Madalya.')}</p>`; }
    } else html += `<p>${L('Practice: no reward, no try used.', 'Antrenman: ödül yok, deneme hakkı harcanmadı.')}</p>`;
    html += `<div class="btnrow"><button class="btn primary" id="tourDoneBtn">${L('Back to career', 'Kariyere dön')}</button></div>`;
    T.phase = 'over';
    UI.modal(html, { onMount: m => m.querySelector('#tourDoneBtn').addEventListener('click', () => { UI.closeModal(); close(); }) });
  }

  // ---------- çizim ----------
  function renderBg() {
    T.view = view();
    const H = T.H, dpr = window.devicePixelRatio || 1, b = bg.getContext('2d');
    b.setTransform(dpr, 0, 0, dpr, 0, 0);
    const S = p => toScreen(p), s = T.view.s;
    b.fillStyle = '#2f5f2c'; b.fillRect(0, 0, CW, CH);
    b.fillStyle = '#4a8a3c';
    b.beginPath();
    for (const p of H.path) { const q = S({ x: p[0] - H.ob, y: p[1] }); b.lineTo(q[0], q[1]); }
    for (let i = H.path.length - 1; i >= 0; i--) { const p = H.path[i]; const q = S({ x: p[0] + H.ob, y: p[1] }); b.lineTo(q[0], q[1]); }
    b.closePath(); b.fill();
    b.save(); b.clip();
    const r = U.mulberry32(H.seed + 7);
    b.fillStyle = 'rgba(30,70,25,0.3)';
    for (let i = 0; i < 1400; i++) b.fillRect(r() * CW, r() * CH, 1.5, 1.5);
    b.restore();
    b.fillStyle = '#fff';
    for (let i = 0; i < H.path.length; i += 3) for (const sd of [-H.ob, H.ob]) { const q = S({ x: H.path[i][0] + sd, y: H.path[i][1] }); b.fillRect(q[0] - 1, q[1] - 3, 2, 6); }
    if (H.fwStart < H.len) {
      const pts = H.path.filter(p => p[1] >= H.fwStart && p[1] <= H.fwEnd).map(p => S({ x: p[0], y: p[1] }));
      const off = document.createElement('canvas'); off.width = bg.width; off.height = bg.height;
      const o = off.getContext('2d'); o.setTransform(dpr, 0, 0, dpr, 0, 0);
      o.lineCap = 'round'; o.lineJoin = 'round'; o.strokeStyle = '#6db54d'; o.lineWidth = H.w * s;
      o.beginPath(); pts.forEach((q, i) => i ? o.lineTo(q[0], q[1]) : o.moveTo(q[0], q[1])); o.stroke();
      o.globalCompositeOperation = 'source-atop'; o.fillStyle = '#7cc45a';
      const band = 12 * s;
      for (let y = 0; y < CH; y += band * 2) o.fillRect(0, y, CW, band);
      b.setTransform(1, 0, 0, 1, 0, 0); b.drawImage(off, 0, 0); b.setTransform(dpr, 0, 0, dpr, 0, 0);
      [[200, '#3a6ee8'], [150, '#ffffff'], [100, '#d6281e']].forEach(([d, col]) => {
        const y = H.green.y - d;
        if (y < H.fwStart || y > H.fwEnd) return;
        const q = S({ x: pathX(H, y) + H.w / 2 + 2, y });
        b.fillStyle = col; b.beginPath(); b.arc(q[0], q[1], 3.5, 0, Math.PI * 2); b.fill();
        b.fillStyle = 'rgba(255,255,255,0.85)'; b.font = '600 10px "Barlow Condensed", sans-serif'; b.fillText(d, q[0] + 6, q[1] + 3);
      });
    }
    if (H.water) {
      const q = S(H.water);
      const g = b.createRadialGradient(q[0], q[1], 2, q[0], q[1], Math.max(H.water.rx, H.water.ry) * s);
      g.addColorStop(0, '#3f8ed6'); g.addColorStop(1, '#2b6aa8');
      b.fillStyle = g; b.beginPath(); b.ellipse(q[0], q[1], H.water.rx * s, H.water.ry * s, 0, 0, Math.PI * 2); b.fill();
      b.strokeStyle = 'rgba(255,255,255,0.35)'; b.lineWidth = 1;
      for (let i = 0; i < 5; i++) { b.beginPath(); b.arc(q[0] + (r() - 0.5) * H.water.rx * s, q[1] + (r() - 0.5) * H.water.ry * s, 4 + r() * 5, Math.PI * 1.1, Math.PI * 1.9); b.stroke(); }
    }
    const gq = S(H.green);
    b.fillStyle = '#7fcb5c'; b.beginPath(); b.arc(gq[0], gq[1], (H.green.r + 3) * s, 0, Math.PI * 2); b.fill();
    b.fillStyle = '#9ddd7a'; b.beginPath(); b.arc(gq[0], gq[1], H.green.r * s, 0, Math.PI * 2); b.fill();
    for (const bk of H.bunkers) {
      const q = S(bk);
      b.fillStyle = '#c9b072'; b.beginPath(); b.ellipse(q[0], q[1], bk.rx * s + 1.5, bk.ry * s + 1.5, 0.3, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#ecdba6'; b.beginPath(); b.ellipse(q[0], q[1], bk.rx * s, bk.ry * s, 0.3, 0, Math.PI * 2); b.fill();
    }
    for (const t of H.trees) {
      const q = S(t);
      b.fillStyle = 'rgba(0,0,0,0.25)'; b.beginPath(); b.arc(q[0] + 3, q[1] + 3, t.r * s, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#255a27'; b.beginPath(); b.arc(q[0], q[1], t.r * s, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#3a7a35'; b.beginPath(); b.arc(q[0] - t.r * s * 0.3, q[1] - t.r * s * 0.3, t.r * s * 0.55, 0, Math.PI * 2); b.fill();
    }
    const tq = S({ x: 0, y: 0 });
    b.fillStyle = '#86cf63'; b.fillRect(tq[0] - 9 * s, tq[1] - 6 * s, 18 * s, 12 * s);
    b.fillStyle = '#d6281e'; b.beginPath(); b.arc(tq[0] - 6 * s, tq[1], 2, 0, Math.PI * 2); b.arc(tq[0] + 6 * s, tq[1], 2, 0, Math.PI * 2); b.fill();
  }
  function draw() {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(bg, 0, 0); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const H = T.H, s = T.view.s;
    const pq = toScreen(H.pin);
    ctx.fillStyle = '#1a2a1a'; ctx.beginPath(); ctx.arc(pq[0], pq[1], 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pq[0], pq[1]); ctx.lineTo(pq[0], pq[1] - 26); ctx.stroke();
    const wa = -H.wind.ang, wf = Math.min(1, 0.3 + H.wind.kmh / 25);
    ctx.fillStyle = '#d6281e';
    ctx.beginPath(); ctx.moveTo(pq[0], pq[1] - 26); ctx.lineTo(pq[0] + Math.cos(wa) * 14 * wf, pq[1] - 26 + Math.sin(wa) * 14 * wf + 4); ctx.lineTo(pq[0], pq[1] - 18); ctx.fill();
    const b = T.ball, bq = toScreen(b);
    // son vuruşun planı ve gerçekleşen düşüş (rastgelelik görünür olsun)
    if (T.ghost && T.phase !== 'fly') {
      const gp = toScreen(T.ghost.plan), gl = toScreen(T.ghost.land);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(gp[0], gp[1], 5, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,140,90,0.9)'; ctx.beginPath(); ctx.moveTo(gp[0], gp[1]); ctx.lineTo(gl[0], gl[1]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,140,90,0.95)'; ctx.font = '700 11px "Barlow Condensed", sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('plan', gp[0] + 7, gp[1] - 4);
      ctx.fillText(`sapma ${Math.round(Math.hypot(T.ghost.land.x - T.ghost.plan.x, T.ghost.land.y - T.ghost.plan.y))} yd`, gl[0] + 7, gl[1] + 4);
    }
    if (T.phase === 'aim') {
      const R = reach(T.club) * s, aimA = Math.atan2(-(T.target.y - b.y), T.target.x - b.x);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(bq[0], bq[1], R, aimA - 0.6, aimA + 0.6); ctx.stroke();
      const tq = toScreen(T.target);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bq[0], bq[1]); ctx.lineTo(tq[0], tq[1]); ctx.stroke(); ctx.setLineDash([]);
      const d = Math.hypot(T.target.x - b.x, T.target.y - b.y), sd = d * devOf(T.club);
      ctx.save(); ctx.translate(tq[0], tq[1]); ctx.rotate(aimA);
      ctx.fillStyle = 'rgba(255,230,120,0.12)'; ctx.strokeStyle = 'rgba(255,230,120,0.85)'; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.ellipse(0, 0, Math.max(4, d * 0.05 * s), Math.max(4, 2 * sd * s), 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(tq[0], tq[1], 6, 0, Math.PI * 2); ctx.moveTo(tq[0] - 10, tq[1]); ctx.lineTo(tq[0] + 10, tq[1]); ctx.moveTo(tq[0], tq[1] - 10); ctx.lineTo(tq[0], tq[1] + 10); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '700 12px "Barlow Condensed", sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(Math.round(d) + ' yd · ' + T.club.id, tq[0] + 12, tq[1] - 8);
    }
    let ball = { x: b.x, y: b.y }, h = 0;
    if (T.anim) {
      const a = T.anim;
      if (a.t < a.T) {
        const u = a.t / a.T, ang = Math.atan2(a.land.y - a.from.y, a.land.x - a.from.x), bend = a.lat * (u * u - u) * 0.9;
        ball = { x: U.lerp(a.from.x, a.land.x, u) + Math.sin(ang) * bend, y: U.lerp(a.from.y, a.land.y, u) - Math.cos(ang) * bend };
        h = 4 * a.apex * u * (1 - u);
      } else {
        const u = Math.min(1, (a.t - a.T) / Math.max(0.01, a.rollT)), e = 1 - Math.pow(1 - u, 2);
        ball = { x: U.lerp(a.land.x, a.fin.x, e), y: U.lerp(a.land.y, a.fin.y, e) };
      }
      const q = toScreen(ball);
      T.trail.push([q[0], q[1] - h * s * 0.9]);
      if (T.trail.length > 40) T.trail.shift();
    }
    if (T.trail.length > 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); T.trail.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    }
    if (!(T.phase === 'done' && T.anim && T.anim.holed)) {
      const q = toScreen(ball);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(q[0] + h * s * 0.15, q[1], 3.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q[0], q[1] - h * s * 0.9, 3.2 + h * s * 0.03, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
    const wx = 46, wy = 50;
    ctx.fillStyle = 'rgba(8,30,22,0.75)'; ctx.beginPath(); ctx.arc(wx, wy, 32, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(wx, wy); ctx.rotate(-H.wind.ang);
    ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = 3;
    const arrow = 8 + H.wind.kmh * 0.6;
    ctx.beginPath(); ctx.moveTo(-arrow, 0); ctx.lineTo(arrow - 6, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(arrow, 0); ctx.lineTo(arrow - 9, -6); ctx.lineTo(arrow - 9, 6); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '700 12px "Barlow Condensed", sans-serif';
    ctx.fillText(H.wind.kmh + L(' km/h wind', ' km/s rüzgâr'), wx, wy + 46);
    if (T.flash) {
      ctx.globalAlpha = Math.min(1, T.flash.t * 2);
      ctx.font = '800 34px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(8,30,22,0.7)';
      ctx.strokeText(T.flash.text, CW / 2, 70); ctx.fillStyle = '#ffd23f'; ctx.fillText(T.flash.text, CW / 2, 70);
      ctx.globalAlpha = 1;
    }
  }
  function loop(now) {
    if (!T) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ring.perfectDeg = 12;
    ring.update(dt);
    ring.enabled = T.phase === 'aim' && !Putt.isOpen();
    ring.center = T.club ? T.club.id : '';
    ring.sub = T.phase === 'aim' ? L('SPACE / CLICK', 'BOŞLUK / TIKLA') : '';
    ring.draw();
    if (T.flash) { T.flash.t -= dt; if (T.flash.t <= 0) T.flash = null; }
    if (T.anim) { T.anim.t += dt; if (T.anim.t >= T.anim.T + T.anim.rollT + 0.15) afterShot(); }
    if (T && T.H) draw();
    raf = requestAnimationFrame(loop);
  }

  // ---------- yan panel ----------
  // one short line instead of a breakdown table: quality, carry, how far off and why
  function shotLine() {
    const r = T.report; if (!r) return '';
    const off = r.devLat + r.windLat, side = off > 0 ? L('left', 'sola') : L('right', 'sağa');
    const q = [L('Miss', 'Iska'), L('Good', 'İyi'), L('Perfect', 'Mükemmel')][r.q];
    return `${q} · ${r.carry} yd · ${Math.abs(off).toFixed(0)} yd ${side} (${L('wind', 'rüzgâr')} ${Math.abs(r.windLat).toFixed(0)}, ${L('luck', 'şans')} ${Math.abs(r.devLat).toFixed(0)}) → ${N(LIE[r.to] ? LIE[r.to].name : { en: r.to, tr: r.to })}`;
  }
  const phi = z => 0.5 * (1 + Math.tanh(z * 0.8));
  // projected standing while playing: keeps the round competitive without extra screens
  function projection() {
    const played = T.holes.slice(0, T.scores.length), parSoFar = played.reduce((a, h) => a + h.par, 0);
    const rel = T.scores.reduce((a, b) => a + b, 0) - parSoFar;
    if (T.mode === 'tour') {
      const mu = 7 - 1.4 * T.lg.i, left = T.holes.length - T.scores.length;
      const proj = rel + left * (mu / T.holes.length);
      return L(`Projected #${Math.max(1, Math.round(1 + 49 * phi((proj - mu) / 3)))} of 50`, `Tahmini sıra ${Math.max(1, Math.round(1 + 49 * phi((proj - mu) / 3)))}/50`);
    }
    if (T.mode === 'daily') return L('Field average today: +1.5', 'Bugünkü ortalama: +1.5');
    return '';
  }
  function renderSide() {
    if (!T) return;
    const H = T.H, b = T.ball, dPin = Math.round(Math.hypot(H.pin.x - b.x, H.pin.y - b.y));
    const tot = T.scores.reduce((a, x) => a + x, 0), parDone = T.holes.slice(0, T.scores.length).reduce((a, h) => a + h.par, 0), rel = tot - parDone;
    const cells = T.holes.map((h, i) => {
      const sc = T.scores[i], r = sc != null ? sc - h.par : null;
      const cls = r == null ? '' : r <= -2 ? 'eagle' : r === -1 ? 'birdie' : r === 0 ? '' : r === 1 ? 'bogey' : 'dbl';
      return `<td class="${i === T.idx ? 'cur' : ''}"><span class="sc ${cls}">${sc != null ? sc : i === T.idx ? (T.strokes || '·') : h.par}</span></td>`;
    }).join('');
    const wa = (-H.wind.ang * 180 / Math.PI).toFixed(0);
    side.innerHTML = `
      <div class="t-head"><div><div class="eyebrow">${T.title}</div><div class="t-hole">${L('Hole', 'Delik')} ${T.idx + 1}<small>/${T.holes.length}</small></div></div>
        <div class="t-par">PAR <b>${H.par}</b></div></div>
      <div class="t-big">
        <div><span>${L('To pin', 'Bayrağa')}</span><b>${dPin}<small> yd</small></b></div>
        <div><span>${L('Wind', 'Rüzgâr')}</span><b><i class="warrow" style="transform:rotate(${wa}deg)">➜</i>${H.wind.kmh}<small> km/h</small></b></div>
        <div><span>${L('Score', 'Skor')}</span><b class="${rel < 0 ? 'under' : ''}">${T.scores.length ? (rel === 0 ? 'E' : rel > 0 ? '+' + rel : rel) : 'E'}</b></div>
      </div>
      <div class="t-club">${T.club ? `<b>${T.club.name}</b> · ${N(LIE[T.lie] ? LIE[T.lie].name : { en: T.lie, tr: T.lie })}` : ''}</div>
      ${projection() ? `<div class="t-proj">${projection()}</div>` : ''}
      ${T.holes.length > 1 ? `<div class="card-scroll"><table class="scorecard mini"><tr>${cells}</tr></table></div>` : ''}`;
  }

  return { init, start, close, isOpen, press, genHole, dailyHole, weekHoles, _state: () => T };
})();
