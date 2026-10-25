// Stage: swing ring, shared golfer timers, view A (side), view B (driving range) and the top-down hole map.

class Ring {
  constructor(cv) {
    this.cv = cv; this.ctx = cv.getContext('2d');
    this.angle = 0; this.speed = 230; this.zone = 0; this.focus = false; this.flash = null; this.cool = 0;
    this.pd = 0; this.pdReady = false; this.center = ''; this.sub = ''; this.perfectDeg = 12; this.goodDeg = 40; this.enabled = true;
    this.relocate();
  }
  zones() { const f = this.focus ? 2 : 1; return { p: this.perfectDeg * f, g: Math.min(80, this.goodDeg * (this.focus ? 1.5 : 1)) }; }
  relocate() { this.zone = (this.angle + 110 + Math.random() * 140) % 360; this.speed = 230 * (0.85 + Math.random() * 0.3); }
  update(dt) { this.angle = (this.angle + this.speed * dt) % 360; this.cool -= dt; if (this.flash) { this.flash.t -= dt; if (this.flash.t <= 0) this.flash = null; } }
  press(keepZone) {
    if (this.cool > 0 || !this.enabled) return null;
    const d = Math.abs(((this.angle - this.zone) % 360 + 540) % 360 - 180), z = this.zones();
    const q = d <= z.p ? 2 : d <= z.g ? 1 : 0;
    this.flash = { q, t: 0.6 }; this.cool = 0.32;
    if (!keepZone) this.relocate();
    return q;
  }
  draw() {
    const cv = this.cv, ctx = this.ctx, dpr = window.devicePixelRatio || 1, S = cv.clientWidth;
    if (!S) return;
    if (cv.width !== Math.round(S * dpr)) cv.width = cv.height = Math.round(S * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, S, S);
    const c = S / 2, R = S * 0.36, rad = a => (a - 90) * Math.PI / 180;
    ctx.fillStyle = 'rgba(8,30,22,0.78)'; ctx.beginPath(); ctx.arc(c, c, S * 0.49, 0, Math.PI * 2); ctx.fill();
    ctx.lineCap = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.arc(c, c, R + 12, 0, Math.PI * 2); ctx.stroke();
    if (this.pd > 0) { const p = this.pdReady ? 0.6 + 0.4 * Math.sin(performance.now() / 120) : 1; ctx.strokeStyle = this.pdReady ? `rgba(255,120,40,${p})` : '#ff8a3d'; ctx.beginPath(); ctx.arc(c, c, R + 12, rad(0), rad(360 * this.pd / 100)); ctx.stroke(); }
    ctx.lineWidth = 13; ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.stroke();
    const z = this.zones();
    ctx.strokeStyle = '#6fbf73'; ctx.beginPath(); ctx.arc(c, c, R, rad(this.zone - z.g), rad(this.zone + z.g)); ctx.stroke();
    ctx.strokeStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(c, c, R, rad(this.zone - z.p), rad(this.zone + z.p)); ctx.stroke();
    const a = rad(this.angle);
    ctx.strokeStyle = this.enabled ? '#fff' : 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(c + Math.cos(a) * R * 0.45, c + Math.sin(a) * R * 0.45); ctx.lineTo(c + Math.cos(a) * (R + 9), c + Math.sin(a) * (R + 9)); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(c + Math.cos(a) * R, c + Math.sin(a) * R, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (this.flash) {
      ctx.fillStyle = ['#ff7b6b', '#bfe8b5', '#ffd23f'][this.flash.q];
      ctx.font = `700 ${Math.round(S * 0.11)}px "Barlow Condensed", sans-serif`; ctx.fillText([L('MISS', 'ISKA'), L('GOOD', 'İYİ'), L('PERFECT', 'MÜKEMMEL')][this.flash.q], c, c - 4);
      ctx.font = `600 ${Math.round(S * 0.085)}px "Barlow Condensed", sans-serif`; ctx.fillText(['×0.5', '×1', '×2.5'][this.flash.q], c, c + S * 0.1);
    } else {
      ctx.fillStyle = this.pdReady ? '#ffb27a' : 'rgba(255,255,255,0.85)'; ctx.font = `700 ${Math.round(S * 0.1)}px "Barlow Condensed", sans-serif`; ctx.fillText(this.center, c, c - 5);
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = `600 ${Math.round(S * 0.075)}px "Barlow Condensed", sans-serif`; ctx.fillText(this.sub, c, c + S * 0.09);
    }
    ctx.textBaseline = 'alphabetic';
  }
}

const GOLFER_COLS = ['#e8453c', '#2fbf71', '#d63fd6', '#f2c230', '#3a6ee8', '#ff8a3d', '#13a39a', '#8d4fd1', '#ff5fa2', '#4fb8f0', '#c9e265'];

// ---------- shared stage logic ----------
const Stage = (() => {
  let golfers = [], views = [], gold = null, goldTimer = 90, pending = null, lastKey = '';
  const bannerEl = () => document.getElementById('banner');
  let bannerT = 0;
  function sync() {
    const run = E.get().run;
    const prev = golfers; golfers = [];
    run.hitters.forEach((h, i) => golfers.push(Object.assign(prev.find(g => g.idx === i) || { t: -1, next: Math.random() }, { idx: i, player: false, col: GOLFER_COLS[(i + 1) % GOLFER_COLS.length] })));
    golfers.push(Object.assign(prev.find(g => g.player) || { t: -1 }, { idx: -1, player: true, col: GOLFER_COLS[0] }));
    views.forEach(v => v.layout());
  }
  const lookOf = g => Art.dress(E.get().meta.looks[g.player ? 'p' : 'h' + g.idx], E.world(), E.get().meta.worldOutfit);
  function banner(text, sub, color = '#fff', dur = 1.8) {
    const b = bannerEl(); if (!b) return;
    b.innerHTML = `<b style="color:${color}">${text}</b>${sub ? `<span>${sub}</span>` : ''}`;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); bannerT = dur;
  }
  function onSwingPlayer(res) {
    const g = golfers.find(x => x.player); if (!g) return;
    g.t = 0; pending = { gi: -1, q: res.q, pd: res.pd, value: res.v, auto: false, range: res.range };
    if (res.pd) banner('POWER DRIVE!', '+' + U.fmt(res.v) + ' yd', '#ffb05a', 1.6);
  }
  function update(dt) {
    const run = E.get().run;
    const key = run.n + '-' + run.hitters.length + '-' + run.hitters.map(h => h.type).join();
    if (key !== lastKey) { const holeChanged = lastKey && lastKey.split('-')[0] !== String(run.n); lastKey = key; sync(); if (holeChanged) views.forEach(v => v.newHole && v.newHole()); }
    const total = E.autoRate(), vis = total > 20 ? 20 / total : 1, per = E.swingDist(), blocked = run.locked;
    for (const g of golfers) {
      if (g.player) {
        if (g.t >= 0) { const prev = g.t; g.t += dt / 0.5; if (prev < 0.53 && g.t >= 0.53 && pending) { views.forEach(v => v.onShot(g, pending)); pending = null; } if (g.t >= 1) g.t = -1; }
        continue;
      }
      const h = run.hitters[g.idx];
      if (!h || !h.L || blocked) { g.t = -1; continue; }
      const rate = E.helperRate(h) * vis, interval = Math.max(0.55, 1 / rate);
      if (g.t >= 0) {
        const prev = g.t; g.t += dt / Math.min(0.5, interval * 0.9);
        if (prev < 0.53 && g.t >= 0.53) {
          const q = Math.random() < E.pPerfect() ? 2 : 1;
          const e = { gi: g.idx, q, auto: true, type: h.type, value: per * E.helperValue(h) * rate * interval / vis, popup: total < 6 };
          views.forEach(v => v.onShot(g, e));
        }
        if (g.t >= 1) g.t = -1;
      } else { g.next -= dt; if (g.next <= 0) { g.next = interval * (0.85 + Math.random() * 0.3); g.t = 0; } }
    }
    // golden ball in normalized coordinates, shared by both views
    if (gold) { gold.t += dt; gold.x += gold.vx * dt; gold.y = gold.by + Math.sin(gold.t * 2) * 0.03; if (gold.t > 10) gold = null; }
    else { goldTimer -= dt; if (goldTimer <= 0) { goldTimer = CFG.goldMin + Math.random() * (CFG.goldMax - CFG.goldMin); gold = { x: 0.35 + Math.random() * 0.3, by: 0.12 + Math.random() * 0.25, y: 0, vx: (Math.random() - 0.5) * 0.03, t: 0 }; } }
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) bannerEl() && bannerEl().classList.remove('show'); }
    views.forEach(v => v.update(dt));
  }
  function drawGold(ctx, W, H) {
    if (!gold) return;
    const x = gold.x * W, y = gold.y * H;
    ctx.save(); ctx.globalAlpha = Math.max(0, gold.t > 8.5 ? (10 - gold.t) / 1.5 : 1);
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 30); glow.addColorStop(0, 'rgba(255,220,90,0.9)'); glow.addColorStop(1, 'rgba(255,220,90,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill();
    const g2 = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, 11); g2.addColorStop(0, '#fff7c8'); g2.addColorStop(1, '#d9a521');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '700 11px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(L('CLICK', 'TIKLA') + ' · ' + Math.ceil(10 - gold.t) + 's', x, y + 26);
    ctx.restore();
  }
  function hitGold(nx, ny, W, H) {
    if (!gold || Math.hypot((nx - gold.x) * W, (ny - gold.y) * H) >= 30) return false;
    const r = { x: gold.x, y: gold.y }; gold = null; return r;
  }
  return { views, sync, update, onSwingPlayer, banner, drawGold, hitGold, lookOf, golfers: () => golfers, spawnGold: () => { goldTimer = 0; } };
})();


// top-left status pill shared by both views: hole, progress % and the lie in plain words
function statusPill(ctx, lie) {
  const run = E.get().run, p = Math.min(1, run.prog / E.holeLen(run.n)), tm = E.terrainMult(lie), pct = Math.round((tm - 1) * 100);
  const parts = [`${L('HOLE', 'DELİK')} ${E.holeIn(run.n)} · ${Math.floor(p * 100)}%`, `${N(E.hazardName(lie)).toUpperCase()}${pct ? ' ' + (pct > 0 ? '+' : '') + pct + '%' : ''}`];
  ctx.save(); ctx.font = '800 14px "Barlow Condensed", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  let x = 10;
  parts.forEach((t, i) => {
    const w = ctx.measureText(t).width + 16;
    ctx.fillStyle = i === 1 ? (pct < 0 ? 'rgba(170,45,30,0.9)' : pct > 0 ? 'rgba(40,120,50,0.9)' : 'rgba(8,30,22,0.8)') : 'rgba(8,30,22,0.8)';
    ctx.fillRect(x, 10, w, 24); ctx.fillStyle = '#fff'; ctx.fillText(t, x + 8, 22.5); x += w + 4;
  });
  ctx.restore();
}

// ---------- view A: side view ----------
function makeSideView(cv) {
  const ctx = cv.getContext('2d');
  let W = 800, H = 340, dpr = 1, gy = 220, balls = [], pops = [], parts = [], scroll = 0, flash = 0, shake = 0, lead = null, time = 0;
  const pos = new Map();
  const v = {
    cv, active: true,
    resize() { dpr = window.devicePixelRatio || 1; W = cv.clientWidth; H = cv.clientHeight; if (!W) return; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); gy = Math.round(H * 0.56); v.layout(); },
    layout() {
      pos.clear(); const gs = Stage.golfers(), hs = gs.filter(g => !g.player), n = hs.length, spread = Math.min(W * 0.3, 34 * n);
      hs.forEach((g, i) => pos.set(g, { x: 26 + (n > 1 ? spread * i / (n - 1) : 0) + (i % 2) * 6, y: gy + 18 + (i % 2) * 8, s: 0.62 }));
      gs.filter(g => g.player).forEach(g => pos.set(g, { x: Math.max(80, W * 0.1) + spread * 0.3, y: gy + Math.min(82, (H - gy) * 0.66), s: 1.15 }));
    },
    newHole() { flash = 0.6; },
    onShot(g, e) {
      if (!v.active) return;
      const p = pos.get(g); if (!p) return;
      const x0 = p.x + 14 * p.s, y0 = p.y - 2 * p.s, q = e.q, grav = E.world().gravity;
      let x1, apex, T;
      if (e.pd) { x1 = W + 260; apex = H * 0.75; T = 1.5; }
      else if (e.auto) { x1 = W * (0.44 + Math.random() * 0.34) * (e.type === 'pow' ? 1.12 : e.type === 'fast' ? 0.9 : 1); apex = 60 + Math.random() * 70; T = 1.0 + Math.random() * 0.5; }
      else { x1 = W * [0.38, 0.62, 0.8][q] + Math.random() * W * 0.08; apex = [50, 110, 170][q]; T = [0.9, 1.25, 1.5][q]; }
      const lowG = Math.pow(1 / grav, 0.18); apex *= lowG; T *= lowG;
      const o = E.landingOdds(); let r = Math.random(), surf = 'fairway';
      if ((r -= o.bunker) < 0) surf = 'bunker'; else if ((r -= o.rough) < 0) surf = 'rough';
      const wk = E.windCycle(E.get().meta.gt).kind, drift = (wk === 'head' ? -1 : wk === 'tail' ? 1 : 0) * Math.min(80, E.wind().kmh * 1.5);
      balls.push({ x0, y0, x1: x1 + drift, y1: gy + 14 + Math.random() * (H - gy - 24), apex, T, t: 0, state: 'fly', x: x0, gy: y0, z: 0, surf, e, trail: [], vx: 0, fade: 1, col: g.col });
      if (e.pd) { shake = 14; burst(x0, y0 - 10, '#ff9a3d', 26, 3); }
    },
    shot(e) { const p = [...pos.entries()].find(([g]) => g.player); if (p) p[0].t = 0; lead = { t: 0, land: e.land }; flash = 0.25; if (e.land === 'bunker') burst(W * 0.2, gy + 40, E.world().sand, 30, 1.2); },
    update(dt) {
      if (!v.active) return;
      time += dt;
      const run = E.get().run, p = run.prog / E.holeLen(run.n);
      scroll += (p * 900 - scroll) * Math.min(1, dt * 4);
      if (flash > 0) { flash -= dt; if (flash > 0.4) scroll = p * 900; }
      for (const b of balls) {
        b.t += dt;
        if (b.state === 'fly') {
          const u = Math.min(1, b.t / b.T); b.x = U.lerp(b.x0, b.x1, u); b.gy = U.lerp(b.y0, b.y1, u); b.z = 4 * b.apex * u * (1 - u);
          if (!b.e.auto || b.e.pd) { b.trail.push([b.x, b.gy - b.z]); if (b.trail.length > 16) b.trail.shift(); }
          if (u >= 1) {
            b.state = 'roll'; b.t = 0; b.vx = ((b.x1 - b.x0) / b.T) * { fairway: 0.22, rough: 0.06, bunker: 0 }[b.surf];
            if (b.surf === 'bunker') burst(b.x, b.gy, E.world().sand, 10, 0.7);
            if (!b.e.auto || b.e.popup) pops.push({ x: b.x, y: b.gy - 12, text: '+' + U.fmt(b.e.value), color: b.e.pd ? '#ffb05a' : b.e.q === 2 ? '#ffd23f' : '#fff', t: 0, big: !b.e.auto });
          }
        } else if (b.state === 'roll') { b.x += b.vx * dt; b.vx *= Math.pow(0.08, dt); if (Math.abs(b.vx) < 4) { b.state = 'rest'; b.t = 0; } }
        else b.fade -= dt * 0.9;
      }
      balls = balls.filter(b => b.fade > 0 && b.x < W + 400);
      for (const q of parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += q.g * dt; q.life -= dt; if (q.rot != null) q.rot += dt * 5; }
      parts = parts.filter(q => q.life > 0);
      pops.forEach(q => q.t += dt); pops = pops.filter(q => q.t < 1.3);
      if (lead) { lead.t += dt; if (lead.t > 1.6) lead = null; }
      shake = Math.max(0, shake - dt * 30);
    },
    draw() {
      if (!v.active || !W) return;
      const S0 = E.get(), run = S0.run, w = E.world();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      Art.sky(ctx, W, gy, w);
      if (w.weather !== 'space' && w.weather !== 'stars') {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (let i = 0; i < 5; i++) { const x = ((i * 237 + time * (6 + i * 2) - scroll * 0.05) % (W + 200) + W + 200) % (W + 200) - 100, y = 26 + (i * 37) % (gy * 0.45); ctx.beginPath(); ctx.ellipse(x, y, 36, 11, 0, 0, Math.PI * 2); ctx.ellipse(x + 20, y - 7, 22, 10, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      hills(w.hill[0], gy - 28, 22, 0.08, run.n * 31); hills(w.hill[1], gy - 6, 12, 0.18, run.n * 31 + 3);
      Art.scenery(ctx, W, gy, w, scroll, run.n);
      ground(w, E.curLie(), run.n);
      const p = run.prog / E.holeLen(run.n);
      greenFlag(p, E.holeIn(run.n), w);
      const gs = Stage.golfers();
      gs.filter(g => !g.player).forEach(g => { const q = pos.get(g); if (!q) return; if (run.hitters[g.idx] && run.hitters[g.idx].L > 0) Art.golfer(ctx, q.x, q.y, q.s, Stage.lookOf(g), g.t, { ball: true, badge: run.hitters[g.idx].type ? HELPER_TYPES[run.hitters[g.idx].type].col : null }); else { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(q.x - 8, q.y - 3, 22, 5); } });
      for (const b of balls.slice().sort((a, c) => a.gy - c.gy)) {
        ctx.globalAlpha = Math.max(0, b.fade);
        if (b.trail.length > 1) { ctx.strokeStyle = trailCol(b); ctx.lineWidth = b.e.pd ? 6 : 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(b.trail[0][0], b.trail[0][1]); b.trail.forEach(t => ctx.lineTo(t[0], t[1])); ctx.stroke(); }
        const sh = Math.max(0.4, 1 - b.z / 220); ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(b.x, b.gy, 3.5 * sh, 1.4 * sh, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = b.e.pd ? '#ffe2b0' : '#fff'; ctx.beginPath(); ctx.arc(b.x, b.gy - b.z - 1, b.e.auto ? 2.4 : 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      gs.filter(g => g.player).forEach(g => { const q = pos.get(g); if (q) Art.golfer(ctx, q.x, q.y, q.s, Stage.lookOf(g), g.t, { ball: true, glow: run.pd >= 100 }); });
      if (lead) {
        const u = Math.min(1, lead.t / 1.2), pt = uu => [U.lerp(W * 0.2, W * 1.05, uu), gy + 40 - Math.sin(uu * Math.PI) * gy * 0.8];
        const c = pt(u); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(c[0], c[1], 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.beginPath(); for (let k = 0; k <= 12; k++) { const q = pt(Math.max(0, u - k * 0.02)); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } ctx.stroke();
      }
      Art.weather(ctx, W, H, gy, w, time, E.windCycle(S0.meta.gt).kind);
      windLines(E.wind());
      if (E.gateBlocked() || run.locked) blockOverlay(run.locked);
      for (const q of parts) { ctx.globalAlpha = Math.min(1, q.life * 2); ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.textAlign = 'center';
      for (const q of pops) { ctx.globalAlpha = 1 - q.t / 1.3; ctx.font = `700 ${q.big ? 20 : 12}px "Barlow Condensed", sans-serif`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,40,25,0.55)'; ctx.strokeText(q.text, q.x, q.y - q.t * 30); ctx.fillStyle = q.color; ctx.fillText(q.text, q.x, q.y - q.t * 30); }
      ctx.globalAlpha = 1;
      Stage.drawGold(ctx, W, H);
      statusPill(ctx, E.curLie());
      if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
      ctx.restore();
    },
    toNorm(x, y) { return [x / W, y / H, W, H]; },
  };
  function burst(x, y, color, n, sp = 1.5, g = 260) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = (40 + Math.random() * 120) * sp; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: 0.6 + Math.random() * 0.6, color, size: 1.5 + Math.random() * 2.5, g }); } }
  v.burst = burst;
  function trailCol(b) {
    if (b.e.auto) return 'rgba(255,255,255,0.35)';
    if (b.e.pd) return 'rgba(255,150,60,0.8)';
    const tr = E.get().meta.trail;
    if (tr === 'gold') return 'rgba(255,215,90,0.85)';
    if (tr === 'fire') return `hsla(${20 + Math.sin(time * 20) * 15},100%,55%,0.85)`;
    if (tr === 'rainbow') return `hsla(${(time * 300) % 360},90%,60%,0.85)`;
    return b.e.q === 2 ? 'rgba(255,230,120,0.6)' : 'rgba(255,255,255,0.5)';
  }
  function hills(col, base, amp, par, seed) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, gy);
    for (let x = 0; x <= W + 10; x += 10) { const u = (x + scroll * par) / 160; ctx.lineTo(x, base - amp * (0.6 * Math.sin(u + seed) + 0.3 * Math.sin(u * 2.3 + seed * 2) + 0.1 * Math.sin(u * 5.1))); }
    ctx.lineTo(W, gy); ctx.closePath(); ctx.fill();
  }
  function ground(w, lie, n) {
    ctx.fillStyle = w.rough; ctx.fillRect(0, gy, W, H - gy);
    const top = gy + 6;
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, top + 4); ctx.lineTo(W, top); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.clip();
    ctx.fillStyle = w.grass[0]; ctx.fillRect(0, top, W, H - top);
    const bw = 64, off = scroll % (bw * 2); ctx.fillStyle = w.grass[1];
    if (w.id === 'space') { ctx.strokeStyle = 'rgba(120,160,255,0.25)'; ctx.lineWidth = 1; for (let x = -off; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + 60, H); ctx.stroke(); } for (let y = top; y < H; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } }
    else for (let x = -bw * 2 - off; x < W + bw * 2; x += bw * 2) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + bw, top); ctx.lineTo(x + bw + 50, H); ctx.lineTo(x + 50, H); ctx.closePath(); ctx.fill(); }
    if (w.id === 'moon' || w.id === 'mercury') { const r = U.rngOf('crater', n); ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 8; i++) { const x = ((r() * 1600 - scroll) % 1600 + 1600) % 1600; ctx.beginPath(); ctx.ellipse(x, top + 20 + r() * (H - top - 30), 20 + r() * 30, 5 + r() * 5, 0, 0, Math.PI * 2); ctx.fill(); } }
    ctx.restore();
    const r = U.rngOf('bunk', n), span = 1600, offB = scroll % span;
    for (let i = 0; i < 3 * (w.bunkerX || 1); i++) { const bx = r() * span, by = top + 20 + r() * (H - top - 40), bw2 = 40 + r() * 40; for (const rep of [0, span]) { const x = bx - offB + rep; if (x < W * 0.38 || x > W + 80) continue; ctx.fillStyle = w.sand; ctx.beginPath(); ctx.ellipse(x, by, bw2, bw2 * 0.18, 0, 0, Math.PI * 2); ctx.fill(); } }
    // the patch under the golfers shows where the ball lies now
    const px = W * 0.36, py = gy + 8;
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(px, py - 2); ctx.quadraticCurveTo(px + 40, (py + H) / 2, px + 10, H); ctx.lineTo(0, H); ctx.closePath(); ctx.clip();
    const cols = { tee: w.grass[1], fairway: w.grass[0], rough: w.rough, bunker: w.sand, green: w.green, water: w.grass[0] };
    ctx.fillStyle = cols[lie] || w.grass[0]; ctx.fillRect(0, py - 4, px + 60, H);
    if (lie === 'rough') { ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5; const rr = U.mulberry32(7); for (let i = 0; i < 160; i++) { const x = rr() * (px + 40), y = py + rr() * (H - py); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rr() - 0.5) * 4, y - 6 - rr() * 6); ctx.stroke(); } }
    else if (lie === 'bunker') { ctx.strokeStyle = 'rgba(120,90,40,0.3)'; ctx.lineWidth = 1.2; for (let y = py + 6; y < H; y += 7) { ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x < px + 40; x += 20) ctx.quadraticCurveTo(x + 5, y - 2, x + 10, y); ctx.stroke(); } }
    else if (lie === 'tee') { ctx.fillStyle = 'rgba(255,255,255,0.12)'; for (let x = 0; x < px + 40; x += 36) ctx.fillRect(x, py, 18, H); ctx.fillStyle = '#d6281e'; ctx.beginPath(); ctx.arc(px - 30, py + 18, 4, 0, Math.PI * 2); ctx.arc(30, py + 18, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function greenFlag(p, holeNo, w) {
    if (p < 0.7) return;
    const k = U.clamp((p - 0.7) / 0.3, 0, 1), gx = U.lerp(W + 140, Math.max(W * 0.55, W - 300), 1 - Math.pow(1 - k, 2)), g2 = gy + (H - gy) * 0.42;
    ctx.fillStyle = w.green; ctx.beginPath(); ctx.ellipse(gx, g2, 110, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#20301f'; ctx.beginPath(); ctx.ellipse(gx + 10, g2 + 2, 6, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(gx + 10, g2 + 2); ctx.lineTo(gx + 10, g2 - 78); ctx.stroke();
    const wk = E.windCycle(E.get().meta.gt).kind, dir = wk === 'head' ? -1 : 1, wave = Math.sin(time * 6) * 4;
    ctx.fillStyle = '#d6281e'; ctx.beginPath(); ctx.moveTo(gx + 10, g2 - 78); ctx.quadraticCurveTo(gx + 10 + dir * 18, g2 - 74 + wave, gx + 10 + dir * 34, g2 - 68 + wave); ctx.lineTo(gx + 10, g2 - 58); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 11px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(holeNo, gx + 10 + dir * 12, g2 - 64 + wave * 0.5);
  }
  function windLines(wd) {
    if (wd.kmh < 8) return;
    const dir = wd.kind === 'head' ? -1 : 1, n = Math.min(40, 6 + wd.kmh / 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < n; i++) { const yy = 20 + ((i * 53) % (gy - 40)), xx = ((i * 211 + dir * time * (150 + wd.kmh * 6)) % (W + 200) + W + 200) % (W + 200) - 100; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + dir * 44, yy); ctx.stroke(); }
  }
  function blockOverlay(locked) {
    ctx.fillStyle = 'rgba(10,20,40,0.35)'; ctx.fillRect(W * 0.4, 0, W * 0.6, H);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) { const y = (i * 37) % H, x = W * 0.45 + ((time * 400 + i * 97) % (W * 0.55)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 50, y); ctx.lineTo(x - 42, y - 6); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.font = '800 26px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(locked ? L('WORLD LOCKED', 'DÜNYA KİLİTLİ') : L('WIND GATE', 'RÜZGÂR KAPISI'), W * 0.7, H * 0.3);
  }
  return v;
}

// ---------- view B: driving range (perspective) ----------
function makeRangeView(cv) {
  const ctx = cv.getContext('2d');
  let W = 800, H = 340, dpr = 1, hz = 140, F = 400, time = 0, balls = [], labels = [], lastPlayer = null;
  const CAM_H = 5, ZC = 12, pos = new Map();
  const proj = (x, y, z) => { const d = z + ZC; return [W / 2 + x * F / d, hz + (CAM_H - y) * F / d, F / d]; };
  const v = {
    cv, active: false,
    resize() { dpr = window.devicePixelRatio || 1; W = cv.clientWidth; H = cv.clientHeight; if (!W) return; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); hz = H * 0.40; F = (H * 0.97 - hz) * ZC / CAM_H; v.layout(); },
    layout() {
      pos.clear();
      const gs = Stage.golfers(), hs = gs.filter(g => !g.player), half = (W / 2) * (ZC + 1.5) / F * 0.9;
      const slots = [];
      const total = hs.length + 1, step = Math.min(3.2, (2 * half) / Math.max(1, total));
      for (let i = 0; i < total; i++) slots.push(-step * (total - 1) / 2 + i * step);
      // player sits in the middle of the line
      const mid = Math.floor(total / 2);
      gs.filter(g => g.player).forEach(g => pos.set(g, { x: slots[mid], z: 1.5 }));
      let k = 0; hs.forEach(g => { if (k === mid) k++; pos.set(g, { x: slots[k++], z: 1.5 }); });
    },
    onShot(g, e) {
      if (!v.active) return;
      const p = pos.get(g); if (!p) return;
      const w = E.world(), rs = e.range || E.rangeShot(e.q, e.pd);
      let carry = e.auto ? rs0(e) : rs.carry;
      const wk = E.windCycle(E.get().meta.gt).kind, wind = E.wind().kmh;
      const drift = (Math.random() - 0.5) * carry * 0.08 + (wk === 'calm' ? 0 : (wk === 'head' ? -1 : 1) * 0) + (Math.random() < 0.5 ? -1 : 1) * Math.min(25, wind * 0.25);
      const low = Math.pow(1 / w.gravity, 0.25);
      const apex = Math.min(42, (e.auto ? carry * 0.11 : rs.height / 3) * (e.pd ? 1.2 : 1));
      const T = (1.2 + carry / 200) * low;
      const b = { x0: p.x + 0.4, z0: p.z + 0.5, x1: p.x + drift, z1: carry, apex, T, t: 0, state: 'fly', col: g.col, e, rs, fade: 1, roll: e.auto ? carry * 0.08 : rs.total - rs.carry, player: !e.auto };
      b.g = g; balls = balls.filter(x => x.g !== g); balls.push(b);
      if (b.player) { lastPlayer = b; labels = [{ kind: 'speed', b, t: 0 }]; }
      if (balls.length > 60) balls.shift();
    },
    shot() { },
    newHole() { },
    update(dt) {
      if (!v.active) return;
      time += dt;
      for (const b of balls) {
        b.t += dt;
        if (b.state === 'fly' && b.t >= b.T) { b.state = 'roll'; b.t = 0; if (b.player) labels.push({ kind: 'carry', b, t: 0 }, { kind: 'height', b, t: 0 }); }
        else if (b.state === 'roll' && b.t >= 0.8) { b.state = 'rest'; b.t = 0; if (b.player) labels.push({ kind: 'total', b, t: 0 }); }
        else if (b.state === 'rest') b.fade -= dt * (b.player ? 0.25 : 0.6);
      }
      balls = balls.filter(b => b.fade > 0);
      labels.forEach(l => l.t += dt); labels = labels.filter(l => l.t < 4.5);
    },
    draw() {
      if (!v.active || !W) return;
      const S0 = E.get(), run = S0.run, w = E.world();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      Art.sky(ctx, W, hz, w);
      Art.scenery(ctx, W, hz, w, 0, 7);
      // ground and mowing bands
      ctx.fillStyle = w.rough; ctx.fillRect(0, hz, W, H - hz);
      for (let z = 0; z < 420; z += 14) {
        const a = proj(-400, 0, z), b = proj(-400, 0, z + 7);
        ctx.fillStyle = (z / 14) % 2 ? w.grass[0] : w.grass[1];
        ctx.fillRect(0, b[1], W, Math.max(1, a[1] - b[1]));
      }
      if (w.id === 'space') { ctx.strokeStyle = 'rgba(120,160,255,0.25)'; ctx.lineWidth = 1; for (let x = -60; x <= 60; x += 6) { const a = proj(x, 0, 0), b = proj(x, 0, 400); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } }
      // fairway corridor
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      { const a = proj(-25, 0, 6), b = proj(25, 0, 6), c = proj(12, 0, 400), d = proj(-12, 0, 400); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.fill(); }
      if (w.id === 'moon' || w.id === 'mercury') { const r = U.mulberry32(3); ctx.fillStyle = 'rgba(0,0,0,0.15)'; for (let i = 0; i < 14; i++) { const z = 20 + r() * 300, x = (r() - 0.5) * 120, p = proj(x, 0, z); ctx.beginPath(); ctx.ellipse(p[0], p[1], 6 * p[2], 6 * p[2] * CAM_H / (z + ZC), 0, 0, Math.PI * 2); ctx.fill(); } }
      // target greens with flags (like a range)
      const greens = [[-14, 55, 7], [12, 100, 9], [-6, 150, 10], [16, 205, 11], [-2, 260, 12], [8, 320, 14]];
      for (let i = greens.length - 1; i >= 0; i--) {
        const [x, z, r] = greens[i], c = proj(x, 0, z), rx = r * c[2], ry = rx * CAM_H / (z + ZC);
        ctx.fillStyle = w.sand; ctx.beginPath(); ctx.ellipse(c[0] + rx * 1.1, c[1] + ry * 0.6, rx * 0.5, ry * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = w.green; ctx.beginPath(); ctx.ellipse(c[0], c[1], rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        const top = proj(x, 3, z);
        ctx.strokeStyle = '#f4f4f4'; ctx.lineWidth = Math.max(1, c[2] * 0.08); ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(top[0], top[1]); ctx.stroke();
        ctx.fillStyle = ['#f2c230', '#e8453c', '#ffffff', '#3a6ee8', '#f2c230', '#e8453c'][i]; ctx.fillRect(top[0], top[1], Math.max(3, c[2] * 0.7), Math.max(2, c[2] * 0.45));
        ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = `700 ${Math.max(9, Math.min(16, c[2] * 0.9))}px "Barlow Condensed", sans-serif`; ctx.textAlign = 'center';
        ctx.fillText(z, c[0], c[1] + ry + Math.max(9, c[2] * 0.9));
      }
      // ball flights, far first
      const sorted = balls.slice().sort((a, b) => b.z1 - a.z1);
      for (const b of sorted) drawFlight(b);
      // golfers line with mats, bags and launch monitors
      const gs = Stage.golfers();
      for (const g of gs) {
        const p = pos.get(g); if (!p) continue;
        const h = !g.player && run.hitters[g.idx];
        const base = proj(p.x, 0, p.z), sc = base[2] * 0.03;
        ctx.fillStyle = 'rgba(20,50,25,0.55)'; ctx.beginPath(); ctx.ellipse(base[0], base[1], 34 * sc * 1.3, 7 * sc * 1.3, 0, 0, Math.PI * 2); ctx.fill();
        // bag
        const bx = base[0] - 26 * sc, by = base[1];
        ctx.fillStyle = g.col; ctx.fillRect(bx - 4 * sc, by - 26 * sc, 9 * sc, 26 * sc);
        ctx.fillStyle = '#1d2024'; ctx.fillRect(bx - 4 * sc, by - 26 * sc, 9 * sc, 4 * sc);
        ctx.strokeStyle = '#ccd'; ctx.lineWidth = Math.max(1, sc); for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(bx - 2 * sc + k * 2.5 * sc, by - 26 * sc); ctx.lineTo(bx - 3 * sc + k * 3 * sc, by - 33 * sc); ctx.stroke(); }
        if (g.player || (h && h.L > 0)) Art.golfer(ctx, base[0], base[1], sc * 1.0, Stage.lookOf(g), g.t, { ball: true, glow: g.player && run.pd >= 100, badge: h && h.type ? HELPER_TYPES[h.type].col : null });
        if (g.player) { ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(11 + sc * 4)}px "Barlow Condensed", sans-serif`; ctx.textAlign = 'center'; ctx.fillText(L('YOU', 'SEN'), base[0], base[1] + 16 * sc); }
      }
      // big stat labels for the last player shot
      for (const l of labels) {
        const b = l.b, a = Math.min(1, l.t * 3) * Math.min(1, (4.5 - l.t) / 0.6);
        let p, num, top, unit;
        if (l.kind === 'speed') { p = proj(b.x0 - 1, 1.5, b.z0); num = b.rs.speed; top = L('BALL SPEED', 'TOP HIZI'); unit = 'MPH'; }
        else if (l.kind === 'height') { p = proj(lerpX(b, 0.5), b.apex + 1, (b.z0 + b.z1) / 2); num = b.rs.height; top = L('HEIGHT', 'YÜKSEKLİK'); unit = 'FT'; }
        else if (l.kind === 'carry') { p = proj(b.x1 - 2, 3, b.z1); num = b.rs.carry; top = L('CARRY', 'TAŞIMA'); unit = 'YDS'; }
        else { p = proj(b.x1 + 2, 3, b.z1 + b.roll); num = b.rs.total; top = L('TOTAL', 'TOPLAM'); unit = 'YDS'; }
        statLabel(p[0], p[1], num, top, unit, a);
      }
      Art.weather(ctx, W, H, hz, w, time, E.windCycle(S0.meta.gt).kind);
      if (E.gateBlocked() || run.locked) {
        ctx.fillStyle = 'rgba(10,20,40,0.3)'; ctx.fillRect(0, 0, W, hz + 40);
        ctx.fillStyle = '#fff'; ctx.font = '800 28px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(run.locked ? L('WORLD LOCKED', 'DÜNYA KİLİTLİ') : L('WIND GATE', 'RÜZGÂR KAPISI'), W / 2, hz * 0.6);
      }
      Stage.drawGold(ctx, W, H);
      statusPill(ctx, E.curLie());
    },
    toNorm(x, y) { return [x / W, y / H, W, H]; },
  };
  function rs0(e) { const base = E.rangeShot(e.q, false).carry; return Math.round(base * (e.type === 'pow' ? 1.15 : e.type === 'fast' ? 0.8 : 0.95) * (0.85 + Math.random() * 0.25)); }
  const lerpX = (b, u) => U.lerp(b.x0, b.x1, u);
  function flightPt(b, u) { return proj(U.lerp(b.x0, b.x1, u), 4 * b.apex * u * (1 - u), U.lerp(b.z0, b.z1, u)); }
  function drawFlight(b) {
    const u = b.state === 'fly' ? Math.min(1, b.t / b.T) : 1;
    ctx.globalAlpha = Math.max(0, b.fade) * (b.player ? 1 : 0.5);
    ctx.strokeStyle = b.e.pd ? '#ff8a3d' : b.col; ctx.lineCap = 'round';
    const n = 28; let prev = flightPt(b, 0);
    for (let i = 1; i <= n; i++) {
      const uu = u * i / n, p = flightPt(b, uu);
      ctx.lineWidth = Math.max(1, (b.player ? 4 : 1.6) * Math.min(1, p[2] / 20 + 0.25));
      ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); prev = p;
    }
    let bp = prev;
    if (b.state !== 'fly') { const k = b.state === 'roll' ? Math.min(1, b.t / 0.8) : 1; bp = proj(b.x1, 0, b.z1 + b.roll * (1 - Math.pow(1 - k, 2))); const s = proj(b.x1, 0, b.z1); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(bp[0], bp[1]); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bp[0], bp[1], Math.max(1.5, bp[2] * 0.1), 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  function statLabel(x, y, num, top, unit, a) {
    ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.textAlign = 'left';
    const big = Math.round(Math.min(46, Math.max(24, W / 22)));
    ctx.font = `800 ${big}px "Barlow Condensed", sans-serif`;
    const nw = ctx.measureText(String(num)).width;
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 6;
    ctx.fillStyle = '#fff'; ctx.fillText(num, x - nw - 4, y);
    ctx.font = `700 ${Math.round(big * 0.32)}px "Barlow Condensed", sans-serif`;
    ctx.fillText(top, x, y - big * 0.38); ctx.fillText(unit, x, y - big * 0.02);
    ctx.restore();
  }
  return v;
}

// ---------- top-down hole map ----------
const HoleMap = (() => {
  let cv, ctx, W, H, dpr, cache = {};
  function init(c) { cv = c; ctx = cv.getContext('2d'); resize(); window.addEventListener('resize', resize); }
  function resize() { dpr = window.devicePixelRatio || 1; W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cache = {}; }
  function cr(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return [0, 1].map(i => 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3)); }
  function layout(n) {
    if (cache[n]) return cache[n];
    const r = U.rngOf('map', n), par = E.parOf(n), x0 = 34, x1 = W - 34, my = H * 0.5;
    const pts = [[x0, my]], bends = par === 3 ? 0 : par === 4 ? 1 : 2;
    for (let i = 1; i <= bends; i++) pts.push([x0 + (x1 - x0) * i / (bends + 1), my + (r() - 0.5) * H * 0.45]);
    pts.push([x1, my + (r() - 0.5) * H * 0.3]);
    const ext = [pts[0], ...pts, pts[pts.length - 1]], path = [];
    for (let i = 1; i < ext.length - 2; i++) for (let s = 0; s < 30; s++) path.push(cr(ext[i - 1], ext[i], ext[i + 1], ext[i + 2], s / 30));
    path.push(pts[pts.length - 1]);
    const cum = [0]; for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    const total = cum[cum.length - 1];
    const at = t => { const d = U.clamp(t, 0, 1) * total; let i = 1; while (i < cum.length - 1 && cum[i] < d) i++; const u = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]); return [U.lerp(path[i - 1][0], path[i][0], u), U.lerp(path[i - 1][1], path[i][1], u)]; };
    const normal = t => { const a = at(Math.max(0, t - 0.01)), b = at(Math.min(1, t + 0.01)), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
    const fw = 20 + r() * 6, bunkers = [], trees = [], w = E.world(n);
    const nb = (1 + Math.floor(r() * 3)) * (w.bunkerX || 1);
    for (let i = 0; i < nb; i++) { const t = 0.35 + r() * 0.6, p = at(t), nn = normal(t), sd = r() < 0.5 ? -1 : 1; bunkers.push([p[0] + nn[0] * sd * (fw / 2 + 6), p[1] + nn[1] * sd * (fw / 2 + 6), 7 + r() * 4]); }
    let water = null;
    if (E.hasWater(n)) { const t = 0.3 + r() * 0.35, p = at(t), nn = normal(t), sd = r() < 0.5 ? -1 : 1; water = [p[0] + nn[0] * sd * (fw / 2 + 10), p[1] + nn[1] * sd * (fw / 2 + 10), 18 + r() * 12, 8 + r() * 4]; }
    for (let i = 0; i < 40; i++) { const t = r(), p = at(t), nn = normal(t), sd = r() < 0.5 ? -1 : 1, off = fw / 2 + 14 + r() * 14; trees.push([p[0] + nn[0] * sd * off, p[1] + nn[1] * sd * off, 4 + r() * 3]); }
    const Lh = { par, at, normal, fw, bunkers, water, trees, fwStart: par === 3 ? 0.75 : 0.1, side: k => (U.hashF('side', n, k) < 0.5 ? -1 : 1) };
    cache[n] = Lh; return Lh;
  }
  function landPos(Lh, k, land, S2) {
    const t = land === 'green' ? 0.97 : 0.9 * k / S2, p = Lh.at(t), nn = Lh.normal(t), sd = Lh.side(k);
    if (land === 'rough') return [p[0] + nn[0] * sd * (Lh.fw / 2 + 7), p[1] + nn[1] * sd * (Lh.fw / 2 + 7)];
    if (land === 'bunker') return [p[0] + nn[0] * sd * (Lh.fw / 2 + 5), p[1] + nn[1] * sd * (Lh.fw / 2 + 5)];
    if (land === 'water') return Lh.water ? [Lh.water[0], Lh.water[1]] : [p[0] + nn[0] * sd * (Lh.fw / 2 + 10), p[1] + nn[1] * sd * (Lh.fw / 2 + 10)];
    return p;
  }
  function draw() {
    const run = E.get().run, n = run.n, Lh = layout(n), len = E.holeLen(n), S2 = E.segCount(n), w = E.world(n), p = Math.min(1, run.prog / len);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = w.rough; ctx.fillRect(0, 0, W, H);
    const r = U.rngOf('tex', n); ctx.fillStyle = 'rgba(0,0,0,0.15)'; for (let i = 0; i < 160; i++) ctx.fillRect(r() * W, r() * H, 2, 2);
    const seg = (a, b) => { ctx.beginPath(); for (let t = a; t <= b + 1e-6; t += 0.01) { const q = Lh.at(Math.min(t, b)); t === a ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1]); } };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = w.grass[0]; ctx.lineWidth = Lh.fw; seg(Lh.fwStart, 0.95); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.setLineDash([7, 7]); seg(Lh.fwStart, 0.95); ctx.stroke(); ctx.setLineDash([]);
    if (Lh.water) { ctx.fillStyle = w.id === 'ice' || w.id === 'snow' ? '#a9d8f0' : w.id === 'mercury' ? '#e0602a' : '#3d8fd1'; ctx.beginPath(); ctx.ellipse(Lh.water[0], Lh.water[1], Lh.water[2], Lh.water[3], 0.2, 0, Math.PI * 2); ctx.fill(); }
    for (const b of Lh.bunkers) { ctx.fillStyle = w.sand; ctx.beginPath(); ctx.ellipse(b[0], b[1], b[2], b[2] * 0.6, 0.3, 0, Math.PI * 2); ctx.fill(); }
    for (const t of Lh.trees) { ctx.fillStyle = w.tree || w.hill[1]; ctx.beginPath(); ctx.arc(t[0], t[1], t[2], 0, Math.PI * 2); ctx.fill(); }
    const tee = Lh.at(0), end = Lh.at(1);
    ctx.fillStyle = w.grass[1]; ctx.fillRect(tee[0] - 9, tee[1] - 6, 16, 12);
    ctx.fillStyle = w.green; ctx.beginPath(); ctx.arc(end[0], end[1], 15, 0, Math.PI * 2); ctx.fill();
    for (let k = 1; k <= S2; k++) { const q = Lh.at(0.9 * k / S2), nn = Lh.normal(0.9 * k / S2); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(q[0] - nn[0] * 14, q[1] - nn[1] * 14); ctx.lineTo(q[0] + nn[0] * 14, q[1] + nn[1] * 14); ctx.stroke(); ctx.setLineDash([]); }
    if (E.gateIdx(n) >= 0) { const q = Lh.at(0.9 / S2); ctx.fillStyle = E.gateBlocked() ? 'rgba(220,60,40,0.85)' : 'rgba(255,255,255,0.8)'; ctx.font = '800 11px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(L('WIND GATE ', 'RÜZGÂR KAPISI ') + E.holeWind(n) + ' km/h', q[0], 12); }
    const sh = run.shot, pts = [tee];
    sh.lands.forEach((land, i) => { const q = landPos(Lh, i + 1, land, S2); pts.push(q); if (land === 'bunker') { ctx.fillStyle = w.sand; ctx.beginPath(); ctx.ellipse(q[0], q[1], 9, 5.5, 0.3, 0, Math.PI * 2); ctx.fill(); } });
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.6; ctx.setLineDash([3, 4]); ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); ctx.setLineDash([]);
    sh.lands.forEach((land, i) => { const q = pts[i + 1]; ctx.fillStyle = TERRAIN_COL[land]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = '700 10px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.fillText((i + 1) + '. ' + N(TERRAIN[land]), q[0], q[1] - 8); });
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(end[0] + 2, end[1]); ctx.lineTo(end[0] + 2, end[1] - 20); ctx.stroke();
    ctx.fillStyle = '#d6281e'; ctx.beginPath(); ctx.moveTo(end[0] + 2, end[1] - 20); ctx.lineTo(end[0] + 14, end[1] - 16); ctx.lineTo(end[0] + 2, end[1] - 12); ctx.fill();
    let bp;
    if (p >= 0.9) { const a = pts[pts.length - 1]; bp = [U.lerp(a[0], end[0], (p - 0.9) / 0.1), U.lerp(a[1], end[1], (p - 0.9) / 0.1)]; }
    else { const k = sh.k, a = pts[k] || tee, b = Lh.at(0.9 * (k + 1) / S2), u = U.clamp((p - 0.9 * k / S2) / (0.9 / S2), 0, 1); bp = [U.lerp(a[0], b[0], u), U.lerp(a[1], b[1], u)]; }
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(bp[0] + 2, bp[1] + 2, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bp[0], bp[1], 4.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#13261d'; ctx.lineWidth = 1; ctx.stroke();
  }
  return { init, draw, layout, resize };
})();
