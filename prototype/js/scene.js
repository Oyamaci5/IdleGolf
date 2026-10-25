// Görseller: yandan saha sahnesi, üstten delik haritası ve vuruş halkası.

// ---------- vuruş halkası (§16.4: kariyer ve turnuvada aynı beceri) ----------
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
  relocate() {
    this.zone = (this.angle + 110 + Math.random() * 140) % 360;
    this.speed = 230 * (0.85 + Math.random() * 0.3);
  }
  update(dt) {
    this.angle = (this.angle + this.speed * dt) % 360;
    this.cool -= dt;
    if (this.flash) { this.flash.t -= dt; if (this.flash.t <= 0) this.flash = null; }
  }
  press(keepZone) {
    if (this.cool > 0 || !this.enabled) return null;
    let d = Math.abs(((this.angle - this.zone) % 360 + 540) % 360 - 180);
    const z = this.zones();
    const q = d <= z.p ? 2 : d <= z.g ? 1 : 0;
    this.flash = { q, t: 0.6 };
    this.cool = 0.32;
    if (!keepZone) this.relocate();
    return q;
  }
  draw() {
    const cv = this.cv, ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const S = cv.clientWidth;
    if (cv.width !== Math.round(S * dpr)) { cv.width = cv.height = Math.round(S * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, S, S);
    const c = S / 2, R = S * 0.36;
    const rad = a => (a - 90) * Math.PI / 180;
    ctx.fillStyle = 'rgba(8,30,22,0.78)';
    ctx.beginPath(); ctx.arc(c, c, S * 0.49, 0, Math.PI * 2); ctx.fill();
    // PD şarjı
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.arc(c, c, R + 12, 0, Math.PI * 2); ctx.stroke();
    if (this.pd > 0) {
      const pulse = this.pdReady ? 0.6 + 0.4 * Math.sin(performance.now() / 120) : 1;
      ctx.strokeStyle = this.pdReady ? `rgba(255,120,40,${pulse})` : '#ff8a3d';
      ctx.beginPath(); ctx.arc(c, c, R + 12, rad(0), rad(360 * this.pd / 100)); ctx.stroke();
    }
    // iz
    ctx.lineWidth = 13; ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(255,255,255,0.13)';
    ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.stroke();
    const z = this.zones();
    ctx.strokeStyle = '#6fbf73';
    ctx.beginPath(); ctx.arc(c, c, R, rad(this.zone - z.g), rad(this.zone + z.g)); ctx.stroke();
    ctx.strokeStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(c, c, R, rad(this.zone - z.p), rad(this.zone + z.p)); ctx.stroke();
    // ibre
    const a = rad(this.angle);
    ctx.strokeStyle = this.enabled ? '#fff' : 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(c + Math.cos(a) * R * 0.45, c + Math.sin(a) * R * 0.45);
    ctx.lineTo(c + Math.cos(a) * (R + 9), c + Math.sin(a) * (R + 9)); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(c + Math.cos(a) * R, c + Math.sin(a) * R, 4.5, 0, Math.PI * 2); ctx.fill();
    // merkez
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (this.flash) {
      const col = ['#ff7b6b', '#bfe8b5', '#ffd23f'][this.flash.q];
      ctx.fillStyle = col;
      ctx.font = `700 ${Math.round(S * 0.12)}px "Barlow Condensed", sans-serif`;
      ctx.fillText(['ISKA', 'İYİ', 'MÜKEMMEL'][this.flash.q], c, c - 4);
      ctx.font = `600 ${Math.round(S * 0.085)}px "Barlow Condensed", sans-serif`;
      ctx.fillText(['×0.5', '×1', '×2.5'][this.flash.q], c, c + S * 0.1);
    } else {
      ctx.fillStyle = this.pdReady ? '#ffb27a' : 'rgba(255,255,255,0.85)';
      ctx.font = `700 ${Math.round(S * 0.1)}px "Barlow Condensed", sans-serif`;
      ctx.fillText(this.center, c, c - 5);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = `600 ${Math.round(S * 0.075)}px "Barlow Condensed", sans-serif`;
      ctx.fillText(this.sub, c, c + S * 0.09);
    }
  }
}

// ---------- yandan sahne ----------
const Scene = (() => {
  let cv, ctx, W = 800, H = 340, dpr = 1, groundY = 220;
  let balls = [], pops = [], parts = [], banners = [];
  let golfers = [];
  let shake = 0, scroll = 0, timeAcc = 0;
  let gold = null, goldTimer = 90;
  let lastHoleKey = '', holeFlash = 0;
  let pendingPlayerShot = null;
  let autoAcc = [];
  const SHIRTS = ['#3a6ea5', '#e0a526', '#7d4fa3', '#2f8f83', '#c25b8a', '#5a7d2a', '#d06a2c', '#4d5bd1', '#8a6a4a'];

  const PAL = [
    { top: '#7fc3f0', bot: '#d9f0ff', hill: '#7fae86', hill2: '#5f9468', tree: '#2f6b3a', sun: '#fff6c8' },
    { top: '#6ab0e8', bot: '#f6e7c4', hill: '#8fae7a', hill2: '#6c9160', tree: '#3a6b33', sun: '#fff1b0' },
    { top: '#e8925f', bot: '#ffd9a0', hill: '#a29a6a', hill2: '#7d7a50', tree: '#3f5a2c', sun: '#fff0c0' },
    { top: '#2d3a6b', bot: '#d87b6a', hill: '#4f5e6a', hill2: '#3c4855', tree: '#1f3328', sun: '#ffe2c4' },
  ];

  function init(canvas) {
    cv = canvas; ctx = cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }
  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    groundY = Math.round(H * 0.6);
    layoutGolfers();
  }
  function layoutGolfers() {
    const run = E.get().run;
    const n = run.hitters.length;
    const prev = golfers;
    golfers = [];
    const spread = Math.min(W * 0.3, 32 * n);
    for (let i = 0; i < n; i++) {
      const g = prev.find(p => p.idx === i) || { t: -1, next: Math.random() };
      golfers.push(Object.assign(g, {
        idx: i, x: 22 + (n > 1 ? (spread * i) / (n - 1) : 0) + (i % 2) * 6, y: groundY + 16 + (i % 2) * 7,
        s: 0.62, shirt: SHIRTS[i % SHIRTS.length], player: false,
      }));
    }
    const p = prev.find(g => g.player) || { t: -1 };
    golfers.push(Object.assign(p, { idx: -1, x: Math.max(70, W * 0.09) + spread * 0.25, y: groundY + Math.min(70, (H - groundY) * 0.62), s: 1.15, shirt: '#c8281e', player: true }));
  }

  // ---------- çizim parçaları ----------
  function drawGolfer(g) {
    const s = g.s, x = g.x, y = g.y;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // gölge
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(x + 2 * s, y + 1, 16 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
    const t = g.t;
    let phi = -0.15;
    if (t >= 0) {
      const ease = u => 1 - Math.pow(1 - u, 2);
      if (t < 0.45) phi = U.lerp(-0.15, 2.5, ease(t / 0.45));
      else if (t < 0.55) phi = U.lerp(2.5, -0.35, (t - 0.45) / 0.1);
      else phi = U.lerp(-0.35, -2.3, ease((t - 0.55) / 0.45));
    }
    const hipX = x, hipY = y - 26 * s;
    const shX = x + 4 * s, shY = y - 48 * s;
    // bacaklar
    ctx.strokeStyle = '#2a2f3a'; ctx.lineWidth = 5 * s;
    ctx.beginPath(); ctx.moveTo(x - 7 * s, y); ctx.lineTo(hipX - 2 * s, hipY); ctx.lineTo(x + 7 * s, y); ctx.stroke();
    // gövde
    ctx.strokeStyle = g.shirt; ctx.lineWidth = 9 * s;
    ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(shX, shY); ctx.stroke();
    // kollar + sopa
    const R = 17 * s, L = 27 * s;
    const hx = shX - Math.sin(phi) * R, hy = shY + Math.cos(phi) * R;
    const cx = hx - Math.sin(phi) * L, cy = hy + Math.cos(phi) * L;
    ctx.strokeStyle = '#e8b98f'; ctx.lineWidth = 4 * s;
    ctx.beginPath(); ctx.moveTo(shX, shY + 2 * s); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = '#c9ced6'; ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 4 * s;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 5 * s * Math.cos(phi), cy + 5 * s * Math.sin(phi)); ctx.stroke();
    // baş + şapka
    ctx.fillStyle = '#e8b98f';
    ctx.beginPath(); ctx.arc(shX + 3 * s, shY - 9 * s, 6.5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = g.player ? '#fff' : g.shirt;
    ctx.beginPath(); ctx.arc(shX + 3 * s, shY - 11 * s, 6.5 * s, Math.PI, 0); ctx.fill();
    ctx.fillRect(shX + 3 * s, shY - 12 * s, 9 * s, 2.5 * s);
    // tee'deki top
    if (t < 0 || t < 0.5) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x + 12 * s, y - 2 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
    }
    if (g.player && E.get().run.pd >= 100) {
      ctx.strokeStyle = `rgba(255,140,50,${0.5 + 0.4 * Math.sin(performance.now() / 100)})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y - 30 * s, 26 * s, 40 * s, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  function hillPath(seed, base, amp, par, color) {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(0, groundY);
    const off = scroll * par;
    for (let x = 0; x <= W + 10; x += 10) {
      const u = (x + off) / 160;
      const y = base - amp * (0.6 * Math.sin(u + seed) + 0.3 * Math.sin(u * 2.3 + seed * 2) + 0.1 * Math.sin(u * 5.1));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, groundY); ctx.closePath(); ctx.fill();
  }
  function drawTrees(seed, pal) {
    const r = U.rngOf('trees', seed);
    const span = 1400, off = (scroll * 0.4) % span;
    const list = [];
    for (let i = 0; i < 26; i++) list.push({ x: r() * span, k: r(), h: 30 + r() * 30 });
    for (const t of list) {
      for (const rep of [0, span]) {
        const x = t.x - off + rep;
        if (x < -40 || x > W + 40) continue;
        const y = groundY + 2;
        ctx.fillStyle = '#4a3a2a';
        ctx.fillRect(x - 2, y - 12, 4, 12);
        ctx.fillStyle = pal.tree;
        if (t.k < 0.35) { ctx.beginPath(); ctx.ellipse(x, y - 12 - t.h * 0.55, 8, t.h * 0.6, 0, 0, Math.PI * 2); ctx.fill(); }
        else {
          ctx.beginPath();
          ctx.arc(x, y - 12 - t.h * 0.35, t.h * 0.38, 0, Math.PI * 2);
          ctx.arc(x - t.h * 0.25, y - 10 - t.h * 0.2, t.h * 0.28, 0, Math.PI * 2);
          ctx.arc(x + t.h * 0.25, y - 10 - t.h * 0.22, t.h * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  function drawGround(seed) {
    // rough
    ctx.fillStyle = '#4f8a3f'; ctx.fillRect(0, groundY, W, H - groundY);
    // fairway (biçilmiş şeritler)
    const top = groundY + 6, bot = H;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(0, top + 4); ctx.lineTo(W, top); ctx.lineTo(W, bot); ctx.lineTo(0, bot); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#6fb04f'; ctx.fillRect(0, top, W, bot - top);
    const bw = 64, off = scroll % (bw * 2);
    ctx.fillStyle = '#7dbd5a';
    for (let x = -bw * 2 - off; x < W + bw * 2; x += bw * 2) {
      ctx.beginPath();
      ctx.moveTo(x, top); ctx.lineTo(x + bw, top); ctx.lineTo(x + bw + 50, bot); ctx.lineTo(x + 50, bot); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // ön plan rough şeridi
    ctx.fillStyle = 'rgba(40,90,40,0.35)';
    ctx.fillRect(0, H - 10, W, 10);
    // bunkerler (deliğe göre)
    const r = U.rngOf('bunk', seed);
    const span = 1600, offB = scroll % span;
    for (let i = 0; i < 3; i++) {
      const bx = r() * span, by = top + 20 + r() * (bot - top - 40), bw2 = 40 + r() * 40;
      for (const rep of [0, span]) {
        const x = bx - offB + rep;
        if (x < W * 0.33 || x > W + 80) continue;
        ctx.fillStyle = '#e8d49a';
        ctx.beginPath(); ctx.ellipse(x, by, bw2, bw2 * 0.18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(120,90,40,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
    // tee alanı
    ctx.fillStyle = 'rgba(160,220,120,0.35)';
    ctx.beginPath();
    ctx.moveTo(8, groundY + 10); ctx.lineTo(W * 0.3, groundY + 8); ctx.lineTo(W * 0.32, H - 6); ctx.lineTo(4, H - 6); ctx.closePath(); ctx.fill();
  }
  function drawGreen(p, holeNo, wind) {
    if (p < 0.7) return;
    const k = U.clamp((p - 0.7) / 0.3, 0, 1);
    // halkanın soluna otursun
    const gx = U.lerp(W + 140, Math.max(W * 0.55, W - 300), 1 - Math.pow(1 - k, 2));
    const gy = groundY + (H - groundY) * 0.45;
    ctx.fillStyle = '#86cf63';
    ctx.beginPath(); ctx.ellipse(gx, gy, 120, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9ad874';
    ctx.beginPath(); ctx.ellipse(gx, gy, 98, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#20301f';
    ctx.beginPath(); ctx.ellipse(gx + 10, gy + 2, 6, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    // bayrak
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(gx + 10, gy + 2); ctx.lineTo(gx + 10, gy - 78); ctx.stroke();
    const dir = wind.kind === 'head' ? -1 : 1;
    const strength = wind.kind === 'calm' || wind.kind === 'none' ? 0.6 : 1;
    const wave = Math.sin(timeAcc * 6) * 4 * strength;
    ctx.fillStyle = '#d6281e';
    ctx.beginPath();
    ctx.moveTo(gx + 10, gy - 78);
    ctx.quadraticCurveTo(gx + 10 + dir * 18, gy - 74 + wave, gx + 10 + dir * 34 * strength, gy - 68 + wave);
    ctx.lineTo(gx + 10, gy - 58);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '700 11px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(holeNo, gx + 10 + dir * 12, gy - 64 + wave * 0.5);
    return { gx, gy };
  }
  function drawWind(w) {
    if (w.kind === 'none' || w.kind === 'calm') return;
    const dir = w.kind === 'tail' ? 1 : -1;
    ctx.strokeStyle = w.kind === 'tail' ? 'rgba(255,255,255,0.55)' : 'rgba(255,230,230,0.5)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      const sp = 260;
      const yy = 20 + ((i * 53) % (groundY - 40));
      const xx = ((i * 211 + dir * timeAcc * sp) % (W + 200) + W + 200) % (W + 200) - 100;
      ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + dir * 40, yy); ctx.stroke();
    }
  }

  // ---------- toplar ----------
  function surfaceFor(lieIdx, q) {
    const r = Math.random();
    const fair = [0.08, 0.3, 0.75, 0.92, 1][lieIdx] + (q === 2 ? 0.1 : q === 0 ? -0.3 : 0);
    if (r < fair) return 'fairway';
    if (lieIdx === 0 || r > 0.9) return 'bunker';
    return 'rough';
  }
  function launch(g, opts) {
    const s = g.s;
    const x0 = g.x + 12 * s, y0 = g.y - 2 * s;
    let x1, apex, T;
    const q = opts.q;
    if (opts.pd) { x1 = W + 260; apex = H * 0.75; T = 1.5; }
    else if (opts.auto) { x1 = W * (0.42 + Math.random() * 0.36); apex = 60 + Math.random() * 70; T = 1.0 + Math.random() * 0.5; }
    else { x1 = W * [0.36, 0.62, 0.8][q] + Math.random() * W * 0.08; apex = [50, 110, 170][q]; T = [0.9, 1.25, 1.5][q]; }
    const y1 = groundY + 14 + Math.random() * (H - groundY - 24);
    const b = {
      x0, y0, x1, y1, apex, T, t: 0, state: 'fly', x: x0, gy: y0, z: 0,
      surface: opts.pd ? 'fairway' : surfaceFor(opts.lie, q), value: opts.value, auto: opts.auto, q, pd: opts.pd,
      trail: [], vx: 0, fade: 1, popup: opts.popup,
    };
    balls.push(b);
    if (opts.pd) { shake = 14; burst(x0, y0 - 10, '#ff9a3d', 26, 3); }
  }
  function burst(x, y, color, n, sp = 1.5, g = 260) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (40 + Math.random() * 120) * sp;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: 0.6 + Math.random() * 0.6, color, size: 1.5 + Math.random() * 2.5, g });
    }
  }
  function confetti() {
    const cols = ['#ffd23f', '#d6281e', '#ffffff', '#6fbf73', '#3a6ea5'];
    for (let i = 0; i < 90; i++) {
      parts.push({ x: W * Math.random(), y: -10 - Math.random() * 40, vx: (Math.random() - 0.5) * 80, vy: 40 + Math.random() * 100, life: 2 + Math.random(), color: cols[i % cols.length], size: 3 + Math.random() * 3, g: 60, rect: true, rot: Math.random() * 6 });
    }
  }
  function popup(x, y, text, color, big) { pops.push({ x, y, text, color, t: 0, big }); }
  function banner(text, sub, color = '#fff', dur = 1.8) { banners.push({ text, sub, color, t: 0, dur }); }

  function updateBalls(dt) {
    for (const b of balls) {
      b.t += dt;
      if (b.state === 'fly') {
        const u = Math.min(1, b.t / b.T);
        b.x = U.lerp(b.x0, b.x1, u);
        b.gy = U.lerp(b.y0, b.y1, u);
        b.z = 4 * b.apex * u * (1 - u);
        if (!b.auto || b.pd) { b.trail.push([b.x, b.gy - b.z]); if (b.trail.length > (b.pd ? 26 : 12)) b.trail.shift(); }
        if (u >= 1) {
          b.state = 'roll'; b.t = 0;
          const k = { fairway: 0.22, rough: 0.06, bunker: 0 }[b.surface];
          b.vx = ((b.x1 - b.x0) / b.T) * k;
          if (b.surface === 'bunker') burst(b.x, b.gy, '#e8d49a', 10, 0.7);
          else if (b.surface === 'rough') burst(b.x, b.gy, '#3d7a32', 6, 0.5);
          if (b.popup) {
            const col = b.pd ? '#ffb05a' : b.q === 2 ? '#ffd23f' : b.auto ? 'rgba(255,255,255,0.85)' : '#fff';
            popup(b.x, b.gy - 12, '+' + U.fmt(b.value), col, !b.auto);
            if (!b.auto && b.surface !== 'fairway') popup(b.x, b.gy + 6, b.surface === 'bunker' ? 'bunker' : 'rough', '#f3e3b0', false);
          }
        }
      } else if (b.state === 'roll') {
        b.x += b.vx * dt; b.vx *= Math.pow(0.08, dt);
        if (Math.abs(b.vx) < 4) { b.state = 'rest'; b.t = 0; }
      } else {
        b.fade -= dt * 0.9;
      }
    }
    balls = balls.filter(b => b.fade > 0 && b.x < W + 400);
  }
  function drawBalls() {
    const sorted = balls.slice().sort((a, b) => a.gy - b.gy);
    for (const b of sorted) {
      ctx.globalAlpha = Math.max(0, b.fade);
      if (b.trail.length > 1) {
        ctx.strokeStyle = b.pd ? 'rgba(255,150,60,0.75)' : b.q === 2 ? 'rgba(255,230,120,0.55)' : 'rgba(255,255,255,0.4)';
        ctx.lineWidth = b.pd ? 6 : 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(b.trail[0][0], b.trail[0][1]);
        for (const p of b.trail) ctx.lineTo(p[0], p[1]);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      const sh = Math.max(0.4, 1 - b.z / 220);
      ctx.beginPath(); ctx.ellipse(b.x, b.gy, 3.5 * sh, 1.4 * sh, 0, 0, Math.PI * 2); ctx.fill();
      const r = b.auto ? 2.4 : 3.4;
      ctx.fillStyle = b.pd ? '#ffe2b0' : '#fff';
      ctx.beginPath(); ctx.arc(b.x, b.gy - b.z - r * 0.5, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // ---------- altın top ----------
  function updateGold(dt) {
    if (gold) {
      gold.t += dt;
      gold.x += gold.vx * dt;
      gold.y = gold.by + Math.sin(gold.t * 2) * 10;
      if (gold.t > 10) gold = null;
      return;
    }
    goldTimer -= dt;
    if (goldTimer <= 0) {
      goldTimer = CFG.goldMin + Math.random() * (CFG.goldMax - CFG.goldMin);
      gold = { x: W * 0.35 + Math.random() * W * 0.3, by: 40 + Math.random() * (groundY - 110), y: 0, vx: (Math.random() - 0.5) * 24, t: 0 };
    }
  }
  function drawGold() {
    if (!gold) return;
    const fade = gold.t > 8.5 ? (10 - gold.t) / 1.5 : 1;
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    const glow = ctx.createRadialGradient(gold.x, gold.y, 2, gold.x, gold.y, 30);
    glow.addColorStop(0, 'rgba(255,220,90,0.9)'); glow.addColorStop(1, 'rgba(255,220,90,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(gold.x, gold.y, 30, 0, Math.PI * 2); ctx.fill();
    const g2 = ctx.createRadialGradient(gold.x - 3, gold.y - 3, 1, gold.x, gold.y, 11);
    g2.addColorStop(0, '#fff7c8'); g2.addColorStop(1, '#d9a521');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(gold.x, gold.y, 11, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const a = gold.t * 2 + i * Math.PI / 2;
      ctx.fillStyle = '#fff';
      ctx.fillRect(gold.x + Math.cos(a) * 18 - 1, gold.y + Math.sin(a) * 18 - 1, 2.5, 2.5);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '700 11px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(10 - gold.t) + ' sn', gold.x, gold.y + 26);
    ctx.restore();
  }
  function hitGold(x, y) {
    if (!gold) return false;
    if (Math.hypot(x - gold.x, y - gold.y) < 30) {
      burst(gold.x, gold.y, '#ffd23f', 30, 1.4, 120);
      const gx = gold.x, gy = gold.y;
      gold = null;
      return { x: gx, y: gy };
    }
    return false;
  }
  function spawnGoldNow() { goldTimer = 0; }

  // ---------- ana güncelleme ----------
  function onSwingPlayer(res, lie) {
    const g = golfers.find(x => x.player);
    if (!g) return;
    g.t = 0;
    pendingPlayerShot = { g, opts: { q: res.q, pd: res.pd, value: res.v, auto: false, lie, popup: true } };
    if (res.pd) banner('POWER DRIVE!', '+' + U.fmt(res.v) + ' yd', '#ffb05a', 1.6);
  }

  function update(dtR) {
    const st = E.get(), run = st.run;
    timeAcc += dtR;
    const key = run.course + '-' + run.hole + '-' + run.hitters.length;
    if (key !== lastHoleKey) {
      const holeChanged = lastHoleKey && lastHoleKey.split('-').slice(0, 2).join() !== key.split('-').slice(0, 2).join();
      lastHoleKey = key; layoutGolfers();
      if (holeChanged) { holeFlash = 0.6; }
    }
    const len = E.holeLen(run.course, run.hole);
    const p = run.seasonDone ? 1 : run.prog / len;
    scroll += ((p * 900) - scroll) * Math.min(1, dtR * 4);
    if (holeFlash > 0) { holeFlash -= dtR; if (holeFlash > 0.3) scroll = p * 900; }

    // otomatik vurucular: görsel tavan 20 vuruş/s (§11.4)
    const boost = E.hitterBoost();
    const lie = E.lieIdx();
    const totalRate = E.autoRate();
    const visScale = totalRate > 20 ? 20 / totalRate : 1;
    const perSwing = E.autoDist();
    for (const g of golfers) {
      if (g.player) {
        if (g.t >= 0) {
          const prev = g.t; g.t += dtR / 0.5;
          if (prev < 0.53 && g.t >= 0.53 && pendingPlayerShot) { launch(pendingPlayerShot.g, pendingPlayerShot.opts); pendingPlayerShot = null; }
          if (g.t >= 1) g.t = -1;
        }
        continue;
      }
      const L = run.hitters[g.idx];
      if (!L) { g.t = -1; continue; }
      const rate = 0.4 * L * boost * visScale;
      const interval = Math.max(0.55, 1 / rate);
      if (g.t >= 0) {
        const prev = g.t; g.t += dtR / Math.min(0.5, interval * 0.9);
        if (prev < 0.53 && g.t >= 0.53) {
          const mult = rate * interval / visScale;
          const q = Math.random() < E.pPerfect() ? 2 : 1;
          launch(g, { q, auto: true, lie, value: perSwing * mult, popup: totalRate < 6 });
        }
        if (g.t >= 1) g.t = -1;
      } else {
        g.next -= dtR;
        if (g.next <= 0) { g.next = interval * (0.85 + Math.random() * 0.3); g.t = 0; }
      }
    }
    updateBalls(dtR);
    for (const pt of parts) { pt.x += pt.vx * dtR; pt.y += pt.vy * dtR; pt.vy += pt.g * dtR; pt.life -= dtR; if (pt.rot != null) pt.rot += dtR * 5; }
    parts = parts.filter(p => p.life > 0);
    for (const pp of pops) pp.t += dtR;
    pops = pops.filter(p => p.t < 1.3);
    for (const b of banners) b.t += dtR;
    banners = banners.filter(b => b.t < b.dur);
    shake = Math.max(0, shake - dtR * 30);
    updateGold(dtR);
  }

  function draw() {
    const st = E.get(), run = st.run;
    const pal = PAL[Math.min(3, run.course - 1)];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, pal.top); sky.addColorStop(1, pal.bot);
    ctx.fillStyle = sky; ctx.fillRect(-20, -20, W + 40, groundY + 20);
    // güneş
    ctx.fillStyle = pal.sun;
    ctx.beginPath(); ctx.arc(W * 0.78, groundY * 0.28, 22, 0, Math.PI * 2); ctx.fill();
    // bulutlar
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 5; i++) {
      const x = ((i * 237 + timeAcc * (6 + i * 2) - scroll * 0.05) % (W + 200) + W + 200) % (W + 200) - 100;
      const y = 26 + (i * 37) % (groundY * 0.45);
      ctx.beginPath(); ctx.ellipse(x, y, 36, 11, 0, 0, Math.PI * 2); ctx.ellipse(x + 20, y - 7, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
    }
    const seed = run.course * 31 + run.hole;
    hillPath(seed, groundY - 28, 22, 0.08, pal.hill);
    hillPath(seed + 3, groundY - 6, 12, 0.18, pal.hill2);
    drawTrees(seed, pal);
    drawWind(E.wind());
    drawGround(seed);
    const len = E.holeLen(run.course, run.hole);
    const p = run.seasonDone ? 1 : run.prog / len;
    const green = drawGreen(p, run.hole, E.wind());
    Scene.greenPos = green || null;
    // derinliğe göre: arka vurucular, toplar, oyuncu
    const back = golfers.filter(g => !g.player), front = golfers.filter(g => g.player);
    back.forEach(g => { if (run.hitters[g.idx] > 0) drawGolfer(g); else drawEmptyMat(g); });
    drawBalls();
    front.forEach(drawGolfer);
    // parçacıklar
    for (const pt of parts) {
      ctx.globalAlpha = Math.min(1, pt.life * 2);
      ctx.fillStyle = pt.color;
      if (pt.rect) { ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.rot); ctx.fillRect(-pt.size / 2, -pt.size / 4, pt.size, pt.size / 2); ctx.restore(); }
      else { ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    // sayı uçuşması
    ctx.textAlign = 'center';
    for (const pp of pops) {
      const a = 1 - pp.t / 1.3;
      ctx.globalAlpha = a;
      ctx.font = `700 ${pp.big ? 20 : 12}px "Barlow Condensed", sans-serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,40,25,0.55)';
      ctx.strokeText(pp.text, pp.x, pp.y - pp.t * 30);
      ctx.fillStyle = pp.color; ctx.fillText(pp.text, pp.x, pp.y - pp.t * 30);
    }
    ctx.globalAlpha = 1;
    drawGold();
    // afişler
    if (banners.length) {
      const b = banners[banners.length - 1];
      const k = b.t < 0.2 ? b.t / 0.2 : b.t > b.dur - 0.3 ? (b.dur - b.t) / 0.3 : 1;
      ctx.globalAlpha = Math.max(0, k);
      ctx.font = `800 ${Math.round(Math.min(46, W / 14))}px "Barlow Condensed", sans-serif`;
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(8,30,22,0.7)';
      const y = groundY * 0.42 - (1 - k) * 10;
      ctx.strokeText(b.text, W / 2, y); ctx.fillStyle = b.color; ctx.fillText(b.text, W / 2, y);
      if (b.sub) {
        ctx.font = `600 ${Math.round(Math.min(22, W / 30))}px "Barlow Condensed", sans-serif`;
        ctx.lineWidth = 4; ctx.strokeText(b.sub, W / 2, y + 30); ctx.fillStyle = '#fff'; ctx.fillText(b.sub, W / 2, y + 30);
      }
      ctx.globalAlpha = 1;
    }
    if (holeFlash > 0) { ctx.fillStyle = `rgba(255,255,255,${holeFlash})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
    ctx.restore();
  }
  function drawEmptyMat(g) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(g.x - 8, g.y - 3, 22, 5);
  }

  return {
    init, update, draw, resize, onSwingPlayer, hitGold, popup, banner, confetti, burst, spawnGoldNow,
    get W() { return W; }, get H() { return H; }, get groundY() { return groundY; }, greenPos: null,
    hasGold: () => !!gold,
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
  function layout(c, h) {
    const k = c + '-' + h;
    if (cache[k]) return cache[k];
    const r = U.rngOf('map', c, h);
    const par = CFG.parPattern[h - 1];
    const x0 = 34, x1 = W - 34, my = H * 0.5;
    const pts = [[x0, my]];
    const bends = par === 3 ? 0 : par === 4 ? 1 : 2;
    for (let i = 1; i <= bends; i++) pts.push([x0 + (x1 - x0) * i / (bends + 1), my + (r() - 0.5) * H * 0.5]);
    pts.push([x1, my + (r() - 0.5) * H * 0.3]);
    const ext = [pts[0], ...pts, pts[pts.length - 1]];
    const path = [];
    for (let i = 1; i < ext.length - 2; i++) for (let s = 0; s < 30; s++) path.push(cr(ext[i - 1], ext[i], ext[i + 1], ext[i + 2], s / 30));
    path.push(pts[pts.length - 1]);
    const cum = [0];
    for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    const total = cum[cum.length - 1];
    const at = t => {
      const d = t * total;
      let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
      const u = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
      return [U.lerp(path[i - 1][0], path[i][0], u), U.lerp(path[i - 1][1], path[i][1], u)];
    };
    const fw = 20 + r() * 6;
    const bunkers = [], trees = [];
    const nb = 1 + Math.floor(r() * 3);
    for (let i = 0; i < nb; i++) { const t = 0.35 + r() * 0.6; const p = at(t); bunkers.push([p[0] + (r() - 0.5) * 16, p[1] + (r() < 0.5 ? -1 : 1) * (fw / 2 + 5), 7 + r() * 5]); }
    let water = null;
    if (r() < 0.4) { const t = 0.3 + r() * 0.35; const p = at(t); water = [p[0], p[1] + (r() < 0.5 ? -1 : 1) * (fw * 0.4 + r() * 10), 18 + r() * 14, 8 + r() * 5]; }
    for (let i = 0; i < 40; i++) { const t = r(); const p = at(t); const side = r() < 0.5 ? -1 : 1; trees.push([p[0] + (r() - 0.5) * 10, p[1] + side * (fw / 2 + 12 + r() * 16), 4 + r() * 3]); }
    const L = { par, at, path, fw, bunkers, water, trees, fwStart: par === 3 ? 0.7 : 0.12 };
    cache[k] = L;
    return L;
  }
  function draw() {
    const st = E.get(), run = st.run;
    const L = layout(run.course, run.hole);
    const len = E.holeLen(run.course, run.hole);
    const p = run.seasonDone ? 1 : Math.min(1, run.prog / len);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#3f7a3a'; ctx.fillRect(0, 0, W, H);
    // rough dokusu
    const r = U.rngOf('tex', run.course, run.hole);
    ctx.fillStyle = 'rgba(30,70,30,0.35)';
    for (let i = 0; i < 160; i++) ctx.fillRect(r() * W, r() * H, 2, 2);
    // fairway
    const seg = (a, b) => { ctx.beginPath(); for (let t = a; t <= b + 1e-6; t += 0.01) { const q = L.at(Math.min(t, b)); if (t === a) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); } };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#6fb04f'; ctx.lineWidth = L.fw; seg(L.fwStart, 0.96); ctx.stroke();
    ctx.strokeStyle = 'rgba(140,210,110,0.55)'; ctx.setLineDash([7, 7]); seg(L.fwStart, 0.96); ctx.stroke(); ctx.setLineDash([]);
    if (L.water) { ctx.fillStyle = '#3d8fd1'; ctx.beginPath(); ctx.ellipse(L.water[0], L.water[1], L.water[2], L.water[3], 0.2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke(); }
    for (const b of L.bunkers) { ctx.fillStyle = '#ead7a0'; ctx.beginPath(); ctx.ellipse(b[0], b[1], b[2], b[2] * 0.6, 0.3, 0, Math.PI * 2); ctx.fill(); }
    for (const t of L.trees) { ctx.fillStyle = '#285c2c'; ctx.beginPath(); ctx.arc(t[0], t[1], t[2], 0, Math.PI * 2); ctx.fill(); }
    // tee ve yeşil
    const tee = L.at(0), end = L.at(1);
    ctx.fillStyle = '#86c966'; ctx.fillRect(tee[0] - 9, tee[1] - 6, 16, 12);
    ctx.fillStyle = '#7cc45c'; ctx.beginPath(); ctx.arc(end[0], end[1], 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9edc7a'; ctx.beginPath(); ctx.arc(end[0], end[1], 13, 0, Math.PI * 2); ctx.fill();
    // %90 yeşil eşiği
    const g90 = L.at(0.9);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(g90[0], g90[1] - 14); ctx.lineTo(g90[0], g90[1] + 14); ctx.stroke(); ctx.setLineDash([]);
    // ilerleme izi
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
    seg(0, Math.max(0.001, p)); ctx.stroke(); ctx.setLineDash([]);
    // bayrak
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(end[0] + 2, end[1]); ctx.lineTo(end[0] + 2, end[1] - 20); ctx.stroke();
    ctx.fillStyle = '#d6281e'; ctx.beginPath(); ctx.moveTo(end[0] + 2, end[1] - 20); ctx.lineTo(end[0] + 14, end[1] - 16); ctx.lineTo(end[0] + 2, end[1] - 12); ctx.fill();
    // top
    const bp = L.at(p);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(bp[0] + 2, bp[1] + 2, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bp[0], bp[1], 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#13261d'; ctx.lineWidth = 1; ctx.stroke();
    return L;
  }
  return { init, draw, layout, resize };
})();
