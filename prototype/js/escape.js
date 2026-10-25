// Hazard escape mini game: when the ball lands in a bunker or water while the player is active,
// stop the moving marker inside the green zone to get out without the penalty stroke.
const Escape = (() => {
  let ov, cv, ctx, titleEl, infoEl, st = null, raf = 0, last = 0;
  const CW = 460, CH = 230;
  function init() {
    ov = document.getElementById('escOverlay'); cv = document.getElementById('escCanvas'); ctx = cv.getContext('2d');
    titleEl = document.getElementById('escTitle'); infoEl = document.getElementById('escInfo');
    const dpr = window.devicePixelRatio || 1; cv.width = CW * dpr; cv.height = CH * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cv.addEventListener('pointerdown', e => { e.preventDefault(); press(); });
  }
  const isOpen = () => !!st;
  function open(o) {
    const zone = U.clamp(o.zone, 0.07, 0.32);
    st = { o, t: 0, x: 0, dir: 1, speed: 0.9 + Math.random() * 0.3, zone, zx: 0.2 + Math.random() * (0.8 - zone - 0.2), phase: 'aim', res: null };
    titleEl.textContent = o.title; infoEl.textContent = o.info;
    ov.hidden = false; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  function press() {
    if (!st || st.phase !== 'aim') return;
    st.res = st.x >= st.zx && st.x <= st.zx + st.zone; st.phase = 'done'; st.t = 0;
  }
  function loop(now) {
    if (!st) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; st.t += dt;
    if (st.phase === 'aim') {
      st.x += st.dir * st.speed * dt;
      if (st.x > 1) { st.x = 2 - st.x; st.dir = -1; } else if (st.x < 0) { st.x = -st.x; st.dir = 1; }
      if (st.t > 4) press();
    } else if (st.t > 1.1) { const cb = st.o.onDone, ok = st.res; ov.hidden = true; st = null; cb && cb(ok); return; }
    draw();
    raf = requestAnimationFrame(loop);
  }
  function draw() {
    const o = st.o, water = o.land === 'water';
    ctx.clearRect(0, 0, CW, CH);
    // the hazard
    ctx.fillStyle = o.grass; ctx.fillRect(0, 0, CW, CH);
    ctx.fillStyle = water ? o.waterCol : o.sand;
    ctx.beginPath(); ctx.ellipse(CW / 2, 92, 190, 62, 0, 0, Math.PI * 2); ctx.fill();
    if (water) { ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { const r = ((st.t * 30 + k * 20) % 60) + 8; ctx.beginPath(); ctx.ellipse(CW / 2, 92, r * 1.6, r * 0.6, 0, 0, Math.PI * 2); ctx.stroke(); } }
    else { ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1.5; for (let y = 50; y < 140; y += 8) { ctx.beginPath(); ctx.moveTo(CW / 2 - 170, y); ctx.quadraticCurveTo(CW / 2, y - 6, CW / 2 + 170, y); ctx.stroke(); } }
    let by = 92, bx = CW / 2;
    if (st.phase === 'done' && st.res) { const u = Math.min(1, st.t / 0.8); bx += u * 160; by -= Math.sin(u * Math.PI) * 70 + u * 20; for (let i = 0; i < 12; i++) { ctx.fillStyle = water ? 'rgba(200,230,255,0.7)' : o.sand; ctx.beginPath(); ctx.arc(CW / 2 + Math.cos(i) * 30 * u * 2, 92 - Math.abs(Math.sin(i * 2)) * 40 * u, 3, 0, Math.PI * 2); ctx.fill(); } }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke();
    // the meter
    const mx = 30, mw = CW - 60, my = 180;
    ctx.fillStyle = 'rgba(8,30,22,0.8)'; ctx.fillRect(mx - 6, my - 10, mw + 12, 34);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(mx, my, mw, 14);
    ctx.fillStyle = '#6fbf73'; ctx.fillRect(mx + st.zx * mw, my, st.zone * mw, 14);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(mx + (st.zx + st.zone * 0.35) * mw, my, st.zone * 0.3 * mw, 14);
    ctx.fillStyle = '#fff'; ctx.fillRect(mx + st.x * mw - 2, my - 6, 4, 26);
    const k = st.phase === 'aim' ? 1 - st.t / 4 : 0;
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(mx, my + 18, mw * k, 3);
    if (st.phase === 'done') {
      ctx.font = '800 34px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(8,30,22,0.7)';
      const t = st.res ? L('OUT! No penalty', 'ÇIKTI! Ceza yok') : L('Stuck: +1 stroke', 'Kaldı: +1 vuruş');
      ctx.strokeText(t, CW / 2, 40); ctx.fillStyle = st.res ? '#ffd23f' : '#fff'; ctx.fillText(t, CW / 2, 40);
    }
  }
  return { init, open, press, isOpen };
})();
