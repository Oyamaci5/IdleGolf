// Ortak yardımcılar: seed'li RNG, sayı/süre biçimleri, yumuşak tavan.
const U = (() => {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(...xs) {
    let h = 2166136261 >>> 0;
    for (const x of xs) {
      const s = String(x);
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      h ^= 0x9e37; h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  const rngOf = (...xs) => mulberry32(hash(...xs));
  const hashF = (...xs) => mulberry32(hash(...xs))();

  // §11.6 gösterim: 3 anlamlı basamak + K, M, B, T, Qa ...; 1e33 üstü bilimsel
  const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + fmt(-n);
    if (n < 10) return (Math.round(n * 10) / 10).toString();
    if (n < 1000) return Math.floor(n).toString();
    const e = Math.floor(Math.log10(n) / 3);
    if (e >= SUF.length) return n.toExponential(2).replace('+', '');
    const v = n / Math.pow(10, e * 3);
    const s = v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0);
    return s + SUF[e];
  }
  function fmtTime(sec) {
    sec = Math.max(0, sec);
    if (!isFinite(sec)) return '∞';
    if (sec < 60) return Math.ceil(sec) + ' sn';
    if (sec < 3600) { const m = Math.floor(sec / 60), s = Math.floor(sec % 60); return m + ' dk' + (s ? ' ' + s + ' sn' : ''); }
    if (sec < 86400) { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h + ' sa' + (m ? ' ' + m + ' dk' : ''); }
    if (sec < 86400 * 365) { const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600); return d + ' gün' + (h ? ' ' + h + ' sa' : ''); }
    return 'çok uzun';
  }
  function fmtClock(sec) {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
    return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  const softcap = (x, s, e) => (x <= s ? x : s * Math.pow(x / s, e));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  function normal(r) {
    const u = Math.max(1e-9, r()), v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);
  return { mulberry32, hash, rngOf, hashF, fmt, fmtTime, fmtClock, softcap, clamp, lerp, normal, pick, el, stars };
})();
