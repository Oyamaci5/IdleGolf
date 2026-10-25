// Putt mini oyunu (§4-B): nişan çizgisi sağa sola salınır, eğim topu kırar.
// Doğru anda bırak: 1 deneme = 3★ (birdie), 2 = 2★ (par), 3 = 1★ (bogey), fazlası 0★.
const Putt = (() => {
  let ov, cv, ctx, titleEl, subEl, infoEl, skipBtn;
  let st = null, raf = 0, last = 0;
  const CW = 460, CH = 520, CUPX = 230, CUPY = 96;
  const F = 2.6;            // sürtünme (ft/s²)
  const CUP_R = 0.42;       // yakalama yarıçapı (ft)
  const CAP_V = 4.4;        // yakalama hızı (ft/s)

  function init() {
    ov = document.getElementById('puttOverlay');
    cv = document.getElementById('puttCanvas');
    ctx = cv.getContext('2d');
    titleEl = document.getElementById('puttTitle');
    subEl = document.getElementById('puttSub');
    infoEl = document.getElementById('puttInfo');
    skipBtn = document.getElementById('puttSkip');
    const dpr = window.devicePixelRatio || 1;
    cv.width = CW * dpr; cv.height = CH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cv.addEventListener('pointerdown', e => { e.preventDefault(); release(); });
    skipBtn.addEventListener('click', () => { if (st && st.phase === 'aim') finish(st.skipTries, true); });
  }
  const isOpen = () => !!st;

  function sim(from, v0, theta, maxT = 12) {
    const dx = -from.x, dy = -from.y, d = Math.hypot(dx, dy);
    const base = Math.atan2(dy, dx) + theta;
    let x = from.x, y = from.y, vx = Math.cos(base) * v0, vy = Math.sin(base) * v0;
    const dt = 1 / 120, path = [[x, y]];
    let minD = d, holed = false;
    for (let t = 0; t < maxT; t += dt) {
      const sp = Math.hypot(vx, vy);
      if (sp < 0.08) break;
      const ax = -F * vx / sp + st.slope.x, ay = -F * vy / sp + st.slope.y;
      vx += ax * dt; vy += ay * dt;
      // sürtünme yönü tersine çevirmesin
      if (vx * (vx - ax * dt) < 0 && vy * (vy - ay * dt) < 0) { vx = 0; vy = 0; }
      x += vx * dt; y += vy * dt;
      path.push([x, y]);
      const dc = Math.hypot(x, y);
      minD = Math.min(minD, dc);
      if (dc < CUP_R && Math.hypot(vx, vy) < CAP_V) { holed = true; path.push([0, 0]); break; }
    }
    return { path, holed, end: { x, y }, minD };
  }
  function solveV0(from) {
    const d = Math.hypot(from.x, from.y);
    let lo = 0.3, hi = 40;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      const r = sim(from, mid, 0);
      // başlangıçtan kat edilen mesafe (çizgi yönünde)
      const ux = -from.x / d, uy = -from.y / d;
      const along = (r.end.x - from.x) * ux + (r.end.y - from.y) * uy;
      if (along < d + 1.1) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  function bestTheta(from, v0) {
    let best = 0, bd = Infinity;
    for (let a = -30; a <= 30; a += 0.5) {
      const r = sim(from, v0, a * Math.PI / 180);
      if (r.minD < bd) { bd = r.minD; best = a; }
    }
    return best;
  }

  function open(opts) {
    const r = Math.random;
    st = {
      opts, tries: 0, slope: opts.slope || { x: (r() - 0.5) * 0.7, y: (r() - 0.5) * 0.5 },
      ball: { x: (r() - 0.5) * 2, y: opts.distFt }, phase: 'aim', t: 0, msg: null,
      maxTries: opts.maxTries || 4, skipTries: opts.skipTries || 4,
    };
    const far = Math.max(opts.distFt, 6);
    st.scale = Math.min(18, 360 / (far * 1.2));
    titleEl.textContent = opts.title || 'Putt';
    subEl.textContent = opts.sub || '';
    skipBtn.textContent = opts.skipLabel || 'Geç (0★)';
    skipBtn.hidden = opts.noSkip;
    newAttempt();
    ov.hidden = false;
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }
  function newAttempt() {
    st.v0 = solveV0(st.ball);
    st.theta0 = bestTheta(st.ball, st.v0);
    st.amp = Math.max(9, Math.abs(st.theta0) + 7);
    st.period = 2.5 * (0.9 + Math.random() * 0.2);
    st.phase = 'aim'; st.t = 0; st.aimT = Math.random() * st.period;
    st.window = (st.opts.window || 5);
    st.path = null; st.pi = 0;
  }
  function curTheta() { return st.amp * Math.sin(2 * Math.PI * st.aimT / st.period) * Math.PI / 180; }
  function release() {
    if (!st || st.phase !== 'aim') return;
    st.tries++;
    const r = sim(st.ball, st.v0, curTheta());
    st.path = r.path; st.holed = r.holed; st.pi = 0; st.phase = 'roll'; st.t = 0;
  }
  function finish(tries, skipped, picked) {
    const cb = st.opts.onDone;
    ov.hidden = true;
    cancelAnimationFrame(raf);
    st = null;
    cb && cb(tries, { skipped, picked });
  }
  function loop(now) {
    if (!st) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    st.t += dt;
    if (st.phase === 'aim') {
      st.aimT += dt;
      if (st.t >= st.window) release();
    } else if (st.phase === 'roll') {
      st.pi += dt * 120;
      if (st.pi >= st.path.length - 1) {
        const end = st.path[st.path.length - 1];
        st.ball = { x: end[0], y: end[1] };
        if (st.holed) { st.phase = 'done'; st.t = 0; st.msg = ['', 'BİRDİE!', 'PAR', 'BOGEY'][st.tries] || 'İÇERİDE'; }
        else if (Math.hypot(end[0], end[1]) < 0.9) { st.tries++; st.holed = true; st.phase = 'done'; st.t = 0; st.msg = 'Tap-in'; st.ball = { x: 0, y: 0 }; }
        else if (st.tries >= st.maxTries - 1 && !st.opts.noAutoTap) { st.tries = st.maxTries; st.phase = 'done'; st.t = 0; st.msg = st.opts.tapMsg || 'Kaddi soktu (0★)'; st.ball = { x: 0, y: 0 }; st.picked = !!st.opts.pickOnMax; }
        else { st.phase = 'wait'; st.t = 0; st.msg = 'Kaçtı! ' + (Math.hypot(end[0], end[1])).toFixed(1) + ' ft kaldı'; }
      }
    } else if (st.phase === 'wait') {
      if (st.t > 0.9) { st.msg = null; newAttempt(); }
    } else if (st.phase === 'done') {
      if (st.t > 1.1) { finish(st.tries, false, st.picked); return; }
    }
    draw();
    raf = requestAnimationFrame(loop);
  }
  const SX = x => CUPX + x * st.scale, SY = y => CUPY + y * st.scale;
  function draw() {
    ctx.clearRect(0, 0, CW, CH);
    // önlük (fringe) ve yeşil
    ctx.fillStyle = '#4c8c3c'; ctx.fillRect(0, 0, CW, CH);
    const g = ctx.createRadialGradient(CW / 2, CH * 0.45, 40, CW / 2, CH * 0.45, CW * 0.75);
    g.addColorStop(0, '#9fdc7c'); g.addColorStop(1, '#79c25a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(CW / 2, CH * 0.48, CW * 0.48, CH * 0.47, 0, 0, Math.PI * 2); ctx.fill();
    // biçim şeritleri
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = -10; i < 20; i += 2) { ctx.beginPath(); ctx.moveTo(i * 40, 0); ctx.lineTo(i * 40 + 40, 0); ctx.lineTo(i * 40 + 40 - 200, CH); ctx.lineTo(i * 40 - 200, CH); ctx.fill(); }
    // eğim okları
    const sl = st.slope, mag = Math.hypot(sl.x, sl.y);
    const ang = Math.atan2(sl.y, sl.x);
    const off = (performance.now() / 1000 * 18 * (0.4 + mag)) % 46;
    ctx.strokeStyle = 'rgba(30,80,30,0.28)'; ctx.lineWidth = 2;
    for (let gx = -1; gx < 12; gx++) for (let gy = -1; gy < 13; gy++) {
      const x = gx * 46 + Math.cos(ang) * off, y = gy * 46 + Math.sin(ang) * off;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(1, 0); ctx.lineTo(-5, 5); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    // delik
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(SX(0), SY(0), Math.max(6, CUP_R * st.scale) + 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a2a1a';
    ctx.beginPath(); ctx.arc(SX(0), SY(0), Math.max(6, CUP_R * st.scale), 0, Math.PI * 2); ctx.fill();
    // top konumu
    let bx = st.ball.x, by = st.ball.y;
    if (st.phase === 'roll') { const p = st.path[Math.floor(st.pi)]; bx = p[0]; by = p[1]; }
    // nişan + okuma çizgisi
    if (st.phase === 'aim') {
      const th = curTheta();
      const r = sim(st.ball, st.v0, th);
      const guide = st.opts.guide || 0.45;
      const n = Math.floor(r.path.length * guide);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5; ctx.setLineDash([2, 7]); ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < n; i += 4) { const p = r.path[i]; if (i === 0) ctx.moveTo(SX(p[0]), SY(p[1])); else ctx.lineTo(SX(p[0]), SY(p[1])); }
      ctx.stroke(); ctx.setLineDash([]);
      // salınım yayı
      const base = Math.atan2(-st.ball.y, -st.ball.x);
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(SX(bx), SY(by), 34, base - st.amp * Math.PI / 180, base + st.amp * Math.PI / 180); ctx.stroke();
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 3;
      const a = base + th;
      ctx.beginPath(); ctx.moveTo(SX(bx), SY(by)); ctx.lineTo(SX(bx) + Math.cos(a) * 44, SY(by) + Math.sin(a) * 44); ctx.stroke();
      // süre çubuğu
      const k = 1 - st.t / st.window;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(20, CH - 18, CW - 40, 6);
      ctx.fillStyle = k > 0.3 ? '#ffd23f' : '#ff7b6b'; ctx.fillRect(20, CH - 18, (CW - 40) * k, 6);
    }
    if (st.phase === 'roll' && st.path) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= st.pi; i += 3) { const p = st.path[i]; if (i === 0) ctx.moveTo(SX(p[0]), SY(p[1])); else ctx.lineTo(SX(p[0]), SY(p[1])); }
      ctx.stroke();
    }
    if (!(st.phase === 'done' && st.holed)) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(SX(bx) + 2, SY(by) + 2, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(SX(bx), SY(by), 5, 0, Math.PI * 2); ctx.fill();
    }
    // mesajlar
    ctx.textAlign = 'center';
    if (st.msg) {
      ctx.font = '800 38px "Barlow Condensed", sans-serif';
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(8,30,22,0.6)';
      ctx.strokeText(st.msg, CW / 2, CH * 0.55);
      ctx.fillStyle = st.holed ? '#ffd23f' : '#fff';
      ctx.fillText(st.msg, CW / 2, CH * 0.55);
    }
    const d = Math.hypot(st.ball.x, st.ball.y);
    const slopeTxt = Math.abs(st.slope.x) < 0.08 ? 'düz' : st.slope.x > 0 ? 'sağa kırar' : 'sola kırar';
    const upTxt = st.slope.y > 0.12 ? ', yokuş yukarı' : st.slope.y < -0.12 ? ', yokuş aşağı' : '';
    infoEl.innerHTML = `<span>Deneme <b>${Math.min(st.tries + (st.phase === 'aim' ? 1 : 0), st.maxTries)}</b></span><span>Mesafe <b>${d.toFixed(1)} ft</b></span><span>Eğim <b>${slopeTxt}${upTxt}</b></span>`;
  }
  function cancel() { ov.hidden = true; cancelAnimationFrame(raf); st = null; }
  return { init, open, release, isOpen, cancel };
})();
