// Arayüz: tabela, sekmeli panel, modallar, zaman kontrolü, kayıt ve ana döngü.
const UI = (() => {
  const $ = id => document.getElementById(id);
  const KEY = 'parfabrikasi-proto-v1';
  let speed = 1, tab = 'up', skipping = false, ring;
  let lastPanel = '', panelTimer = 0, saveTimer = 0;
  const hist = [];            // gelir kaynağı geçmişi (gerçek saniye başına)
  let histAcc = 0, prevStats = null;

  // ---------- kayıt ----------
  function save() {
    try { const S = E.get(); S.lastSeen = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* depolama kapalı olabilir */ }
  }
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return s; } catch (e) { }
    return null;
  }

  // ---------- modal ve bildirim ----------
  let modalOpen = false, modalClose = null;
  function modal(html, o = {}) {
    const m = $('modal'), c = $('modalCard');
    c.className = 'mcard' + (o.wide ? ' wide' : '');
    c.innerHTML = html;
    m.hidden = false; modalOpen = true; modalClose = o.onClose || null;
    o.onMount && o.onMount(c);
    const f = c.querySelector('button.primary, button'); f && f.focus();
  }
  function closeModal() {
    $('modal').hidden = true; modalOpen = false;
    const cb = modalClose; modalClose = null; cb && cb();
  }
  function toast(text, kind = '') {
    if (skipping) return;
    const t = U.el('div', 'toast ' + kind, text);
    $('toasts').appendChild(t);
    setTimeout(() => t.remove(), 3800);
    while ($('toasts').children.length > 5) $('toasts').firstChild.remove();
  }

  // ---------- olay kancaları ----------
  const UNLOCK_MSG = {
    3: 'Duruş açıldı: art arda mükemmel vuruşlar seri çarpanı verir',
    6: 'Top açıldı: her 10 seviyede ×1.5 sıçrama',
    9: 'Rüzgâr ve Haftalık Turnuva açıldı',
    12: 'Kulüp Evi açıldı: çevrimdışı tavanı uzar',
    18: 'Sezon tamamlandı! Sezon sekmesinden bitirip TP alabilirsin',
  };
  E.hooks.hole = ({ c, h, stars, auto, newStar }) => {
    const meta = E.get().meta;
    if (h >= 9) meta.tourOpen = true;
    if (skipping) return;
    const names = ['Delik tamamlandı', 'Bogey', 'Par', 'Birdie!'];
    Scene.banner(stars ? names[stars] + ' ' + U.stars(stars) : `Delik ${h} bitti`, auto ? 'Putt oynanmadı: 0★ · çanta düştü' : (newStar ? 'Yeni yıldız rekoru · ' : '') + 'Çanta düştü', stars === 3 ? '#ffd23f' : '#fff', 2.2);
    if (stars === 3) Scene.confetti();
    if (UNLOCK_MSG[h] && c === 1) toast(UNLOCK_MSG[h], 'gold');
    pingBags();
  };
  E.hooks.toast = (t, k) => toast(t, k);
  E.hooks.season = () => { Scene.resize(); };

  function pingBags() {
    const b = $('sBagsBtn'); b.classList.add('ping'); setTimeout(() => b.classList.remove('ping'), 3000);
  }

  // ---------- vuruş ----------
  function swing() {
    if (modalOpen || Putt.isOpen() || Tour.isOpen()) return;
    const q = ring.press();
    if (q == null) return;
    const res = E.manualSwing(q);
    Scene.onSwingPlayer(res, E.lieIdx());
  }
  function openPutt() {
    const S = E.get(), run = S.run;
    if (!E.greenPhase() || Putt.isOpen()) return;
    const key = run.course + '-' + run.hole;
    Putt.open({
      distFt: 8 + Math.random() * 14,
      title: `Delik ${run.hole} · Yeşil`, sub: '1 deneme 3★ · 2 deneme 2★ · 3 deneme 1★',
      window: 5 + 0.5 * E.perk('starhunt') + E.eqStat('putt'), maxTries: 4, guide: 0.45,
      skipTries: 4, skipLabel: 'Geç (0★)',
      onDone: (tries, info) => {
        const r = E.get().run;
        if (r.seasonDone || r.course + '-' + r.hole !== key) return;
        E.puttDone(info && info.skipped ? 4 : tries);
      },
    });
  }

  // ---------- zaman atlama ----------
  function skipModal() {
    const html = `<h3>Zamanı ileri al</h3>
      <p class="note">Oyun, seçtiğin süreyi aynı kurallarla adım adım simüle eder (§5). Akademi zamanlayıcıları da ilerler.</p>
      <div class="sec"><h3>Süre</h3><div class="opts" id="skDur">
        ${[[60, '1 dk'], [600, '10 dk'], [3600, '1 saat'], [4 * 3600, '4 saat'], [12 * 3600, '12 saat'], [86400, '1 gün'], [3 * 86400, '3 gün']].map(([s, l], i) => `<label><input type="radio" name="skd" value="${s}" ${i === 2 ? 'checked' : ''}>${l}</label>`).join('')}
      </div></div>
      <div class="sec"><h3>Oyuncu nasıl geçirdi?</h3><div class="opts" id="skProf">
        <label><input type="radio" name="skp" value="offline" checked>Uygulama kapalı (%60, tavanlı)</label>
        <label><input type="radio" name="skp" value="idle">Açık ama dokunmadı (%100 oto)</label>
        <label><input type="radio" name="skp" value="active">Aktif oynadı (0.8 vuruş/sn, %40 mükemmel)</label>
      </div></div>
      <div class="sec"><h3>Yükseltmeler</h3><div class="opts" id="skBuy">
        <label><input type="radio" name="skb" value="all" checked>Hepsini en iyi orana göre al</label>
        <label><input type="radio" name="skb" value="perk">Yalnızca Otomatik Alım perk'i</label>
        <label><input type="radio" name="skb" value="none">Hiç alma</label>
      </div></div>
      <p class="note">Çevrimdışı tavanı şu an <b>${U.fmtTime(E.offlineCapS())}</b>. Atlamada putt oynanmaz; delikler 0★ geçer, çantalar birikir.</p>
      <div class="btnrow"><button class="btn primary" id="skGo">İleri al</button><button class="btn" id="skCancel">Vazgeç</button></div>`;
    modal(html, {
      onMount: c => {
        c.querySelector('#skCancel').addEventListener('click', closeModal);
        c.querySelector('#skGo').addEventListener('click', () => {
          const sec = +c.querySelector('input[name=skd]:checked').value;
          const prof = c.querySelector('input[name=skp]:checked').value;
          const buy = c.querySelector('input[name=skb]:checked').value;
          closeModal();
          runSkip(sec, prof, buy, 'İleri alındı');
        });
      },
    });
  }
  function runSkip(sec, prof, buy, title) {
    skipping = true;
    const res = E.simulate(sec, prof, buy);
    skipping = false;
    Scene.resize();
    showSummary(res, title);
    save();
  }
  function showSummary(res, title) {
    const b = res.before, a = res.after;
    const profName = { offline: 'Uygulama kapalı, %60 verim', idle: 'Açık, yalnızca otomatik', active: 'Aktif oyun simülasyonu' }[res.profile];
    const gained = (a.season - b.season) + (a.course !== b.course ? 0 : 0);
    const rows = [
      ['Süre', U.fmtTime(res.seconds) + (res.capped ? ` (yalnızca ${U.fmtTime(res.used)} sayıldı)` : '')],
      ['Kazanılan yarda', U.fmt(Math.max(0, gained))],
      ['Delik', a.done ? `Kurs ${a.course} bitti (18/18)` : `${b.hole} → ${a.hole}${a.holes - b.holes ? ' (' + (a.holes - b.holes) + ' delik geçildi)' : ''}`],
      ['Alınan yükseltme seviyesi', (a.lv - b.lv).toString()],
      ['Biriken çanta', `${a.bags - b.bags}${a.lost > b.lost ? ' · raf doldu, ' + (a.lost - b.lost) + ' kayıp' : ''}`],
      ['Biten araştırma', (a.acad - b.acad).toString()],
    ];
    const capNote = res.capped ? `<p class="note gold">Tavan doldu: ${U.fmtTime(res.seconds - res.used)} boşa gitti. Kulüp Evi ve Kulüp Evi Anahtarı tavanı uzatır.</p>` : '';
    modal(`<h3>${title}</h3><p class="note">${profName} · hesap ${Math.round(res.ms)} ms</p>
      <table class="sumtable">${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>${capNote}
      <div class="btnrow" style="margin-top:12px"><button class="btn primary" id="sumOk">Devam</button>${a.bags > 0 ? '<button class="btn gold" id="sumBags">Çantaları aç</button>' : ''}</div>`, {
      onMount: c => {
        c.querySelector('#sumOk').addEventListener('click', closeModal);
        const sb = c.querySelector('#sumBags');
        sb && sb.addEventListener('click', () => { closeModal(); openAllBags(); });
      },
    });
  }

  // ---------- çantalar ----------
  function resultHtml(r) {
    if (r.kind === 'yards') return `<div class="res r1"><div class="rn">Yarda patlaması</div><div class="it">+${U.fmt(r.amount)} yd</div><p class="note">${Math.round(r.secs)} saniyelik gelir</p></div>`;
    if (r.kind === 'bilgi') return `<div class="res r2"><div class="rn">Bilgi</div><div class="it">+${r.amount} Bilgi</div><p class="note">Akademide araştırma başlatmak için</p></div>`;
    const it = r.item, rar = RARITY[it.rar];
    const ex = it.ex ? ` · ${EXTRA[it.ex].f(it.exv)} ${EXTRA[it.ex].name}` : '';
    return `<div class="res ${rar.cls}"><div class="rn">${rar.name} · ${SLOTS[it.slot]}${r.pity ? ' · acıma sayacı' : ''}</div><div class="it">${it.name}</div>
      <p class="note">+%${Math.round(it.dist * 100)} mesafe${ex}</p>
      <p class="note">${r.isNew ? 'Yeni parça!' : 'Kopya: seviye ' + r.lvl + ' oldu'}${r.equipped ? ' · takıldı' : ''}</p></div>`;
  }
  function openOneBag() {
    const S = E.get();
    if (!S.meta.bags.length) return;
    const tier = S.meta.bags[0].tier;
    const r = E.openBag(0);
    modal(`<h3>Delik çantası</h3><div class="reveal"><div class="bagicon" style="color:${['#8a948e', '#3f9a52', '#3a6ee8', '#8d4fd1'][tier]}">◆</div>
      <p class="note">${RARITY[tier].name} çanta</p>${resultHtml(r)}</div>
      <div class="btnrow"><button class="btn primary" id="bOk">Tamam</button>${S.meta.bags.length ? `<button class="btn gold" id="bNext">Sıradakini aç (${S.meta.bags.length})</button>` : ''}</div>`, {
      onMount: c => {
        c.querySelector('#bOk').addEventListener('click', closeModal);
        const n = c.querySelector('#bNext'); n && n.addEventListener('click', openOneBag);
      },
    });
  }
  function openAllBags() {
    const S = E.get();
    const out = [];
    while (S.meta.bags.length) out.push(E.openBag(0));
    if (!out.length) return;
    const y = out.filter(r => r.kind === 'yards').reduce((a, r) => a + r.amount, 0);
    const b = out.filter(r => r.kind === 'bilgi').reduce((a, r) => a + r.amount, 0);
    const items = out.filter(r => r.kind === 'item');
    modal(`<h3>${out.length} çanta açıldı</h3>
      <table class="sumtable"><tr><td>Yarda</td><td>+${U.fmt(y)}</td></tr><tr><td>Bilgi</td><td>+${b}</td></tr><tr><td>Ekipman</td><td>${items.length}</td></tr></table>
      ${items.map(r => `<p class="note"><b class="${RARITY[r.item.rar].cls}" style="color:var(--rc)">${RARITY[r.item.rar].name}</b> ${r.item.name} ${r.isNew ? '(yeni)' : '(sv ' + r.lvl + ')'}${r.equipped ? ' · takıldı' : ''}</p>`).join('')}
      <div class="btnrow"><button class="btn primary" id="aOk">Tamam</button></div>`, { onMount: c => c.querySelector('#aOk').addEventListener('click', closeModal) });
  }

  // ---------- sezon ----------
  function seasonModal(withdraw) {
    const S = E.get(), meta = S.meta, run = S.run;
    const tp = withdraw ? 0 : E.tpPreview();
    const courses = [];
    for (let c = 1; c <= 4; c++) {
      const open = c <= meta.coursesUnlocked;
      courses.push(`<label style="${open ? '' : 'opacity:.5'}"><input type="radio" name="crs" value="${c}" ${open ? '' : 'disabled'} ${c === Math.min(meta.coursesUnlocked, run.course + (withdraw ? 0 : 1)) ? 'checked' : ''}>Kurs ${c} · ${CFG.courseNames[c - 1]}${open ? '' : ' (kilitli)'}</label>`);
    }
    const newM = Math.pow(1 + U.softcap(meta.tpTotal + tp, 1e5, 0.85) / 10, 1.8);
    modal(`<h3>${withdraw ? 'Sezondan çekil' : 'Sezonu bitir'}</h3>
      ${withdraw ? '<p>Koşu sıfırlanır ama <b>TP ve PP verilmez</b>. Takıldığında kullanılır.</p>' : `<p>Bu sezon <b>${U.fmt(run.seasonYards)} yd</b> kazandın → <b class="under">+${tp} TP</b> ve +${tp} PP. TP çarpanı ×${E.mTP().toFixed(2)} → <b>×${newM.toFixed(2)}</b>.</p><p class="note">TP = ⌊√(sezon yardası / 1e8)⌋</p>`}
      <div class="cols"><div class="keep"><h4>Kalır</h4><ul><li>Tur Puanı toplamı, PP ve perk'ler</li><li>Yıldızlar ve açık kurslar</li><li>Ekipman, Bilgi, akademi</li></ul></div>
      <div class="reset"><h4>Sıfırlanır</h4><ul><li>Yarda ve 6 yükseltme</li><li>Vurucu seviyeleri</li><li>Delik ilerlemesi ve delik çarpanı</li></ul></div></div>
      <div class="sec"><h3>Sonraki sezonun kursu</h3><div class="opts">${courses.join('')}</div>
      <p class="note">Her kurs ×${CFG.D} daha uzun ve Tutuş zorluğu +4. Yüksek kurs daha çok TP verir.</p></div>
      <div class="btnrow"><button class="btn ${withdraw ? 'danger' : 'gold'}" id="sGo">${withdraw ? 'Çekil' : 'Sezonu bitir'}</button><button class="btn" id="sNo">Vazgeç</button></div>`, {
      onMount: c => {
        c.querySelector('#sNo').addEventListener('click', closeModal);
        c.querySelector('#sGo').addEventListener('click', () => {
          const crs = +(c.querySelector('input[name=crs]:checked') || { value: 1 }).value;
          const got = E.endSeason(crs, withdraw);
          closeModal();
          Scene.banner(withdraw ? 'Yeni sezon' : `+${got} TP`, `Kurs ${crs} · ${CFG.courseNames[crs - 1]}`, '#ffd23f', 2.4);
          setTab('season');
          save();
        });
      },
    });
  }

  // ---------- panel içerikleri ----------
  function upEffect(key, L) {
    const S = E.get(), run = S.run;
    switch (key) {
      case 'head': return `Taban mesafe <b>${5 + 2 * L}</b> → ${5 + 2 * (L + 1)} yd`;
      case 'shaft': { const p = l => Math.min(E.pMax(), 0.05 + 0.01 * l + E.eqStat('perfect')); return `Oto mükemmel şansı <b>%${(p(L) * 100).toFixed(0)}</b> → %${(p(L + 1) * 100).toFixed(0)} (tavan %${Math.round(E.pMax() * 100)})`; }
      case 'grip': { const d = E.difficulty(run.course, run.hole); const i = l => U.clamp(l - d, -2, 2) + 2; return `Zemin <b>${CFG.lieNames[i(L)]} ×${CFG.lieTable[i(L)]}</b> → ${CFG.lieNames[i(L + 1)]} ×${CFG.lieTable[i(L + 1)]} (delik zorluğu ${d})`; }
      case 'ball': return `Top çarpanı <b>×${E.ballMult(L).toFixed(2)}</b> → ×${E.ballMult(L + 1).toFixed(2)}${(L + 1) % 10 === 0 ? ' <span class="tag">×1.5 sıçrama</span>' : ` · ${10 - (L % 10)} sv sonra ×1.5`}`;
      case 'stance': return `Seri tavanı <b>×${(1 + 0.15 * L).toFixed(2)}</b> → ×${(1 + 0.15 * (L + 1)).toFixed(2)} (her mükemmel +%5)`;
      case 'clubhouse': return `Çevrimdışı tavanı <b>${4 + 2 * L} sa</b> → ${4 + 2 * (L + 1)} sa`;
    }
    return '';
  }
  function buyBtn(key) {
    const S = E.get();
    const q = E.quote(key, S.settings.buyAmt);
    const it = q.it;
    if (it.L >= it.max) return `<button class="buy" disabled>MAKS</button>`;
    const can = q.cost <= S.run.yards && q.n > 0;
    return `<button class="buy" data-act="buy" data-key="${key}" ${can ? '' : 'disabled'}>${U.fmt(q.cost)}<small>+${q.n} sv</small></button>`;
  }
  function panelUp() {
    const S = E.get(), run = S.run;
    const amt = S.settings.buyAmt;
    const auto = E.allowedAuto();
    let h = `<div class="sec"><h3>Otomatik vurucular <span class="amt">${[1, 10, 100, 'max'].map(a => `<button data-act="amt" data-v="${a}" class="${amt === a ? 'on' : ''}">${a === 'max' ? 'Maks' : '×' + a}</button>`).join('')}</span></h3>`;
    run.hitters.forEach((L, i) => {
      const rate = 0.4 * L;
      h += `<div class="uprow"><div><div class="nm">Vurucu ${i + 1}<small>sv ${L}</small>${auto.has('hitters') ? '<span class="tag">oto</span>' : ''}</div>
        <div class="ef">${L ? `<b>${rate.toFixed(1)}</b> → ${(rate + 0.4).toFixed(1)} vuruş/sn · vuruş başı ~${U.fmt(E.autoDist())} yd` : 'Henüz vurmuyor: 1 seviye al'}</div></div>${buyBtn('h' + i)}</div>`;
    });
    const nextSlot = run.hitters.length + 1;
    if (nextSlot <= 10) {
      const n = ACAD.find(x => x.id === 'slot' + nextSlot);
      h += `<div class="uprow locked"><div><div class="nm">Vurucu ${nextSlot}<small>kilitli</small></div><div class="ef">Akademide araştır: ${n.cost} Bilgi · ${U.fmtTime(n.dur)}</div></div><button class="buy" data-act="tab" data-v="acad">Akademi</button></div>`;
    }
    h += `</div><div class="sec"><h3>Sopa ve top</h3>`;
    for (const key of ['head', 'shaft', 'grip', 'ball', 'stance', 'clubhouse']) {
      const u = CFG.up[key], it = E.item(key);
      if (!it.ok) {
        h += `<div class="uprow locked"><div><div class="nm">${u.name}</div><div class="ef">Delik ${u.unlock} temizlenince açılır</div></div><button class="buy" disabled>Kilitli</button></div>`;
        continue;
      }
      h += `<div class="uprow"><div><div class="nm">${u.name}<small>sv ${it.L}/${it.max}</small>${auto.has(key) ? '<span class="tag">oto</span>' : ''}</div><div class="ef">${upEffect(key, it.L)}</div></div>${buyBtn(key)}</div>`;
    }
    h += `</div><p class="note">Maliyet = taban × büyüme<sup>seviye</sup>. Toplu alım kapalı formla hesaplanır (§3.1).</p>`;
    return h;
  }
  function panelBag() {
    const S = E.get(), meta = S.meta;
    let h = `<div class="sec"><h3>Bekleyen çantalar <span>${meta.bags.length}/${E.bagCap()}</span></h3>
      <div class="btnrow"><button class="btn gold" data-act="bag1" ${meta.bags.length ? '' : 'disabled'}>Bir çanta aç</button><button class="btn" data-act="bagAll" ${meta.bags.length ? '' : 'disabled'}>Hepsini aç</button></div>
      <p class="note">Her delik bir çanta düşürür; 3★ ile geçilen deliğin çantası bir kademe yüksek. Olasılıklar: %60 yarda, %25 Bilgi, %14 ekipman, %1 efsanevi. Acıma sayacı: ${meta.pity}/25${meta.bagsLost ? ` · raf dolu olduğu için ${meta.bagsLost} çanta kayboldu` : ''}.</p></div>`;
    h += `<div class="sec"><h3>Takılı ekipman <span>×${E.mEquip().toFixed(2)} mesafe</span></h3><div class="eqgrid">`;
    for (const slot in SLOTS) {
      const id = meta.equip.on[slot];
      if (!id) { h += `<div class="eq"><div class="sl">${SLOTS[slot]}</div><div class="in" style="color:var(--muted)">Boş</div><div class="st">Çantadan çıkar</div></div>`; continue; }
      const it = E.itemById(id), lv = meta.equip.owned[id], m = E.lvlMul(lv);
      const ex = it.ex ? ` · ${EXTRA[it.ex].f(it.exv * m)} ${EXTRA[it.ex].name}` : '';
      h += `<div class="eq ${RARITY[it.rar].cls}"><div class="sl">${SLOTS[slot]} · ${RARITY[it.rar].name} · sv ${lv}</div><div class="in">${it.name}</div><div class="st">+%${Math.round(it.dist * m * 100)} mesafe${ex}</div></div>`;
    }
    h += `</div><p class="note">Ham çarpım ×${E.mEquipRaw().toFixed(2)}, yumuşak tavan softcap(Π, 5, 0.6) → ×${E.mEquip().toFixed(2)}. Ekipman sezon ve Efsane'de korunur.</p></div>`;
    h += `<div class="sec"><h3>Koleksiyon albümü <span>${Object.keys(meta.equip.owned).length}/${ITEMS.length}</span></h3><div class="album">`;
    for (const slot in SLOTS) {
      h += `<div class="lbl">${SLOTS[slot]}${E.albumDone(slot) ? ' ✓' : ''}</div>`;
      for (const it of ITEMS.filter(i => i.slot === slot)) {
        const own = meta.equip.owned[it.id];
        h += own ? `<button class="${RARITY[it.rar].cls} ${meta.equip.on[slot] === it.id ? 'on' : ''}" data-act="equip" data-v="${it.id}" title="${it.name}">${it.name}<br>sv ${own}</button>`
          : `<button class="miss ${RARITY[it.rar].cls}" disabled>?<br>${RARITY[it.rar].name}</button>`;
      }
    }
    h += `</div><p class="note">Bir yuvanın 6 parçasını da bulmak o yuva için kalıcı +%5 verir. Parçaya tıklayınca takılır.</p></div>`;
    return h;
  }
  function panelAcad() {
    const S = E.get(), meta = S.meta, A = meta.academy;
    let h = `<div class="sec"><h3>Akademi <span>${meta.bilgi} Bilgi</span></h3>`;
    if (A.q) {
      const n = ACAD.find(x => x.id === A.q.id);
      const left = A.q.end - meta.gt, k = 1 - left / A.q.dur;
      h += `<div class="card"><div class="nm"><b>${n.name}</b> araştırılıyor</div><div class="pbar"><i style="width:${(k * 100).toFixed(1)}%"></i></div><p class="note">Kalan <b>${U.fmtTime(left)}</b> (oyun saati). Beklemek yerine üstteki <b>Zamanı atla</b> ile ileri alabilirsin.</p></div>`;
    } else h += `<p class="note">Kuyruk boş. Bilgi; çantalardan, günlük görevlerden, günlük delikten ve sezon sonundan gelir. Araştırmalar zamanlayıcıyla ilerler ve kalıcıdır.</p>`;
    h += `</div>`;
    const groups = [...new Set(ACAD.map(n => n.group))];
    for (const g of groups) {
      h += `<div class="sec"><h3>${g}</h3>`;
      for (const n of ACAD.filter(x => x.group === g)) {
        const st = E.acadState(n);
        if (st === 'locked' && g === 'Vurucu yuvaları' && !E.acad(n.req) && n.req !== 'slot' + (E.slotsUnlocked() + 1)) continue;
        const btn = st === 'done' ? '<span class="state">Tamam</span>' : st === 'running' ? '<span class="state">Sürüyor</span>'
          : `<button class="buy" data-act="research" data-v="${n.id}" ${st !== 'open' || A.q || meta.bilgi < n.cost ? 'disabled' : ''}>${n.cost} Bilgi<small>${U.fmtTime(n.dur)}</small></button>`;
        h += `<div class="node ${st}"><div><div class="nm">${n.name}</div><div class="ds">${n.desc}${st === 'locked' ? ' · önce ' + ACAD.find(x => x.id === n.req).name : ''}</div></div>${btn}</div>`;
      }
      h += `</div>`;
    }
    return h;
  }
  function panelDaily() {
    const S = E.get(), meta = S.meta;
    let h = `<div class="sec"><h3>Günlük görevler <span>Gün ${E.dayIndex() - Math.floor(meta.epoch / 86400) + 1}</span></h3>`;
    meta.quests.list.forEach((q, i) => {
      const d = QUESTS.find(x => x.id === q.id);
      const done = q.prog >= d.goal;
      h += `<div class="node ${q.claimed ? 'done' : ''}"><div><div class="nm">${d.text}</div><div class="pbar"><i style="width:${(q.prog / d.goal * 100).toFixed(0)}%"></i></div><div class="ds">${q.prog}/${d.goal} · ödül 10 Bilgi + İyi çanta</div></div>
        ${q.claimed ? '<span class="state">Alındı</span>' : `<button class="buy" data-act="claim" data-v="${i}" ${done ? '' : 'disabled'}>Al</button>`}</div>`;
    });
    h += `<p class="note">Seri cezası yok; kaçırınca bir şey kaybetmezsin (§17.7).</p></div>`;
    const dh = Tour.genHole(U.hash('daily', meta.daily.day), [3, 4, 4, 5][U.hash('daily', meta.daily.day) % 4]);
    const best = meta.daily.best == null ? '—' : meta.daily.best === 0 ? 'E' : (meta.daily.best > 0 ? '+' : '') + meta.daily.best;
    h += `<div class="sec"><h3>Günlük delik</h3><div class="card"><p class="note">Bugün herkes için aynı delik: <b>Par ${dh.par} · ${dh.len} yd</b>. Gerçek ölçekli golf: sopa, nişan, rüzgâr, halka ve putt.</p>
      <p class="note">Deneme ${meta.daily.tries}/3 · en iyi skor <b>${best}</b> · par altı Nadir, par İyi, par üstü Sıradan çanta.</p>
      <div class="btnrow"><button class="btn primary" data-act="daily" ${meta.daily.tries >= 3 ? 'disabled' : ''}>Günlük deliği oyna</button><button class="btn" data-act="practice">Antrenman (ödülsüz)</button></div></div></div>`;
    const G = E.tourG(), lg = E.league(G);
    const open = meta.tourOpen || meta.coursesUnlocked > 1;
    const tb = meta.tour.best == null ? '—' : meta.tour.best === 0 ? 'E' : (meta.tour.best > 0 ? '+' : '') + meta.tour.best;
    h += `<div class="sec"><h3>Haftalık turnuva</h3><div class="card">
      <p class="note">9 delik, herkes aynı sahayı oynar. Haftada 3 tur, en iyisi sayılır. Lig turnuva gücüne (G) göre: <b>G = ${Math.round(G)} → ${lg.name}</b>.</p>
      <p class="note">G = 100·log10(1+TP) + yıldız + 25·kurs + 5·ekipman. Eğri doyduğu için güç farkı lig içinde küçük kalır.</p>
      <p class="note">Bu hafta tur ${meta.tour.tries}/3 · en iyi <b>${tb}</b> · rozet ${meta.badge}/10</p>
      <button class="btn gold" data-act="tour" ${!open || meta.tour.tries >= 3 ? 'disabled' : ''}>${open ? 'Turnuva turu oyna' : 'Kurs 1 / Delik 9 sonrası açılır'}</button></div></div>`;
    return h;
  }
  function panelSeason() {
    const S = E.get(), meta = S.meta, run = S.run;
    const st = E.starsOf(run.course), cs = E.courseStars(run.course);
    let h = `<div class="sec"><h3>Bu sezon <span>Kurs ${run.course}</span></h3><div class="card">
      <p class="note">Sezon süresi <b>${U.fmtTime(meta.gt - run.t0)}</b> · sezon yardası <b>${U.fmt(run.seasonYards)}</b></p>
      <p class="note">${run.seasonDone ? `Kurs bitti. Şimdi bitirirsen <b class="under">+${E.tpPreview()} TP</b>.` : `18. delikten sonra bitirilebilir. Şu anki tahmin: ${E.tpPreview()} TP.`}</p>
      <div class="btnrow"><button class="btn gold" data-act="endSeason" ${run.seasonDone ? '' : 'disabled'}>Sezonu bitir</button><button class="btn danger" data-act="withdraw">Sezondan çekil</button></div></div></div>`;
    h += `<div class="sec"><h3>Yıldızlar · ${CFG.courseNames[run.course - 1]} <span>${cs}/54 ★ · ×${E.mThreshold(run.course).toFixed(1)}</span></h3><div class="stargrid">`;
    for (let i = 0; i < 18; i++) h += `<div class="${i + 1 === run.hole && !run.seasonDone ? 'cur' : ''} ${i + 1 > run.hole ? 'todo' : ''}">${i + 1}<b>${'★'.repeat(st[i])}<span class="e">${'★'.repeat(3 - st[i])}</span></b></div>`;
    h += `</div><p class="note">Her ★ o deliğe +%3 mesafe. 18 / 36 / 54 ★ eşiklerinin her biri kursa kalıcı +%10. Yıldızlar sezonlar arası kalır.</p></div>`;
    h += `<div class="sec"><h3>Perk ağacı <span>${meta.pp} PP</span></h3>`;
    for (const p of PERKS) {
      const lv = E.perk(p.id), cost = E.perkCost(p);
      h += `<div class="node"><div><div class="nm">${p.name} <small style="color:var(--muted)">${lv}/${p.max}</small></div><div class="ds">${p.desc}</div></div>
        ${lv >= p.max ? '<span class="state">Maks</span>' : `<button class="buy" data-act="perk" data-v="${p.id}" ${meta.pp >= cost ? '' : 'disabled'}>${U.fmt(cost)} PP</button>`}</div>`;
    }
    h += `<p class="note">TP harcanmaz; toplam TP çarpan verir: (1 + TP/10)<sup>1.8</sup> = <b>×${E.mTP().toFixed(2)}</b> (toplam ${meta.tpTotal} TP). Perk'ler ayrı birim olan PP ile alınır.</p></div>`;
    h += `<div class="sec"><h3>Kurslar</h3>`;
    for (let c = 1; c <= 4; c++) h += `<div class="node ${c <= meta.coursesUnlocked ? '' : 'locked'}"><div><div class="nm">Kurs ${c} · ${CFG.courseNames[c - 1]}</div><div class="ds">Delik 1: ${U.fmt(E.holeLen(c, 1))} yd · Delik 18: ${U.fmt(E.holeLen(c, 18))} yd · ${E.courseStars(c)}/54 ★</div></div><span class="state">${c <= meta.coursesUnlocked ? 'Açık' : 'Kilitli'}</span></div>`;
    h += `<p class="note">Büyük Şampiyon, Efsane ve Sonsuz Tur bu prototipte yok.</p></div>`;
    return h;
  }
  function panelTune() {
    const S = E.get(), run = S.run;
    const lie = E.lieIdx();
    const parts = E.metaParts().map(([k, v]) => `<span>${k}</span><b>×${v.toFixed(2)}</b>`).join('');
    const p = E.pPerfect();
    let h = `<div class="sec"><h3>Vuruş başına mesafe (otomatik)</h3><div class="kv">
      <span>Taban (5 + 2·Sopa Başı)</span><b>${5 + 2 * run.up.head}</b>
      <span>Zemin (${CFG.lieNames[lie]})</span><b>×${CFG.lieTable[lie]}</b>
      <span>Top</span><b>×${E.ballMult(run.up.ball).toFixed(2)}</b>
      <span>Delik çarpanı 1.08^(h−1)</span><b>×${E.holeMult(run).toFixed(2)}</b>
      <span>Kritik 1 + p·1.5 (p=%${(p * 100).toFixed(0)})</span><b>×${(1 + p * 1.5).toFixed(2)}</b>
      <span>Rüzgâr (oto)</span><b>×${E.windAuto().toFixed(2)}</b>
      ${parts}
      <span><b style="text-align:left">= vuruş başına</b></span><b>${U.fmt(E.autoDist())} yd</b>
      <span>× vuruş/sn (0.4 · Σ seviye${E.hitterBoost() > 1 ? ' · ×' + E.hitterBoost() : ''})</span><b>${E.autoRate().toFixed(1)}</b>
      <span><b style="text-align:left">= otomatik gelir</b></span><b>${U.fmt(E.autoIncome())}/sn</b>
    </div></div>`;
    const mv = E.manualValue(CFG.perfectMult, E.streakMult());
    h += `<div class="sec"><h3>Elle vuruş</h3><div class="kv">
      <span>Mükemmel vuruş değeri</span><b>${U.fmt(mv)} yd</b>
      <span>= oto gelirin kaç saniyesi</span><b>${(mv / Math.max(1e-9, E.autoIncome())).toFixed(1)} sn</b>
      <span>Power Drive (mükemmel)</span><b>${U.fmt(E.tPD() * E.autoIncome() * CFG.perfectMult)} yd</b>
      <span>Seri çarpanı</span><b>×${E.streakMult().toFixed(2)}</b>
    </div><p class="note">Elle vuruş = max(v3 formülü, τ_man × oto gelir/sn × kalite × seri). Taban sayesinde otomasyon büyüse de elle vuruş değerini korur (§17.3).</p></div>`;
    const P = [['tauMan', 'τ_man: elle vuruş tabanı (sn)'], ['tPD', 'T_PD: Power Drive (sn gelir)'], ['manualPower', 'Elle vuruş gücü (oto katı)'], ['holeGrowth', 'Delik uzunluğu büyümesi'], ['D', 'Kurs ölçeği D'], ['offlineEff', 'Çevrimdışı verim'], ['goldMin', 'Altın top en erken (sn)'], ['goldMax', 'Altın top en geç (sn)'], ['greenGrace', 'Putt bekleme süresi (sn)']];
    h += `<div class="sec"><h3>Test edilecek varsayımlar (TBT)</h3><div class="tune">${P.map(([k, l]) => `<label for="cfg-${k}">${l}</label><input id="cfg-${k}" type="number" step="any" data-cfg="${k}" value="${CFG[k]}">`).join('')}</div>
      <p class="note">Değerler kayda yazılır; denge denemesi için.</p></div>`;
    h += `<div class="sec"><h3>Test araçları</h3>
      <label class="note"><input type="checkbox" id="autoAll" data-act="autoAll" ${S.settings.autoAll ? 'checked' : ''}> Açık oyunda da tüm kategorileri otomatik al</label>
      <div class="btnrow"><button class="btn" data-act="gold">Altın topu şimdi çıkar</button><button class="btn" data-act="bilgi">+50 Bilgi</button><button class="btn danger" data-act="reset">Kaydı sıfırla</button></div>
      <p class="note">İstatistik: ${S.meta.stats.swings} elle vuruş, %${S.meta.stats.swings ? Math.round(S.meta.stats.perfects / S.meta.stats.swings * 100) : 0} mükemmel, ${S.meta.stats.holes} delik, ${S.meta.stats.seasons} sezon, en iyi vuruş ${U.fmt(S.meta.stats.bestSwing)} yd.</p></div>`;
    return h;
  }
  const PANELS = { up: panelUp, bag: panelBag, acad: panelAcad, daily: panelDaily, season: panelSeason, tune: panelTune };

  function renderPanel(force) {
    const html = PANELS[tab]();
    if (!force && html === lastPanel) return;
    const body = $('tabBody');
    // odaklı bir girişi yeniden çizme
    if (!force && body.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
    const sc = body.scrollTop;
    body.innerHTML = html; lastPanel = html; body.scrollTop = sc;
  }
  function setTab(t) {
    tab = t;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    renderPanel(true);
    $('tabBody').scrollTop = 0;
  }
  let resetArm = 0;
  function onAct(btn) {
    const S = E.get(), a = btn.dataset.act, v = btn.dataset.v;
    switch (a) {
      case 'buy': E.buy(btn.dataset.key, S.settings.buyAmt); break;
      case 'amt': S.settings.buyAmt = v === 'max' ? 'max' : +v; break;
      case 'tab': setTab(v); return;
      case 'bag1': openOneBag(); break;
      case 'bagAll': openAllBags(); break;
      case 'equip': E.equip(v); break;
      case 'research': if (E.startResearch(v)) toast('Araştırma başladı', 'blue'); break;
      case 'claim': E.claimQuest(+v); toast('Görev ödülü: 10 Bilgi + çanta', 'gold'); pingBags(); break;
      case 'daily': Tour.start('daily'); break;
      case 'practice': Tour.start('practice'); break;
      case 'tour': Tour.start('tour'); break;
      case 'endSeason': seasonModal(false); break;
      case 'withdraw': seasonModal(true); break;
      case 'perk': E.buyPerk(v); break;
      case 'gold': Scene.spawnGoldNow(); break;
      case 'bilgi': S.meta.bilgi += 50; break;
      case 'autoAll': S.settings.autoAll = btn.checked; break;
      case 'reset':
        if (Date.now() - resetArm < 4000) { try { localStorage.removeItem(KEY); } catch (e) { } E.fresh(); Scene.resize(); resetArm = 0; toast('Kayıt sıfırlandı', 'red'); }
        else { resetArm = Date.now(); toast('Sıfırlamak için 4 sn içinde tekrar bas', 'red'); return; }
        break;
    }
    renderPanel(true);
  }
  function refreshAll() { renderPanel(true); }

  // ---------- HUD ----------
  function hud() {
    const S = E.get(), run = S.run, meta = S.meta;
    $('sYards').textContent = U.fmt(run.yards);
    const rates = shareRates();
    $('sIncome').textContent = U.fmt(Math.max(E.autoIncome(), rates.total));
    $('sStars').textContent = E.totalStars();
    $('sTP').textContent = meta.tpTotal;
    $('sBilgi').textContent = meta.bilgi;
    $('sBags').textContent = meta.bags.length;
    const day = E.dayIndex() - Math.floor(meta.epoch / 86400) + 1;
    $('clock').textContent = `Gün ${day} · ${U.fmtClock(meta.gt)}`;
    $('courseName').textContent = `Kurs ${run.course} · ${CFG.courseNames[run.course - 1]}`;
    const len = E.holeLen(run.course, run.hole);
    const par = CFG.parPattern[run.hole - 1];
    $('holeTitle').innerHTML = run.seasonDone ? `Kurs bitti <em>18/18</em>` : `Delik <em>${run.hole}</em>/18 · Par ${par}`;
    $('holeMeta').textContent = `Uzunluk ${U.fmt(len)} yd · delik çarpanı ×${E.holeMult(run).toFixed(2)} · zorluk ${E.difficulty(run.course, run.hole)}`;
    const p = run.seasonDone ? 1 : Math.min(1, run.prog / len);
    $('pfill').style.width = (p * 100).toFixed(2) + '%';
    $('pText').textContent = `${U.fmt(run.prog)} / ${U.fmt(len)} yd (%${(p * 100).toFixed(1)})`;
    const inc = Math.max(E.autoIncome(), rates.total);
    $('pEta').textContent = run.seasonDone ? 'Sezonu bitirebilirsin' : E.greenPhase() ? (run.prog >= len ? `Yeşilde bekliyor · ${Math.max(0, Math.ceil(CFG.greenGrace - run.greenWait))} sn sonra 0★ geçer` : 'Yeşil fazı: putt oyna') : `Kalan ~${U.fmtTime((len - run.prog) / Math.max(1e-9, inc) / Math.max(1, speed))} (gerçek zaman)`;
    // zemin
    const li = E.lieIdx(), d = E.difficulty(run.course, run.hole);
    $('lieV').innerHTML = `<span class="lie${li}">${CFG.lieNames[li]} ×${CFG.lieTable[li]}</span>`;
    $('lieP').textContent = `Tutuş ${run.up.grip} − zorluk ${d} = ${run.up.grip - d >= 0 ? '+' : ''}${run.up.grip - d}. ${li < 2 ? 'Tutuşu yükselt: toplar rough/bunkere düşüyor.' : li < 4 ? 'Tutuş delikle yarışıyor; her yeni delik zorlaşır.' : 'En iyi zemin.'}`;
    // rüzgâr
    if (E.windActive()) {
      const w = E.wind();
      $('windV').textContent = { calm: 'Durgun ×1.0', head: 'Karşı rüzgâr ×0.7', tail: 'Arka rüzgâr ×1.4 · PD ×1.5' }[w.kind];
      let s = '';
      for (let i = 0; i < 5; i++) {
        const ww = E.windAt(meta.gt + i * 45);
        const t = i === 0 ? 'şimdi' : '+' + Math.round((i * 45 - (meta.gt % 45)) / 1) + 's';
        s += `<div class="${ww.kind} ${i === 0 ? 'now' : ''}">${{ calm: '—', head: '←', tail: '→' }[ww.kind]} ${t}</div>`;
      }
      $('windStrip').innerHTML = s;
    } else {
      $('windV').textContent = 'Yok';
      $('windStrip').innerHTML = `<div>Delik 9 temizlenince açılır</div>`;
    }
    // gelir payı
    const cols = { auto: '#3f9a52', man: '#3a6ee8', pd: '#ff8a3d', gold: '#d9a521', bag: '#8d4fd1' };
    const names = { auto: 'Otomatik', man: 'Elle', pd: 'Power Drive', gold: 'Altın top', bag: 'Çanta' };
    const tot = rates.total || 1;
    $('share').innerHTML = Object.keys(cols).map(k => `<i style="width:${(rates[k] / tot * 100).toFixed(1)}%;background:${cols[k]}"></i>`).join('');
    $('shareLegend').innerHTML = Object.keys(cols).filter(k => rates[k] > 0).map(k => `<span><b style="background:${cols[k]}"></b>${names[k]} %${Math.round(rates[k] / tot * 100)}</span>`).join('');
    // ipucu
    const hint = $('stageHint');
    if (meta.stats.swings < 3) hint.innerHTML = 'İbre <b>sarı</b> bölgeye gelince <b>Boşluk</b>a bas ya da sahaya tıkla. Elle vuruş 12 otomatik vuruş değerinde.';
    else if (run.pd >= 100) hint.innerHTML = '<b>Power Drive hazır!</b> Sıradaki elle vuruş 30 sn\'lik otomatik gelir değerinde.';
    else if (run.streak >= 2) hint.innerHTML = `Seri <b>${run.streak}</b> · ×${E.streakMult().toFixed(2)}${run.up.stance ? '' : ' (Duruş alınca seri çarpanı açılır)'}`;
    else hint.innerHTML = `<b>${run.hitters.filter(x => x > 0).length}</b> vurucu · ${E.autoRate().toFixed(1)} vuruş/sn${E.autoRate() > 20 ? ' (ekranda en fazla 20)' : ''}`;
    // yetenekler
    const ab = [];
    const g = meta.gt;
    if (E.acad('focus')) ab.push(`<button data-ab="focus" ${run.focusCd > g ? 'disabled' : ''}>Odak<small>${run.focusUntil > g ? 'aktif ' + Math.ceil(run.focusUntil - g) + ' sn' : run.focusCd > g ? Math.ceil(run.focusCd - g) + ' sn' : 'hazır'}</small></button>`);
    if (E.acad('tempo')) ab.push(`<button data-ab="tempo" ${run.tempoCd > g ? 'disabled' : ''}>Hızlı Tempo<small>${run.tempoUntil > g ? 'aktif ' + Math.ceil(run.tempoUntil - g) + ' sn' : run.tempoCd > g ? Math.ceil(run.tempoCd - g) + ' sn' : 'hazır'}</small></button>`);
    const abHtml = ab.join('');
    if ($('abil').dataset.h !== abHtml) { $('abil').innerHTML = abHtml; $('abil').dataset.h = abHtml; }
    $('puttBtn').hidden = !E.greenPhase() || Putt.isOpen();
    // sekme noktaları
    const dots = { bag: meta.bags.length > 0, acad: !meta.academy.q && ACAD.some(n => E.acadState(n) === 'open' && meta.bilgi >= n.cost), daily: meta.quests.list.some(q => !q.claimed && q.prog >= QUESTS.find(x => x.id === q.id).goal), season: run.seasonDone };
    document.querySelectorAll('#tabs button').forEach(b => {
      const has = !!dots[b.dataset.tab], cur = !!b.querySelector('.dot');
      if (has && !cur) b.appendChild(U.el('span', 'dot')); else if (!has && cur) b.querySelector('.dot').remove();
    });
  }
  function shareRates() {
    const r = { auto: 0, man: 0, pd: 0, gold: 0, bag: 0, total: 0 };
    let dt = 0;
    for (const h of hist) { for (const k in h.d) r[k] += h.d[k]; dt += h.dt; }
    if (dt <= 0) return r;
    for (const k of ['auto', 'man', 'pd', 'gold', 'bag']) { r[k] /= dt; r.total += r[k]; }
    return r;
  }
  function sampleStats(dtGame) {
    histAcc += dtGame;
    const cur = Object.assign({}, E.stats);
    if (!prevStats) prevStats = cur;
    const d = {};
    for (const k in cur) d[k] = cur[k] - (prevStats[k] || 0);
    prevStats = cur;
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
    // halka
    ring.update(dtR);
    ring.pd = S.run.pd; ring.pdReady = S.run.pd >= 100;
    ring.focus = S.run.focusUntil > S.meta.gt;
    ring.enabled = !Putt.isOpen() && !Tour.isOpen() && !modalOpen;
    ring.center = ring.pdReady ? 'POWER' : S.run.streak > 0 ? 'SERİ ' + S.run.streak : 'VURUŞ';
    ring.sub = ring.pdReady ? 'DRIVE HAZIR' : S.run.streak > 0 ? '×' + E.streakMult().toFixed(2) : 'BOŞLUK / TIKLA';
    ring.draw();
    Scene.update(dtR); Scene.draw(); HoleMap.draw();
    hud();
    panelTimer += dtR;
    if (panelTimer > 0.35) { panelTimer = 0; renderPanel(false); }
    saveTimer += dtR;
    if (saveTimer > 10) { saveTimer = 0; save(); }
    requestAnimationFrame(frame);
  }

  function help() {
    modal(`<h3>Par Fabrikası · prototip</h3>
      <p class="note">Blueprint v4'ün oynanabilir taslağı. Kariyer soyut ölçekte (delik = yarda eşiği), turnuva ve günlük delik gerçek ölçekte.</p>
      <ol class="help">
        <li><b>Elle vuruş:</b> halkadaki ibre sarı bölgeye gelince <kbd>Boşluk</kbd>. Mükemmel ×2.5, iyi ×1, ıska ×0.5. Elle vuruş 12 otomatik vuruş değerindedir.</li>
        <li><b>Power Drive:</b> elle vuruşlar dış turuncu halkayı doldurur. Dolunca sıradaki vuruş 30 saniyelik otomatik gelir değerinde.</li>
        <li><b>Otomatik vurucular</b> arkada sürekli vurur. Seviye al; yeni yuvalar Akademi'de araştırılır.</li>
        <li><b>Delik:</b> kazanılan her yarda ilerleme çubuğunu doldurur. Son %10'da <b>Putt oyna</b> çıkar: 1 denemede 3★. Oynamazsan delik 0★ geçer.</li>
        <li><b>Tutuş</b> zemini belirler. Delikler zorlaştıkça toplar rough ve bunkere düşer.</li>
        <li><b>Çanta</b> her delikten düşer: yarda, Bilgi veya ekipman. <b>Altın top</b> gökyüzünde belirince tıkla.</li>
        <li><b>Zaman:</b> üstteki ×10 / ×100 hızlandırır. <b>Zamanı atla</b> saatler ya da günler ilerletir (çevrimdışı, boşta veya aktif oyuncu olarak).</li>
        <li><b>Günlük</b> sekmesinde gerçek ölçekli golf: sopa seç, hedefi sürükle, halkayla vur.</li>
      </ol>
      <div class="btnrow"><button class="btn primary" id="hOk">Başla</button></div>`, { onMount: c => c.querySelector('#hOk').addEventListener('click', closeModal) });
  }

  // ---------- başlatma ----------
  function boot(hotData) {
    const saved = (hotData && hotData.S) || load();
    let offline = null;
    if (saved) {
      E.attach(saved);
      const dt = (Date.now() - (saved.lastSeen || Date.now())) / 1000;
      if (!hotData && dt >= 60) offline = dt;
    } else E.fresh();
    ring = new Ring($('ring'));
    Scene.init($('scene')); HoleMap.init($('holemap'));
    Putt.init(); Tour.init();

    $('scene').addEventListener('pointerdown', e => {
      const r = $('scene').getBoundingClientRect();
      const g = Scene.hitGold(e.clientX - r.left, e.clientY - r.top);
      if (g) {
        const res = E.goldReward();
        Scene.banner('ALTIN TOP', res.text, '#ffd23f', 2);
        Scene.popup(g.x, g.y, res.y ? '+' + U.fmt(res.y) : '★', '#ffd23f', true);
        toast('Altın top: ' + res.text, 'gold');
        return;
      }
      swing();
    });
    $('ring').addEventListener('pointerdown', e => { e.preventDefault(); swing(); });
    $('puttBtn').addEventListener('click', openPutt);
    $('abil').addEventListener('click', e => { const b = e.target.closest('[data-ab]'); if (b && E.useAbility(b.dataset.ab)) toast(b.dataset.ab === 'focus' ? 'Odak: mükemmel bölgesi 2 kat' : 'Hızlı Tempo: vurucular ×3', 'blue'); });
    $('sBagsBtn').addEventListener('click', () => setTab('bag'));
    $('skipBtn').addEventListener('click', skipModal);
    $('helpBtn').addEventListener('click', help);
    $('speed').addEventListener('click', e => {
      const b = e.target.closest('[data-speed]'); if (!b) return;
      speed = +b.dataset.speed;
      document.querySelectorAll('#speed [data-speed]').forEach(x => x.classList.toggle('on', x === b));
    });
    $('tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
    // panel düğmeleri: yeniden çizim tıklamayı kaçırmasın diye pointerdown
    const body = $('tabBody');
    body.addEventListener('pointerdown', e => {
      const b = e.target.closest('button[data-act]');
      if (b && !b.disabled && e.button === 0) { e.preventDefault(); onAct(b); }
    });
    body.addEventListener('click', e => {
      const b = e.target.closest('button[data-act]');
      if (b && e.detail === 0 && !b.disabled) onAct(b);   // klavye
    });
    body.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.cfg) { const v = parseFloat(t.value); if (isFinite(v) && v > 0) { CFG[t.dataset.cfg] = v; E.get().cfg[t.dataset.cfg] = v; } }
      if (t.dataset.act === 'autoAll') onAct(t);
    });
    $('modal').addEventListener('pointerdown', e => { if (e.target === $('modal')) closeModal(); });
    document.addEventListener('keydown', e => {
      if (e.code === 'Escape' && modalOpen) { closeModal(); return; }
      if (e.code !== 'Space') return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' && e.target.closest('.mcard')) return;
      e.preventDefault();
      // odaktaki düğme Boşluk bırakılınca tıklanmasın
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
      if (e.repeat) return;
      if (Tour.isOpen()) { if (!Putt.isOpen()) Tour.press(); else Putt.release(); return; }
      if (Putt.isOpen()) { Putt.release(); return; }
      swing();
    });
    document.addEventListener('keyup', e => {
      if (e.code === 'Space' && !(e.target.tagName === 'INPUT' || e.target.closest && e.target.closest('.mcard'))) e.preventDefault();
    });
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    window.claude?.hot?.snapshot?.(() => ({ S: E.get() }));

    setTab('up');
    requestAnimationFrame(frame);
    if (offline) runSkip(offline, 'offline', 'perk', 'Siz yokken');
    else if (!saved) help();
  }

  return { boot, modal, closeModal, toast, refreshAll, save, get speed() { return speed; } };
})();

window.claude?.hot?.ready ? window.claude.hot.ready(UI.boot) : UI.boot(window.claude?.hot?.data ?? null);
