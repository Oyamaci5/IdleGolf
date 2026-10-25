// Putt mini oyunu: 1) salınan nişanı kilitle, 2) güç çubuğunu doğru yerde durdur.
// Güç çubuğundaki çizgi düz zemin içindir; yokuş yukarı daha sert, yokuş aşağı daha yumuşak vurmak gerekir.
const Putt = (() => {
  let ov, cv, ctx, titleEl, subEl, infoEl, skipBtn, stepEl;
  let st = null, raf = 0, last = 0;
  const CW = 460, CH = 520, CUPX = 215, CUPY = 96;
  const CUP_R = 0.42, CAP_V = 4.4, PMAX = 1.4;

  function init() {
    ov = document.getElementById('puttOverlay');
    cv = document.getElementById('puttCanvas');
    ctx = cv.getContext('2d');
    titleEl = document.getElementById('puttTitle');
    subEl = document.getElementById('puttSub');
    infoEl = document.getElementById('puttInfo');
    stepEl = document.getElementById('puttStep');
    skipBtn = document.getElementById('puttSkip');
    const dpr = window.devicePixelRatio || 1;
    cv.width = CW * dpr; cv.height = CH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cv.addEventListener('pointerdown', e => { e.preventDefault(); release(); });
    skipBtn.addEventListener('click', () => { if (st && (st.phase === 'aim' || st.phase === 'power')) finish(st.skipTries, true); });
  }
  const isOpen = () => !!st;

  function sim(from, v0, theta) {
    const d = Math.hypot(from.x, from.y), base = Math.atan2(-from.y, -from.x) + theta;
    let x = from.x, y = from.y, vx = Math.cos(base) * v0, vy = Math.sin(base) * v0;
    const dt = 1 / 120, path = [[x, y]];
    let minD = d, holed = false, lip = false;
    for (let t = 0; t < 14; t += dt) {
      const sp = Math.hypot(vx, vy);
      if (sp < 0.08) break;
      vx += (-st.F * vx / sp + st.slope.x) * dt; vy += (-st.F * vy / sp + st.slope.y) * dt;
      x += vx * dt; y += vy * dt;
      path.push([x, y]);
      const dc = Math.hypot(x, y);
      minD = Math.min(minD, dc);
      if (dc < CUP_R) { if (Math.hypot(vx, vy) < CAP_V) { holed = true; path.push([0, 0]); break; } lip = true; }
    }
    return { path, holed, end: { x, y }, minD, lip };
  }
  // nişan çizgisi için eğimi hesaba katan güç (yalnızca yön göstermek için)
  function solveV0(from) {
    const d = Math.hypot(from.x, from.y), ux = -from.x / d, uy = -from.y / d;
    let lo = 0.3, hi = 50;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2, r = sim(from, mid, 0);
      const along = (r.end.x - from.x) * ux + (r.end.y - from.y) * uy;
      if (along < d + 1.1) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }
  function bestTheta(from, v0) {
    let best = 0, bd = Infinity;
    for (let a = -30; a <= 30; a += 0.5) { const r = sim(from, v0, a * Math.PI / 180); if (r.minD < bd) { bd = r.minD; best = a; } }
    return best;
  }

  function open(opts) {
    const r = Math.random;
    st = {
      opts, tries: 0, slope: opts.slope || { x: (r() - 0.5) * 0.7, y: (r() - 0.5) * 1.2 },
      F: opts.fast ? 2.0 : 2.6,
      ball: { x: (r() - 0.5) * 2, y: opts.distFt }, phase: 'aim', t: 0, msg: null,
      maxTries: opts.maxTries || 4, skipTries: opts.skipTries || 4,
    };
    st.scale = Math.min(18, 360 / (Math.max(opts.distFt, 6) * 1.25));
    titleEl.textContent = opts.title || 'Putt';
    subEl.textContent = opts.sub || '';
    skipBtn.textContent = opts.skipLabel || L('Skip', 'Geç');
    skipBtn.hidden = !!opts.noSkip;
    newAttempt();
    ov.hidden = false;
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }
  function newAttempt() {
    st.vGuide = solveV0(st.ball);
    st.theta0 = bestTheta(st.ball, st.vGuide);
    st.amp = Math.max(9, Math.abs(st.theta0) + 7);
    st.period = 2.5 * (0.9 + Math.random() * 0.2);
    st.phase = 'aim'; st.t = 0; st.aimT = Math.random() * st.period; st.theta = 0;
    st.powT = 0; st.power = 0;
    st.powPeriod = 2.2 * (1 + 0.15 * (st.opts.calm || 0));
    st.window = st.opts.window || 6;
    st.path = null; st.pi = 0;
    const d = Math.hypot(st.ball.x, st.ball.y);
    st.vFlat = Math.sqrt(2 * st.F * (d + 1.1));
  }
  const aimTheta = () => st.amp * Math.sin(2 * Math.PI * st.aimT / st.period) * Math.PI / 180;
  function powNow() { const u = (st.powT / st.powPeriod) % 1; return PMAX * (u < 0.5 ? u * 2 : 2 - u * 2); }
  function release() {
    if (!st) return;
    if (st.phase === 'aim') { st.theta = aimTheta(); st.phase = 'power'; st.powT = 0; return; }
    if (st.phase !== 'power') return;
    st.power = powNow();
    st.tries++;
    const r = sim(st.ball, st.vFlat * Math.sqrt(Math.max(0.02, st.power)), st.theta);
    st.path = r.path; st.holed = r.holed; st.lip = r.lip; st.pi = 0; st.phase = 'roll'; st.t = 0;
  }
  function finish(tries, skipped, picked) {
    const cb = st.opts.onDone;
    ov.hidden = true; cancelAnimationFrame(raf); st = null;
    cb && cb(tries, { skipped, picked });
  }
  function cancel() { ov.hidden = true; cancelAnimationFrame(raf); st = null; }

  function loop(now) {
    if (!st) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    st.t += dt;
    if (st.phase === 'aim') { st.aimT += dt; if (st.t >= st.window) release(); }
    else if (st.phase === 'power') { st.powT += dt; if (st.t >= st.window + 2.5) release(); }
    else if (st.phase === 'roll') {
      st.pi += dt * 120;
      if (st.pi >= st.path.length - 1) {
        const end = st.path[st.path.length - 1], dist = Math.hypot(end[0], end[1]);
        st.ball = { x: end[0], y: end[1] };
        const names = ['', L('ONE PUTT!', 'İLK PUTTTA!'), L('TWO PUTTS', 'İKİ PUTT'), L('THREE PUTTS', 'ÜÇ PUTT')];
        if (st.holed) { st.phase = 'done'; st.t = 0; st.msg = names[st.tries] || L('IN!', 'İÇERİDE'); }
        else if (dist < 0.9) { st.tries++; st.holed = true; st.phase = 'done'; st.t = 0; st.msg = L('Tap-in', 'Tap-in'); st.ball = { x: 0, y: 0 }; }
        else if (st.tries >= st.maxTries - 1) { st.tries = st.maxTries; st.phase = 'done'; st.t = 0; st.msg = st.opts.tapMsg || L('Caddie holed it', 'Kaddi soktu'); st.ball = { x: 0, y: 0 }; st.picked = !!st.opts.pickOnMax; }
        else {
          st.phase = 'wait'; st.t = 0;
          // neden kaçtı? güç mü, yön mü?
          const short = st.power < 1 && !st.lip && end[1] > 0.3;
          st.msg = st.lip ? L('Too hard: lipped out', 'Çok sert: delikten sektü') : short ? L('Left it short', 'Kısa kaldı') : L('Missed', 'Kaçtı');
          st.sub = dist.toFixed(1) + L(' ft left', ' ft kaldı');
        }
      }
    } else if (st.phase === 'wait') { if (st.t > 1.1) { st.msg = null; st.sub = null; newAttempt(); } }
    else if (st.phase === 'done') { if (st.t > 1.2) { finish(st.tries, false, st.picked); return; } }
    draw();
    raf = requestAnimationFrame(loop);
  }

  const SX = x => CUPX + x * st.scale, SY = y => CUPY + y * st.scale;
  function draw() {
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = '#4c8c3c'; ctx.fillRect(0, 0, CW, CH);
    const g = ctx.createRadialGradient(CW / 2, CH * 0.45, 40, CW / 2, CH * 0.45, CW * 0.75);
    g.addColorStop(0, '#a6e083'); g.addColorStop(1, '#79c25a');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(CW / 2 - 15, CH * 0.48, CW * 0.44, CH * 0.47, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = -10; i < 20; i += 2) { ctx.beginPath(); ctx.moveTo(i * 40, 0); ctx.lineTo(i * 40 + 40, 0); ctx.lineTo(i * 40 - 160, CH); ctx.lineTo(i * 40 - 200, CH); ctx.fill(); }
    // eğim okları: büyüklük eğim kadar
    const sl = st.slope, mag = Math.hypot(sl.x, sl.y), ang = Math.atan2(sl.y, sl.x);
    const off = (performance.now() / 1000 * 18 * (0.4 + mag)) % 46;
    ctx.strokeStyle = `rgba(30,80,30,${0.15 + Math.min(0.35, mag * 0.4)})`; ctx.lineWidth = 2;
    for (let gx = -1; gx < 12; gx++) for (let gy = -1; gy < 13; gy++) {
      ctx.save(); ctx.translate(gx * 46 + Math.cos(ang) * off, gy * 46 + Math.sin(ang) * off); ctx.rotate(ang);
      ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(1, 0); ctx.lineTo(-5, 5); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
    // delik ve bayrak gölgesi
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(SX(0), SY(0), Math.max(6, CUP_R * st.scale) + 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a2a1a'; ctx.beginPath(); ctx.arc(SX(0), SY(0), Math.max(6, CUP_R * st.scale), 0, Math.PI * 2); ctx.fill();
    let bx = st.ball.x, by = st.ball.y;
    if (st.phase === 'roll') { const p = st.path[Math.floor(st.pi)]; bx = p[0]; by = p[1]; }
    const base = Math.atan2(-st.ball.y, -st.ball.x);
    if (st.phase === 'aim' || st.phase === 'power') {
      const th = st.phase === 'aim' ? aimTheta() : st.theta;
      const r = sim(st.ball, st.vGuide, th);
      const n = Math.floor(r.path.length * (st.opts.guide || 0.45));
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5; ctx.setLineDash([2, 7]); ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < n; i += 4) { const p = r.path[i]; i ? ctx.lineTo(SX(p[0]), SY(p[1])) : ctx.moveTo(SX(p[0]), SY(p[1])); }
      ctx.stroke(); ctx.setLineDash([]);
      if (st.phase === 'aim') {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(SX(bx), SY(by), 34, base - st.amp * Math.PI / 180, base + st.amp * Math.PI / 180); ctx.stroke();
      }
      ctx.strokeStyle = st.phase === 'aim' ? '#ffd23f' : '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(SX(bx), SY(by)); ctx.lineTo(SX(bx) + Math.cos(base + th) * 44, SY(by) + Math.sin(base + th) * 44); ctx.stroke();
      // süre
      const k = 1 - st.t / (st.phase === 'aim' ? st.window : st.window + 2.5);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(20, CH - 16, CW - 80, 5);
      ctx.fillStyle = k > 0.3 ? '#ffd23f' : '#ff7b6b'; ctx.fillRect(20, CH - 16, (CW - 80) * Math.max(0, k), 5);
    }
    if (st.phase === 'roll' && st.path) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= st.pi; i += 3) { const p = st.path[i]; i ? ctx.lineTo(SX(p[0]), SY(p[1])) : ctx.moveTo(SX(p[0]), SY(p[1])); }
      ctx.stroke();
    }
    if (!(st.phase === 'done' && st.holed)) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(SX(bx) + 2, SY(by) + 2, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(SX(bx), SY(by), 5, 0, Math.PI * 2); ctx.fill();
    }
    // güç çubuğu
    const bxp = CW - 40, top = 40, hgt = CH - 110;
    ctx.fillStyle = 'rgba(8,30,22,0.75)'; ctx.fillRect(bxp - 6, top - 6, 30, hgt + 12);
    const grd = ctx.createLinearGradient(0, top + hgt, 0, top);
    grd.addColorStop(0, '#6fbf73'); grd.addColorStop(0.65, '#ffd23f'); grd.addColorStop(1, '#ff6b4a');
    const pw = st.phase === 'power' ? powNow() : st.phase === 'roll' || st.phase === 'wait' ? st.power : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(bxp, top, 18, hgt);
    ctx.fillStyle = grd; ctx.fillRect(bxp, top + hgt * (1 - pw / PMAX), 18, hgt * pw / PMAX);
    const ty = top + hgt * (1 - 1 / PMAX);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bxp - 8, ty); ctx.lineTo(bxp + 22, ty); ctx.stroke();
    ctx.save(); ctx.translate(bxp - 12, ty); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#fff'; ctx.font = '700 11px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(L('FLAT', 'DÜZ ZEMİN'), 0, 0); ctx.restore();
    ctx.fillStyle = '#cfe6d8'; ctx.font = '700 11px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(L('POWER', 'GÜÇ'), bxp + 9, top + hgt + 18);
    // mesajlar
    if (st.msg) {
      ctx.font = '800 36px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(8,30,22,0.6)';
      ctx.strokeText(st.msg, CW / 2 - 15, CH * 0.55); ctx.fillStyle = st.holed ? '#ffd23f' : '#fff'; ctx.fillText(st.msg, CW / 2 - 15, CH * 0.55);
      if (st.sub) { ctx.font = '700 18px "Barlow Condensed", sans-serif'; ctx.lineWidth = 4; ctx.strokeText(st.sub, CW / 2 - 15, CH * 0.55 + 26); ctx.fillStyle = '#fff'; ctx.fillText(st.sub, CW / 2 - 15, CH * 0.55 + 26); }
    }
    const d = Math.hypot(st.ball.x, st.ball.y);
    const side = Math.abs(st.slope.x) < 0.08 ? L('straight', 'düz') : st.slope.x > 0 ? L('breaks right', 'sağa kırar') : L('breaks left', 'sola kırar');
    const up = st.slope.y > 0.15 ? L('uphill (hit harder)', 'yokuş yukarı (sert vur)') : st.slope.y < -0.15 ? L('downhill (hit softer)', 'yokuş aşağı (yumuşak vur)') : L('flat', 'eğimsiz');
    infoEl.innerHTML = `<span>${L('Putt', 'Deneme')} <b>${Math.min(st.tries + (st.phase === 'aim' || st.phase === 'power' ? 1 : 0), st.maxTries)}</b></span><span>${L('Distance', 'Mesafe')} <b>${d.toFixed(1)} ft</b></span><span>${L('Break', 'Yan eğim')} <b>${side}</b></span><span>${L('Slope', 'Boy eğim')} <b>${up}</b></span>`;
    stepEl.innerHTML = st.phase === 'aim' ? L('<b>1/2 Aim:</b> press <kbd>Space</kbd> when the yellow line points along the breaking path', '<b>1/2 Yön:</b> sarı çizgi deliğe doğru kırılan yolu gösterirken <kbd>Boşluk</kbd>') : st.phase === 'power' ? L('<b>2/2 Power:</b> press <kbd>Space</kbd> at the right height. The white line is for a flat green.', '<b>2/2 Güç:</b> çubuk doğru yükseklikteyken <kbd>Boşluk</kbd>. Beyaz çizgi düz zemin içindir.') : '&nbsp;';
  }
  return { init, open, release, isOpen, cancel };
})();
