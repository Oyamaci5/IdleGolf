// Arayüz: tabela, hedefler, sekmeli panel, modallar, zaman kontrolü, kayıt ve ana döngü.
const UI = (() => {
  const $ = id => document.getElementById(id);
  const KEY = 'parfabrikasi-proto-v2';
  let speed = 1, tab = 'up', skipping = false, ring, lookSel = 'p', previewT = 0;
  let lastPanel = '', panelTimer = 0, saveTimer = 0;
  const hist = [];
  let prevStats = null;
  const fmtRel = x => x === 0 ? 'E' : x > 0 ? '+' + x : '' + x;

  // ---------- kayıt ----------
  function save() { try { const S = E.get(); S.lastSeen = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* depolama kapalı olabilir */ } }
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 2) return s; } catch (e) { } return null; }

  // ---------- modal ve bildirim ----------
  let modalOpen = false, modalClose = null;
  function modal(html, o = {}) {
    const m = $('modal'), c = $('modalCard');
    c.className = 'mcard' + (o.wide ? ' wide' : '');
    c.innerHTML = html; m.hidden = false; modalOpen = true; modalClose = o.onClose || null;
    o.onMount && o.onMount(c);
  }
  function closeModal() { $('modal').hidden = true; modalOpen = false; const cb = modalClose; modalClose = null; cb && cb(); }
  function toast(text, kind = '') {
    if (skipping) return;
    const t = U.el('div', 'toast ' + kind, text);
    $('toasts').appendChild(t); setTimeout(() => t.remove(), 3800);
    while ($('toasts').children.length > 5) $('toasts').firstChild.remove();
  }
  function ping(id) { const b = $(id); if (!b) return; b.classList.add('ping'); setTimeout(() => b.classList.remove('ping'), 3000); }

  // ---------- olay kancaları ----------
  const UNLOCK_MSG = { 3: 'Duruş açıldı: art arda mükemmel vuruş seri çarpanı verir', 6: 'Top açıldı: her 10 seviyede ×1.5', 9: 'Rüzgâr ve Haftalık Turnuva açıldı', 12: 'Kulüp Evi açıldı: çevrimdışı tavanı uzar' };
  E.hooks.shot = e => { Scene.shotEvent(e); };
  E.hooks.hole = ({ n, par, strokes, rel, stars, auto, courseDone }) => {
    const name = { '-3': 'ALBATROS', '-2': 'EAGLE', '-1': 'BİRDİE', '0': 'PAR', '1': 'BOGEY', '2': 'DOUBLE BOGEY' }[rel] || (rel < -3 ? 'EFSANE' : '+' + rel);
    Scene.banner(`${name} ${stars ? U.stars(stars) : ''}`, `${strokes} vuruş · par ${par}${auto ? ' · putt oynanmadı (3 putt sayıldı)' : ''} · sandık düştü`, stars >= 3 ? '#ffd23f' : stars === 2 ? '#fff' : '#f3e3b0', 2.4);
    if (stars === 3) Scene.confetti();
    if (UNLOCK_MSG[n]) toast(UNLOCK_MSG[n], 'gold');
    ping('sChestBtn');
    if (courseDone) {
      Scene.confetti(); Scene.confetti();
      const c = E.courseOf(n);
      setTimeout(() => modal(`<h3>Kurs ${c} tamamlandı</h3><div class="trophy">🏆</div><p><b>${E.courseName(c)}</b> bitti. Kalıcı kupa çarpanı: tüm mesafeler <b>×${CFG.trophyMult}</b> (toplam ×${E.mTrophy().toFixed(0)}).</p><p>Sıradaki: <b>Kurs ${c + 1} · ${E.courseName(c + 1)}</b>. Sıfırlama yok; kaldığın yerden devam.</p><div class="btnrow"><button class="btn primary" id="cOk">Devam</button></div>`, { onMount: m => m.querySelector('#cOk').addEventListener('click', closeModal) }), 600);
    }
  };
  E.hooks.toast = (t, k) => toast(t, k);

  // ---------- vuruş ve putt ----------
  function swing() {
    if (modalOpen || Putt.isOpen() || Tour.isOpen()) return;
    const q = ring.press(); if (q == null) return;
    Scene.onSwingPlayer(E.manualSwing(q));
  }
  function openPutt() {
    const run = E.get().run;
    if (!E.greenPhase() || Putt.isOpen()) return;
    const key = run.n;
    Putt.open({
      distFt: 8 + Math.random() * 14, title: `Delik ${E.holeIn(run.n)} · Yeşil`,
      sub: `Şu ana kadar ${run.shot.strokes} vuruş · par ${E.parOf(run.n)}`,
      window: 6 + E.res('calm') + E.eqStat('putt'), maxTries: 4, guide: 0.4 + 0.1 * E.res('read'), calm: E.res('calm'),
      skipTries: 3, skipLabel: 'Geç (3 putt)',
      onDone: (tries, info) => { if (E.get().run.n === key) E.puttDone(info && info.skipped ? 3 : tries); },
    });
  }

  // ---------- zaman atlama ----------
  function skipModal() {
    modal(`<h3>Zamanı ileri al</h3>
      <p class="note">Seçtiğin süre aynı kurallarla adım adım simüle edilir. Araştırma zamanlayıcıları da ilerler.</p>
      <div class="sec"><h3>Süre</h3><div class="opts">${[[60, '1 dk'], [600, '10 dk'], [3600, '1 saat'], [4 * 3600, '4 saat'], [12 * 3600, '12 saat'], [86400, '1 gün'], [3 * 86400, '3 gün']].map(([s, l], i) => `<label><input type="radio" name="skd" value="${s}" ${i === 2 ? 'checked' : ''}>${l}</label>`).join('')}</div></div>
      <div class="sec"><h3>Oyuncu nasıl geçirdi?</h3><div class="opts">
        <label><input type="radio" name="skp" value="offline" checked>Uygulama kapalı (%${Math.round(E.offlineEff() * 100)}, tavanlı)</label>
        <label><input type="radio" name="skp" value="idle">Açık ama dokunmadı</label>
        <label><input type="radio" name="skp" value="active">Aktif oynadı (0.8 vuruş/sn)</label></div></div>
      <div class="sec"><h3>Yükseltmeler</h3><div class="opts">
        <label><input type="radio" name="skb" value="all" checked>En iyi orana göre otomatik al</label>
        <label><input type="radio" name="skb" value="none">Hiç alma</label></div></div>
      <p class="note">Çevrimdışı tavanı <b>${U.fmtTime(E.offlineCapS())}</b>. Atlamada putt oynanmaz (3 putt sayılır), sandıklar birikir.</p>
      <div class="btnrow"><button class="btn primary" id="skGo">İleri al</button><button class="btn" id="skCancel">Vazgeç</button></div>`, {
      onMount: c => {
        c.querySelector('#skCancel').addEventListener('click', closeModal);
        c.querySelector('#skGo').addEventListener('click', () => {
          const sec = +c.querySelector('input[name=skd]:checked').value, prof = c.querySelector('input[name=skp]:checked').value, buy = c.querySelector('input[name=skb]:checked').value;
          closeModal(); runSkip(sec, prof, buy, 'İleri alındı');
        });
      },
    });
  }
  function runSkip(sec, prof, buy, title) {
    skipping = true; const r = E.simulate(sec, prof, buy); skipping = false;
    Scene.resize(); save();
    const b = r.before, a = r.after;
    const rows = [
      ['Süre', U.fmtTime(r.seconds) + (r.capped ? ` (yalnızca ${U.fmtTime(r.used)} sayıldı)` : '')],
      ['Kazanılan yarda', U.fmt(Math.max(0, a.total - b.total))],
      ['Delik', `${b.n} → ${a.n}${a.n - b.n ? ' (' + (a.n - b.n) + ' delik)' : ''}`],
      ['Yeni yıldız', String(a.stars - b.stars)],
      ['Alınan yükseltme seviyesi', String(a.lv - b.lv)],
      ['Biriken sandık', `${a.chests - b.chests}${a.lost > b.lost ? ' · raf doldu, ' + (a.lost - b.lost) + ' kayıp' : ''}`],
      ['Biten araştırma', String(a.res - b.res)],
    ];
    modal(`<h3>${title}</h3><p class="note">${{ offline: 'Uygulama kapalı', idle: 'Açık, yalnızca otomatik', active: 'Aktif oyun simülasyonu' }[prof]} · hesap ${Math.round(r.ms)} ms</p>
      <table class="sumtable">${rows.map(x => `<tr><td>${x[0]}</td><td>${x[1]}</td></tr>`).join('')}</table>
      ${r.capped ? `<p class="note gold">Tavan doldu: ${U.fmtTime(r.seconds - r.used)} boşa gitti. Kulüp Evi tavanı uzatır.</p>` : ''}
      <div class="btnrow" style="margin-top:12px"><button class="btn primary" id="sumOk">Devam</button>${a.chests > 0 ? '<button class="btn gold" id="sumC">Sandıkları aç</button>' : ''}</div>`, {
      onMount: c => { c.querySelector('#sumOk').addEventListener('click', closeModal); const x = c.querySelector('#sumC'); x && x.addEventListener('click', () => { closeModal(); openAllChests(); }); },
    });
  }

  // ---------- sandık ----------
  const chestCol = t => ['#8a948e', '#3f9a52', '#3a6ee8', '#8d4fd1'][t] || '#8a948e';
  function resultHtml(r) {
    if (r.kind === 'yards') return `<div class="res r1"><div class="rn">Yarda</div><div class="it">+${U.fmt(r.amount)} yd</div><p class="note">${Math.round(r.secs)} saniyelik gelir</p></div>`;
    if (r.kind === 'bilgi') return `<div class="res r2"><div class="rn">Bilgi</div><div class="it">+${r.amount} Bilgi</div><p class="note">Araştırma başlatmak için</p></div>`;
    if (r.kind === 'parts') return `<div class="res r1"><div class="rn">Parça</div><div class="it">+${r.amount} parça</div><p class="note">Ekipman geliştirmek için</p></div>`;
    const it = r.item, rar = RARITY[it.rar], ex = it.ex ? ` · ${EXTRA[it.ex].f(it.exv)} ${EXTRA[it.ex].name}` : '';
    const owned = Object.keys(E.get().meta.equip.owned).length;
    return `<div class="res ${rar.cls}"><div class="rn">${rar.name} · ${SLOTS[it.slot]}${r.pity ? ' · garanti' : ''}</div><div class="it">${it.name}</div>
      <p class="note">+%${Math.round(it.dist * 100)} mesafe${ex} · ${SLOT_TOUR[it.slot]}</p>
      <p class="note"><b>${r.isNew ? 'YENİ! Albüme eklendi (' + owned + '/24)' : 'Kopya → +' + r.dupParts + ' parça'}</b>${r.equipped ? ' · otomatik takıldı' : ''}</p></div>`;
  }
  function openOneChest() {
    const S = E.get(); if (!S.meta.chests.length) return;
    const tier = S.meta.chests[0].tier, r = E.openChest(0);
    modal(`<h3>Sandık</h3><div class="reveal"><div class="chesticon" style="--cc:${chestCol(tier)}"><i></i><b></b></div><p class="note">${RARITY[tier].name} sandık</p>${resultHtml(r)}</div>
      <div class="btnrow"><button class="btn primary" id="bOk">Tamam</button>${S.meta.chests.length ? `<button class="btn gold" id="bNext">Sıradakini aç (${S.meta.chests.length})</button>` : ''}${r.kind === 'item' ? '<button class="btn" id="bAlb">Albüme git</button>' : ''}</div>`, {
      onMount: c => {
        c.querySelector('#bOk').addEventListener('click', closeModal);
        const n = c.querySelector('#bNext'); n && n.addEventListener('click', openOneChest);
        const a = c.querySelector('#bAlb'); a && a.addEventListener('click', () => { closeModal(); setTab('gear'); });
      },
    });
  }
  function openAllChests() {
    const S = E.get(), out = [];
    while (S.meta.chests.length) out.push(E.openChest(0));
    if (!out.length) return;
    const sum = k => out.filter(r => r.kind === k).reduce((a, r) => a + r.amount, 0), items = out.filter(r => r.kind === 'item');
    modal(`<h3>${out.length} sandık açıldı</h3>
      <table class="sumtable"><tr><td>Yarda</td><td>+${U.fmt(sum('yards'))}</td></tr><tr><td>Bilgi</td><td>+${sum('bilgi')}</td></tr><tr><td>Parça</td><td>+${sum('parts') + items.reduce((a, r) => a + (r.dupParts || 0), 0)}</td></tr><tr><td>Ekipman</td><td>${items.length} (${items.filter(r => r.isNew).length} yeni)</td></tr></table>
      ${items.map(r => `<p class="note"><b class="${RARITY[r.item.rar].cls}" style="color:var(--rc)">${RARITY[r.item.rar].name}</b> ${r.item.name} ${r.isNew ? '<b>· YENİ</b>' : '· kopya +' + r.dupParts + ' parça'}${r.equipped ? ' · takıldı' : ''}</p>`).join('')}
      <div class="btnrow"><button class="btn primary" id="aOk">Tamam</button></div>`, { onMount: c => c.querySelector('#aOk').addEventListener('click', closeModal) });
  }

  // ---------- panel: yükseltme ----------
  function upEffect(key, L) {
    const run = E.get().run;
    switch (key) {
      case 'head': return `Taban mesafe <b>${U.fmt((5 + 2 * L) * E.msMult(L))}</b> → ${U.fmt((5 + 2 * (L + 1)) * E.msMult(L + 1))} yd${(L + 1) % 25 === 0 ? ' <span class="tag">×1.5 eşik</span>' : ` · ${25 - L % 25} sv sonra ×1.5`}`;
      case 'shaft': { const p = l => Math.min(E.pMax(), 0.05 + 0.01 * l + E.eqStat('perfect')); return `Oto mükemmel şansı <b>%${(p(L) * 100).toFixed(0)}</b> → %${(p(L + 1) * 100).toFixed(0)}`; }
      case 'grip': {
        const o0 = E.landingOdds(); run.up.grip++; const o1 = E.landingOdds(); const fm = E.terrainMult('fairway'); run.up.grip--;
        return `Sonraki vuruşta fairway <b>%${Math.round(o0.fairway * 100)}</b> → %${Math.round(o1.fairway * 100)}, bunker %${Math.round(o0.bunker * 100)} → %${Math.round(o1.bunker * 100)}${fm > 1 ? ' · fairway ×' + fm.toFixed(1) : ''}`;
      }
      case 'ball': return `Top çarpanı <b>×${E.ballMult(L).toFixed(2)}</b> → ×${E.ballMult(L + 1).toFixed(2)}${(L + 1) % 10 === 0 ? ' <span class="tag">×1.5 sıçrama</span>' : ` · ${10 - (L % 10)} sv sonra ×1.5`}`;
      case 'stance': return `Seri tavanı <b>×${(1 + 0.15 * L).toFixed(2)}</b> → ×${(1 + 0.15 * (L + 1)).toFixed(2)} (her mükemmel +%5)`;
      case 'clubhouse': return `Çevrimdışı tavanı <b>${4 + 2 * L} sa</b> → ${4 + 2 * (L + 1)} sa`;
    }
    return '';
  }
  function buyBtn(key) {
    const S = E.get(), q = E.quote(key, S.settings.buyAmt), it = q.it;
    if (it.L >= it.max) return `<button class="buy" disabled>MAKS</button>`;
    return `<button class="buy" data-act="buy" data-key="${key}" ${q.cost <= S.run.yards && q.n > 0 ? '' : 'disabled'}>${U.fmt(q.cost)}<small>+${q.n} sv</small></button>`;
  }
  function panelUp() {
    const S = E.get(), run = S.run, amt = S.settings.buyAmt;
    let h = `<div class="sec"><h3>Otomatik vurucular <span class="amt">${[1, 10, 100, 'max'].map(a => `<button data-act="amt" data-v="${a}" class="${amt === a ? 'on' : ''}">${a === 'max' ? 'Maks' : '×' + a}</button>`).join('')}</span></h3>`;
    run.hitters.forEach((L, i) => {
      const rate = 0.4 * L * E.msMult(L);
      h += `<div class="uprow"><canvas class="mini" data-look="h${i}"></canvas><div><div class="nm">Vurucu ${i + 1}<small>sv ${L}</small></div>
        <div class="ef">${L ? `<b>${rate.toFixed(1)}</b> vuruş/sn · ${25 - L % 25} sv sonra ×1.5` : 'Henüz vurmuyor: 1 seviye al'}</div></div>${buyBtn('h' + i)}</div>`;
    });
    if (run.hitters.length < 10) {
      const r = RESEARCH[0], lv = E.res('slot');
      h += `<div class="uprow locked"><span class="mini"></span><div><div class="nm">Vurucu ${run.hitters.length + 1}<small>kilitli</small></div><div class="ef">Araştırma: ${r.cost(lv)} Bilgi · ${U.fmtTime(r.dur(lv))}</div></div><button class="buy" data-act="tab" data-v="res">Araştırma</button></div>`;
    }
    h += `</div><div class="sec"><h3>Sopa ve top</h3>`;
    for (const key of ['head', 'shaft', 'grip', 'ball', 'stance', 'clubhouse']) {
      const u = CFG.up[key], it = E.item(key);
      if (!it.ok) { h += `<div class="uprow locked"><span class="mini"></span><div><div class="nm">${u.name}</div><div class="ef">Delik ${u.unlock} bitince açılır</div></div><button class="buy" disabled>Kilitli</button></div>`; continue; }
      h += `<div class="uprow"><span class="mini ico ico-${key}"></span><div><div class="nm">${u.name}<small>sv ${it.L}${it.max < 1000 ? '/' + it.max : ''}</small></div><div class="ef">${upEffect(key, it.L)}</div></div>${buyBtn(key)}</div>`;
    }
    h += `</div><p class="note">Sezon yok: aldığın seviyeler kalıcı. Her 25 seviyede Sopa Başı ve vurucular ×1.5 kazanır.</p>`;
    return h;
  }

  // ---------- panel: araştırma ----------
  function panelRes() {
    const S = E.get(), meta = S.meta, A = meta.res;
    let h = `<div class="sec"><h3>Laboratuvar <span>${meta.bilgi} Bilgi · ${A.q.length}/${E.resSlots()} yuva</span></h3>`;
    if (A.q.length) for (const q of A.q) {
      const r = RESEARCH.find(x => x.id === q.id), left = q.end - meta.gt;
      h += `<div class="card"><div class="nm"><b>${r.name} ${E.res(r.id) + 1}</b> araştırılıyor</div><div class="pbar"><i style="width:${((1 - left / q.dur) * 100).toFixed(1)}%"></i></div><p class="note">Kalan <b>${U.fmtTime(left)}</b> (oyun saati). Üstteki <b>Zamanı atla</b> ile ileri alabilirsin.</p></div>`;
    } else h += `<p class="note">Laboratuvar boş. Bilgi; sandıklardan, hedeflerden ve turnuvalardan gelir. Araştırmalar kalıcıdır.</p>`;
    h += `</div>`;
    for (const br of [...new Set(RESEARCH.map(r => r.br))]) {
      h += `<div class="sec"><h3>${br}</h3>`;
      for (const r of RESEARCH.filter(x => x.br === br)) {
        const lv = E.res(r.id), st = E.resState(r);
        const pips = r.max > 1 ? `<span class="pips">${Array.from({ length: Math.min(r.max, 15) }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span>` : '';
        const btn = st === 'max' ? '<span class="state">Tamam</span>' : st === 'running' ? '<span class="state">Sürüyor</span>'
          : `<button class="buy" data-act="research" data-v="${r.id}" ${A.q.length >= E.resSlots() || meta.bilgi < r.cost(lv) ? 'disabled' : ''}>${Math.round(r.cost(lv))} Bilgi<small>${U.fmtTime(r.dur(lv))}</small></button>`;
        h += `<div class="node ${st === 'max' ? 'done' : ''}"><div><div class="nm">${r.name} <small>${lv}/${r.max}</small></div>${pips}<div class="ds">${r.desc(lv)}</div></div>${btn}</div>`;
      }
      h += `</div>`;
    }
    return h;
  }

  // ---------- panel: ekipman ----------
  function panelGear() {
    const S = E.get(), meta = S.meta, o = E.chestOdds(0);
    let h = `<div class="sec"><h3>Sandıklar <span>${meta.chests.length}/${E.chestCap()}</span></h3>
      <div class="btnrow"><button class="btn gold" data-act="chest1" ${meta.chests.length ? '' : 'disabled'}>Bir sandık aç</button><button class="btn" data-act="chestAll" ${meta.chests.length ? '' : 'disabled'}>Hepsini aç</button></div>
      <div class="odds"><span style="flex:${o.item + o.legend}" class="r3">Ekipman %${Math.round((o.item + o.legend) * 100)}</span><span style="flex:${o.bilgi}" class="r2">Bilgi %${Math.round(o.bilgi * 100)}</span><span style="flex:${o.parts}" class="r1">Parça %${Math.round(o.parts * 100)}</span><span style="flex:${o.yards}" class="r0">Yarda %${Math.round(o.yards * 100)}</span></div>
      <p class="note">Her delik bir sandık düşürür; birdie yapılan delikten İyi sandık çıkar. 20 sandıkta en az bir Nadir garanti (${meta.pity}/20). Kopya parça seviye yerine <b>parça</b> verir.</p></div>`;
    h += `<div class="sec"><h3>Takılı ekipman <span>${meta.parts} parça · ×${E.mEquip().toFixed(2)} mesafe</span></h3><div class="eqgrid">`;
    for (const slot in SLOTS) {
      const id = meta.equip.on[slot];
      if (!id) { h += `<div class="eq"><div class="sl">${SLOTS[slot]}</div><div class="in" style="color:var(--muted)">Boş</div><div class="st">Sandıktan çıkar</div></div>`; continue; }
      const it = E.itemById(id), lv = meta.equip.owned[id], m = E.lvlMul(lv), c = E.upgradeCost(id);
      const ex = it.ex ? ` · ${EXTRA[it.ex].f(it.exv * m)} ${EXTRA[it.ex].name}` : '';
      h += `<div class="eq ${RARITY[it.rar].cls}"><div class="sl"><span class="sw" style="background:${it.col}"></span>${SLOTS[slot]} · ${RARITY[it.rar].name} · sv ${lv}/10</div><div class="in">${it.name}</div>
        <div class="st">+%${Math.round(it.dist * m * 100)} mesafe${ex}</div>
        ${lv < 10 ? `<button class="btn mini-btn" data-act="upg" data-v="${id}" ${meta.parts >= c ? '' : 'disabled'}>Geliştir · ${c} parça</button>` : '<span class="state">Maks</span>'}</div>`;
    }
    h += `</div><p class="note">Ekipman sopanın görünüşünü değiştirir ve turnuvada da işe yarar (sopa başı taşıma, şaft isabet, tutuş zemin, top yuvarlanma). Toplam çarpan softcap(Π, 5, 0.6).</p></div>`;
    const owned = Object.keys(meta.equip.owned).length;
    h += `<div class="sec"><h3>Koleksiyon albümü <span>${owned}/24</span></h3><div class="pbar"><i style="width:${owned / 24 * 100}%"></i></div><div class="album">`;
    for (const slot in SLOTS) {
      h += `<div class="lbl">${SLOTS[slot]}${E.albumDone(slot) ? ' ✓' : ''}</div>`;
      for (const it of ITEMS.filter(i => i.slot === slot)) {
        const lv = meta.equip.owned[it.id], fresh = lv && meta.equip.seen[it.id] === false;
        h += lv ? `<button class="${RARITY[it.rar].cls} ${meta.equip.on[slot] === it.id ? 'on' : ''}" data-act="equip" data-v="${it.id}" title="${it.name}"><span class="sw" style="background:${it.col}"></span>${it.name}<br>sv ${lv}${fresh ? '<em>YENİ</em>' : ''}</button>`
          : `<button class="miss ${RARITY[it.rar].cls}" disabled>?<br>${RARITY[it.rar].name}</button>`;
      }
    }
    h += `</div><p class="note">Bir yuvanın 6 parçası tamamlanınca o yuva kalıcı +%5 verir. Parçaya tıkla: tak.</p></div>`;
    return h;
  }

  // ---------- panel: görünüm ----------
  function panelLook() {
    const S = E.get(), meta = S.meta, look = meta.looks[lookSel];
    const who = [['p', 'Sen']].concat(S.run.hitters.map((_, i) => ['h' + i, 'Vurucu ' + (i + 1)]));
    let h = `<div class="sec"><h3>Kimi giydiriyorsun?</h3><div class="opts">${who.map(([k, l]) => `<button class="pill ${k === lookSel ? 'on' : ''}" data-act="lookSel" data-v="${k}">${l}</button>`).join('')}</div>
      <canvas id="lookPreview" class="lookprev"></canvas>
      <p class="note">Sopanın kafa, şaft ve sap rengi takılı ekipmandan gelir; kaplama aşağıdan seçilir.</p></div>`;
    const cats = [['skin', 'Ten'], ['shirt', 'Tişört'], ['pants', 'Pantolon'], ['hat', 'Şapka'], ['hatColor', 'Şapka rengi'], ['club', 'Sopa kaplaması']];
    for (const [cat, label] of cats) {
      h += `<div class="sec"><h3>${label}</h3><div class="swatches">`;
      for (const [val, name, req] of LOOKS[cat]) {
        const ok = E.lookUnlocked(cat, val), on = look[cat] === val;
        const isCol = /^#/.test(val), bg = isCol ? val : val === 'gold' ? 'linear-gradient(135deg,#fff1a8,#d9a521)' : val === 'argyle' ? 'repeating-linear-gradient(45deg,#2f64d6 0 6px,#f0c419 6px 9px)' : val === 'plaid' ? 'repeating-linear-gradient(0deg,#8a2b2b 0 5px,#e0c070 5px 7px)' : val === 'carbon' ? 'repeating-linear-gradient(45deg,#333 0 3px,#555 3px 6px)' : val === 'chrome' ? '#c9ced6' : val === 'black' ? '#2b2f36' : '#e8efe7';
        h += `<button class="sw-btn ${on ? 'on' : ''}" data-act="look" data-cat="${cat}" data-v="${val}" ${ok ? '' : 'disabled'} title="${name}${ok ? '' : ' · kilitli: ' + UNLOCKS[req][0]}"><span style="background:${bg}"></span><small>${ok ? name : '🔒 ' + UNLOCKS[req][0]}</small></button>`;
      }
      h += `</div></div>`;
    }
    if (lookSel === 'p') {
      h += `<div class="sec"><h3>Top izi (elle vuruş)</h3><div class="swatches">${LOOKS.trail.map(([val, name, req]) => {
        const ok = E.lookUnlocked('trail', val);
        const bg = { white: '#fff', gold: '#ffd75a', fire: 'linear-gradient(90deg,#ffb020,#e0301e)', rainbow: 'linear-gradient(90deg,red,orange,yellow,green,blue,violet)' }[val];
        return `<button class="sw-btn ${meta.trail === val ? 'on' : ''}" data-act="trail" data-v="${val}" ${ok ? '' : 'disabled'}><span style="background:${bg}"></span><small>${ok ? name : '🔒 ' + UNLOCKS[req][0]}</small></button>`;
      }).join('')}</div></div>`;
    }
    return h;
  }

  // ---------- panel: turnuva ----------
  function panelTour() {
    const S = E.get(), meta = S.meta;
    const dh = Tour.dailyHole(meta.daily.day);
    const G = E.tourG(), lg = E.league(G), open = S.run.n > 9;
    const best = v => v == null ? '—' : fmtRel(v);
    const wd = Math.max(0, 7 - (E.dayIndex() % 7));
    let h = `<div class="sec"><h3>Günlük delik <span>zor</span></h3><div class="card tourcard">
      <div class="tc-top"><div><b>Par ${dh.par}</b> · ${dh.len} yd · rüzgâr ${dh.wind.kmh} km/s</div><div>Deneme ${meta.daily.tries}/3 · en iyi <b>${best(meta.daily.best)}</b></div></div>
      <p class="note">Bugün herkes aynı deliği oynar: dar fairway, çok bunker, sık su ve hızlı yeşil. Sonuçta 2 000 oyuncu içindeki yerini ve skor dağılımını görürsün. Ödül sıralamaya göre sandık.</p>
      <div class="btnrow"><button class="btn primary" data-act="daily" ${meta.daily.tries >= 3 ? 'disabled' : ''}>Günlük deliği oyna</button></div></div></div>`;
    h += `<div class="sec"><h3>Haftalık turnuva <span>9 delik · zor · ${wd} gün kaldı</span></h3><div class="card tourcard">
      <div class="tc-top"><div>Lig <b>${lg.name}</b> · G ${Math.round(G)}</div><div>Tur ${meta.tour.tries}/3 · en iyi <b>${best(meta.tour.best)}</b></div></div>
      <p class="note">Haftada 3 tur, en iyisi sayılır. 50 kişilik grupta sıralanırsın. İlk %10 rozet (+%1 kariyer mesafesi), Bilgi ve parça kazanır; ilk %25 ve %10 kostüm açar.</p>
      <div class="btnrow"><button class="btn gold" data-act="tour" ${!open || meta.tour.tries >= 3 ? 'disabled' : ''}>${open ? 'Turnuva turu oyna' : 'Delik 9 bitince açılır'}</button></div></div></div>`;
    h += `<div class="sec"><h3>Antrenman</h3><div class="card"><p class="note">Normal zorlukta rastgele bir delik. Ödül yok, hak harcamaz. Sopaları ve rüzgârı denemek için.</p><button class="btn" data-act="practice">Antrenman sahası</button></div></div>`;
    h += `<div class="sec"><h3>Bu mod nasıl çalışır?</h3><div class="card"><ul class="plain">
      <li><b>Par:</b> o deliğin beklenen vuruş sayısı. Par 4 = 2 vuruşta yeşile + 2 putt. Parın 1 altı birdie, 1 üstü bogey.</li>
      <li><b>Taşıma (carry):</b> topun tam vuruşta havada gittiği mesafe. Hedefi daha yakına sürüklersen yarım vuruş yaparsın. Uzun sopa daha çok sapar.</li>
      <li><b>Zemin:</b> rough mesafeyi ×0.85, bunker ×0.6 yapar ve sapmayı artırır. Driver yalnızca tee'den, wood bunkerden vurulamaz.</li>
      <li><b>Rüzgâr:</b> arka rüzgâr uzatır, yan rüzgâr topu sürükler; her vuruşta ±%20 esinti.</li>
      <li><b>Şans:</b> her vuruşta bir sapma zarı atılır. Mükemmel vuruş sapmayı ×0.3'e, ıska ×2.5'e çeker.</li>
      <li><b>Güç (G):</b> kariyerden gelir (yıldız, kupa, ekipman) ve doygun eğriyle küçük bir avantaj verir.</li></ul></div></div>`;
    return h;
  }

  // ---------- panel: kariyer ----------
  function panelCareer() {
    const S = E.get(), meta = S.meta, run = S.run, c = E.courseOf(run.n), first = (c - 1) * 18 + 1;
    let pars = '', bests = '', nums = '';
    for (let n = first; n < first + 18; n++) {
      const b = meta.best[n], par = E.parOf(n), rel = b != null ? b - par : null;
      const cls = rel == null ? '' : rel <= -2 ? 'eagle' : rel === -1 ? 'birdie' : rel === 0 ? '' : rel === 1 ? 'bogey' : 'dbl';
      nums += `<th class="${n === run.n ? 'cur' : ''}">${n - first + 1}</th>`; pars += `<td>${par}</td>`;
      bests += `<td class="${n === run.n ? 'cur' : ''}"><span class="sc ${cls}">${b != null ? b : n === run.n ? '·' : ''}</span></td>`;
    }
    let h = `<div class="sec"><h3>Skor kartı · Kurs ${c} ${E.courseName(c)}</h3><div class="card-scroll"><table class="scorecard"><tr><th>Delik</th>${nums}</tr><tr><td>Par</td>${pars}</tr><tr><td>Skor</td>${bests}</tr></table></div>
      <p class="note">Delik skorun = vuruş bölümleri + bunker/su cezası + putt sayısı. Birdie ★★★, par ★★, bogey ★. Her yıldız kalıcı +%1 mesafe.</p></div>`;
    h += `<div class="sec"><h3>Kupalar <span>×${E.mTrophy().toFixed(0)}</span></h3><div class="trophies">`;
    for (let k = 1; k <= Math.max(4, c); k++) h += `<div class="${k < c ? 'won' : k === c ? 'cur' : ''}"><b>${k < c ? '🏆' : k === c ? '⛳' : '·'}</b><span>Kurs ${k}</span><small>${E.courseName(k)}</small></div>`;
    h += `</div><p class="note">Sezon ve sıfırlama yok. Her biten kurs kalıcı ×${CFG.trophyMult} verir ve yeni bir saha açar. Kurs 1 sonrası delikler daha yavaş uzar (×${CFG.holeGrowth2}/delik).</p></div>`;
    h += `<div class="sec"><h3>Mesafe çarpanları</h3><div class="kv">${E.metaParts().map(([k, v]) => `<span>${k}</span><b>×${v.toFixed(2)}</b>`).join('')}<span>Delik çarpanı 1.08^(n−1)</span><b>×${U.fmt(E.holeMult())}</b></div></div>`;
    h += `<div class="sec"><h3>İstatistik</h3><div class="kv">
      <span>Elle vuruş</span><b>${meta.stats.swings} (%${meta.stats.swings ? Math.round(meta.stats.perfects / meta.stats.swings * 100) : 0} mükemmel)</b>
      <span>Biten delik</span><b>${meta.stats.holes}</b><span>Birdie</span><b>${meta.stats.birdies}</b><span>Power Drive</span><b>${meta.stats.pds}</b>
      <span>En iyi vuruş</span><b>${U.fmt(meta.stats.bestSwing)} yd</b><span>Oynama</span><b>${U.fmtTime(meta.stats.playS)}</b></div></div>`;
    return h;
  }

  // ---------- panel: denge ----------
  function panelTune() {
    const S = E.get(), run = S.run, p = E.pPerfect(), lie = E.curLie();
    let h = `<div class="sec"><h3>Vuruş başına mesafe (otomatik)</h3><div class="kv">
      <span>Taban (5 + 2·Sopa Başı) × eşik</span><b>${U.fmt((5 + 2 * run.up.head) * E.msMult(run.up.head))}</b>
      <span>Zemin (${TERRAIN[lie].name})</span><b>×${E.lieMult().toFixed(2)}</b>
      <span>Top</span><b>×${E.ballMult(run.up.ball).toFixed(2)}</b>
      <span>Delik çarpanı</span><b>×${U.fmt(E.holeMult())}</b>
      <span>Kritik 1 + p·1.5 (p=%${(p * 100).toFixed(0)})</span><b>×${(1 + p * 1.5).toFixed(2)}</b>
      <span>Rüzgâr (oto)</span><b>×${E.windMul(true).toFixed(2)}</b>
      ${E.metaParts().map(([k, v]) => `<span>${k}</span><b>×${v.toFixed(2)}</b>`).join('')}
      <span><b style="text-align:left">= vuruş başına</b></span><b>${U.fmt(E.autoDist())} yd</b>
      <span>× vuruş/sn</span><b>${E.autoRate().toFixed(1)}</b>
      <span><b style="text-align:left">= otomatik gelir</b></span><b>${U.fmt(E.autoIncome())}/sn</b></div></div>`;
    const mv = E.manualValue(CFG.perfectMult, E.streakMult());
    h += `<div class="sec"><h3>Elle vuruş</h3><div class="kv"><span>Mükemmel vuruş</span><b>${U.fmt(mv)} yd</b><span>= oto gelirin</span><b>${(mv / Math.max(1e-9, E.autoIncome())).toFixed(1)} sn</b><span>Power Drive (mükemmel)</span><b>${U.fmt(E.tPD() * E.autoIncome() * CFG.perfectMult)} yd</b></div></div>`;
    const P = [['tauMan', 'τ_man: elle vuruş tabanı (sn)'], ['tPD', 'T_PD: Power Drive (sn gelir)'], ['manualPower', 'Elle vuruş gücü'], ['holeGrowth', 'Kurs 1 delik büyümesi'], ['holeGrowth2', 'Sonraki delik büyümesi'], ['trophyMult', 'Kupa çarpanı'], ['offlineEff', 'Çevrimdışı verim'], ['goldMin', 'Altın top en erken (sn)'], ['goldMax', 'Altın top en geç (sn)'], ['greenGrace', 'Putt bekleme (sn)']];
    h += `<div class="sec"><h3>Test edilecek varsayımlar</h3><div class="tune">${P.map(([k, l]) => `<label for="cfg-${k}">${l}</label><input id="cfg-${k}" type="number" step="any" data-cfg="${k}" value="${CFG[k]}">`).join('')}</div></div>`;
    h += `<div class="sec"><h3>Test araçları</h3>
      <label class="note"><input type="checkbox" data-act="autoAll" ${S.settings.autoAll ? 'checked' : ''}> Açık oyunda yükseltmeleri otomatik al</label>
      <div class="btnrow"><button class="btn" data-act="gold">Altın top</button><button class="btn" data-act="bilgi">+50 Bilgi</button><button class="btn" data-act="parts">+100 parça</button><button class="btn" data-act="chests">+5 sandık</button><button class="btn danger" data-act="reset">Kaydı sıfırla</button></div></div>`;
    return h;
  }

  const PANELS = { up: panelUp, res: panelRes, gear: panelGear, look: panelLook, tour: panelTour, career: panelCareer, tune: panelTune };
  function renderPanel(force) {
    const html = PANELS[tab](), body = $('tabBody');
    if (!force && html === lastPanel) return;
    if (!force && body.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
    const sc = body.scrollTop; body.innerHTML = html; lastPanel = html; body.scrollTop = sc;
    drawMinis();
  }
  function drawMinis() {
    document.querySelectorAll('canvas.mini[data-look]').forEach(cv => {
      const look = E.get().meta.looks[cv.dataset.look], ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1;
      cv.width = 34 * dpr; cv.height = 40 * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      Art.golfer(ctx, 15, 38, 0.52, look, -1);
    });
  }
  function setTab(t) {
    tab = t;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    if (t === 'gear') setTimeout(() => { const m = E.get().meta.equip.seen; for (const k in m) m[k] = true; }, 2500);
    renderPanel(true); $('tabBody').scrollTop = 0;
  }
  let resetArm = 0;
  function onAct(btn) {
    const S = E.get(), a = btn.dataset.act, v = btn.dataset.v;
    switch (a) {
      case 'buy': E.buy(btn.dataset.key, S.settings.buyAmt); break;
      case 'amt': S.settings.buyAmt = v === 'max' ? 'max' : +v; break;
      case 'tab': setTab(v); return;
      case 'chest1': openOneChest(); break;
      case 'chestAll': openAllChests(); break;
      case 'equip': E.equip(v); break;
      case 'upg': if (E.upgradeItem(v)) toast('Ekipman geliştirildi', 'blue'); break;
      case 'research': if (E.startResearch(v)) toast('Araştırma başladı', 'blue'); break;
      case 'lookSel': lookSel = v; break;
      case 'look': S.meta.looks[lookSel][btn.dataset.cat] = v; Scene.resize(); break;
      case 'trail': S.meta.trail = v; break;
      case 'daily': Tour.start('daily'); break;
      case 'practice': Tour.start('practice'); break;
      case 'tour': Tour.start('tour'); break;
      case 'goal': { const rw = E.claimGoal(); if (rw) { toast('Hedef ödülü: ' + E.rewardText(rw), 'gold'); if (rw.chest) ping('sChestBtn'); } break; }
      case 'gold': Scene.spawnGoldNow(); break;
      case 'bilgi': S.meta.bilgi += 50; break;
      case 'parts': S.meta.parts += 100; break;
      case 'chests': for (let i = 0; i < 5; i++) E.addChest({ tier: 1, n: S.run.n }); break;
      case 'autoAll': S.settings.autoAll = btn.checked; break;
      case 'reset':
        if (Date.now() - resetArm < 4000) { try { localStorage.removeItem(KEY); } catch (e) { } E.fresh(); Scene.resize(); resetArm = 0; toast('Kayıt sıfırlandı', 'red'); }
        else { resetArm = Date.now(); toast('Sıfırlamak için 4 sn içinde tekrar bas', 'red'); return; }
        break;
    }
    renderPanel(true); renderGoals(true);
  }
  function refreshAll() { renderPanel(true); renderGoals(true); }

  // ---------- hedefler ve kurs şeridi ----------
  let lastGoals = '';
  function renderGoals(force) {
    const gs = E.goalState();
    const html = gs.length ? gs.map((g, i) => `<div class="goal ${g.done ? 'done' : ''} ${i ? 'later' : ''}"><div><b>${g.text}</b><small>Ödül: ${E.rewardText(g.reward)}</small></div>${i === 0 ? (g.done ? '<button class="btn gold mini-btn" data-act="goal">Al</button>' : '<span class="state">Sıradaki</span>') : ''}</div>`).join('') : '<p class="note">Tüm hedefler tamam.</p>';
    if (!force && html === lastGoals) return;
    lastGoals = html; $('goals').innerHTML = html;
  }
  function courseStrip() {
    const S = E.get(), run = S.run, c = E.courseOf(run.n), first = (c - 1) * 18 + 1;
    let s = '';
    for (let n = first; n < first + 18; n++) {
      const st = S.meta.stars[n];
      s += `<div class="${n === run.n ? 'cur' : n < run.n ? 'past' : ''}"><span>${n - first + 1}</span><b>${n < run.n ? '★'.repeat(st || 0) + '<i>' + '★'.repeat(3 - (st || 0)) + '</i>' : E.parOf(n)}</b></div>`;
    }
    return s;
  }

  // ---------- HUD ----------
  function hud() {
    const S = E.get(), run = S.run, meta = S.meta, rates = shareRates();
    const inc = Math.max(E.autoIncome(), rates.total);
    $('sYards').textContent = U.fmt(run.yards); $('sIncome').textContent = U.fmt(inc);
    $('sStars').textContent = E.totalStars(); $('sBilgi').textContent = meta.bilgi; $('sParts').textContent = meta.parts; $('sChests').textContent = meta.chests.length;
    $('clock').textContent = `Gün ${E.dayIndex() - Math.floor(meta.epoch / 86400) + 1} · ${U.fmtClock(meta.gt)}`;
    const c = E.courseOf(run.n);
    $('courseName').textContent = `Kurs ${c} · ${E.courseName(c)}`;
    const len = E.holeLen(run.n), par = E.parOf(run.n), lie = E.curLie(), S2 = E.segCount(run.n);
    $('holeTitle').innerHTML = `Delik <em>${E.holeIn(run.n)}</em>/18 · Par ${par}`;
    $('holeMeta').innerHTML = `Vuruş <b>${run.shot.strokes}</b> · ${E.greenPhase() ? 'yeşilde' : `${Math.min(run.shot.k + 1, S2)}. vuruş (${S2}'de yeşile)`} · ${U.fmt(len)} yd`;
    const strip = courseStrip(); if ($('courseStrip').dataset.h !== strip) { $('courseStrip').innerHTML = strip; $('courseStrip').dataset.h = strip; }
    const p = Math.min(1, run.prog / len);
    $('pfill').style.width = (p * 100).toFixed(2) + '%';
    let marks = ''; for (let k = 1; k < S2; k++) marks += `<i style="left:${(90 * k / S2).toFixed(1)}%"></i>`;
    if ($('pmarks').dataset.h !== marks) { $('pmarks').innerHTML = marks; $('pmarks').dataset.h = marks; }
    $('pText').textContent = `${U.fmt(run.prog)} / ${U.fmt(len)} yd`;
    $('pEta').textContent = E.greenPhase() ? (run.prog >= len ? `Yeşilde bekliyor · ${Math.max(0, Math.ceil(CFG.greenGrace - run.greenWait))} sn sonra 3 putt sayılır` : 'Yeşil fazı: putt oyna') : `Sonraki vuruşa ~${U.fmtTime((E.segBoundary(run.shot.k + 1) - run.prog) / Math.max(1e-9, inc) / Math.max(1, speed))}`;
    const tm = E.terrainMult(lie), o = E.landingOdds();
    $('lieV').innerHTML = `<span class="${tm < 0.95 ? 'bad' : 'good'}">${TERRAIN[lie].name} ×${tm.toFixed(2)}</span>`;
    $('lieOdds').innerHTML = ['fairway', 'rough', 'bunker', 'water'].filter(k => o[k] > 0).map(k => `<i style="flex:${o[k]};background:${TERRAIN[k].col}" title="${TERRAIN[k].name} %${Math.round(o[k] * 100)}">${o[k] > 0.08 ? TERRAIN[k].name + ' %' + Math.round(o[k] * 100) : ''}</i>`).join('');
    if (E.windActive()) {
      const w = E.wind();
      $('windV').textContent = { calm: 'Durgun ×1.0', head: `Karşı ×${E.windMul(false).toFixed(2)} · rough +%8`, tail: 'Arka ×1.4 · PD ×1.5' }[w.kind];
      let s = '';
      for (let i = 0; i < 5; i++) { const ww = E.windAt(meta.gt + i * 45), t = i === 0 ? 'şimdi' : '+' + Math.round(i * 45 - (meta.gt % 45)) + 's'; s += `<div class="${ww.kind} ${i === 0 ? 'now' : ''}">${{ calm: '—', head: '←', tail: '→' }[ww.kind]} ${t}</div>`; }
      $('windStrip').innerHTML = s;
    } else { $('windV').textContent = 'Yok'; $('windStrip').innerHTML = `<div>Delik 9 bitince açılır</div>`; }
    const cols = { auto: '#3f9a52', man: '#3a6ee8', pd: '#ff8a3d', gold: '#d9a521', chest: '#8d4fd1' }, names = { auto: 'Otomatik', man: 'Elle', pd: 'Power Drive', gold: 'Altın top', chest: 'Sandık' }, tot = rates.total || 1;
    $('share').innerHTML = Object.keys(cols).map(k => `<i style="width:${(rates[k] / tot * 100).toFixed(1)}%;background:${cols[k]}"></i>`).join('');
    $('shareLegend').innerHTML = Object.keys(cols).filter(k => rates[k] > 0).map(k => `<span><b style="background:${cols[k]}"></b>${names[k]} %${Math.round(rates[k] / tot * 100)}</span>`).join('');
    const hint = $('stageHint');
    if (meta.stats.swings < 3) hint.innerHTML = 'İbre <b>sarı</b> bölgeye gelince <b>Boşluk</b>a bas ya da sahaya tıkla.';
    else if (run.pd >= 100) hint.innerHTML = '<b>Power Drive hazır!</b> Sıradaki elle vuruş 30 sn\'lik gelir değerinde.';
    else if (run.streak >= 2) hint.innerHTML = `Seri <b>${run.streak}</b> · ×${E.streakMult().toFixed(2)}`;
    else hint.innerHTML = `<b>${run.hitters.filter(x => x > 0).length}</b> vurucu · ${E.autoRate().toFixed(1)} vuruş/sn`;
    const g = meta.gt, ab = [];
    if (E.res('focus')) ab.push(`<button data-ab="focus" ${run.focusCd > g ? 'disabled' : ''}>Odak<small>${run.focusUntil > g ? 'aktif ' + Math.ceil(run.focusUntil - g) + ' sn' : run.focusCd > g ? Math.ceil(run.focusCd - g) + ' sn' : 'hazır'}</small></button>`);
    if (E.res('tempo')) ab.push(`<button data-ab="tempo" ${run.tempoCd > g ? 'disabled' : ''}>Hızlı Tempo<small>${run.tempoUntil > g ? 'aktif ' + Math.ceil(run.tempoUntil - g) + ' sn' : run.tempoCd > g ? Math.ceil(run.tempoCd - g) + ' sn' : 'hazır'}</small></button>`);
    const abH = ab.join(''); if ($('abil').dataset.h !== abH) { $('abil').innerHTML = abH; $('abil').dataset.h = abH; }
    $('puttBtn').hidden = !E.greenPhase() || Putt.isOpen();
    const dots = { gear: meta.chests.length > 0 || Object.values(meta.equip.seen).some(v => v === false), res: meta.res.q.length < E.resSlots() && RESEARCH.some(r => E.resState(r) === 'open' && meta.bilgi >= r.cost(E.res(r.id))), tour: meta.daily.tries < 3 };
    document.querySelectorAll('#tabs button').forEach(b => { const has = !!dots[b.dataset.tab], cur = !!b.querySelector('.dot'); if (has && !cur) b.appendChild(U.el('span', 'dot')); else if (!has && cur) b.querySelector('.dot').remove(); });
  }
  function shareRates() {
    const r = { auto: 0, man: 0, pd: 0, gold: 0, chest: 0, total: 0 }; let dt = 0;
    for (const h of hist) { for (const k in h.d) r[k] += h.d[k]; dt += h.dt; }
    if (dt <= 0) return r;
    for (const k of ['auto', 'man', 'pd', 'gold', 'chest']) { r[k] /= dt; r.total += r[k]; }
    return r;
  }
  function sampleStats(dtGame) {
    const cur = Object.assign({}, E.stats); if (!prevStats) prevStats = cur;
    const d = {}; for (const k in cur) d[k] = cur[k] - (prevStats[k] || 0); prevStats = cur;
    if (!hist.length || hist[hist.length - 1].age > 1) hist.push({ d, dt: dtGame, age: 0 });
    else { const h = hist[hist.length - 1]; for (const k in d) h.d[k] = (h.d[k] || 0) + d[k]; h.dt += dtGame; }
  }

  // ---------- ana döngü ----------
  let last = performance.now();
  function frame(now) {
    const dtR = Math.min(0.1, (now - last) / 1000); last = now;
    const S = E.get();
    if (Putt.isOpen() && !Tour.isOpen()) S.run.greenWait = 0;
    if (speed > 0) E.tickOnline(dtR * speed, dtR);
    for (const h of hist) h.age += dtR;
    sampleStats(dtR * speed);
    while (hist.length && hist[0].age > 30) hist.shift();
    ring.perfectDeg = 12 + 3 * E.res('sweet');
    ring.update(dtR);
    ring.pd = S.run.pd; ring.pdReady = S.run.pd >= 100; ring.focus = S.run.focusUntil > S.meta.gt;
    ring.enabled = !Putt.isOpen() && !Tour.isOpen() && !modalOpen;
    ring.center = ring.pdReady ? 'POWER' : S.run.streak > 0 ? 'SERİ ' + S.run.streak : 'VURUŞ';
    ring.sub = ring.pdReady ? 'DRIVE HAZIR' : S.run.streak > 0 ? '×' + E.streakMult().toFixed(2) : 'BOŞLUK / TIKLA';
    ring.draw();
    Scene.update(dtR); Scene.draw(); HoleMap.draw();
    hud();
    if (tab === 'look') { previewT = (previewT + dtR / 1.6) % 1.6; const cv = $('lookPreview'); cv && Art.preview(cv, S.meta.looks[lookSel], previewT < 1 ? previewT : -1); }
    panelTimer += dtR;
    if (panelTimer > 0.35) { panelTimer = 0; renderPanel(false); renderGoals(false); }
    saveTimer += dtR; if (saveTimer > 10) { saveTimer = 0; save(); }
    requestAnimationFrame(frame);
  }

  function help() {
    modal(`<h3>Par Fabrikası · prototip 2</h3>
      <ol class="help">
        <li><b>Elle vuruş:</b> halkadaki ibre sarı bölgeye gelince <kbd>Boşluk</kbd>. Dış turuncu halka dolunca Power Drive.</li>
        <li><b>Delik ve par:</b> her delik par−2 vuruş bölümünden oluşur. Her bölüm bitince top düşer: fairway, rough, bunker ya da su. Kötü zemin sonraki bölümü yavaşlatır, bunker ve su +1 vuruş ekler.</li>
        <li><b>Putt:</b> yeşilde önce yönü, sonra gücü seç. Skorun = vuruşlar + putt. Birdie ★★★, par ★★, bogey ★.</li>
        <li><b>Sezon yok:</b> delikler kurs kurs devam eder. Her biten kurs kalıcı ×2 kupa verir.</li>
        <li><b>Sandık</b> her delikten düşer: ekipman, Bilgi, parça ya da yarda. Parça ekipmanı geliştirir, Bilgi araştırmayı açar.</li>
        <li><b>Görünüm</b> sekmesinde kendini ve vurucularını giydir; sopanın rengi takılı ekipmandan gelir.</li>
        <li><b>Turnuva</b> sekmesi: zor günlük delik ve 9 delikli haftalık turnuva, gerçek ölçekte.</li>
        <li><b>Zaman:</b> ×10 / ×100 ya da <b>Zamanı atla</b>.</li>
      </ol><div class="btnrow"><button class="btn primary" id="hOk">Başla</button></div>`, { onMount: c => c.querySelector('#hOk').addEventListener('click', closeModal) });
  }

  // ---------- başlatma ----------
  function boot(hotData) {
    const saved = (hotData && hotData.S && hotData.S.v === 2 ? hotData.S : null) || load();
    let offline = null;
    if (saved) { E.attach(saved); const dt = (Date.now() - (saved.lastSeen || Date.now())) / 1000; if (!hotData && dt >= 60) offline = dt; }
    else E.fresh();
    ring = new Ring($('ring'));
    Scene.init($('scene')); HoleMap.init($('holemap')); Putt.init(); Tour.init();
    $('scene').addEventListener('pointerdown', e => {
      const r = $('scene').getBoundingClientRect(), g = Scene.hitGold(e.clientX - r.left, e.clientY - r.top);
      if (g) { const res = E.goldReward(); Scene.banner('ALTIN TOP', res.text, '#ffd23f', 2); Scene.popup(g.x, g.y, res.y ? '+' + U.fmt(res.y) : '★', '#ffd23f', true); toast('Altın top: ' + res.text, 'gold'); return; }
      swing();
    });
    $('ring').addEventListener('pointerdown', e => { e.preventDefault(); swing(); });
    $('puttBtn').addEventListener('click', openPutt);
    $('abil').addEventListener('click', e => { const b = e.target.closest('[data-ab]'); if (b && E.useAbility(b.dataset.ab)) toast(b.dataset.ab === 'focus' ? 'Odak: mükemmel bölgesi 2 kat' : 'Hızlı Tempo: vurucular ×3', 'blue'); });
    $('sChestBtn').addEventListener('click', () => setTab('gear'));
    $('tourBtn').addEventListener('click', () => setTab('tour'));
    $('skipBtn').addEventListener('click', skipModal);
    $('helpBtn').addEventListener('click', help);
    $('speed').addEventListener('click', e => {
      const b = e.target.closest('[data-speed]'); if (!b) return;
      speed = +b.dataset.speed; document.querySelectorAll('#speed [data-speed]').forEach(x => x.classList.toggle('on', x === b));
    });
    $('tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
    for (const root of [$('tabBody'), $('goals')]) {
      root.addEventListener('pointerdown', e => { const b = e.target.closest('button[data-act]'); if (b && !b.disabled && e.button === 0) { e.preventDefault(); onAct(b); } });
      root.addEventListener('click', e => { const b = e.target.closest('button[data-act]'); if (b && e.detail === 0 && !b.disabled) onAct(b); });
    }
    $('tabBody').addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.cfg) { const v = parseFloat(t.value); if (isFinite(v) && v > 0) { CFG[t.dataset.cfg] = v; E.get().cfg[t.dataset.cfg] = v; } }
      if (t.dataset.act === 'autoAll') onAct(t);
    });
    $('modal').addEventListener('pointerdown', e => { if (e.target === $('modal')) closeModal(); });
    document.addEventListener('keydown', e => {
      if (e.code === 'Escape' && modalOpen) { closeModal(); return; }
      if (e.code !== 'Space') return;
      if (e.target.tagName === 'INPUT' || (e.target.tagName === 'BUTTON' && e.target.closest('.mcard'))) return;
      e.preventDefault();
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
      if (e.repeat) return;
      if (Putt.isOpen()) { Putt.release(); return; }
      if (Tour.isOpen()) { Tour.press(); return; }
      swing();
    });
    document.addEventListener('keyup', e => { if (e.code === 'Space' && !(e.target.tagName === 'INPUT' || (e.target.closest && e.target.closest('.mcard')))) e.preventDefault(); });
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    window.claude?.hot?.snapshot?.(() => ({ S: E.get() }));
    setTab('up'); renderGoals(true);
    requestAnimationFrame(frame);
    if (offline) runSkip(offline, 'offline', 'none', 'Siz yokken');
    else if (!saved) help();
  }

  return { boot, modal, closeModal, toast, refreshAll, save, get speed() { return speed; } };
})();

window.claude?.hot?.ready ? window.claude.hot.ready(UI.boot) : UI.boot(window.claude?.hot?.data ?? null);
