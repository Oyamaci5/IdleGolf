// Shared drawing: golfers (looks + world outfits + gear colors), world backdrops and weather.
const Art = (() => {
  const FINISH = { chrome: '#c9ced6', black: '#2b2f36', carbon: '#4a4f57', gold: '#e0b23a' };
  function gearColors(look) {
    const on = E.get().meta.equip.on, col = id => (id ? E.itemById(id).col : null);
    return { head: FINISH[look.club] || FINISH.chrome, rim: col(on.head), shaft: col(on.shaft) || (look.club === 'gold' ? '#e0b23a' : '#b9c0c8'), grip: col(on.grip) || '#2a2a2a', carbon: look.club === 'carbon' };
  }
  // apply the world outfit on top of the chosen look
  function dress(look, w, auto) {
    const o = Object.assign({}, look, { extra: null, suit: null });
    if (w.suit === 'space') return Object.assign(o, { shirt: '#e9edf2', pants: '#dfe4ea', hat: 'none', suit: 'space' });
    if (w.suit === 'heat') return Object.assign(o, { shirt: '#c9ccd1', pants: '#b9bcc2', hat: 'none', suit: 'heat' });
    if (!auto || !w.suit) return o;
    switch (w.suit) {
      case 'rain': return Object.assign(o, { shirt: '#f2c230', hat: 'bucket', hatColor: '#f2c230', extra: 'jacket' });
      case 'storm': return Object.assign(o, { shirt: '#24365c', hat: 'beanie', hatColor: '#c8281e', extra: 'jacket' });
      case 'forest': return Object.assign(o, { shirt: '#5b6b3a', hat: 'ranger', hatColor: '#7a5a32', extra: 'vest' });
      case 'desert': return Object.assign(o, { shirt: '#efe2c4', pants: '#d8c8a2', hat: 'sunhat', hatColor: '#e3c98f', extra: 'shades' });
      case 'snow': return Object.assign(o, { shirt: '#d33a2c', hat: 'beanie', hatColor: '#f4f6f1', extra: 'scarf' });
      case 'ice': return Object.assign(o, { shirt: '#e6f2fa', hat: 'hood', hatColor: '#e6f2fa', extra: 'goggles' });
    }
    return o;
  }
  function phiAt(t) {
    if (t < 0) return -0.15;
    const ease = u => 1 - Math.pow(1 - u, 2);
    if (t < 0.45) return U.lerp(-0.15, 2.5, ease(t / 0.45));
    if (t < 0.55) return U.lerp(2.5, -0.35, (t - 0.45) / 0.1);
    return U.lerp(-0.35, -2.3, ease((t - 0.55) / 0.45));
  }
  // x,y = feet; s = scale (1 ≈ 64 px tall)
  function golfer(ctx, x, y, s, look, t, opts = {}) {
    const gc = gearColors(look), phi = phiAt(t), shirt = look.shirt, pants = look.pants;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x + 2 * s, y + 1, 18 * s, 4.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    const hipX = x - s, hipY = y - 27 * s, shX = x + 4 * s, shY = y - 47 * s;
    if (look.suit === 'space') { ctx.fillStyle = '#9aa3ad'; ctx.fillRect(shX - 14 * s, shY + 1 * s, 7 * s, 18 * s); }
    ctx.strokeStyle = pants === 'plaid' ? '#8a2b2b' : pants; ctx.lineWidth = (look.suit ? 8 : 6.5) * s;
    ctx.beginPath(); ctx.moveTo(x - 8 * s, y - 3 * s); ctx.lineTo(hipX - 2 * s, hipY); ctx.lineTo(x + 8 * s, y - 3 * s); ctx.stroke();
    if (pants === 'plaid') { ctx.strokeStyle = 'rgba(255,220,120,0.6)'; ctx.lineWidth = s; for (let k = 0; k < 4; k++) { const u = k / 4; ctx.beginPath(); ctx.moveTo(U.lerp(x - 8 * s, hipX, u) - 3 * s, U.lerp(y, hipY, u)); ctx.lineTo(U.lerp(x + 8 * s, hipX, u) + 3 * s, U.lerp(y, hipY, u)); ctx.stroke(); } }
    ctx.fillStyle = look.suit ? '#7d858f' : '#f4f4f0';
    ctx.beginPath(); ctx.ellipse(x - 9 * s, y - s, 5 * s, 2.4 * s, 0, 0, Math.PI * 2); ctx.ellipse(x + 10 * s, y - s, 5 * s, 2.4 * s, 0, 0, Math.PI * 2); ctx.fill();
    // torso
    const wide = look.extra === 'jacket' || look.suit || look.shirt === '#d33a2c' && look.extra === 'scarf' ? 2.5 : 0;
    ctx.save(); ctx.beginPath();
    ctx.moveTo(hipX - 7 * s - wide * s, hipY + s); ctx.lineTo(shX - 8 * s - wide * s, shY + s); ctx.quadraticCurveTo(shX, shY - 4 * s, shX + 8 * s + wide * s, shY + s); ctx.lineTo(hipX + 7 * s + wide * s, hipY + s); ctx.closePath();
    if (shirt === 'gold') { const g = ctx.createLinearGradient(hipX, shY, hipX + 16 * s, hipY); g.addColorStop(0, '#fff1a8'); g.addColorStop(0.5, '#d9a521'); g.addColorStop(1, '#a87c10'); ctx.fillStyle = g; }
    else ctx.fillStyle = shirt === 'argyle' ? '#2f64d6' : shirt;
    ctx.fill();
    if (shirt === 'argyle') { ctx.clip(); ctx.fillStyle = '#f0c419'; for (let i = -1; i < 3; i++) for (let j = 0; j < 4; j++) { const cx = hipX - 6 * s + i * 7 * s + (j % 2) * 3.5 * s, cy = shY + 2 * s + j * 6.5 * s; ctx.beginPath(); ctx.moveTo(cx, cy - 3 * s); ctx.lineTo(cx + 2.5 * s, cy); ctx.lineTo(cx, cy + 3 * s); ctx.lineTo(cx - 2.5 * s, cy); ctx.fill(); } }
    if (look.extra === 'vest') { ctx.fillStyle = 'rgba(30,40,20,0.45)'; ctx.fillRect(shX - 3 * s, shY, 6 * s, 26 * s); }
    if (look.suit === 'heat') { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = s; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(hipX - 8 * s, shY + 5 * s + k * 6 * s); ctx.lineTo(hipX + 10 * s, shY + 3 * s + k * 6 * s); ctx.stroke(); } }
    ctx.restore();
    ctx.fillStyle = '#222'; ctx.fillRect(hipX - 7 * s, hipY - s, 14 * s, 2.4 * s);
    if (!look.suit && !look.extra) { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.moveTo(shX - 3 * s, shY); ctx.lineTo(shX + s, shY + 4 * s); ctx.lineTo(shX + 5 * s, shY); ctx.fill(); }
    if (look.extra === 'scarf' || look.extra === 'shades' && false) { ctx.strokeStyle = '#2f64d6'; ctx.lineWidth = 3.5 * s; ctx.beginPath(); ctx.moveTo(shX - 5 * s, shY + s); ctx.lineTo(shX + 5 * s, shY + s); ctx.lineTo(shX - 6 * s, shY + 10 * s); ctx.stroke(); }
    // arms + club
    const R = 17 * s, Lc = 30 * s;
    const hx = shX - Math.sin(phi) * R, hy = shY + 2 * s + Math.cos(phi) * R;
    const cx = hx - Math.sin(phi) * Lc, cy = hy + Math.cos(phi) * Lc;
    ctx.strokeStyle = shirt === 'argyle' ? '#2f64d6' : shirt === 'gold' ? '#d9a521' : shirt; ctx.lineWidth = (look.suit ? 7 : 5.5) * s;
    const mx = U.lerp(shX, hx, look.suit || look.extra === 'jacket' ? 0.85 : 0.45), my = U.lerp(shY + 2 * s, hy, look.suit || look.extra === 'jacket' ? 0.85 : 0.45);
    ctx.beginPath(); ctx.moveTo(shX, shY + 2 * s); ctx.lineTo(mx, my); ctx.stroke();
    ctx.strokeStyle = look.suit ? '#9aa3ad' : look.skin; ctx.lineWidth = 4 * s;
    ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(hx, hy); ctx.stroke();
    const gx = hx - Math.sin(phi) * 7 * s, gy = hy + Math.cos(phi) * 7 * s;
    ctx.strokeStyle = gc.grip; ctx.lineWidth = 3.2 * s; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(gx, gy); ctx.stroke();
    ctx.strokeStyle = gc.shaft; ctx.lineWidth = 1.8 * s; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(phi);
    ctx.fillStyle = gc.head; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-1.5 * s, -1.5 * s, 9 * s, 4.5 * s, 1.5 * s); else ctx.rect(-1.5 * s, -1.5 * s, 9 * s, 4.5 * s); ctx.fill();
    if (gc.carbon) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 0.6 * s; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(k * 2 * s, -1.5 * s); ctx.lineTo(k * 2 * s + 2 * s, 3 * s); ctx.stroke(); } }
    if (gc.rim) { ctx.strokeStyle = gc.rim; ctx.lineWidth = 1.4 * s; ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = look.suit ? '#e9edf2' : '#fafafa'; ctx.beginPath(); ctx.arc(hx, hy, 2.4 * s, 0, Math.PI * 2); ctx.fill();
    // head
    const headX = shX + 3 * s, headY = shY - 10 * s;
    ctx.fillStyle = look.skin; ctx.beginPath(); ctx.arc(headX, headY, 7 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1d14'; ctx.beginPath(); ctx.arc(headX + 3.5 * s, headY - 0.5 * s, 0.9 * s, 0, Math.PI * 2); ctx.fill();
    if (look.extra === 'shades') { ctx.fillStyle = '#111'; ctx.fillRect(headX + 1 * s, headY - 2 * s, 6.5 * s, 2.6 * s); }
    if (look.extra === 'goggles') { ctx.fillStyle = '#ff9a3d'; ctx.fillRect(headX - 3 * s, headY - 2.5 * s, 10.5 * s, 3.2 * s); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(headX + 3 * s, headY - 2 * s, 3 * s, 1 * s); }
    if (look.extra === 'scarf') { ctx.fillStyle = '#2f64d6'; ctx.fillRect(headX - 6 * s, headY + 5 * s, 12 * s, 3 * s); }
    hat(ctx, look.hat, look.hatColor, headX, headY, s);
    if (look.suit === 'space') {
      ctx.fillStyle = 'rgba(180,220,255,0.28)'; ctx.strokeStyle = 'rgba(230,240,255,0.95)'; ctx.lineWidth = 1.6 * s;
      ctx.beginPath(); ctx.arc(headX, headY, 10.5 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(headX + 4 * s, headY - 4.5 * s, 2.5 * s, 1.4 * s, -0.6, 0, Math.PI * 2); ctx.fill();
    }
    if (look.suit === 'heat') {
      ctx.fillStyle = '#c9ccd1'; ctx.beginPath(); ctx.arc(headX, headY, 9.5 * s, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createLinearGradient(headX, headY - 5 * s, headX + 9 * s, headY + 4 * s); g.addColorStop(0, '#fff1a8'); g.addColorStop(1, '#c48a10');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(headX + 3 * s, headY, 6 * s, 5 * s, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
    }
    if (opts.glow) { ctx.strokeStyle = `rgba(255,140,50,${0.5 + 0.4 * Math.sin(performance.now() / 100)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y - 30 * s, 26 * s, 40 * s, 0, 0, Math.PI * 2); ctx.stroke(); }
    if (opts.ball && t < 0.53) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 14 * s, y - 2 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill(); }
    if (opts.badge) { ctx.fillStyle = opts.badge; ctx.beginPath(); ctx.arc(x - 12 * s, y - 60 * s, 4 * s, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.restore();
  }
  function hat(ctx, kind, col, hx, hy, s) {
    ctx.fillStyle = col;
    switch (kind) {
      case 'cap': ctx.beginPath(); ctx.arc(hx, hy - s, 7.2 * s, Math.PI, 0); ctx.fill(); ctx.fillRect(hx + 2 * s, hy - 2 * s, 9 * s, 2.4 * s); break;
      case 'visor': ctx.fillStyle = '#3a2a1e'; ctx.beginPath(); ctx.arc(hx, hy - s, 7 * s, Math.PI, 0); ctx.fill(); ctx.fillStyle = col; ctx.fillRect(hx - 7 * s, hy - 3 * s, 14 * s, 2.6 * s); ctx.fillRect(hx + 4 * s, hy - 2.5 * s, 8 * s, 2.2 * s); break;
      case 'bucket': ctx.beginPath(); ctx.moveTo(hx - 6 * s, hy - 2 * s); ctx.lineTo(hx - 5 * s, hy - 9 * s); ctx.lineTo(hx + 5 * s, hy - 9 * s); ctx.lineTo(hx + 6 * s, hy - 2 * s); ctx.fill(); ctx.beginPath(); ctx.ellipse(hx, hy - 2 * s, 10 * s, 2 * s, 0, 0, Math.PI * 2); ctx.fill(); break;
      case 'beanie': ctx.beginPath(); ctx.arc(hx, hy - 1.5 * s, 7.6 * s, Math.PI, 0); ctx.fill(); ctx.fillRect(hx - 7.6 * s, hy - 2.5 * s, 15.2 * s, 3 * s); ctx.beginPath(); ctx.arc(hx, hy - 9.5 * s, 2 * s, 0, Math.PI * 2); ctx.fill(); break;
      case 'sunhat': ctx.beginPath(); ctx.ellipse(hx, hy - 3 * s, 13 * s, 2.6 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(hx, hy - 3.5 * s, 6 * s, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#8a5a32'; ctx.fillRect(hx - 6 * s, hy - 5 * s, 12 * s, 1.5 * s); break;
      case 'ranger': ctx.beginPath(); ctx.ellipse(hx, hy - 3 * s, 11 * s, 2.2 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(hx - 6 * s, hy - 3 * s); ctx.lineTo(hx - 4 * s, hy - 11 * s); ctx.lineTo(hx, hy - 9 * s); ctx.lineTo(hx + 4 * s, hy - 11 * s); ctx.lineTo(hx + 6 * s, hy - 3 * s); ctx.fill(); break;
      case 'hood': ctx.beginPath(); ctx.arc(hx - s, hy, 9.5 * s, Math.PI * 0.55, Math.PI * 2.05); ctx.lineTo(hx - s, hy); ctx.fill(); ctx.fillStyle = '#f7f1e3'; ctx.beginPath(); ctx.arc(hx + 3 * s, hy, 8.5 * s, -1.2, 1.2); ctx.lineWidth = 2.5 * s; ctx.strokeStyle = '#f7f1e3'; ctx.stroke(); break;
      case 'flat': ctx.beginPath(); ctx.ellipse(hx, hy - 4 * s, 8 * s, 4 * s, -0.1, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.ellipse(hx + 5 * s, hy - 3 * s, 6 * s, 1.6 * s, 0, 0, Math.PI * 2); ctx.fill(); break;
      case 'crown':
        ctx.fillStyle = '#3a2a1e'; ctx.beginPath(); ctx.arc(hx, hy - s, 7 * s, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#e0b23a'; ctx.beginPath(); ctx.moveTo(hx - 6 * s, hy - 5 * s); [[-4, -12], [-2, -7], [0, -13], [2, -7], [4, -12], [6, -5]].forEach(p => ctx.lineTo(hx + p[0] * s, hy + p[1] * s)); ctx.fill(); break;
      case 'none': ctx.fillStyle = '#3a2a1e'; ctx.beginPath(); ctx.arc(hx, hy - 1.5 * s, 7 * s, Math.PI * 1.05, -0.1); ctx.fill(); break;
    }
  }
  function preview(cv, look, w, auto, t) {
    const ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1, Wc = cv.clientWidth, Hc = cv.clientHeight;
    if (!Wc) return;
    if (cv.width !== Math.round(Wc * dpr)) { cv.width = Math.round(Wc * dpr); cv.height = Math.round(Hc * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gy = Hc * 0.66;
    sky(ctx, Wc, gy, w);
    ctx.fillStyle = w.grass[0]; ctx.fillRect(0, gy, Wc, Hc - gy);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < 8; i++) ctx.fillRect(i * 60 - 20, gy, 30, Hc);
    weather(ctx, Wc, Hc, gy, w, performance.now() / 1000, 'calm');
    const s = Math.min(Wc / 50, Hc / 86);
    golfer(ctx, Wc * 0.45, Hc * 0.92, s, dress(look, w, auto), t, { ball: true });
  }

  // ---------- backdrops ----------
  function sky(ctx, W, gy, w) {
    const g = ctx.createLinearGradient(0, 0, 0, gy); g.addColorStop(0, w.sky[0]); g.addColorStop(1, w.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, gy + 20);
    if (w.weather === 'stars' || w.weather === 'space' || w.weather === 'aurora') {
      const r = U.mulberry32(99); ctx.fillStyle = '#fff';
      for (let i = 0; i < 90; i++) { const a = 0.4 + r() * 0.6; ctx.globalAlpha = a; ctx.fillRect(r() * W, r() * gy * 0.95, r() < 0.1 ? 2 : 1, r() < 0.1 ? 2 : 1); }
      ctx.globalAlpha = 1;
    }
    if (w.id === 'moon') { // Earth in the sky
      const ex = W * 0.8, ey = gy * 0.3, er = Math.min(28, W * 0.04);
      ctx.fillStyle = '#2f6fd1'; ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4fae5a'; ctx.beginPath(); ctx.ellipse(ex - er * 0.2, ey - er * 0.1, er * 0.45, er * 0.3, 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(ex + er * 0.3, ey + er * 0.4, er * 0.4, er * 0.12, -0.3, 0, Math.PI * 2); ctx.fill();
    } else if (w.id === 'space') { // planet + ring
      const ex = W * 0.78, ey = gy * 0.38, er = Math.min(46, W * 0.06);
      ctx.fillStyle = '#c96a3d'; ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(240,210,160,0.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(ex, ey, er * 1.7, er * 0.35, -0.3, 0, Math.PI * 2); ctx.stroke();
    } else if (w.id === 'mercury') { // the sun fills the sky
      const sx = W * 0.75, sy = gy * 0.45, sr = Math.min(W, gy) * 0.45;
      const sg = ctx.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 1.4); sg.addColorStop(0, '#fffbe0'); sg.addColorStop(0.35, '#ffd25a'); sg.addColorStop(0.7, 'rgba(255,120,30,0.6)'); sg.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, sr * 1.4, 0, Math.PI * 2); ctx.fill();
    } else if (w.sun) { ctx.fillStyle = w.sun; ctx.beginPath(); ctx.arc(W * 0.78, gy * 0.28, 22, 0, Math.PI * 2); ctx.fill(); }
    if (w.weather === 'aurora') {
      const t = performance.now() / 4000;
      for (let k = 0; k < 3; k++) {
        ctx.strokeStyle = `rgba(${80 + k * 40},255,${180 - k * 30},0.18)`; ctx.lineWidth = 18 - k * 4;
        ctx.beginPath(); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, gy * (0.25 + 0.08 * k) + Math.sin(x / 90 + t + k) * 16); ctx.stroke();
      }
    }
  }
  // seeded scenery silhouettes per world (trees, cacti, rocks, station masts, craters)
  function scenery(ctx, W, gy, w, scroll, seed) {
    const r = U.rngOf('scn', seed, w.id), span = 1400, off = (scroll * 0.4) % span;
    for (let i = 0; i < 24; i++) {
      const tx = r() * span, k = r(), h = 26 + r() * 34;
      for (const rep of [0, span]) {
        const x = tx - off + rep; if (x < -50 || x > W + 50) continue;
        const y = gy + 2;
        if (w.id === 'desert') { ctx.fillStyle = '#5d7a3a'; ctx.fillRect(x - 3, y - h * 0.7, 6, h * 0.7); if (k > 0.4) { ctx.fillRect(x - 10, y - h * 0.5, 7, 4); ctx.fillRect(x - 10, y - h * 0.65, 4, 12); ctx.fillRect(x + 3, y - h * 0.4, 7, 4); ctx.fillRect(x + 7, y - h * 0.55, 4, 12); } }
        else if (w.id === 'moon' || w.id === 'mercury') { ctx.fillStyle = w.hill[1]; ctx.beginPath(); ctx.ellipse(x, y, h * 0.6, h * 0.22, 0, Math.PI, 0); ctx.fill(); }
        else if (w.id === 'space') { if (k < 0.3) { ctx.strokeStyle = '#5a6488'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h * 1.4); ctx.stroke(); ctx.fillStyle = k < 0.15 ? '#ff5f5f' : '#5fd1ff'; ctx.fillRect(x - 2, y - h * 1.4 - 3, 4, 4); } }
        else if (w.id === 'snow' || w.id === 'ice') { ctx.fillStyle = w.tree; ctx.beginPath(); ctx.moveTo(x, y - h * 1.2); ctx.lineTo(x - h * 0.35, y); ctx.lineTo(x + h * 0.35, y); ctx.fill(); ctx.fillStyle = '#f4f8fb'; ctx.beginPath(); ctx.moveTo(x, y - h * 1.2); ctx.lineTo(x - h * 0.15, y - h * 0.7); ctx.lineTo(x + h * 0.15, y - h * 0.7); ctx.fill(); }
        else if (w.tree) {
          ctx.fillStyle = '#4a3a2a'; ctx.fillRect(x - 2, y - 12, 4, 12); ctx.fillStyle = w.tree;
          const big = w.id === 'forest' ? 1.6 : 1;
          if (k < 0.35) { ctx.beginPath(); ctx.ellipse(x, y - 12 - h * 0.55 * big, 8 * big, h * 0.6 * big, 0, 0, Math.PI * 2); ctx.fill(); }
          else { ctx.beginPath(); ctx.arc(x, y - 12 - h * 0.35 * big, h * 0.38 * big, 0, Math.PI * 2); ctx.arc(x - h * 0.25, y - 10 - h * 0.2 * big, h * 0.28 * big, 0, Math.PI * 2); ctx.arc(x + h * 0.25, y - 10 - h * 0.22 * big, h * 0.3 * big, 0, Math.PI * 2); ctx.fill(); }
        }
      }
    }
  }
  // weather is computed from time alone, so both views can share it without particle state
  function weather(ctx, W, H, gy, w, t, windKind) {
    const dir = windKind === 'head' ? -1 : 1, r = U.mulberry32(7);
    switch (w.weather) {
      case 'rain': case 'storm': {
        const n = w.weather === 'storm' ? 140 : 90, slant = (w.weather === 'storm' ? 0.5 : 0.2) * dir;
        ctx.strokeStyle = 'rgba(210,225,240,0.55)'; ctx.lineWidth = 1.2;
        for (let i = 0; i < n; i++) { const x0 = r() * (W + 200) - 100, sp = 500 + r() * 300, y = ((r() * H + t * sp) % (H + 40)) - 20, x = x0 + slant * y; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + slant * 14, y + 14); ctx.stroke(); }
        if (w.weather === 'storm' && Math.sin(t * 0.9) > 0.985) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 0, W, H); }
        break;
      }
      case 'snow': ctx.fillStyle = 'rgba(255,255,255,0.9)';
        for (let i = 0; i < 110; i++) { const x0 = r() * W, sp = 30 + r() * 40, y = (r() * H + t * sp) % H, x = (x0 + Math.sin(t + i) * 12 + dir * t * 20) % W; ctx.beginPath(); ctx.arc((x + W) % W, y, 1 + r() * 1.8, 0, Math.PI * 2); ctx.fill(); }
        break;
      case 'dust': ctx.strokeStyle = 'rgba(230,190,120,0.45)'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 50; i++) { const y = r() * H, x = ((r() * W + dir * t * 260) % (W + 100) + W + 100) % (W + 100) - 50; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dir * 30, y + 2); ctx.stroke(); }
        ctx.fillStyle = 'rgba(240,200,130,0.12)'; ctx.fillRect(0, 0, W, H);
        break;
      case 'fog': { const g = ctx.createLinearGradient(0, gy - 40, 0, gy + 40); g.addColorStop(0, 'rgba(230,240,235,0)'); g.addColorStop(0.5, 'rgba(230,240,235,0.45)'); g.addColorStop(1, 'rgba(230,240,235,0)'); ctx.fillStyle = g; ctx.fillRect(0, gy - 40, W, 80); break; }
      case 'heat': ctx.fillStyle = 'rgba(255,140,40,0.10)'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(255,230,180,0.25)'; ctx.lineWidth = 1;
        for (let k = 0; k < 6; k++) { ctx.beginPath(); for (let x = 0; x <= W; x += 12) ctx.lineTo(x, gy - 6 + k * 3 + Math.sin(x / 14 + t * 4 + k) * 2); ctx.stroke(); }
        break;
      case 'space': ctx.fillStyle = 'rgba(160,200,255,0.5)';
        for (let i = 0; i < 25; i++) { const y = r() * gy, x = ((r() * W + t * 120 * (0.5 + r())) % W); ctx.fillRect(x, y, 6, 1); }
        break;
    }
  }
  return { golfer, preview, dress, gearColors, sky, scenery, weather, FINISH };
})();
