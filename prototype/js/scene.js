// Görseller: vuruş halkası, karakter çizimi (kostüm + ekipman), yandan sahne ve üstten delik haritası.

// ---------- vuruş halkası ----------
class Ring {
  constructor(cv) {
    this.cv = cv; this.ctx = cv.getContext('2d');
    this.angle = 0; this.speed = 230; this.zone = 0;
    this.focus = false; this.flash = null; this.cool = 0;
    this.pd = 0; this.pdReady = false; this.center = ''; this.sub = '';
    this.perfectDeg = 12; this.goodDeg = 40; this.enabled = true;
    this.relocate();
  }
  zones() { const f = this.focus ? 2 : 1; return { p: this.perfectDeg * f, g: Math.min(80, this.goodDeg * (this.focus ? 1.5 : 1)) }; }
  relocate() { this.zone = (this.angle + 110 + Math.random() * 140) % 360; this.speed = 230 * (0.85 + Math.random() * 0.3); }
  update(dt) {
    this.angle = (this.angle + this.speed * dt) % 360;
    this.cool -= dt;
    if (this.flash) { this.flash.t -= dt; if (this.flash.t <= 0) this.flash = null; }
  }
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
    if (cv.width !== Math.round(S * dpr)) { cv.width = cv.height = Math.round(S * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, S, S);
    const c = S / 2, R = S * 0.36, rad = a => (a - 90) * Math.PI / 180;
    ctx.fillStyle = 'rgba(8,30,22,0.78)'; ctx.beginPath(); ctx.arc(c, c, S * 0.49, 0, Math.PI * 2); ctx.fill();
    ctx.lineCap = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.arc(c, c, R + 12, 0, Math.PI * 2); ctx.stroke();
    if (this.pd > 0) {
      const pulse = this.pdReady ? 0.6 + 0.4 * Math.sin(performance.now() / 120) : 1;
      ctx.strokeStyle = this.pdReady ? `rgba(255,120,40,${pulse})` : '#ff8a3d';
      ctx.beginPath(); ctx.arc(c, c, R + 12, rad(0), rad(360 * this.pd / 100)); ctx.stroke();
    }
    ctx.lineWidth = 13; ctx.lineCap = 'butt'; ctx.strokeStyle = 'rgba(255,255,255,0.13)';
    ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.stroke();
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
      ctx.font = `700 ${Math.round(S * 0.12)}px "Barlow Condensed", sans-serif`;
      ctx.fillText(['ISKA', 'İYİ', 'MÜKEMMEL'][this.flash.q], c, c - 4);
      ctx.font = `600 ${Math.round(S * 0.085)}px "Barlow Condensed", sans-serif`;
      ctx.fillText(['×0.5', '×1', '×2.5'][this.flash.q], c, c + S * 0.1);
    } else {
      ctx.fillStyle = this.pdReady ? '#ffb27a' : 'rgba(255,255,255,0.85)';
      ctx.font = `700 ${Math.round(S * 0.1)}px "Barlow Condensed", sans-serif`; ctx.fillText(this.center, c, c - 5);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = `600 ${Math.round(S * 0.075)}px "Barlow Condensed", sans-serif`; ctx.fillText(this.sub, c, c + S * 0.09);
    }
    ctx.textBaseline = 'alphabetic';
  }
}

// ---------- karakter çizimi ----------
const Art = (() => {
  const FINISH = { chrome: '#c9ced6', black: '#2b2f36', carbon: '#4a4f57', gold: '#e0b23a' };
  // ekipman → sopa renkleri
  function gearColors(look) {
    const on = E.get().meta.equip.on, col = id => id ? E.itemById(id).col : null;
    return {
      head: FINISH[look.club] || FINISH.chrome, rim: col(on.head), shaft: col(on.shaft) || (look.club === 'gold' ? '#e0b23a' : '#b9c0c8'),
      grip: col(on.grip) || '#2a2a2a', carbon: look.club === 'carbon',
    };
  }
  function fillPattern(ctx, kind, base, x, y, w, h) {
    if (kind === 'gold') {
      const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#fff1a8'); g.addColorStop(0.5, '#d9a521'); g.addColorStop(1, '#a87c10');
      return g;
    }
    return base;
  }
  function phiAt(t) {
    if (t < 0) return -0.15;
    const ease = u => 1 - Math.pow(1 - u, 2);
    if (t < 0.45) return U.lerp(-0.15, 2.5, ease(t / 0.45));
    if (t < 0.55) return U.lerp(2.5, -0.35, (t - 0.45) / 0.1);
    return U.lerp(-0.35, -2.3, ease((t - 0.55) / 0.45));
  }
  // x,y = ayakların ortası; s = ölçek (1 ≈ 64 px boy)
  function golfer(ctx, x, y, s, look, t, opts = {}) {
    const gc = gearColors(look), phi = phiAt(t);
    const shirt = look.shirt, pants = look.pants;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x + 2 * s, y + 1, 18 * s, 4.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    const hipX = x - 1 * s, hipY = y - 27 * s, shX = x + 4 * s, shY = y - 47 * s;
    // bacaklar
    const pantsCol = pants === 'plaid' ? '#8a2b2b' : pants;
    ctx.strokeStyle = pantsCol; ctx.lineWidth = 6.5 * s;
    ctx.beginPath(); ctx.moveTo(x - 8 * s, y - 3 * s); ctx.lineTo(hipX - 2 * s, hipY); ctx.lineTo(x + 8 * s, y - 3 * s); ctx.stroke();
    if (pants === 'plaid') {
      ctx.strokeStyle = 'rgba(255,220,120,0.6)'; ctx.lineWidth = 1 * s;
      for (let k = 0; k < 4; k++) { const u = k / 4; ctx.beginPath(); ctx.moveTo(U.lerp(x - 8 * s, hipX, u) - 3 * s, U.lerp(y, hipY, u)); ctx.lineTo(U.lerp(x + 8 * s, hipX, u) + 3 * s, U.lerp(y, hipY, u)); ctx.stroke(); }
    }
    // ayakkabılar
    ctx.fillStyle = '#f4f4f0';
    ctx.beginPath(); ctx.ellipse(x - 9 * s, y - 1 * s, 4.5 * s, 2.2 * s, 0, 0, Math.PI * 2); ctx.ellipse(x + 10 * s, y - 1 * s, 4.5 * s, 2.2 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333'; ctx.fillRect(x - 13 * s, y - 0.5 * s, 8 * s, 1.2 * s); ctx.fillRect(x + 6 * s, y - 0.5 * s, 8 * s, 1.2 * s);
    // gövde
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(hipX - 7 * s, hipY + 1 * s); ctx.lineTo(shX - 8 * s, shY + 1 * s); ctx.quadraticCurveTo(shX, shY - 4 * s, shX + 8 * s, shY + 1 * s); ctx.lineTo(hipX + 7 * s, hipY + 1 * s); ctx.closePath();
    ctx.fillStyle = fillPattern(ctx, shirt, shirt === 'argyle' ? '#2f64d6' : shirt, hipX - 8 * s, shY, 16 * s, 28 * s); ctx.fill();
    if (shirt === 'argyle') {
      ctx.clip();
      ctx.fillStyle = '#f0c419';
      for (let i = -1; i < 3; i++) for (let j = 0; j < 4; j++) { const cx = hipX - 6 * s + i * 7 * s + (j % 2) * 3.5 * s, cy = shY + 2 * s + j * 6.5 * s; ctx.beginPath(); ctx.moveTo(cx, cy - 3 * s); ctx.lineTo(cx + 2.5 * s, cy); ctx.lineTo(cx, cy + 3 * s); ctx.lineTo(cx - 2.5 * s, cy); ctx.fill(); }
    }
    ctx.restore();
    // kemer ve yaka
    ctx.fillStyle = '#222'; ctx.fillRect(hipX - 7 * s, hipY - 1 * s, 14 * s, 2.4 * s);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.moveTo(shX - 3 * s, shY); ctx.lineTo(shX + 1 * s, shY + 4 * s); ctx.lineTo(shX + 5 * s, shY); ctx.fill();
    // kollar ve sopa
    const R = 17 * s, L = 30 * s;
    const hx = shX - Math.sin(phi) * R, hy = shY + 2 * s + Math.cos(phi) * R;
    const cx = hx - Math.sin(phi) * L, cy = hy + Math.cos(phi) * L;
    const sleeve = shirt === 'argyle' ? '#2f64d6' : shirt === 'gold' ? '#d9a521' : shirt;
    ctx.strokeStyle = sleeve; ctx.lineWidth = 5.5 * s;
    ctx.beginPath(); ctx.moveTo(shX, shY + 2 * s); ctx.lineTo(U.lerp(shX, hx, 0.45), U.lerp(shY + 2 * s, hy, 0.45)); ctx.stroke();
    ctx.strokeStyle = look.skin; ctx.lineWidth = 4 * s;
    ctx.beginPath(); ctx.moveTo(U.lerp(shX, hx, 0.45), U.lerp(shY + 2 * s, hy, 0.45)); ctx.lineTo(hx, hy); ctx.stroke();
    // sap, şaft, kafa
    const gx = hx - Math.sin(phi) * 7 * s, gy = hy + Math.cos(phi) * 7 * s;
    ctx.strokeStyle = gc.grip; ctx.lineWidth = 3.2 * s; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(gx, gy); ctx.stroke();
    ctx.strokeStyle = gc.shaft; ctx.lineWidth = 1.8 * s; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(phi);
    ctx.fillStyle = gc.head; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-1.5 * s, -1.5 * s, 9 * s, 4.5 * s, 1.5 * s) : ctx.rect(-1.5 * s, -1.5 * s, 9 * s, 4.5 * s); ctx.fill();
    if (gc.carbon) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 0.6 * s; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(k * 2 * s, -1.5 * s); ctx.lineTo(k * 2 * s + 2 * s, 3 * s); ctx.stroke(); } }
    if (gc.rim) { ctx.strokeStyle = gc.rim; ctx.lineWidth = 1.3 * s; ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#fafafa'; ctx.beginPath(); ctx.arc(hx, hy, 2.4 * s, 0, Math.PI * 2); ctx.fill();   // eldiven
    // baş
    const headX = shX + 3 * s, headY = shY - 10 * s;
    ctx.fillStyle = look.skin; ctx.beginPath(); ctx.arc(headX, headY, 7 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a1d14'; ctx.beginPath(); ctx.arc(headX + 3.5 * s, headY - 0.5 * s, 0.9 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.arc(headX - 2.5 * s, headY + 0.5 * s, 1.6 * s, 0, Math.PI * 2); ctx.fill();
    hat(ctx, look.hat, look.hatColor, headX, headY, s);
    if (opts.glow) {
      ctx.strokeStyle = `rgba(255,140,50,${0.5 + 0.4 * Math.sin(performance.now() / 100)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y - 30 * s, 26 * s, 40 * s, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (opts.ball && (t < 0 || t < 0.53)) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 14 * s, y - 2 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function hat(ctx, kind, col, hx, hy, s) {
    ctx.fillStyle = col;
    switch (kind) {
      case 'cap':
        ctx.beginPath(); ctx.arc(hx, hy - 1 * s, 7.2 * s, Math.PI, 0); ctx.fill();
        ctx.fillRect(hx + 2 * s, hy - 2 * s, 9 * s, 2.4 * s); break;
      case 'visor':
        ctx.fillStyle = '#3a2a1e'; ctx.beginPath(); ctx.arc(hx, hy - 1 * s, 7 * s, Math.PI, 0); ctx.fill();
        ctx.fillStyle = col; ctx.fillRect(hx - 7 * s, hy - 3 * s, 14 * s, 2.6 * s); ctx.fillRect(hx + 4 * s, hy - 2.5 * s, 8 * s, 2.2 * s); break;
      case 'bucket':
        ctx.beginPath(); ctx.moveTo(hx - 6 * s, hy - 2 * s); ctx.lineTo(hx - 5 * s, hy - 9 * s); ctx.lineTo(hx + 5 * s, hy - 9 * s); ctx.lineTo(hx + 6 * s, hy - 2 * s); ctx.fill();
        ctx.beginPath(); ctx.ellipse(hx, hy - 2 * s, 10 * s, 2 * s, 0, 0, Math.PI * 2); ctx.fill(); break;
      case 'flat':
        ctx.beginPath(); ctx.ellipse(hx, hy - 4 * s, 8 * s, 4 * s, -0.1, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.ellipse(hx + 5 * s, hy - 3 * s, 6 * s, 1.6 * s, 0, 0, Math.PI * 2); ctx.fill(); break;
      case 'crown':
        ctx.fillStyle = '#3a2a1e'; ctx.beginPath(); ctx.arc(hx, hy - 1 * s, 7 * s, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#e0b23a'; ctx.beginPath(); ctx.moveTo(hx - 6 * s, hy - 5 * s);
        [[-4, -12], [-2, -7], [0, -13], [2, -7], [4, -12], [6, -5]].forEach(p => ctx.lineTo(hx + p[0] * s, hy + p[1] * s)); ctx.fill();
        ctx.fillStyle = '#c8281e'; ctx.beginPath(); ctx.arc(hx, hy - 8 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill(); break;
      default:
        ctx.fillStyle = '#3a2a1e'; ctx.beginPath(); ctx.arc(hx, hy - 1.5 * s, 7 * s, Math.PI * 1.05, -0.1); ctx.fill();
    }
  }
  // görünüm sekmesi önizlemesi
  function preview(cv, look, t) {
    const ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    if (!W) return;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#9fd2f2'); g.addColorStop(0.62, '#e2f3ff'); g.addColorStop(0.62, '#6db54d'); g.addColorStop(1, '#5aa043');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 0; i < 6; i++) ctx.fillRect(i * 60 - 20, H * 0.62, 30, H);
    const s = Math.min(W / 60, H / 92);
    golfer(ctx, W * 0.45, H * 0.9, s, look, t, { ball: true });
  }
  return { golfer, preview, gearColors, FINISH };
})();

// ---------- yandan sahne ----------
const Scene = (() => {
  let cv, ctx, W = 800, H = 340, dpr = 1, groundY = 220;
  let balls = [], pops = [], parts = [], banners = [], golfers = [];
  let shake = 0, scroll = 0, timeAcc = 0, holeFlash = 0, lastKey = '', pendingShot = null;
  let gold = null, goldTimer = 90, lead = null;
  const PAL = [
    { top: '#7fc3f0', bot: '#d9f0ff', hill: '#7fae86', hill2: '#5f9468', tree: '#2f6b3a', sun: '#fff6c8' },
    { top: '#6ab0e8', bot: '#f6e7c4', hill: '#8fae7a', hill2: '#6c9160', tree: '#3a6b33', sun: '#fff1b0' },
    { top: '#e8925f', bot: '#ffd9a0', hill: '#a29a6a', hill2: '#7d7a50', tree: '#3f5a2c', sun: '#fff0c0' },
    { top: '#2d3a6b', bot: '#d87b6a', hill: '#4f5e6a', hill2: '#3c4855', tree: '#1f3328', sun: '#ffe2c4' },
    { top: '#5bb7c9', bot: '#f2f7e1', hill: '#c9b98a', hill2: '#a9976a', tree: '#4f7a3a', sun: '#ffffff' },
  ];
  const pal = () => PAL[(E.courseOf(E.get().run.n) - 1) % PAL.length];

  function init(canvas) { cv = canvas; ctx = cv.getContext('2d'); resize(); window.addEventListener('resize', resize); }
  function resize() {
    dpr = window.devicePixelRatio || 1; W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    groundY = Math.round(H * 0.56);
    layoutGolfers();
  }
  function layoutGolfers() {
    const run = E.get().run, n = run.hitters.length, prev = golfers;
    golfers = [];
    const spread = Math.min(W * 0.3, 34 * n);
    for (let i = 0; i < n; i++) {
      const g = prev.find(p => p.idx === i) || { t: -1, next: Math.random() };
      golfers.push(Object.assign(g, { idx: i, x: 26 + (n > 1 ? spread * i / (n - 1) : 0) + (i % 2) * 6, y: groundY + 18 + (i % 2) * 8, s: 0.62, player: false }));
    }
    const p = prev.find(g => g.player) || { t: -1 };
    golfers.push(Object.assign(p, { idx: -1, x: Math.max(80, W * 0.1) + spread * 0.3, y: groundY + Math.min(82, (H - groundY) * 0.66), s: 1.15, player: true }));
  }
  const lookOf = g => E.get().meta.looks[g.player ? 'p' : 'h' + g.idx];

  // ---------- arka plan ----------
  function hills(seed, base, amp, par, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, groundY);
    const off = scroll * par;
    for (let x = 0; x <= W + 10; x += 10) { const u = (x + off) / 160; ctx.lineTo(x, base - amp * (0.6 * Math.sin(u + seed) + 0.3 * Math.sin(u * 2.3 + seed * 2) + 0.1 * Math.sin(u * 5.1))); }
    ctx.lineTo(W, groundY); ctx.closePath(); ctx.fill();
  }
  function trees(seed, p) {
    const r = U.rngOf('trees', seed), span = 1400, off = (scroll * 0.4) % span;
    const list = []; for (let i = 0; i < 26; i++) list.push({ x: r() * span, k: r(), h: 30 + r() * 30 });
    for (const t of list) for (const rep of [0, span]) {
      const x = t.x - off + rep; if (x < -40 || x > W + 40) continue;
      const y = groundY + 2;
      ctx.fillStyle = '#4a3a2a'; ctx.fillRect(x - 2, y - 12, 4, 12);
      ctx.fillStyle = p.tree;
      if (t.k < 0.35) { ctx.beginPath(); ctx.ellipse(x, y - 12 - t.h * 0.55, 8, t.h * 0.6, 0, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(x, y - 12 - t.h * 0.35, t.h * 0.38, 0, Math.PI * 2); ctx.arc(x - t.h * 0.25, y - 10 - t.h * 0.2, t.h * 0.28, 0, Math.PI * 2); ctx.arc(x + t.h * 0.25, y - 10 - t.h * 0.22, t.h * 0.3, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  function ground(seed, lie) {
    ctx.fillStyle = '#4f8a3f'; ctx.fillRect(0, groundY, W, H - groundY);
    const top = groundY + 6, bot = H;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(0, top + 4); ctx.lineTo(W, top); ctx.lineTo(W, bot); ctx.lineTo(0, bot); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#6fb04f'; ctx.fillRect(0, top, W, bot - top);
    const bw = 64, off = scroll % (bw * 2);
    ctx.fillStyle = '#7dbd5a';
    for (let x = -bw * 2 - off; x < W + bw * 2; x += bw * 2) { ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + bw, top); ctx.lineTo(x + bw + 50, bot); ctx.lineTo(x + 50, bot); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    const r = U.rngOf('bunk', seed), span = 1600, offB = scroll % span;
    for (let i = 0; i < 3; i++) {
      const bx = r() * span, by = top + 20 + r() * (bot - top - 40), bw2 = 40 + r() * 40;
      for (const rep of [0, span]) {
        const x = bx - offB + rep; if (x < W * 0.38 || x > W + 80) continue;
        ctx.fillStyle = '#e8d49a'; ctx.beginPath(); ctx.ellipse(x, by, bw2, bw2 * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    // oyuncuların durduğu zemin: topun şu anki yeri
    const px = W * 0.36, py = groundY + 8;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(px, py - 2); ctx.quadraticCurveTo(px + 40, (py + H) / 2, px + 10, H); ctx.lineTo(0, H); ctx.closePath(); ctx.clip();
    const cols = { tee: '#9ddc76', fairway: '#7dc45a', rough: '#3d7531', bunker: '#e6d199', green: '#a5e283', water: '#7dc45a' };
    ctx.fillStyle = cols[lie] || '#7dc45a'; ctx.fillRect(0, py - 4, px + 60, H);
    if (lie === 'rough') {
      ctx.strokeStyle = 'rgba(25,60,20,0.7)'; ctx.lineWidth = 1.5;
      const rr = U.mulberry32(7);
      for (let i = 0; i < 160; i++) { const x = rr() * (px + 40), y = py + rr() * (H - py); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rr() - 0.5) * 4, y - 6 - rr() * 6); ctx.stroke(); }
    } else if (lie === 'bunker') {
      ctx.strokeStyle = 'rgba(160,120,60,0.35)'; ctx.lineWidth = 1.2;
      for (let y = py + 6; y < H; y += 7) { ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x < px + 40; x += 20) ctx.quadraticCurveTo(x + 5, y - 2, x + 10, y); ctx.stroke(); }
    } else if (lie === 'tee') {
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; for (let x = 0; x < px + 40; x += 36) ctx.fillRect(x, py, 18, H);
      ctx.fillStyle = '#d6281e'; ctx.beginPath(); ctx.arc(px - 30, py + 18, 4, 0, Math.PI * 2); ctx.arc(30, py + 18, 4, 0, Math.PI * 2); ctx.fill();
    } else if (lie === 'green') {
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; for (let x = 0; x < px + 40; x += 30) ctx.fillRect(x, py, 15, H);
    }
    ctx.restore();
    // zemin etiketi
    const tm = E.terrainMult(lie);
    ctx.font = '800 15px "Barlow Condensed", sans-serif'; ctx.textAlign = 'left';
    const label = `${TERRAIN[lie] ? TERRAIN[lie].name.toUpperCase() : lie} ×${tm.toFixed(2)}`;
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = tm < 0.95 ? 'rgba(160,40,30,0.85)' : 'rgba(8,30,22,0.75)';
    ctx.fillRect(10, H - 30, tw + 16, 22);
    ctx.fillStyle = '#fff'; ctx.fillText(label, 18, H - 13);
  }
  function greenFlag(p, holeNo, w) {
    if (p < 0.7) return null;
    const k = U.clamp((p - 0.7) / 0.3, 0, 1);
    const gx = U.lerp(W + 140, Math.max(W * 0.55, W - 300), 1 - Math.pow(1 - k, 2)), gy = groundY + (H - groundY) * 0.42;
    ctx.fillStyle = '#86cf63'; ctx.beginPath(); ctx.ellipse(gx, gy, 120, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9ad874'; ctx.beginPath(); ctx.ellipse(gx, gy, 98, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#20301f'; ctx.beginPath(); ctx.ellipse(gx + 10, gy + 2, 6, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(gx + 10, gy + 2); ctx.lineTo(gx + 10, gy - 78); ctx.stroke();
    const dir = w.kind === 'head' ? -1 : 1, str = w.kind === 'calm' || w.kind === 'none' ? 0.6 : 1, wave = Math.sin(timeAcc * 6) * 4 * str;
    ctx.fillStyle = '#d6281e'; ctx.beginPath(); ctx.moveTo(gx + 10, gy - 78);
    ctx.quadraticCurveTo(gx + 10 + dir * 18, gy - 74 + wave, gx + 10 + dir * 34 * str, gy - 68 + wave); ctx.lineTo(gx + 10, gy - 58); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 11px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(holeNo, gx + 10 + dir * 12, gy - 64 + wave * 0.5);
    return { gx, gy };
  }
  function windLines(w) {
    if (w.kind === 'none' || w.kind === 'calm') return;
    const dir = w.kind === 'tail' ? 1 : -1;
    ctx.strokeStyle = w.kind === 'tail' ? 'rgba(255,255,255,0.6)' : 'rgba(255,225,225,0.55)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 16; i++) {
      const yy = 20 + ((i * 53) % (groundY - 40)), xx = ((i * 211 + dir * timeAcc * 300) % (W + 200) + W + 200) % (W + 200) - 100;
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + dir * 44, yy); ctx.stroke();
    }
  }

  // ---------- toplar ----------
  function surfaceFor(q) {
    const o = E.landingOdds(); let r = Math.random() - (q === 2 ? 0.1 : q === 0 ? -0.2 : 0);
    if ((r -= o.bunker) < 0) return 'bunker';
    if ((r -= o.rough) < 0) return 'rough';
    return 'fairway';
  }
  function trailColor(b) {
    if (b.auto) return 'rgba(255,255,255,0.35)';
    const tr = E.get().meta.trail;
    if (b.pd) return 'rgba(255,150,60,0.8)';
    if (tr === 'gold') return 'rgba(255,215,90,0.8)';
    if (tr === 'fire') return `hsla(${20 + Math.sin(timeAcc * 20) * 15},100%,55%,0.85)`;
    if (tr === 'rainbow') return `hsla(${(timeAcc * 300) % 360},90%,60%,0.85)`;
    return b.q === 2 ? 'rgba(255,230,120,0.55)' : 'rgba(255,255,255,0.45)';
  }
  function launch(g, o) {
    const s = g.s, x0 = g.x + 14 * s, y0 = g.y - 2 * s, q = o.q;
    let x1, apex, T;
    if (o.pd) { x1 = W + 260; apex = H * 0.75; T = 1.5; }
    else if (o.auto) { x1 = W * (0.44 + Math.random() * 0.34); apex = 60 + Math.random() * 70; T = 1.0 + Math.random() * 0.5; }
    else { x1 = W * [0.38, 0.62, 0.8][q] + Math.random() * W * 0.08; apex = [50, 110, 170][q]; T = [0.9, 1.25, 1.5][q]; }
    const y1 = groundY + 14 + Math.random() * (H - groundY - 24);
    balls.push({ x0, y0, x1, y1, apex, T, t: 0, state: 'fly', x: x0, gy: y0, z: 0, surface: o.pd ? 'fairway' : surfaceFor(q), value: o.value, auto: o.auto, q, pd: o.pd, trail: [], vx: 0, fade: 1, popup: o.popup, big: o.big });
    if (o.pd) { shake = 14; burst(x0, y0 - 10, '#ff9a3d', 26, 3); }
  }
  function burst(x, y, color, n, sp = 1.5, g = 260) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = (40 + Math.random() * 120) * sp; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 0.6 + Math.random() * 0.6, color, size: 1.5 + Math.random() * 2.5, g }); }
  }
  function confetti() {
    const cols = ['#ffd23f', '#d6281e', '#ffffff', '#6fbf73', '#3a6ea5'];
    for (let i = 0; i < 90; i++) parts.push({ x: W * Math.random(), y: -10 - Math.random() * 40, vx: (Math.random() - 0.5) * 80, vy: 40 + Math.random() * 100, life: 2 + Math.random(), color: cols[i % cols.length], size: 3 + Math.random() * 3, g: 60, rect: true, rot: Math.random() * 6 });
  }
  const popup = (x, y, text, color, big) => pops.push({ x, y, text, color, t: 0, big });
  const banner = (text, sub, color = '#fff', dur = 1.8) => banners.push({ text, sub, color, t: 0, dur });

  // kariyer vuruş bölümü bitti: büyük top uçar ve yeni zemine düşer
  function shotEvent(e) {
    const p = golfers.find(g => g.player); if (p) p.t = 0;
    const T2 = { fairway: ['FAİRWAY', '#bff0a0', 'Temiz vuruş'], rough: ['ROUGH', '#f3e3b0', 'Sonraki vuruş yavaş'], bunker: ['BUNKER!', '#ffd59a', '+1 vuruş · ağır zemin'], water: ['SU!', '#9fd2ff', '+1 ceza vuruşu'], green: ['YEŞİLDE', '#d8ffb5', 'Putt zamanı'] }[e.land] || ['', '#fff', ''];
    banner(`${e.k}. vuruş: ${T2[0]}`, `${T2[2]} · zemin ×${E.terrainMult(e.land === 'water' ? 'water' : e.land).toFixed(2)}`, T2[1], 1.8);
    lead = { t: 0, land: e.land };
    holeFlash = 0.25;
    if (e.land === 'bunker') burst(W * 0.2, groundY + 40, '#e8d49a', 30, 1.2);
    if (e.land === 'water') burst(W * 0.2, groundY + 40, '#9fd2ff', 30, 1.2);
  }

  function updateBalls(dt) {
    for (const b of balls) {
      b.t += dt;
      if (b.state === 'fly') {
        const u = Math.min(1, b.t / b.T);
        b.x = U.lerp(b.x0, b.x1, u); b.gy = U.lerp(b.y0, b.y1, u); b.z = 4 * b.apex * u * (1 - u);
        if (!b.auto || b.pd) { b.trail.push([b.x, b.gy - b.z]); if (b.trail.length > (b.pd ? 26 : 14)) b.trail.shift(); }
        if (u >= 1) {
          b.state = 'roll'; b.t = 0;
          b.vx = ((b.x1 - b.x0) / b.T) * { fairway: 0.22, rough: 0.06, bunker: 0 }[b.surface];
          if (b.surface === 'bunker') burst(b.x, b.gy, '#e8d49a', 10, 0.7);
          else if (b.surface === 'rough') burst(b.x, b.gy, '#3d7a32', 6, 0.5);
          if (b.popup) {
            const col = b.pd ? '#ffb05a' : b.q === 2 ? '#ffd23f' : b.auto ? 'rgba(255,255,255,0.85)' : '#fff';
            popup(b.x, b.gy - 12, '+' + U.fmt(b.value), col, !b.auto);
          }
        }
      } else if (b.state === 'roll') { b.x += b.vx * dt; b.vx *= Math.pow(0.08, dt); if (Math.abs(b.vx) < 4) { b.state = 'rest'; b.t = 0; } }
      else b.fade -= dt * 0.9;
    }
    balls = balls.filter(b => b.fade > 0 && b.x < W + 400);
  }
  function drawBalls() {
    for (const b of balls.slice().sort((a, c) => a.gy - c.gy)) {
      ctx.globalAlpha = Math.max(0, b.fade);
      if (b.trail.length > 1) {
        ctx.strokeStyle = trailColor(b); ctx.lineWidth = b.pd ? 6 : 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(b.trail[0][0], b.trail[0][1]); for (const p of b.trail) ctx.lineTo(p[0], p[1]); ctx.stroke();
      }
      const sh = Math.max(0.4, 1 - b.z / 220);
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(b.x, b.gy, 3.5 * sh, 1.4 * sh, 0, 0, Math.PI * 2); ctx.fill();
      const r = b.auto ? 2.4 : 3.4;
      ctx.fillStyle = b.pd ? '#ffe2b0' : '#fff'; ctx.beginPath(); ctx.arc(b.x, b.gy - b.z - r * 0.5, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // ---------- altın top ----------
  function updateGold(dt) {
    if (gold) { gold.t += dt; gold.x += gold.vx * dt; gold.y = gold.by + Math.sin(gold.t * 2) * 10; if (gold.t > 10) gold = null; return; }
    goldTimer -= dt;
    if (goldTimer <= 0) { goldTimer = CFG.goldMin + Math.random() * (CFG.goldMax - CFG.goldMin); gold = { x: W * 0.35 + Math.random() * W * 0.3, by: 40 + Math.random() * (groundY - 110), y: 0, vx: (Math.random() - 0.5) * 24, t: 0 }; }
  }
  function drawGold() {
    if (!gold) return;
    ctx.save(); ctx.globalAlpha = Math.max(0, gold.t > 8.5 ? (10 - gold.t) / 1.5 : 1);
    const glow = ctx.createRadialGradient(gold.x, gold.y, 2, gold.x, gold.y, 30);
    glow.addColorStop(0, 'rgba(255,220,90,0.9)'); glow.addColorStop(1, 'rgba(255,220,90,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(gold.x, gold.y, 30, 0, Math.PI * 2); ctx.fill();
    const g2 = ctx.createRadialGradient(gold.x - 3, gold.y - 3, 1, gold.x, gold.y, 11);
    g2.addColorStop(0, '#fff7c8'); g2.addColorStop(1, '#d9a521');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(gold.x, gold.y, 11, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 4; i++) { const a = gold.t * 2 + i * Math.PI / 2; ctx.fillStyle = '#fff'; ctx.fillRect(gold.x + Math.cos(a) * 18 - 1, gold.y + Math.sin(a) * 18 - 1, 2.5, 2.5); }
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = '700 11px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('TIKLA · ' + Math.ceil(10 - gold.t) + ' sn', gold.x, gold.y + 26);
    ctx.restore();
  }
  function hitGold(x, y) {
    if (!gold || Math.hypot(x - gold.x, y - gold.y) >= 30) return false;
    burst(gold.x, gold.y, '#ffd23f', 30, 1.4, 120);
    const r = { x: gold.x, y: gold.y }; gold = null; return r;
  }

  // ---------- ana güncelleme ----------
  function onSwingPlayer(res) {
    const g = golfers.find(x => x.player); if (!g) return;
    g.t = 0; pendingShot = { g, o: { q: res.q, pd: res.pd, value: res.v, auto: false, popup: true } };
    if (res.pd) banner('POWER DRIVE!', '+' + U.fmt(res.v) + ' yd', '#ffb05a', 1.6);
  }
  function update(dtR) {
    const run = E.get().run;
    timeAcc += dtR;
    const key = run.n + '-' + run.hitters.length;
    if (key !== lastKey) { const changed = lastKey && lastKey.split('-')[0] !== String(run.n); lastKey = key; layoutGolfers(); if (changed) holeFlash = 0.6; }
    const p = run.prog / E.holeLen(run.n);
    scroll += (p * 900 - scroll) * Math.min(1, dtR * 4);
    if (holeFlash > 0) { holeFlash -= dtR; if (holeFlash > 0.4) scroll = p * 900; }
    const boost = E.hitterBoost(), totalRate = E.autoRate(), vis = totalRate > 20 ? 20 / totalRate : 1, per = E.autoDist();
    for (const g of golfers) {
      if (g.player) {
        if (g.t >= 0) { const prev = g.t; g.t += dtR / 0.5; if (prev < 0.53 && g.t >= 0.53 && pendingShot) { launch(pendingShot.g, pendingShot.o); pendingShot = null; } if (g.t >= 1) g.t = -1; }
        continue;
      }
      const L = run.hitters[g.idx];
      if (!L) { g.t = -1; continue; }
      const rate = 0.4 * L * E.msMult(L) * boost * vis, interval = Math.max(0.55, 1 / rate);
      if (g.t >= 0) {
        const prev = g.t; g.t += dtR / Math.min(0.5, interval * 0.9);
        if (prev < 0.53 && g.t >= 0.53) launch(g, { q: Math.random() < E.pPerfect() ? 2 : 1, auto: true, value: per * rate * interval / vis, popup: totalRate < 6 });
        if (g.t >= 1) g.t = -1;
      } else { g.next -= dtR; if (g.next <= 0) { g.next = interval * (0.85 + Math.random() * 0.3); g.t = 0; } }
    }
    if (lead) { lead.t += dtR; if (lead.t > 1.6) lead = null; }
    updateBalls(dtR);
    for (const pt of parts) { pt.x += pt.vx * dtR; pt.y += pt.vy * dtR; pt.vy += pt.g * dtR; pt.life -= dtR; if (pt.rot != null) pt.rot += dtR * 5; }
    parts = parts.filter(p2 => p2.life > 0);
    for (const pp of pops) pp.t += dtR; pops = pops.filter(p2 => p2.t < 1.3);
    for (const b of banners) b.t += dtR; banners = banners.filter(b => b.t < b.dur);
    shake = Math.max(0, shake - dtR * 30);
    updateGold(dtR);
  }
  function draw() {
    const run = E.get().run, P = pal();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    const sky = ctx.createLinearGradient(0, 0, 0, groundY); sky.addColorStop(0, P.top); sky.addColorStop(1, P.bot);
    ctx.fillStyle = sky; ctx.fillRect(-20, -20, W + 40, groundY + 20);
    ctx.fillStyle = P.sun; ctx.beginPath(); ctx.arc(W * 0.78, groundY * 0.28, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 5; i++) {
      const x = ((i * 237 + timeAcc * (6 + i * 2) - scroll * 0.05) % (W + 200) + W + 200) % (W + 200) - 100, y = 26 + (i * 37) % (groundY * 0.45);
      ctx.beginPath(); ctx.ellipse(x, y, 36, 11, 0, 0, Math.PI * 2); ctx.ellipse(x + 20, y - 7, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
    }
    const seed = run.n * 31;
    hills(seed, groundY - 28, 22, 0.08, P.hill); hills(seed + 3, groundY - 6, 12, 0.18, P.hill2);
    trees(seed, P);
    const w = E.wind();
    windLines(w);
    const lie = E.curLie();
    ground(seed, lie);
    const p = run.prog / E.holeLen(run.n);
    Scene.greenPos = greenFlag(p, E.holeIn(run.n), w);
    const back = golfers.filter(g => !g.player), front = golfers.filter(g => g.player);
    back.forEach(g => { if (run.hitters[g.idx] > 0) Art.golfer(ctx, g.x, g.y, g.s, lookOf(g), g.t, { ball: true }); else { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(g.x - 8, g.y - 3, 22, 5); } });
    drawBalls();
    front.forEach(g => Art.golfer(ctx, g.x, g.y, g.s, lookOf(g), g.t, { ball: true, glow: run.pd >= 100 }));
    // vuruş bölümü: büyük top ekranın üstünden uçar
    if (lead) {
      const u = Math.min(1, lead.t / 1.2), x = U.lerp(W * 0.2, W * 1.05, u), y = groundY + 40 - Math.sin(u * Math.PI) * groundY * 0.8;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.beginPath();
      for (let k = 0; k <= 12; k++) { const uu = Math.max(0, u - k * 0.02), xx = U.lerp(W * 0.2, W * 1.05, uu), yy = groundY + 40 - Math.sin(uu * Math.PI) * groundY * 0.8; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke();
    }
    for (const pt of parts) {
      ctx.globalAlpha = Math.min(1, pt.life * 2); ctx.fillStyle = pt.color;
      if (pt.rect) { ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.rot); ctx.fillRect(-pt.size / 2, -pt.size / 4, pt.size, pt.size / 2); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'center';
    for (const pp of pops) {
      ctx.globalAlpha = 1 - pp.t / 1.3;
      ctx.font = `700 ${pp.big ? 20 : 12}px "Barlow Condensed", sans-serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,40,25,0.55)'; ctx.strokeText(pp.text, pp.x, pp.y - pp.t * 30);
      ctx.fillStyle = pp.color; ctx.fillText(pp.text, pp.x, pp.y - pp.t * 30);
    }
    ctx.globalAlpha = 1;
    drawGold();
    if (banners.length) {
      const b = banners[banners.length - 1], k = b.t < 0.2 ? b.t / 0.2 : b.t > b.dur - 0.3 ? (b.dur - b.t) / 0.3 : 1;
      ctx.globalAlpha = Math.max(0, k);
      ctx.font = `800 ${Math.round(Math.min(44, W / 14))}px "Barlow Condensed", sans-serif`;
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(8,30,22,0.7)';
      const y = groundY * 0.42 - (1 - k) * 10;
      ctx.strokeText(b.text, W / 2, y); ctx.fillStyle = b.color; ctx.fillText(b.text, W / 2, y);
      if (b.sub) { ctx.font = `600 ${Math.round(Math.min(20, W / 30))}px "Barlow Condensed", sans-serif`; ctx.lineWidth = 4; ctx.strokeText(b.sub, W / 2, y + 28); ctx.fillStyle = '#fff'; ctx.fillText(b.sub, W / 2, y + 28); }
      ctx.globalAlpha = 1;
    }
    if (holeFlash > 0) { ctx.fillStyle = `rgba(255,255,255,${holeFlash})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
    ctx.restore();
  }
  return {
    init, update, draw, resize, onSwingPlayer, hitGold, popup, banner, confetti, burst, shotEvent,
    spawnGoldNow: () => { goldTimer = 0; }, greenPos: null,
  };
})();

// ---------- üstten delik haritası ----------
const HoleMap = (() => {
  let cv, ctx, W, H, dpr, cache = {};
  function init(c) { cv = c; ctx = cv.getContext('2d'); resize(); window.addEventListener('resize', resize); }
  function resize() { dpr = window.devicePixelRatio || 1; W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cache = {}; }
  function cr(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return [0, 1].map(i => 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3));
  }
  function layout(n) {
    if (cache[n]) return cache[n];
    const r = U.rngOf('map', n), par = E.parOf(n), x0 = 34, x1 = W - 34, my = H * 0.5;
    const pts = [[x0, my]], bends = par === 3 ? 0 : par === 4 ? 1 : 2;
    for (let i = 1; i <= bends; i++) pts.push([x0 + (x1 - x0) * i / (bends + 1), my + (r() - 0.5) * H * 0.45]);
    pts.push([x1, my + (r() - 0.5) * H * 0.3]);
    const ext = [pts[0], ...pts, pts[pts.length - 1]], path = [];
    for (let i = 1; i < ext.length - 2; i++) for (let s = 0; s < 30; s++) path.push(cr(ext[i - 1], ext[i], ext[i + 1], ext[i + 2], s / 30));
    path.push(pts[pts.length - 1]);
    const cum = [0];
    for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    const total = cum[cum.length - 1];
    const at = t => {
      const d = U.clamp(t, 0, 1) * total; let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
      const u = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
      return [U.lerp(path[i - 1][0], path[i][0], u), U.lerp(path[i - 1][1], path[i][1], u)];
    };
    const normal = t => { const a = at(Math.max(0, t - 0.01)), b = at(Math.min(1, t + 0.01)), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
    const fw = 20 + r() * 6, bunkers = [], trees = [];
    const nb = 1 + Math.floor(r() * 3);
    for (let i = 0; i < nb; i++) { const t = 0.35 + r() * 0.6, p = at(t), nn = normal(t), sd = r() < 0.5 ? -1 : 1; bunkers.push([p[0] + nn[0] * sd * (fw / 2 + 6), p[1] + nn[1] * sd * (fw / 2 + 6), 7 + r() * 4]); }
    let water = null;
    if (E.hasWater(n)) { const t = 0.3 + r() * 0.35, p = at(t), nn = normal(t), sd = r() < 0.5 ? -1 : 1; water = [p[0] + nn[0] * sd * (fw / 2 + 10), p[1] + nn[1] * sd * (fw / 2 + 10), 18 + r() * 12, 8 + r() * 4]; }
    for (let i = 0; i < 40; i++) { const t = r(), p = at(t), nn = normal(t), sd = r() < 0.5 ? -1 : 1, off = fw / 2 + 14 + r() * 14; trees.push([p[0] + nn[0] * sd * off, p[1] + nn[1] * sd * off, 4 + r() * 3]); }
    const L = { par, at, normal, fw, bunkers, water, trees, fwStart: par === 3 ? 0.75 : 0.1, side: k => (U.hashF('side', n, k) < 0.5 ? -1 : 1) };
    cache[n] = L;
    return L;
  }
  // bir düşüş noktasının harita konumu (zemine göre fairway dışına kayar)
  function landPos(L, k, land, S2) {
    const t = land === 'green' ? 0.97 : 0.9 * k / S2, p = L.at(t), nn = L.normal(t), sd = L.side(k);
    if (land === 'rough') return [p[0] + nn[0] * sd * (L.fw / 2 + 7), p[1] + nn[1] * sd * (L.fw / 2 + 7)];
    if (land === 'bunker') return [p[0] + nn[0] * sd * (L.fw / 2 + 5), p[1] + nn[1] * sd * (L.fw / 2 + 5)];
    if (land === 'water') return L.water ? [L.water[0], L.water[1]] : [p[0] + nn[0] * sd * (L.fw / 2 + 10), p[1] + nn[1] * sd * (L.fw / 2 + 10)];
    return p;
  }
  function draw() {
    const run = E.get().run, n = run.n, L = layout(n), len = E.holeLen(n), S2 = E.segCount(n);
    const p = Math.min(1, run.prog / len);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#3f7a3a'; ctx.fillRect(0, 0, W, H);
    const r = U.rngOf('tex', n); ctx.fillStyle = 'rgba(30,70,30,0.35)';
    for (let i = 0; i < 160; i++) ctx.fillRect(r() * W, r() * H, 2, 2);
    const seg = (a, b) => { ctx.beginPath(); for (let t = a; t <= b + 1e-6; t += 0.01) { const q = L.at(Math.min(t, b)); t === a ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1]); } };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#6fb04f'; ctx.lineWidth = L.fw; seg(L.fwStart, 0.95); ctx.stroke();
    ctx.strokeStyle = 'rgba(140,210,110,0.55)'; ctx.setLineDash([7, 7]); seg(L.fwStart, 0.95); ctx.stroke(); ctx.setLineDash([]);
    if (L.water) { ctx.fillStyle = '#3d8fd1'; ctx.beginPath(); ctx.ellipse(L.water[0], L.water[1], L.water[2], L.water[3], 0.2, 0, Math.PI * 2); ctx.fill(); }
    for (const b of L.bunkers) { ctx.fillStyle = '#ead7a0'; ctx.beginPath(); ctx.ellipse(b[0], b[1], b[2], b[2] * 0.6, 0.3, 0, Math.PI * 2); ctx.fill(); }
    for (const t of L.trees) { ctx.fillStyle = '#285c2c'; ctx.beginPath(); ctx.arc(t[0], t[1], t[2], 0, Math.PI * 2); ctx.fill(); }
    const tee = L.at(0), end = L.at(1);
    ctx.fillStyle = '#86c966'; ctx.fillRect(tee[0] - 9, tee[1] - 6, 16, 12);
    ctx.fillStyle = '#7cc45c'; ctx.beginPath(); ctx.arc(end[0], end[1], 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9edc7a'; ctx.beginPath(); ctx.arc(end[0], end[1], 13, 0, Math.PI * 2); ctx.fill();
    // vuruş bölüm sınırları
    for (let k = 1; k <= S2; k++) {
      const q = L.at(0.9 * k / S2);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      const nn = L.normal(0.9 * k / S2);
      ctx.beginPath(); ctx.moveTo(q[0] - nn[0] * 14, q[1] - nn[1] * 14); ctx.lineTo(q[0] + nn[0] * 14, q[1] + nn[1] * 14); ctx.stroke(); ctx.setLineDash([]);
    }
    // gerçekleşen düşüşler
    const sh = run.shot, pts = [tee];
    sh.lands.forEach((land, i) => {
      const q = landPos(L, i + 1, land, S2); pts.push(q);
      if (land === 'bunker') { ctx.fillStyle = '#ead7a0'; ctx.beginPath(); ctx.ellipse(q[0], q[1], 9, 5.5, 0.3, 0, Math.PI * 2); ctx.fill(); }
    });
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.6; ctx.setLineDash([3, 4]);
    ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke(); ctx.setLineDash([]);
    sh.lands.forEach((land, i) => {
      const q = pts[i + 1];
      ctx.fillStyle = TERRAIN[land] ? TERRAIN[land].col : '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '700 10px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText((i + 1) + '. ' + (TERRAIN[land] ? TERRAIN[land].name : land), q[0], q[1] - 8);
    });
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(end[0] + 2, end[1]); ctx.lineTo(end[0] + 2, end[1] - 20); ctx.stroke();
    ctx.fillStyle = '#d6281e'; ctx.beginPath(); ctx.moveTo(end[0] + 2, end[1] - 20); ctx.lineTo(end[0] + 14, end[1] - 16); ctx.lineTo(end[0] + 2, end[1] - 12); ctx.fill();
    // top: bulunduğu bölümün başından sonuna ilerler
    let bp;
    if (p >= 0.9) { const a = pts[pts.length - 1]; bp = [U.lerp(a[0], end[0], (p - 0.9) / 0.1), U.lerp(a[1], end[1], (p - 0.9) / 0.1)]; }
    else {
      const k = sh.k, a = pts[k] || tee, tNext = 0.9 * (k + 1) / S2, b = L.at(tNext);
      const u = U.clamp((p - 0.9 * k / S2) / (0.9 / S2), 0, 1);
      bp = [U.lerp(a[0], b[0], u), U.lerp(a[1], b[1], u)];
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(bp[0] + 2, bp[1] + 2, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bp[0], bp[1], 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#13261d'; ctx.lineWidth = 1; ctx.stroke();
  }
  return { init, draw, layout, resize };
})();
