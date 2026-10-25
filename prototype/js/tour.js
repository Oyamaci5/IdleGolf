// Gerçek ölçekli golf modu (§16 turnuva, §17.7 günlük delik): sopa → nişan → halka.
const CLUBS = [
  { id: 'D', name: 'Driver', carry: 250, dev: 0.075, roll: 0.12, apex: 0.10 },
  { id: '3W', name: '3 Wood', carry: 225, dev: 0.065, roll: 0.10, apex: 0.11 },
  { id: '5i', name: '5 Demir', carry: 185, dev: 0.052, roll: 0.07, apex: 0.13 },
  { id: '7i', name: '7 Demir', carry: 160, dev: 0.046, roll: 0.05, apex: 0.15 },
  { id: '9i', name: '9 Demir', carry: 135, dev: 0.04, roll: 0.035, apex: 0.18 },
  { id: 'PW', name: 'Pitching W.', carry: 110, dev: 0.036, roll: 0.025, apex: 0.2 },
  { id: 'SW', name: 'Sand W.', carry: 85, dev: 0.034, roll: 0.015, apex: 0.22 },
];
const LIE_MUL = { tee: 1, fairway: 1, fringe: 0.95, rough: 0.85, trees: 0.7, bunker: 0.6 };
const LIE_TR = { tee: 'Tee', fairway: 'Fairway', fringe: 'Yeşil kenarı', rough: 'Rough', trees: 'Ağaç altı', bunker: 'Bunker', green: 'Yeşil' };

const Tour = (() => {
  let ov, cv, ctx, bg, side, ring, ringCv, msgEl;
  let T = null, raf = 0, last = 0;
  const CW = 560, CH = 700;

  // ---------- delik üretimi (§16.3) ----------
  function crSample(pts, n) {
    const ext = [pts[0], ...pts, pts[pts.length - 1]], out = [];
    for (let i = 1; i < ext.length - 2; i++) for (let s = 0; s < n; s++) {
      const t = s / n, t2 = t * t, t3 = t2 * t, p0 = ext[i - 1], p1 = ext[i], p2 = ext[i + 1], p3 = ext[i + 2];
      out.push([0, 1].map(k => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function genHole(seed, par) {
    const r = U.mulberry32(seed);
    const len = Math.round(par === 3 ? 130 + r() * 80 : par === 4 ? 320 + r() * 130 : 480 + r() * 90);
    const dog = (r() < 0.5 ? -1 : 1) * (12 + r() * 28);
    let pts;
    if (par === 3) pts = [[0, 0], [(r() - 0.5) * 16, len]];
    else if (par === 4) pts = [[0, 0], [0, 40], [dog * 0.3, len * 0.55], [dog, len * 0.85], [dog * 0.9, len]];
    else pts = [[0, 0], [0, 40], [dog * 0.5, len * 0.4], [-dog * 0.4, len * 0.72], [-dog * 0.2, len]];
    const path = crSample(pts, 16);
    const pin = { x: pts[pts.length - 1][0], y: len };
    const gr = 12 + r() * 5;
    const green = { x: pin.x + (r() - 0.5) * gr * 0.6, y: pin.y + (r() - 0.5) * gr * 0.6, r: gr };
    const w = 30 + r() * 12;
    const H = { seed, par, len, path, pin, green, w, fwStart: par === 3 ? len + 999 : 55, fwEnd: len - gr - 6, bunkers: [], water: null, trees: [] };
    const px = y => pathX(H, y);
    if (par > 3) {
      const by = 225 + r() * 40;
      if (by < len - 60) H.bunkers.push({ x: px(by) + (r() < 0.5 ? -1 : 1) * (w / 2 + 6), y: by, rx: 10, ry: 7 });
    }
    const ng = 1 + Math.floor(r() * 2);
    for (let i = 0; i < ng; i++) {
      const a = Math.PI * 1.5 + (r() - 0.5) * 2.6;
      H.bunkers.push({ x: green.x + Math.cos(a) * (gr + 6), y: green.y + Math.sin(a) * (gr + 6), rx: 7, ry: 5 });
    }
    if (r() < 0.4) {
      if (par === 3) H.water = { x: (r() - 0.5) * 20, y: len - gr - 30, rx: 38, ry: 11 };
      else { const wy = 120 + r() * (len - 220); H.water = { x: px(wy) + (r() < 0.5 ? -1 : 1) * (w / 2 + 16), y: wy, rx: 14, ry: 40 }; }
    }
    for (let y = 20; y < len + 20; y += 16) for (const side of [-1, 1]) {
      if (r() < 0.75) H.trees.push({ x: px(y) + side * (w / 2 + 24 + r() * 26), y: y + (r() - 0.5) * 8, r: 4 + r() * 4 });
    }
    H.slope = { x: (r() - 0.5) * 0.7, y: (r() - 0.5) * 0.5 };
    H.wind = { ang: r() * Math.PI * 2, kmh: Math.round(r() * 25) };
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
    if (Math.abs(x - cx) > 80 || y < -25 || y > H.len + 45) return 'ob';
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
      // object-fit: contain kenar boşluğunu hesaba kat
      const r = cv.getBoundingClientRect();
      const k = Math.min(r.width / CW, r.height / CH);
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

  function start(mode) {
    const meta = E.get().meta;
    E.questDayCheck();
    let holes = [], title, seedBase;
    if (mode === 'daily') {
      if (meta.daily.tries >= 3) return false;
      meta.daily.tries++;
      seedBase = U.hash('daily', meta.daily.day);
      holes = [genHole(seedBase, [3, 4, 4, 5][seedBase % 4])];
      title = 'Günlük Delik · Deneme ' + meta.daily.tries + '/3';
      E.questEv('dailyhole');
    } else if (mode === 'tour') {
      if (meta.tour.tries >= 3) return false;
      meta.tour.tries++;
      seedBase = U.hash('week', meta.tour.week);
      const r = U.mulberry32(seedBase);
      const pars = [3, 3, 4, 4, 4, 4, 4, 5, 5];
      for (let i = pars.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pars[i], pars[j]] = [pars[j], pars[i]]; }
      holes = pars.map((p, i) => genHole(U.hash(seedBase, i), p));
      title = 'Haftalık Turnuva · Tur ' + meta.tour.tries + '/3';
    } else {
      seedBase = (Math.random() * 1e9) | 0;
      holes = [genHole(seedBase, [3, 4, 4, 5][seedBase % 4])];
      title = 'Antrenman sahası';
    }
    const G = E.tourG();
    T = { mode, title, holes, idx: 0, scores: [], G, eff: E.tourEffects(G), lg: E.league(G), rng: U.mulberry32(seedBase ^ 0x5bd1e995), anim: null, flash: null };
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
    T.H = H; T.ball = { x: 0, y: 0 }; T.lie = 'tee'; T.strokes = 0; T.trail = []; T.phase = 'aim'; T.manualClub = false;
    T.last = { x: 0, y: 0 };
    renderBg();
    defaultTarget();
    say(`Delik ${T.idx + 1} · Par ${H.par} · ${H.len} yd. Hedefi sürükle, halkaya tıkla.`);
    renderSide();
  }
  function say(t) { msgEl.textContent = t; }

  // ---------- koordinatlar ----------
  function view() {
    const H = T.H;
    const s = Math.min((CH - 70) / (H.len + 45), (CW - 20) / 200);
    const xs = H.path.map(p => p[0]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    return { s, cx };
  }
  function toScreen(p) { const v = T.view; return [CW / 2 + (p.x - v.cx) * v.s, CH - 34 - p.y * v.s]; }
  function toWorld(sx, sy) { const v = T.view; return { x: (sx - CW / 2) / v.s + v.cx, y: (CH - 34 - sy) / v.s }; }

  // ---------- sopa ve nişan ----------
  const lieMul = () => LIE_MUL[T.lie] || 1;
  const reach = c => c.carry * T.eff.power * lieMul();
  function clubFor(d) {
    const usable = CLUBS.filter(c => c.id !== 'D' || T.lie === 'tee');
    for (let i = usable.length - 1; i >= 0; i--) if (reach(usable[i]) >= d * 0.98) return usable[i];
    return usable[0];
  }
  function defaultTarget() {
    const H = T.H, b = T.ball;
    const dPin = Math.hypot(H.pin.x - b.x, H.pin.y - b.y);
    const maxR = reach(clubFor(9999));
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
    const b = T.ball;
    let d = Math.hypot(p.x - b.x, p.y - b.y);
    if (!T.manualClub) T.club = clubFor(d);
    const mx = reach(T.club);
    if (d > mx) { const k = mx / d; p = { x: b.x + (p.x - b.x) * k, y: b.y + (p.y - b.y) * k }; }
    T.target = p;
    if (fromDrag) renderSide();
  }
  function pickClub(id) {
    if (!T || T.phase !== 'aim') return;
    T.club = CLUBS.find(c => c.id === id); T.manualClub = true;
    const b = T.ball, mx = reach(T.club);
    const dPin = Math.hypot(T.H.pin.x - b.x, T.H.pin.y - b.y);
    // seçilen sopanın menziline göre hedefi yeniden yerleştir
    const ang = Math.atan2(T.target.y - b.y, T.target.x - b.x);
    const d = Math.min(mx, dPin <= mx ? dPin : mx);
    T.target = { x: b.x + Math.cos(ang) * d, y: b.y + Math.sin(ang) * d };
    renderSide();
  }

  // ---------- vuruş (§16.4) ----------
  function press() {
    if (!T || T.phase !== 'aim' || Putt.isOpen()) return;
    const q = ring.press(false);
    if (q == null) return;
    shoot(q);
  }
  function windVec() {
    const w = T.H.wind;
    const k = w.kmh * (0.8 + 0.4 * T.rng());
    return { x: Math.cos(w.ang) * k, y: Math.sin(w.ang) * k };
  }
  function shoot(q) {
    const b = T.ball, tg = T.target, club = T.club, eff = T.eff;
    const want = Math.hypot(tg.x - b.x, tg.y - b.y);
    const ang = Math.atan2(tg.y - b.y, tg.x - b.x);
    const ux = Math.cos(ang), uy = Math.sin(ang), lx = -uy, ly = ux;
    const plan = Math.min(want, reach(club));
    const qm = [0.75, 0.95, 1][q], qs = [2.5, 1, 0.3][q];
    const wv = windVec();
    const along = wv.x * ux + wv.y * uy, cross = wv.x * lx + wv.y * ly;
    const carry = plan * qm * (1 + 0.006 * along);
    const z = U.clamp(U.normal(T.rng), -2.5, 2.5);
    const lat = carry * club.dev * (1 - eff.control) * qs * z + cross * 0.32 * (carry / 150) * (1 - eff.windRes);
    const land = { x: b.x + ux * carry + lx * lat, y: b.y + uy * carry + ly * lat };
    const s1 = surfaceAt(T.H, land.x, land.y);
    const rollK = { fairway: 1, rough: 0.3, trees: 0.15, bunker: 0, green: 0.5, fringe: 0.6, water: 0, ob: 0, tee: 1 }[s1];
    const roll = carry * club.roll * rollK * (q === 2 ? 1 : 0.8);
    const rdir = Math.atan2(land.y - b.y, land.x - b.x);
    const fin = { x: land.x + Math.cos(rdir) * roll, y: land.y + Math.sin(rdir) * roll };
    // top rulo yolunda deliğe düştü mü?
    let holed = false;
    const pin = T.H.pin;
    for (let i = 0; i <= 20; i++) {
      const p = { x: U.lerp(land.x, fin.x, i / 20), y: U.lerp(land.y, fin.y, i / 20) };
      if (Math.hypot(p.x - pin.x, p.y - pin.y) < 0.6) { holed = true; fin.x = pin.x; fin.y = pin.y; break; }
    }
    if (!holed && Math.hypot(land.x - pin.x, land.y - pin.y) < 0.5) { holed = true; fin.x = pin.x; fin.y = pin.y; }
    // rulo sırasında su/bunker
    let s2 = holed ? 'green' : surfaceAt(T.H, fin.x, fin.y);
    T.strokes++;
    T.last = { x: b.x, y: b.y, lie: T.lie };
    T.phase = 'fly';
    T.anim = { from: { ...b }, land, fin, carry, apex: carry * club.apex, t: 0, T: 0.8 + carry / 170, rollT: roll > 0.5 ? 0.6 : 0, s1, s2, holed, q, lat };
    T.trail = [];
    T.flash = { text: ['ISKA', 'İYİ', 'MÜKEMMEL'][q], t: 1 };
    renderSide();
    say(`${club.name}: ${Math.round(carry)} yd uçtu${Math.abs(lat) > 3 ? ', ' + Math.abs(lat).toFixed(0) + ' yd ' + (lat > 0 ? 'sola' : 'sağa') + ' saptı' : ''}.`);
  }
  function afterShot() {
    const a = T.anim, H = T.H, sess = T;
    const live = () => T === sess;
    T.anim = null;
    if (a.holed) {
      const rel = T.strokes - H.par;
      say(T.strokes === 1 ? 'HOLE-IN-ONE!' : 'Deliğe girdi! ' + scoreName(rel));
      T.flash = { text: T.strokes === 1 ? 'HOLE-IN-ONE!' : scoreName(rel).toUpperCase(), t: 2 };
      T.phase = 'done';
      setTimeout(() => live() && finishHole(T.strokes), 1400);
      return;
    }
    if (a.s2 === 'water' || a.s2 === 'ob') {
      T.strokes++;
      T.ball = { x: T.last.x, y: T.last.y }; T.lie = T.last.lie || 'rough';
      say((a.s2 === 'water' ? 'Su engeli' : 'Saha dışı') + '! +1 ceza vuruşu, son güvenli noktadan devam.');
      T.flash = { text: a.s2 === 'water' ? 'SU! +1' : 'OB! +1', t: 1.4 };
    } else {
      T.ball = { x: a.fin.x, y: a.fin.y };
      T.lie = a.s2;
    }
    if (T.strokes >= H.par + 4) { say('Delik sınırı (par + 4): top kaldırıldı.'); T.phase = 'done'; setTimeout(() => live() && finishHole(H.par + 4), 1000); renderSide(); return; }
    if (T.lie === 'green') {
      T.phase = 'putt';
      const ft = Math.hypot(H.pin.x - T.ball.x, H.pin.y - T.ball.y) * 3;
      renderSide();
      setTimeout(() => {
        if (!live()) return;
        const allowed = H.par + 4 - T.strokes;
        Putt.open({
          distFt: Math.max(2, ft), slope: H.slope, title: `Delik ${T.idx + 1} · Yeşilde`,
          sub: `Vuruş ${T.strokes} · Par ${H.par}`, maxTries: allowed, noSkip: true,
          tapMsg: 'Top kaldırıldı', pickOnMax: true,
          window: 5 + 0.5 * E.perk('starhunt') + E.eqStat('putt'), guide: 0.45,
          onDone: (tries, info) => {
            if (!live()) return;
            T.strokes += tries;
            finishHole(info && info.picked ? H.par + 4 : T.strokes);
          },
        });
      }, 600);
      return;
    }
    T.phase = 'aim';
    defaultTarget();
    renderSide();
  }
  function scoreName(rel) {
    return { '-3': 'Albatros', '-2': 'Eagle', '-1': 'Birdie', '0': 'Par', '1': 'Bogey', '2': 'Double bogey', '3': 'Triple bogey' }[rel] || (rel < -3 ? 'İnanılmaz' : '+' + rel);
  }
  function finishHole(score) {
    if (!T) return;
    T.scores.push(score);
    if (T.idx < T.holes.length - 1) { T.idx++; startHole(); return; }
    finishRound();
  }
  function finishRound() {
    const meta = E.get().meta;
    const par = T.holes.reduce((a, h) => a + h.par, 0);
    const tot = T.scores.reduce((a, b) => a + b, 0);
    const rel = tot - par;
    const relTxt = rel === 0 ? 'E' : rel > 0 ? '+' + rel : '' + rel;
    let html = `<h3>${T.title}</h3><p class="big-score ${rel < 0 ? 'under' : ''}">${relTxt}</p><p>${tot} vuruş · par ${par}</p>`;
    if (T.mode === 'daily') {
      const tier = rel < 0 ? 2 : rel === 0 ? 1 : 0;
      E.addBag({ tier, c: E.get().run.course, h: E.get().run.hole });
      if (meta.daily.best == null || rel < meta.daily.best) meta.daily.best = rel;
      html += `<p>Ödül: <b>${RARITY[tier].name} çanta</b> (par altı Nadir, par İyi, par üstü Sıradan)</p>`;
    } else if (T.mode === 'tour') {
      if (meta.tour.best == null || rel < meta.tour.best) meta.tour.best = rel;
      const rk = rivals(T.lg.i, meta.tour.week, meta.tour.best);
      html += `<p>${T.lg.name} ligi, 50 kişilik grup: bu haftaki en iyi turunla <b>${rk.rank}. sıra</b> (ilk %${Math.max(1, Math.round(rk.rank / 50 * 100))})</p>`;
      if (rk.rank <= 5 && meta.tour.badgeWeek !== meta.tour.week) {
        meta.tour.badgeWeek = meta.tour.week; meta.badge = Math.min(10, meta.badge + 1);
        html += `<p class="gold">Turnuva Rozeti kazandın: kariyer mesafesi +%1 (toplam +%${meta.badge})</p>`;
      }
      E.get().meta.bilgi += 8;
      html += `<p>+8 Bilgi</p>`;
    } else {
      html += `<p>Antrenman: ödül yok, deneme hakkı harcanmadı.</p>`;
    }
    html += `<button class="btn primary" id="tourDoneBtn">Kariyere dön</button>`;
    T.phase = 'over';
    UI.modal(html, { onMount: m => m.querySelector('#tourDoneBtn').addEventListener('click', () => { UI.closeModal(); close(); }) });
  }
  function rivals(li, week, mine) {
    const r = U.rngOf('riv', week, li);
    const mu = 4 - 1.3 * li;
    let better = 0;
    for (let i = 0; i < 49; i++) { const s = Math.round(mu + U.normal(r) * 2.4); if (s < mine) better++; }
    return { rank: better + 1 };
  }

  // ---------- çizim ----------
  function renderBg() {
    T.view = view();
    const H = T.H;
    const dpr = window.devicePixelRatio || 1;
    const b = bg.getContext('2d');
    b.setTransform(dpr, 0, 0, dpr, 0, 0);
    const S = p => toScreen(p), s = T.view.s;
    b.fillStyle = '#2f5f2c'; b.fillRect(0, 0, CW, CH);
    // oyun alanı (rough)
    b.fillStyle = '#4a8a3c';
    b.beginPath();
    for (const p of H.path) { const q = S({ x: p[0] - 80, y: p[1] }); b.lineTo(q[0], q[1]); }
    for (let i = H.path.length - 1; i >= 0; i--) { const p = H.path[i]; const q = S({ x: p[0] + 80, y: p[1] }); b.lineTo(q[0], q[1]); }
    b.closePath(); b.fill();
    b.save(); b.clip();
    const r = U.mulberry32(H.seed + 7);
    b.fillStyle = 'rgba(30,70,25,0.3)';
    for (let i = 0; i < 1400; i++) b.fillRect(r() * CW, r() * CH, 1.5, 1.5);
    b.restore();
    // saha dışı kazıkları
    b.fillStyle = '#fff';
    for (let i = 0; i < H.path.length; i += 3) for (const sd of [-80, 80]) { const q = S({ x: H.path[i][0] + sd, y: H.path[i][1] }); b.fillRect(q[0] - 1, q[1] - 3, 2, 6); }
    // fairway
    if (H.fwStart < H.len) {
      const pts = H.path.filter(p => p[1] >= H.fwStart && p[1] <= H.fwEnd).map(p => S({ x: p[0], y: p[1] }));
      const off = document.createElement('canvas'); off.width = bg.width; off.height = bg.height;
      const o = off.getContext('2d'); o.setTransform(dpr, 0, 0, dpr, 0, 0);
      o.lineCap = 'round'; o.lineJoin = 'round'; o.strokeStyle = '#6db54d'; o.lineWidth = H.w * s;
      o.beginPath(); pts.forEach((q, i) => i ? o.lineTo(q[0], q[1]) : o.moveTo(q[0], q[1])); o.stroke();
      o.globalCompositeOperation = 'source-atop';
      o.fillStyle = '#7cc45a';
      const band = 12 * s;
      for (let y = 0; y < CH; y += band * 2) o.fillRect(0, y, CW, band);
      b.setTransform(1, 0, 0, 1, 0, 0); b.drawImage(off, 0, 0); b.setTransform(dpr, 0, 0, dpr, 0, 0);
      // mesafe işaretleri: 200 mavi, 150 beyaz, 100 kırmızı (yeşil merkezine)
      [[200, '#3a6ee8'], [150, '#ffffff'], [100, '#d6281e']].forEach(([d, col]) => {
        const y = H.green.y - d;
        if (y < H.fwStart || y > H.fwEnd) return;
        const q = S({ x: pathX(H, y) + H.w / 2 + 2, y });
        b.fillStyle = col; b.beginPath(); b.arc(q[0], q[1], 3.5, 0, Math.PI * 2); b.fill();
        b.fillStyle = 'rgba(255,255,255,0.85)'; b.font = '600 10px "Barlow Condensed", sans-serif'; b.fillText(d, q[0] + 6, q[1] + 3);
      });
    }
    // su
    if (H.water) {
      const q = S(H.water);
      const g = b.createRadialGradient(q[0], q[1], 2, q[0], q[1], Math.max(H.water.rx, H.water.ry) * s);
      g.addColorStop(0, '#3f8ed6'); g.addColorStop(1, '#2b6aa8');
      b.fillStyle = g; b.beginPath(); b.ellipse(q[0], q[1], H.water.rx * s, H.water.ry * s, 0, 0, Math.PI * 2); b.fill();
      b.strokeStyle = 'rgba(255,255,255,0.35)'; b.lineWidth = 1;
      for (let i = 0; i < 5; i++) { b.beginPath(); b.arc(q[0] + (r() - 0.5) * H.water.rx * s, q[1] + (r() - 0.5) * H.water.ry * s, 4 + r() * 5, Math.PI * 1.1, Math.PI * 1.9); b.stroke(); }
    }
    // yeşil
    const gq = S(H.green);
    b.fillStyle = '#7fcb5c'; b.beginPath(); b.arc(gq[0], gq[1], (H.green.r + 3) * s, 0, Math.PI * 2); b.fill();
    b.fillStyle = '#9ddd7a'; b.beginPath(); b.arc(gq[0], gq[1], H.green.r * s, 0, Math.PI * 2); b.fill();
    // bunkerler
    for (const bk of H.bunkers) {
      const q = S(bk);
      b.fillStyle = '#c9b072'; b.beginPath(); b.ellipse(q[0], q[1], bk.rx * s + 1.5, bk.ry * s + 1.5, 0.3, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#ecdba6'; b.beginPath(); b.ellipse(q[0], q[1], bk.rx * s, bk.ry * s, 0.3, 0, Math.PI * 2); b.fill();
    }
    // ağaçlar
    for (const t of H.trees) {
      const q = S(t);
      b.fillStyle = 'rgba(0,0,0,0.25)'; b.beginPath(); b.arc(q[0] + 3, q[1] + 3, t.r * s, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#255a27'; b.beginPath(); b.arc(q[0], q[1], t.r * s, 0, Math.PI * 2); b.fill();
      b.fillStyle = '#3a7a35'; b.beginPath(); b.arc(q[0] - t.r * s * 0.3, q[1] - t.r * s * 0.3, t.r * s * 0.55, 0, Math.PI * 2); b.fill();
    }
    // tee
    const tq = S({ x: 0, y: 0 });
    b.fillStyle = '#86cf63'; b.fillRect(tq[0] - 9 * s, tq[1] - 6 * s, 18 * s, 12 * s);
    b.fillStyle = '#d6281e'; b.beginPath(); b.arc(tq[0] - 6 * s, tq[1], 2, 0, Math.PI * 2); b.arc(tq[0] + 6 * s, tq[1], 2, 0, Math.PI * 2); b.fill();
  }
  function draw() {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const H = T.H, s = T.view.s;
    // bayrak
    const pq = toScreen(H.pin);
    ctx.fillStyle = '#1a2a1a'; ctx.beginPath(); ctx.arc(pq[0], pq[1], 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pq[0], pq[1]); ctx.lineTo(pq[0], pq[1] - 26); ctx.stroke();
    const wa = -H.wind.ang, wf = Math.min(1, 0.3 + H.wind.kmh / 25);
    ctx.fillStyle = '#d6281e';
    ctx.beginPath(); ctx.moveTo(pq[0], pq[1] - 26);
    ctx.lineTo(pq[0] + Math.cos(wa) * 14 * wf, pq[1] - 26 + Math.sin(wa) * 14 * wf + 4);
    ctx.lineTo(pq[0], pq[1] - 18); ctx.fill();
    const b = T.ball, bq = toScreen(b);
    // nişan
    if (T.phase === 'aim') {
      const R = reach(T.club) * s;
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
      const aimA = Math.atan2(-(T.target.y - b.y), T.target.x - b.x);
      ctx.beginPath(); ctx.arc(bq[0], bq[1], R, aimA - 0.6, aimA + 0.6); ctx.stroke();
      const tq = toScreen(T.target);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bq[0], bq[1]); ctx.lineTo(tq[0], tq[1]); ctx.stroke();
      ctx.setLineDash([]);
      // dağılım elipsi (iyi vuruş, 1σ)
      const d = Math.hypot(T.target.x - b.x, T.target.y - b.y);
      const sd = d * T.club.dev * (1 - T.eff.control) * 1.0;
      ctx.save(); ctx.translate(tq[0], tq[1]); ctx.rotate(aimA);
      ctx.strokeStyle = 'rgba(255,230,120,0.8)'; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.ellipse(0, 0, Math.max(4, d * 0.05 * s), Math.max(4, sd * s), 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(tq[0], tq[1], 6, 0, Math.PI * 2); ctx.moveTo(tq[0] - 10, tq[1]); ctx.lineTo(tq[0] + 10, tq[1]); ctx.moveTo(tq[0], tq[1] - 10); ctx.lineTo(tq[0], tq[1] + 10); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '700 12px "Barlow Condensed", sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(Math.round(d) + ' yd', tq[0] + 12, tq[1] - 8);
    }
    // uçuş
    let ball = { x: b.x, y: b.y }, h = 0;
    if (T.anim) {
      const a = T.anim;
      if (a.t < a.T) {
        const u = a.t / a.T;
        // yana sapma sona doğru artar: eğri uçuş
        const straight = { x: U.lerp(a.from.x, a.land.x, u), y: U.lerp(a.from.y, a.land.y, u) };
        const ang = Math.atan2(a.land.y - a.from.y, a.land.x - a.from.x);
        const bend = a.lat * (u * u - u) * 0.9;
        ball = { x: straight.x - Math.sin(ang) * bend * -1, y: straight.y + Math.cos(ang) * bend * -1 };
        h = 4 * a.apex * u * (1 - u);
      } else {
        const u = Math.min(1, (a.t - a.T) / Math.max(0.01, a.rollT));
        const e = 1 - Math.pow(1 - u, 2);
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
    if (T.phase !== 'done' || !(T.anim && T.anim.holed)) {
      const q = toScreen(ball);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(q[0] + h * s * 0.15, q[1], 3.5, 2.2, 0, 0, Math.PI * 2); ctx.fill();
      const rr = 3.2 + h * s * 0.03;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q[0], q[1] - h * s * 0.9, rr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
    // rüzgâr göstergesi
    const wx = 46, wy = 50;
    ctx.fillStyle = 'rgba(8,30,22,0.75)'; ctx.beginPath(); ctx.arc(wx, wy, 32, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(wx, wy); ctx.rotate(-H.wind.ang);
    ctx.strokeStyle = '#fff'; ctx.fillStyle = '#fff'; ctx.lineWidth = 3;
    const L = 8 + H.wind.kmh * 0.7;
    ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L - 6, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(L - 9, -6); ctx.lineTo(L - 9, 6); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '700 12px "Barlow Condensed", sans-serif';
    ctx.fillText(H.wind.kmh + ' km/s', wx, wy + 46);
    // vuruş kalitesi afişi
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
    ring.update(dt);
    ring.enabled = T.phase === 'aim' && !Putt.isOpen();
    ring.center = T.club ? T.club.id : '';
    ring.sub = T.phase === 'aim' ? 'BOŞLUK / TIKLA' : '';
    ring.draw();
    if (T.flash) { T.flash.t -= dt; if (T.flash.t <= 0) T.flash = null; }
    if (T.anim) { T.anim.t += dt; if (T.anim.t >= T.anim.T + T.anim.rollT + 0.15) afterShot(); }
    if (T && T.H) draw();
    raf = requestAnimationFrame(loop);
  }

  // ---------- yan panel ----------
  function renderSide() {
    if (!T) return;
    const H = T.H, b = T.ball;
    const dPin = Math.hypot(H.pin.x - b.x, H.pin.y - b.y);
    const parTot = T.holes.reduce((a, h) => a + h.par, 0);
    const rows = T.holes.map((h, i) => {
      const sc = T.scores[i];
      const rel = sc != null ? sc - h.par : null;
      const cls = rel == null ? '' : rel <= -2 ? 'eagle' : rel === -1 ? 'birdie' : rel === 0 ? '' : rel === 1 ? 'bogey' : 'dbl';
      return `<td class="${i === T.idx ? 'cur' : ''}"><span class="sc ${cls}">${sc != null ? sc : i === T.idx ? T.strokes || '·' : ''}</span></td>`;
    }).join('');
    const pars = T.holes.map(h => `<td>${h.par}</td>`).join('');
    const nums = T.holes.map((h, i) => `<th>${i + 1}</th>`).join('');
    const clubs = CLUBS.map(c => {
      const dis = c.id === 'D' && T.lie !== 'tee';
      return `<button class="club ${T.club && T.club.id === c.id ? 'on' : ''}" data-club="${c.id}" ${dis ? 'disabled' : ''}><b>${c.id}</b><span>${Math.round(reach(c))}</span></button>`;
    }).join('');
    const e = T.eff;
    side.innerHTML = `
      <div class="t-head"><div><div class="eyebrow">${T.title}</div><div class="t-hole">Delik ${T.idx + 1} <small>/ ${T.holes.length}</small></div></div>
        <div class="t-par">PAR <b>${H.par}</b><span>${H.len} yd</span></div></div>
      <div class="t-stats">
        <div><span>Bayrağa</span><b>${Math.round(dPin)} yd</b></div>
        <div><span>Zemin</span><b>${LIE_TR[T.lie] || T.lie} ×${(LIE_MUL[T.lie] || 1).toFixed(2)}</b></div>
        <div><span>Vuruş</span><b>${T.strokes}</b></div>
        <div><span>Rüzgâr</span><b>${H.wind.kmh} km/s</b></div>
      </div>
      <div class="eyebrow">Sopa (taşıma mesafesi, yd)</div>
      <div class="clubs">${clubs}</div>
      <div class="t-g">Turnuva gücü G = <b>${Math.round(T.G)}</b> · ${T.lg.name} ligi · güç +%${((e.power - 1) * 100).toFixed(1)}, kontrol %${(e.control * 100).toFixed(0)}, rüzgâr direnci %${(e.windRes * 100).toFixed(0)}</div>
      <div class="card-scroll"><table class="scorecard"><tr><th>Delik</th>${nums}<th>Top</th></tr><tr><td>Par</td>${pars}<td>${parTot}</td></tr><tr><td>Skor</td>${rows}<td>${T.scores.length ? T.scores.reduce((a, b) => a + b, 0) : ''}</td></tr></table></div>`;
    side.querySelectorAll('[data-club]').forEach(btn => btn.addEventListener('click', () => pickClub(btn.dataset.club)));
  }

  return { init, start, close, isOpen, press, genHole, _state: () => T };
})();
