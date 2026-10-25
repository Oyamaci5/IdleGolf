// UI: header, panels, modals, view A/B, language, time controls, save and main loop.
const UI = (() => {
  const $ = id => document.getElementById(id);
  const KEY = 'parfabrikasi-proto-v3';
  let speed = 1, tab = 'up', skipping = false, ring, lookSel = 'p', lookWorld = -1, previewT = 0;
  let lastPanel = '', panelTimer = 0, saveTimer = 0, wasBlocked = false;
  const hist = []; let prevStats = null;
  const fmtRel = x => x === 0 ? 'E' : x > 0 ? '+' + x : '' + x;
  const cur = (k, v) => `<span class="cur cur-${k}" title="${N(CUR[k])}">${CUR[k].icon}</span>${U.fmt(v)}`;
  const costHtml = c => ['data', 'shards', 'medals'].filter(k => c[k]).map(k => cur(k, c[k])).join(' ');

  // ---------- save ----------
  function save() { try { const S = E.get(); S.lastSeen = Date.now(); localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage may be blocked */ } }
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 3) return s; } catch (e) { } return null; }

  // ---------- modal and toast ----------
  let modalOpen = false, modalClose = null;
  function modal(html, o = {}) { const m = $('modal'), c = $('modalCard'); c.className = 'mcard' + (o.wide ? ' wide' : ''); c.innerHTML = html; m.hidden = false; modalOpen = true; modalClose = o.onClose || null; o.onMount && o.onMount(c); }
  function closeModal() { $('modal').hidden = true; modalOpen = false; const cb = modalClose; modalClose = null; cb && cb(); }
  function toast(text, kind = '') { if (skipping) return; const t = U.el('div', 'toast ' + kind, text); $('toasts').appendChild(t); setTimeout(() => t.remove(), 4200); while ($('toasts').children.length > 5) $('toasts').firstChild.remove(); }
  function ping(id) { const b = $(id); if (!b) return; b.classList.add('ping'); setTimeout(() => b.classList.remove('ping'), 3000); }

  // ---------- language ----------
  function applyLang() {
    LANG.cur = E.get().settings.lang || 'en';
    document.documentElement.lang = LANG.cur;
    document.querySelectorAll('[data-en]').forEach(el => { el.textContent = LANG.cur === 'tr' && el.dataset.tr ? el.dataset.tr : el.dataset.en; });
    document.querySelectorAll('#langBtn button').forEach(b => b.classList.toggle('on', b.dataset.lang === LANG.cur));
    renderPanel(true);
  }

  // ---------- views ----------
  let viewA, viewB;
  function setView(v) {
    E.get().settings.view = v;
    const st = $('stage');
    st.classList.toggle('split', v === 'split');
    $('sceneA').hidden = v === 'range'; $('sceneB').hidden = v === 'side';
    viewA.active = v !== 'range'; viewB.active = v !== 'side';
    document.querySelectorAll('#viewBtn button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
    requestAnimationFrame(() => { viewA.resize(); viewB.resize(); });
  }

  // ---------- hooks ----------
  E.hooks.shot = e => {
    Stage.views.forEach(v => v.shot && v.shot(e));
    const pct = Math.round((E.terrainMult(e.land) - 1) * 100), nm = N(E.hazardName(e.land)).toUpperCase();
    const T = { fairway: ['#bff0a0', L('Clean shot', 'Temiz vuruş')], rough: ['#f3e3b0', L('Next shot slower', 'Sonraki vuruş yavaş')], bunker: ['#ffd59a', L('+1 stroke', '+1 vuruş')], water: ['#9fd2ff', L('+1 penalty', '+1 ceza')], green: ['#d8ffb5', L('Time to putt', 'Putt zamanı')] }[e.land];
    Stage.banner(`${nm}!`, `${T[1]}${pct ? ` · ${pct > 0 ? '+' : ''}${pct}% ${L('speed', 'hız')}` : ''}`, T[0], 1.6);
  };
  E.hooks.hole = ({ n, par, strokes, rel, stars, auto, worldDone }) => {
    const name = { '-3': 'ALBATROSS', '-2': 'EAGLE', '-1': 'BIRDIE', '0': 'PAR', '1': 'BOGEY', '2': 'DOUBLE BOGEY' }[rel] || (rel < -3 ? 'LEGEND' : '+' + rel);
    Stage.banner(`${name} ${stars ? U.stars(stars) : ''}`, L(`${strokes} strokes · par ${par}`, `${strokes} vuruş · par ${par}`) + (auto ? L(' · putt not played (2 putts)', ' · putt oynanmadı (2 putt)') : ''), stars >= 3 ? '#ffd23f' : '#fff', 2.4);
    if (n % 6 === 0) { toast(L('Gear bag earned!', 'Ekipman çantası kazandın!'), 'gold'); ping('sBagBtn'); }
    if (worldDone) setTimeout(() => worldDoneModal(E.worldOf(n)), 700);
  };
  E.hooks.ach = a => { toast(`🏆 ${N(a.name)} · ${E.rewardText(a.reward)}`, 'gold'); };
  E.hooks.world = ({ w }) => { worldModal(w); };
  E.hooks.toast = (t, k) => toast(t, k);
  // hazard escape: only when the player is actually here; away from the game the penalty just applies
  let lastInput = 0;
  const playerActive = () => performance.now() - lastInput < 60000 && speed > 0 && speed <= 10 && !modalOpen && !Putt.isOpen() && !Tour.isOpen() && !Escape.isOpen() && !document.hidden;
  E.hooks.hazard = h => {
    if (!playerActive()) return false;
    const w = E.world(), d = E.accuracy() - E.terrainDiff();
    setTimeout(() => {
      if (!E.get().run.hazard) return;
      Escape.open({
        land: h.land, grass: w.grass[0], sand: w.sand, waterCol: w.id === 'mercury' ? '#e0602a' : w.id === 'ice' || w.id === 'snow' ? '#a9d8f0' : '#3d8fd1',
        zone: 0.14 + 0.012 * d,
        title: L(`Escape the ${N(E.hazardName(h.land)).toLowerCase()}!`, `${N(E.hazardName(h.land))}'dan çık!`),
        info: L('Stop the marker in the green zone. Higher Accuracy = wider zone.', 'İşaretçiyi yeşilde durdur. İsabet yüksekse bölge geniş.'),
        onDone: ok => { E.resolveHazard(ok); Stage.banner(ok ? L('ESCAPED!', 'ÇIKTI!') : L('+1 STROKE', '+1 VURUŞ'), ok ? L('No penalty', 'Ceza yok') : '', ok ? '#bff0a0' : '#ffd59a', 1.4); },
      });
    }, 700);
    return true;
  };
  E.hooks.patience = () => { toast(L('Patience bonus: +1 ★ for staying on this hole', 'Sabır ödülü: bu delikte kaldığın için +1 ★'), 'gold'); };
  function worldDoneModal(w) {
    const next = WORLDS[w + 1], S0 = E.get();
    if (!next) return;
    const ok = E.totalStars() >= next.stars;
    modal(`<h3>${L('World complete', 'Dünya tamamlandı')}: ${N(WORLDS[w].name)}</h3><div class="trophy">🏆</div>
      <p>${L(`Permanent trophy: all distance ×${CFG.trophyMult}.`, `Kalıcı kupa: tüm mesafeler ×${CFG.trophyMult}.`)}</p>
      <p>${L('Next', 'Sıradaki')}: <b>${N(next.name)}</b> · ${L('needs', 'gerekli')} <b>${next.stars} ★</b> (${L('you have', 'sende')} ${E.totalStars()} ★)</p>
      ${ok ? '' : `<p class="note gold">${L('Not enough stars yet. Replay putts on earlier holes in the Worlds tab to raise their stars.', 'Henüz yıldız yetmiyor. Dünyalar sekmesinde önceki deliklerin putt\'larını tekrar oynayıp yıldız topla.')}</p>`}
      <div class="btnrow"><button class="btn primary" id="wOk">${L('Continue', 'Devam')}</button>${ok ? '' : `<button class="btn gold" id="wGo">${L('Open Worlds', 'Dünyaları aç')}</button>`}</div>`, {
      onMount: c => { c.querySelector('#wOk').addEventListener('click', closeModal); const g = c.querySelector('#wGo'); g && g.addEventListener('click', () => { closeModal(); setTab('worlds'); }); },
    });
    void S0;
  }
  function worldModal(w) {
    const W = WORLDS[w];
    modal(`<h3>${L('New world', 'Yeni dünya')}: ${N(W.name)}</h3><canvas id="wPrev" class="lookprev"></canvas>
      <p>${N(W.desc)}</p>
      <div class="kv"><span>${N(W.windName)}</span><b>${W.wind}–${W.wind + W.step * W.gates.length} km/h</b><span>${L('Terrain difficulty', 'Zemin zorluğu')}</span><b>+${W.terrain}</b>
      ${W.heat < 1 ? `<span>${L('Heat (helper speed)', 'Sıcak (yardımcı hızı)')}</span><b>×${W.heat}</b>` : ''}${W.gravity < 1 ? `<span>${L('Gravity', 'Yerçekimi')}</span><b>${W.gravity}g</b>` : ''}
      ${W.suit ? `<span>${L('Outfit', 'Kıyafet')}</span><b>${N(WORLD_OUTFIT[W.suit])}</b>` : ''}</div>
      <div class="btnrow"><button class="btn primary" id="nwOk">${L('Tee off', 'Başla')}</button></div>`, {
      onMount: c => { c.querySelector('#nwOk').addEventListener('click', closeModal); setTimeout(() => { const cv = c.querySelector('#wPrev'); cv && Art.preview(cv, E.get().meta.looks.p, W, true, -1); }, 30); },
    });
  }

  // ---------- swing and putt ----------
  function swing() { if (modalOpen || Putt.isOpen() || Tour.isOpen()) return; const q = ring.press(); if (q == null) return; Stage.onSwingPlayer(E.manualSwing(q)); }
  const puttOpts = () => ({ window: 6 + E.res('putt_calm'), guide: 0.4 + 0.1 * E.res('putt_read'), calm: E.res('putt_calm') });
  function openPutt() {
    const run = E.get().run; if (!E.greenPhase() || Putt.isOpen()) return;
    const key = run.n;
    Putt.open(Object.assign(puttOpts(), {
      distFt: 8 + Math.random() * 14, title: L(`Hole ${E.holeIn(run.n)} · Green`, `Delik ${E.holeIn(run.n)} · Yeşil`),
      sub: L(`${run.shot.strokes} strokes so far · par ${E.parOf(run.n)}`, `Şimdiye kadar ${run.shot.strokes} vuruş · par ${E.parOf(run.n)}`),
      maxTries: 4, skipTries: CFG.autoPutts, skipLabel: L('Skip (2 putts)', 'Geç (2 putt)'),
      onDone: (tries, info) => { if (E.get().run.n === key) E.puttDone(info && info.skipped ? CFG.autoPutts : tries); },
    }));
  }
  // ---------- skip ----------
  function skipModal() {
    modal(`<h3>${L('Fast-forward time', 'Zamanı ileri al')}</h3>
      <div class="sec"><h3>${L('Duration', 'Süre')}</h3><div class="opts">${[[600, '10 min', '10 dk'], [3600, '1 h', '1 sa'], [4 * 3600, '4 h', '4 sa'], [12 * 3600, '12 h', '12 sa'], [86400, '1 day', '1 gün'], [3 * 86400, '3 days', '3 gün']].map(([s, a, b], i) => `<label><input type="radio" name="skd" value="${s}" ${i === 1 ? 'checked' : ''}>${L(a, b)}</label>`).join('')}</div></div>
      <div class="sec"><h3>${L('How was it spent?', 'Nasıl geçti?')}</h3><div class="opts">
        <label><input type="radio" name="skp" value="offline" checked>${L(`App closed (${Math.round(E.offlineEff() * 100)}%, capped)`, `Uygulama kapalı (%${Math.round(E.offlineEff() * 100)}, tavanlı)`)}</label>
        <label><input type="radio" name="skp" value="idle">${L('Open, not touched', 'Açık, dokunulmadı')}</label>
        <label><input type="radio" name="skp" value="active">${L('Playing actively', 'Aktif oynandı')}</label></div></div>
      <div class="sec"><h3>${L('Upgrades', 'Yükseltmeler')}</h3><div class="opts">
        <label><input type="radio" name="skb" value="all" checked>${L('Auto-buy best value', 'En iyisini otomatik al')}</label><label><input type="radio" name="skb" value="none">${L('Do not buy', 'Alma')}</label></div></div>
      <div class="btnrow"><button class="btn primary" id="skGo">${L('Fast-forward', 'İleri al')}</button><button class="btn" id="skNo">${L('Cancel', 'Vazgeç')}</button></div>`, {
      onMount: c => {
        c.querySelector('#skNo').addEventListener('click', closeModal);
        c.querySelector('#skGo').addEventListener('click', () => { const s = +c.querySelector('input[name=skd]:checked').value, p = c.querySelector('input[name=skp]:checked').value, b = c.querySelector('input[name=skb]:checked').value; closeModal(); runSkip(s, p, b, L('Time skipped', 'Zaman atlandı')); });
      },
    });
  }
  function runSkip(sec, prof, buy, title) {
    skipping = true; const r = E.simulate(sec, prof, buy); skipping = false;
    viewA.resize(); viewB.resize(); save();
    const b = r.before, a = r.after;
    const rows = [[L('Time', 'Süre'), U.fmtTime(sec) + (r.capped ? L(` (only ${U.fmtTime(r.used)} counted)`, ` (yalnızca ${U.fmtTime(r.used)} sayıldı)`) : '')],
      [N(CUR.yards), '+' + U.fmt(Math.max(0, a.total - b.total))], [L('Hole', 'Delik'), `${b.n} → ${a.n}`], [N(CUR.stars), '+' + (a.stars - b.stars)],
      [N(CUR.data), '+' + U.fmt(a.data - b.data)], [N(CUR.medals), '+' + U.fmt(a.medals - b.medals)], [N(CUR.bags), '+' + (a.bags - b.bags) + (a.lost > b.lost ? L(` · rack full, ${a.lost - b.lost} lost`, ` · raf dolu, ${a.lost - b.lost} kayıp`) : '')],
      [L('Research levels', 'Araştırma seviyesi'), '+' + (a.res - b.res)], [L('Achievements', 'Başarımlar'), '+' + (a.ach - b.ach)]];
    const stuck = r.gate ? L(`Stuck at a wind gate: ${E.holeWind()} km/h vs wind control ${E.windControl()}.`, `Rüzgâr kapısında takıldı: ${E.holeWind()} km/s, rüzgâr kontrolü ${E.windControl()}.`) : r.locked ? L(`World locked: need ${E.world().stars}★, you have ${E.totalStars()}★.`, `Dünya kilitli: ${E.world().stars}★ gerekli, sende ${E.totalStars()}★.`) : '';
    modal(`<h3>${title}</h3><table class="sumtable">${rows.map(x => `<tr><td>${x[0]}</td><td>${x[1]}</td></tr>`).join('')}</table>${stuck ? `<p class="note gold">${stuck}</p>` : ''}
      <div class="btnrow"><button class="btn primary" id="sOk">${L('Continue', 'Devam')}</button>${E.get().meta.bags.length ? `<button class="btn gold" id="sBag">${L('Open bags', 'Çantaları aç')}</button>` : ''}</div>`, {
      onMount: c => { c.querySelector('#sOk').addEventListener('click', closeModal); const x = c.querySelector('#sBag'); x && x.addEventListener('click', () => { closeModal(); setTab('gear'); }); },
    });
  }

  // ---------- bags ----------
  const itemName = it => N(it.name);
  function statText(it, lv) {
    const st = itemStats(it, lv), p = [];
    if (st.power) p.push(`${L('Power', 'Güç')} +${Math.round(st.power * 100)}%`);
    if (st.tempo) p.push(`${L('Tempo', 'Tempo')} +${Math.round(st.tempo * 100)}%`);
    if (st.acc) p.push(`${L('Accuracy', 'İsabet')} +${st.acc}`);
    if (st.wc) p.push(`${L('Wind control', 'Rüzgâr kontrolü')} +${st.wc}`);
    return p.join(' · ');
  }
  function openBagUI(tierFilter) {
    const meta = E.get().meta, idx = tierFilter == null ? 0 : meta.bags.indexOf(tierFilter);
    if (idx < 0) return;
    const r = E.openBag(idx), def = BAGS[r.tier];
    const cards = r.items.map((x, i) => `<div class="icard" style="--rc:${RARITY[x.item.rar].col};animation-delay:${0.9 + i * 0.35}s">
      <div class="rn">${N(RARITY[x.item.rar])} · ${N(SLOTS[x.item.slot])}</div><div class="it">${itemName(x.item)}</div><div class="st">${statText(x.item, meta.equip.owned[x.item.id])}</div>
      <div class="nw">${x.isNew ? L('NEW · added to album', 'YENİ · albüme eklendi') : L(`Duplicate → +${x.dup} shards`, `Kopya → +${x.dup} parça`)}${x.equipped ? L(' · equipped', ' · takıldı') : ''}</div></div>`).join('');
    modal(`<h3>${N(def)}</h3><div class="reveal"><div class="bagicon2" style="--cc:${def.col}"><i></i><b></b></div></div>
      <div class="icards">${cards}</div><p class="note">+${r.shards} ${N(CUR.shards)} · ${L('Album', 'Albüm')} ${Object.keys(meta.equip.owned).length}/${ITEMS.length}</p>
      <div class="btnrow"><button class="btn primary" id="bOk">${L('Done', 'Tamam')}</button>${meta.bags.length ? `<button class="btn gold" id="bNext">${L('Open next', 'Sıradakini aç')} (${meta.bags.length})</button>` : ''}</div>`, {
      onMount: c => { c.querySelector('#bOk').addEventListener('click', () => { closeModal(); renderPanel(true); }); const n = c.querySelector('#bNext'); n && n.addEventListener('click', () => openBagUI()); },
    });
  }

  // ---------- panels ----------
  function buyBtn(key) {
    const S = E.get(), q = E.quote(key, S.settings.buyAmt), it = q.it;
    if (it.L >= it.max) return `<button class="buy" disabled>MAX</button>`;
    return `<button class="buy" data-act="buy" data-key="${key}" ${q.cost <= S.run.yards && q.n > 0 ? '' : 'disabled'}>${U.fmt(q.cost)}<small>+${q.n} ${L('lv', 'sv')}</small></button>`;
  }
  function upEffect(key, Lv) {
    switch (key) {
      case 'power': return L(`Your base distance <b>${U.fmt((5 + 2 * Lv) * E.msMult(Lv))}</b> → ${U.fmt((5 + 2 * (Lv + 1)) * E.msMult(Lv + 1))} yd · ×1.5 every 25 lv`, `Temel mesafen <b>${U.fmt((5 + 2 * Lv) * E.msMult(Lv))}</b> → ${U.fmt((5 + 2 * (Lv + 1)) * E.msMult(Lv + 1))} yd · her 25 sv'de ×1.5`);
      case 'timing': return L(`Helper perfect chance <b>${Math.round(E.pPerfect() * 100)}%</b> → ${Math.round(Math.min(0.5, 0.05 + 0.01 * (Lv + 1)) * 100)}%`, `Yardımcı mükemmel şansı <b>%${Math.round(E.pPerfect() * 100)}</b> → %${Math.round(Math.min(0.5, 0.05 + 0.01 * (Lv + 1)) * 100)}`);
      case 'accuracy': { const run = E.get().run, o0 = E.landingOdds(), w0 = E.windControl(); run.up.accuracy++; const o1 = E.landingOdds(), w1 = E.windControl(); run.up.accuracy--; return L(`+1 Accuracy: fairway <b>${Math.round(o0.fairway * 100)}%</b> → ${Math.round(o1.fairway * 100)}%, wind control ${w0} → ${w1}`, `+1 İsabet: fairway <b>%${Math.round(o0.fairway * 100)}</b> → %${Math.round(o1.fairway * 100)}, rüzgâr kontrolü ${w0} → ${w1}`); }
      case 'ball': return L(`Ball ×<b>${E.ballMult(Lv).toFixed(2)}</b> → ×${E.ballMult(Lv + 1).toFixed(2)} · ×1.5 every 10 lv`, `Top ×<b>${E.ballMult(Lv).toFixed(2)}</b> → ×${E.ballMult(Lv + 1).toFixed(2)} · her 10 sv'de ×1.5`);
      case 'stance': return L(`Manual streak cap ×<b>${(1 + 0.15 * Lv).toFixed(2)}</b> → ×${(1 + 0.15 * (Lv + 1)).toFixed(2)}`, `Elle seri tavanı ×<b>${(1 + 0.15 * Lv).toFixed(2)}</b> → ×${(1 + 0.15 * (Lv + 1)).toFixed(2)}`);
      case 'clubhouse': return L(`Offline cap <b>${4 + 2 * Lv} h</b> → ${4 + 2 * (Lv + 1)} h`, `Çevrimdışı tavanı <b>${4 + 2 * Lv} sa</b> → ${4 + 2 * (Lv + 1)} sa`);
    }
    return '';
  }
  function panelUp() {
    const S = E.get(), run = S.run, amt = S.settings.buyAmt;
    let h = `<div class="sec"><h3>${L('Your training (your own power)', 'Antrenmanın (kendi gücün)')} <span class="amt">${[1, 10, 100, 'max'].map(a => `<button data-act="amt" data-v="${a}" class="${amt === a ? 'on' : ''}">${a === 'max' ? 'Max' : '×' + a}</button>`).join('')}</span></h3>`;
    for (const key of ['power', 'accuracy', 'timing', 'ball', 'stance', 'clubhouse']) {
      const u = CFG.up[key], it = E.item(key);
      if (!it.ok) { h += `<div class="uprow locked"><span class="mini ico ico-${key}"></span><div><div class="nm">${N(u.name)}</div><div class="ef">${L(`Unlocks after hole ${u.unlock}`, `Delik ${u.unlock} bitince açılır`)}</div></div><button class="buy" disabled>${L('Locked', 'Kilitli')}</button></div>`; continue; }
      h += `<div class="uprow"><span class="mini ico ico-${key}"></span><div><div class="nm">${N(u.name)}<small>${L('lv', 'sv')} ${it.L}${it.max < 1000 ? '/' + it.max : ''}</small></div><div class="ef">${upEffect(key, it.L)}</div></div>${buyBtn(key)}</div>`;
    }
    h += `</div><div class="sec"><h3>${L('Helpers', 'Yardımcılar')}</h3>`;
    run.hitters.forEach((hh, i) => {
      const t = hh.type ? HELPER_TYPES[hh.type] : null;
      h += `<div class="uprow"><canvas class="mini" data-look="h${i}"></canvas><div><div class="nm">${L('Helper', 'Yardımcı')} ${i + 1}<small>${L('lv', 'sv')} ${hh.L}</small>${t ? `<span class="tag" style="background:${t.col};color:#fff">${N(t.short)} ${hh.rank}</span>` : `<span class="tag warn">${L('choose specialty', 'uzmanlık seç')}</span>`}</div>
        <div class="ef">${hh.L ? `${U.fmt(E.helperRate(hh))} ${L('swings/s', 'vuruş/sn')} · ${L('value', 'değer')} ×${E.helperValue(hh).toFixed(2)}` : L('Not swinging yet: buy 1 level', 'Henüz vurmuyor: 1 seviye al')}</div></div>${buyBtn('h' + i)}</div>`;
    });
    if (run.hitters.length < 10) { const r = RESEARCH[0], lv = E.res('slot'); h += `<div class="uprow locked"><span class="mini"></span><div><div class="nm">${L('Helper', 'Yardımcı')} ${run.hitters.length + 1}</div><div class="ef">${L('Research', 'Araştırma')}: ${costHtml(r.cost(lv))} · ${U.fmtTime(r.dur(lv))}</div></div><button class="buy" data-act="tab" data-v="res">${L('Research', 'Araştırma')}</button></div>`; }
    return h + `</div>`;
  }
  function meter(label, have, need, unit = '') {
    const ok = have >= need, k = Math.min(1, have / Math.max(1, need));
    return `<div class="meter ${ok ? 'ok' : 'bad'}"><div class="ml"><span>${label}</span><b>${have}${unit} / ${need}${unit}</b></div><div class="pbar"><i style="width:${(k * 100).toFixed(0)}%"></i></div></div>`;
  }
  function panelTeam() {
    const S = E.get(), run = S.run, meta = S.meta, pf = E.profile(), w = E.world();
    const gi = E.gateIdx(), nextGate = w.gates.find(g => g >= E.holeIn(run.n));
    let h = `<div class="sec"><h3>${L('You vs this hole', 'Sen ve bu delik')}</h3><div class="card">
      <div class="prof"><canvas class="mini big" data-look="p"></canvas><div class="kv">
        <span>${L('Power (training × ball × gear × research)', 'Güç (antrenman × top × ekipman × araştırma)')}</span><b>${U.fmt(pf.power)}</b>
        <span>${L('Accuracy', 'İsabet')}</span><b>${pf.acc}</b><span>${L('Wind control', 'Rüzgâr kontrolü')}</span><b>${pf.wc}</b><span>${L('Team tempo', 'Takım temposu')}</span><b>${U.fmt(pf.tempo)} ${L('swings/s', 'vuruş/sn')}</b></div></div>
      ${meter(L('Accuracy vs terrain', 'İsabet ve zemin'), pf.acc, pf.need)}
      ${meter(L(`Wind control vs ${N(w.windName).toLowerCase()} (this hole)`, `Rüzgâr kontrolü ve ${N(w.windName).toLowerCase()} (bu delik)`), pf.wc, E.holeWind(), '')}
      ${nextGate ? meter(L(`Next wind gate: hole ${nextGate}`, `Sıradaki rüzgâr kapısı: delik ${nextGate}`), pf.wc, E.holeWind((E.worldOf(run.n)) * WORLD_HOLES + nextGate)) : ''}</div></div>`;
    h += `<div class="sec"><h3>${L('Helpers', 'Yardımcılar')} <span>${cur('medals', meta.medals)}</span></h3>`;
    run.hitters.forEach((hh, i) => {
      h += `<div class="helper"><canvas class="mini" data-look="h${i}"></canvas><div class="hb"><div class="nm">${L('Helper', 'Yardımcı')} ${i + 1} <small>${L('lv', 'sv')} ${hh.L}</small></div>
        <div class="types">${Object.entries(HELPER_TYPES).map(([k, t]) => `<button class="tbtn ${hh.type === k ? 'on' : ''}" style="--tc:${t.col}" data-act="htype" data-i="${i}" data-v="${k}" title="${N(t.desc)}">${N(t.short)}</button>`).join('')}</div>
        <div class="ef">${hh.type ? N(HELPER_TYPES[hh.type].desc) : L('Choose a specialty (first choice is free).', 'Bir uzmanlık seç (ilk seçim ücretsiz).')}${hh.type ? ` ${L('Switching costs', 'Değiştirmek')} ${HELPER_SWITCH_COST} ${N(CUR.medals)}.` : ''}</div></div>
        ${hh.type ? (hh.rank >= HELPER_RANK_MAX ? '<span class="state">MAX</span>' : `<button class="buy" data-act="hrank" data-i="${i}" ${meta.medals >= helperRankCost(hh.rank) ? '' : 'disabled'}>${L('Rank', 'Kademe')} ${hh.rank + 1}<small>${helperRankCost(hh.rank)} ${CUR.medals.icon}</small></button>`) : ''}</div>`;
    });
    h += `</div><div class="sec"><h3>${L('Skills', 'Yetenekler')}</h3>`;
    for (const sk of SKILLS) {
      const lv = E.skill(sk.id);
      h += `<div class="node"><div><div class="nm">${N(sk.name)} <small>${lv}/${sk.max}</small></div><div class="ds">${lv ? sk.desc(lv) : L('Not learned yet.', 'Henüz öğrenilmedi.') + ' ' + sk.desc(1)}</div></div>
        ${lv >= sk.max ? '<span class="state">MAX</span>' : `<button class="buy" data-act="skill" data-v="${sk.id}" ${meta.medals >= skillCost(lv) ? '' : 'disabled'}>${lv ? L('Upgrade', 'Geliştir') : L('Learn', 'Öğren')}<small>${skillCost(lv)} ${CUR.medals.icon}</small></button>`}</div>`;
    }
    return h + `</div>`;
  }
  function panelRes() {
    const S = E.get(), meta = S.meta, A = meta.res;
    let h = `<div class="sec"><h3>${L('Lab', 'Laboratuvar')} <span>${A.q.length}/${E.resSlots()} · ${cur('data', meta.data)} ${cur('shards', meta.shards)} ${cur('medals', meta.medals)}</span></h3>`;
    if (A.q.length) for (const q of A.q) { const r = RESEARCH.find(x => x.id === q.id), left = q.end - meta.gt; h += `<div class="card"><b>${N(r.name)} ${E.res(r.id) + 1}</b><div class="pbar"><i style="width:${((1 - left / q.dur) * 100).toFixed(1)}%"></i></div><p class="note">${L('Time left', 'Kalan')} <b>${U.fmtTime(left)}</b></p></div>`; }
    else h += `<p class="note">${L('Lab is empty.', 'Laboratuvar boş.')}</p>`;
    h += `</div>`;
    const brs = []; RESEARCH.forEach(r => { if (!brs.includes(N(r.br))) brs.push(N(r.br)); });
    for (const br of brs) {
      h += `<div class="sec"><h3>${br}</h3>`;
      for (const r of RESEARCH.filter(x => N(x.br) === br)) {
        const lv = E.res(r.id), st = E.resState(r), c = r.cost(lv);
        if (r.rar && st === 'locked' && r.req && !E.res(r.req) && E.resState(RESEARCH.find(x => x.id === r.req)) === 'locked') continue;
        const pips = r.max > 1 ? `<span class="pips">${Array.from({ length: Math.min(r.max, 15) }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span>` : '';
        const btn = st === 'max' ? `<span class="state">${L('Done', 'Tamam')}</span>` : st === 'running' ? `<span class="state">${L('Running', 'Sürüyor')}</span>` : st === 'locked' ? `<span class="state muted">${L('Locked', 'Kilitli')}</span>`
          : `<button class="buy" data-act="research" data-v="${r.id}" ${A.q.length >= E.resSlots() || !E.canPay(c) ? 'disabled' : ''}>${costHtml(c)}<small>${U.fmtTime(r.dur(lv))}</small></button>`;
        h += `<div class="node ${st === 'max' ? 'done' : ''}" ${r.rar ? `style="border-left:5px solid ${RARITY[r.rar].col}"` : ''}><div><div class="nm">${N(r.name)} <small>${lv}/${r.max}</small></div>${pips}<div class="ds">${r.desc(lv)}</div></div>${btn}</div>`;
      }
      h += `</div>`;
    }
    return h;
  }
  function panelGear() {
    const S = E.get(), meta = S.meta, maxR = E.unlockedRarities();
    const counts = [0, 0, 0, 0, 0]; meta.bags.forEach(t => counts[t]++);
    let h = `<div class="sec"><h3>${N(CUR.bags)} <span>${meta.bags.length}/${E.bagCap()}</span></h3><div class="bags">${BAGS.map((b, t) => `<button class="bagbtn" style="--cc:${b.col}" data-act="bag" data-v="${t}" ${counts[t] ? '' : 'disabled'}><span class="bagicon2 small" style="--cc:${b.col}"><i></i><b></b></span><b>${N(b)}</b><small>×${counts[t]} · ${b.items} ${L('items', 'parça')}</small></button>`).join('')}</div></div>`;
    const w = E.rarityWeights(0), tw = w.reduce((a, b) => a + b, 0), w2 = E.rarityWeights(2), tw2 = w2.reduce((a, b) => a + b, 0);
    h += `<div class="sec"><h3>${L('Rarity odds per item', 'Parça başına nadirlik olasılığı')} <span>${L('Bronze / Gold bag', 'Bronz / Altın çanta')}</span></h3><div class="rtable">${RARITY.map((r, i) => `<div class="${i > maxR ? 'locked' : ''}" style="--rc:${r.col}"><b>${N(r)}</b><span>${i > maxR ? L('research', 'araştır') : (w[i] / tw * 100).toFixed(i > 4 ? 2 : 1) + '%'}</span><span>${i > maxR ? '' : (w2[i] / tw2 * 100).toFixed(i > 4 ? 2 : 1) + '%'}</span></div>`).join('')}</div></div>`;
    h += `<div class="sec"><h3>${L('Equipped', 'Takılı')} <span>${cur('shards', meta.shards)} · ${L('power', 'güç')} ×${E.gearSum().mult.toFixed(2)}</span></h3><div class="eqgrid">`;
    for (const slot in SLOTS) {
      const id = meta.equip.on[slot];
      if (!id) { h += `<div class="eq"><div class="sl">${N(SLOTS[slot])}</div><div class="in muted">${L('Empty', 'Boş')}</div></div>`; continue; }
      const it = E.itemById(id), lv = meta.equip.owned[id], cap = levelCap(it), c = upgradeShards(it, lv);
      h += `<div class="eq" style="--rc:${RARITY[it.rar].col}"><div class="sl">${N(SLOTS[slot])} · ${N(RARITY[it.rar])} · ${L('lv', 'sv')} ${lv}/${cap}</div><div class="in">${itemName(it)}</div><div class="st">${statText(it, lv)}</div>
        ${lv < cap ? `<button class="btn mini-btn" data-act="upg" data-v="${id}" ${meta.shards >= c ? '' : 'disabled'}>${L('Upgrade', 'Geliştir')} · ${c} ◆</button>` : '<span class="state">MAX</span>'}</div>`;
    }
    h += `</div></div>`;
    const owned = Object.keys(meta.equip.owned).length;
    h += `<div class="sec"><h3>${L('Album', 'Albüm')} <span>${owned}/${ITEMS.length}</span></h3><div class="pbar"><i style="width:${owned / ITEMS.length * 100}%"></i></div><div class="album10">`;
    for (const slot in SLOTS) {
      h += `<div class="lbl">${N(SLOTS[slot])}</div>`;
      for (const it of ITEMS.filter(i => i.slot === slot)) {
        const lv = meta.equip.owned[it.id], fresh = lv && meta.equip.seen[it.id] === false;
        h += lv ? `<button class="${meta.equip.on[slot] === it.id ? 'on' : ''}" style="--rc:${RARITY[it.rar].col}" data-act="equip" data-v="${it.id}" title="${itemName(it)} · ${statText(it, lv)}"><span>${itemName(it)}</span><small>${L('lv', 'sv')} ${lv}</small>${fresh ? `<em>${L('NEW', 'YENİ')}</em>` : ''}</button>`
          : `<button class="miss" style="--rc:${RARITY[it.rar].col}" disabled title="${N(RARITY[it.rar])}"><span>?</span><small>${N(RARITY[it.rar])}</small></button>`;
      }
    }
    return h + `</div></div>`;
  }
  function panelLook() {
    const S = E.get(), meta = S.meta, look = meta.looks[lookSel];
    const who = [['p', L('You', 'Sen')]].concat(S.run.hitters.map((_, i) => ['h' + i, L('Helper ', 'Yardımcı ') + (i + 1)]));
    const wi = lookWorld < 0 ? E.worldOf(S.run.n) : lookWorld;
    let h = `<div class="sec"><h3>${L('Who are you dressing?', 'Kimi giydiriyorsun?')}</h3><div class="opts">${who.map(([k, l]) => `<button class="pill ${k === lookSel ? 'on' : ''}" data-act="lookSel" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="opts">${WORLDS.map((w, i) => `<button class="pill small ${i === wi ? 'on' : ''}" data-act="lookWorld" data-v="${i}">${N(w.name)}</button>`).join('')}</div>
      <canvas id="lookPreview" class="lookprev"></canvas>
      <label class="note"><input type="checkbox" data-act="worldOutfit" ${meta.worldOutfit ? 'checked' : ''}> ${L('Wear the world outfit automatically (space and heat suits are always on)', 'Dünya kıyafetini otomatik giy (uzay ve ısı giysisi her zaman giyilir)')}</label>
      <p class="note">${WORLDS[wi].suit ? L('Outfit here: ', 'Buradaki kıyafet: ') + N(WORLD_OUTFIT[WORLDS[wi].suit]) : L('No special outfit in this world.', 'Bu dünyada özel kıyafet yok.')}</p></div>`;
    for (const [cat, en, trn] of [['skin', 'Skin', 'Ten'], ['shirt', 'Shirt', 'Tişört'], ['pants', 'Pants', 'Pantolon'], ['hat', 'Hat', 'Şapka'], ['hatColor', 'Hat color', 'Şapka rengi'], ['club', 'Club finish', 'Sopa kaplaması']]) {
      h += `<div class="sec"><h3>${L(en, trn)}</h3><div class="swatches">`;
      for (const [val, name, req] of LOOKS[cat]) {
        const ok = E.lookUnlocked(cat, val), on = look[cat] === val;
        const bg = /^#/.test(val) ? val : { gold: 'linear-gradient(135deg,#fff1a8,#d9a521)', argyle: 'repeating-linear-gradient(45deg,#2f64d6 0 6px,#f0c419 6px 9px)', plaid: 'repeating-linear-gradient(0deg,#8a2b2b 0 5px,#e0c070 5px 7px)', carbon: 'repeating-linear-gradient(45deg,#333 0 3px,#555 3px 6px)', chrome: '#c9ced6', black: '#2b2f36' }[val] || '#e8efe7';
        h += `<button class="sw-btn ${on ? 'on' : ''}" data-act="look" data-cat="${cat}" data-v="${val}" ${ok ? '' : 'disabled'}><span style="background:${bg}"></span><small>${ok ? N(name) : '🔒 ' + N(UNLOCKS[req][0])}</small></button>`;
      }
      h += `</div></div>`;
    }
    if (lookSel === 'p') h += `<div class="sec"><h3>${L('Ball trail', 'Top izi')}</h3><div class="swatches">${LOOKS.trail.map(([val, name, req]) => { const ok = E.lookUnlocked('trail', val); const bg = { white: '#fff', gold: '#ffd75a', fire: 'linear-gradient(90deg,#ffb020,#e0301e)', rainbow: 'linear-gradient(90deg,red,orange,yellow,green,blue,violet)' }[val]; return `<button class="sw-btn ${meta.trail === val ? 'on' : ''}" data-act="trail" data-v="${val}" ${ok ? '' : 'disabled'}><span style="background:${bg}"></span><small>${ok ? N(name) : '🔒 ' + N(UNLOCKS[req][0])}</small></button>`; }).join('')}</div></div>`;
    return h;
  }
  function panelWorlds() {
    const S = E.get(), run = S.run, wi = E.worldOf(run.n), done = E.holeIn(run.n) - 1, next = WORLDS[wi + 1], have = E.totalStars();
    let h = `<div class="sec"><h3>${N(WORLDS[wi].name)} <span>${done}/24</span></h3><div class="pbar big"><i style="width:${(done / 24 * 100).toFixed(0)}%"></i></div>
      ${next ? `<div class="starneed"><b>${have} / ${next.stars} ★</b><span>${L('to open', 'açmak için')} ${N(next.name)}</span></div><div class="pbar big gold"><i style="width:${Math.min(100, have / next.stars * 100).toFixed(0)}%"></i></div>` : ''}
      <p class="note">${L('Stars only go up: putt well, and staying long on a hole pays bonus ★.', 'Yıldız hep artar: iyi putt at; bir delikte uzun kalmak bonus ★ verir.')}</p></div>`;
    h += `<div class="sec"><h3>${L('Worlds', 'Dünyalar')}</h3><div class="worlds">`;
    WORLDS.forEach((w, i) => {
      const state = i < wi ? 'done' : i === wi ? 'cur' : have >= w.stars ? 'ready' : 'locked';
      h += `<div class="world ${state}" style="--w1:${w.sky[0]};--w2:${w.grass[0]}"><div class="wbg"></div><div class="wtx"><b>${i + 1}. ${N(w.name)}</b>
        <span>${N(w.windName)} ${w.wind}–${w.wind + w.step * w.gates.length} km/h${w.heat < 1 ? ' · ' + L('heat', 'sıcak') : ''}${w.gravity < 1 ? ' · ' + w.gravity + 'g' : ''}</span></div>
        <em>${state === 'done' ? '🏆' : state === 'cur' ? L('HERE', 'BURADASIN') : state === 'ready' ? L('READY', 'HAZIR') : '🔒 ' + w.stars + '★'}</em></div>`;
    });
    return h + `</div></div>`;
  }
  function panelCompete() {
    const S = E.get(), meta = S.meta, dh = Tour.dailyHole(meta.daily.day), lg = E.league(E.tourG()), open = S.run.n > 9;
    const ready = E.dailyReady(), idx = meta.rewards.idx % DAILY.length;
    let h = `<div class="sec"><h3>${L('Daily rewards', 'Günlük ödüller')}</h3><div class="daily">${DAILY.map((d, i) => `<div class="${i < idx ? 'got' : i === idx ? 'next' : ''}"><b>${L('Day', 'Gün')} ${i + 1}</b><small>${E.rewardText(d)}</small></div>`).join('')}</div>
      <button class="btn gold" data-act="claimDaily" ${ready ? '' : 'disabled'}>${ready ? L('Claim', 'Al') : L('Tomorrow', 'Yarın')}</button></div>`;
    h += `<div class="sec"><h3>${L('Daily hole', 'Günlük delik')} <span>${meta.daily.tries}/3 · ${L('best', 'en iyi')} ${meta.daily.best == null ? '—' : fmtRel(meta.daily.best)}</span></h3>
      <button class="btn primary big-btn" data-act="daily" ${meta.daily.tries >= 3 ? 'disabled' : ''}>${L('Play', 'Oyna')} · Par ${dh.par} · ${dh.len} yd</button></div>`;
    h += `<div class="sec"><h3>${L('Weekly tournament', 'Haftalık turnuva')} <span>${lg.name} · ${meta.tour.tries}/3 · ${L('best', 'en iyi')} ${meta.tour.best == null ? '—' : fmtRel(meta.tour.best)}</span></h3>
      <button class="btn gold big-btn" data-act="tour" ${!open || meta.tour.tries >= 3 ? 'disabled' : ''}>${open ? L('Play 9 holes', '9 delik oyna') : L('Opens after hole 9', 'Delik 9\'dan sonra')}</button>
      <button class="btn" data-act="practice">${L('Practice', 'Antrenman')}</button></div>`;
    return h;
  }
  function panelAwards() {
    const meta = E.get().meta, n = E.achCount();
    let h = `<div class="sec"><h3>${L('Achievements', 'Başarımlar')} <span>${n}/${ACH.length} · +${Math.min(10, Math.floor(n / 10))}% ${L('distance', 'mesafe')}</span></h3><div class="achs">`;
    for (const a of ACH) { const d = !!meta.ach[a.id]; h += `<div class="ach ${d ? 'done' : ''}"><b>${d ? '🏆' : '·'}</b><div><span>${N(a.name)}</span><small>${E.rewardText(a.reward)}</small></div></div>`; }
    return h + `</div></div>`;
  }
  function panelDev() {
    const S = E.get(), run = S.run;
    let h = `<div class="sec"><h3>${L('Distance per helper swing', 'Yardımcı vuruşu başına mesafe')}</h3><div class="kv">
      <span>${L('Power base', 'Güç tabanı')}</span><b>${U.fmt(E.powerBase())}</b><span>${L('Lie', 'Zemin')} (${N(TERRAIN[E.curLie()])})</span><b>×${E.lieMult().toFixed(2)}</b>
      <span>${L('Ball', 'Top')}</span><b>×${E.ballMult(run.up.ball).toFixed(2)}</b><span>${L('Hole multiplier', 'Delik çarpanı')}</span><b>×${U.fmt(E.holeMult())}</b>
      <span>${L('Wind', 'Rüzgâr')}</span><b>×${E.windMul().toFixed(2)}</b>${E.metaParts().map(([k, v]) => `<span>${k}</span><b>×${v.toFixed(2)}</b>`).join('')}
      <span><b>=</b></span><b>${U.fmt(E.swingDist())} yd</b><span>${L('Auto income', 'Otomatik gelir')}</span><b>${U.fmt(E.autoIncome())}/s</b></div></div>`;
    const P = [['tauMan', 'τ_man'], ['manualPower', L('Manual power', 'Elle güç')], ['holeGrowth2', L('Hole growth after 18', '18 sonrası delik büyümesi')], ['trophyMult', L('World trophy', 'Dünya kupası')], ['autoPutts', L('Auto putts', 'Otomatik putt')], ['offlineEff', L('Offline efficiency', 'Çevrimdışı verim')], ['goldMin', L('Golden ball min (s)', 'Altın top en erken (sn)')]];
    h += `<div class="sec"><h3>${L('Tuning', 'Ayar')}</h3><div class="tune">${P.map(([k, l]) => `<label for="cfg-${k}">${l}</label><input id="cfg-${k}" type="number" step="any" data-cfg="${k}" value="${CFG[k]}">`).join('')}</div></div>`;
    h += `<div class="sec"><h3>${L('Test tools', 'Test araçları')}</h3><label class="note"><input type="checkbox" data-act="autoAll" ${S.settings.autoAll ? 'checked' : ''}> ${L('Auto-buy upgrades while playing', 'Oynarken yükseltmeleri otomatik al')}</label>
      <div class="btnrow"><button class="btn" data-act="gold">${L('Golden ball', 'Altın top')}</button><button class="btn" data-act="cash">+100 D/◆/M</button><button class="btn" data-act="bags5">+5 ${L('bags', 'çanta')}</button><button class="btn" data-act="stars">+20 ★</button><button class="btn danger" data-act="reset">${L('Reset save', 'Kaydı sıfırla')}</button></div>
      <p class="note">${L('Jump to a world (sets a plausible build):', 'Bir dünyaya atla (makul bir seviye kurar):')}</p><div class="opts">${WORLDS.map((w, i) => `<button class="pill small" data-act="tele" data-v="${i}">${i + 1}. ${N(w.name)}</button>`).join('')}</div></div>`;
    return h;
  }
  const PANELS = { up: panelUp, team: panelTeam, res: panelRes, gear: panelGear, look: panelLook, worlds: panelWorlds, compete: panelCompete, awards: panelAwards, dev: panelDev };
  function renderPanel(force) {
    const html = PANELS[tab](), body = $('tabBody');
    if (!force && html === lastPanel) return;
    if (!force && body.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
    const sc = body.scrollTop; body.innerHTML = html; lastPanel = html; body.scrollTop = sc;
    document.querySelectorAll('canvas.mini[data-look]').forEach(cv => {
      const k = cv.dataset.look, big = cv.classList.contains('big'), ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1, w = big ? 60 : 34, h = big ? 72 : 40;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      Art.golfer(ctx, w * 0.44, h - 2, big ? 0.95 : 0.52, Art.dress(E.get().meta.looks[k], E.world(), E.get().meta.worldOutfit), -1);
    });
  }
  function setTab(t) {
    tab = t;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    if (t === 'gear') setTimeout(() => { const m = E.get().meta.equip.seen; for (const k in m) m[k] = true; }, 3000);
    renderPanel(true); $('tabBody').scrollTop = 0;
  }
  let resetArm = 0;
  function onAct(btn) {
    const S = E.get(), a = btn.dataset.act, v = btn.dataset.v;
    switch (a) {
      case 'buy': E.buy(btn.dataset.key, S.settings.buyAmt); break;
      case 'amt': S.settings.buyAmt = v === 'max' ? 'max' : +v; break;
      case 'tab': setTab(v); return;
      case 'bag': openBagUI(+v); break;
      case 'equip': E.equip(v); break;
      case 'upg': if (E.upgradeItem(v)) toast(L('Item upgraded', 'Ekipman geliştirildi'), 'blue'); break;
      case 'research': if (E.startResearch(v)) toast(L('Research started', 'Araştırma başladı'), 'blue'); break;
      case 'htype': if (!E.setHelperType(+btn.dataset.i, v)) toast(L(`Switching needs ${HELPER_SWITCH_COST} Medals`, `Değiştirmek için ${HELPER_SWITCH_COST} Madalya gerekir`), 'red'); else Stage.sync(); break;
      case 'hrank': E.rankHelper(+btn.dataset.i); break;
      case 'skill': E.upgradeSkill(v); break;
      case 'lookSel': lookSel = v; break;
      case 'lookWorld': lookWorld = +v; break;
      case 'look': S.meta.looks[lookSel][btn.dataset.cat] = v; break;
      case 'worldOutfit': S.meta.worldOutfit = btn.checked; break;
      case 'trail': S.meta.trail = v; break;
      case 'claimDaily': { const rw = E.claimDaily(); if (rw) { toast(L('Daily reward: ', 'Günlük ödül: ') + E.rewardText(rw), 'gold'); ping('sBagBtn'); } break; }
      case 'daily': Tour.start('daily'); break;
      case 'practice': Tour.start('practice'); break;
      case 'tour': Tour.start('tour'); break;
      case 'gold': Stage.spawnGold(); break;
      case 'cash': S.meta.data += 100; S.meta.shards += 100; S.meta.medals += 100; break;
      case 'bags5': [0, 1, 2, 3, 4].forEach(t => E.addBag(t)); break;
      case 'stars': for (let n = 1, k = 0; k < 20 && n < S.run.n; n++) if ((S.meta.stars[n] || 0) < 3) { S.meta.stars[n] = (S.meta.stars[n] || 0) + 1; k++; } E.checkWorldLock(); break;
      case 'tele': E.teleport(+v); viewA.resize(); viewB.resize(); break;
      case 'autoAll': S.settings.autoAll = btn.checked; break;
      case 'reset':
        if (Date.now() - resetArm < 4000) { try { localStorage.removeItem(KEY); } catch (e) { } const lang = S.settings.lang; E.fresh(); E.get().settings.lang = lang; Stage.sync(); setView('side'); resetArm = 0; toast(L('Save reset', 'Kayıt sıfırlandı'), 'red'); }
        else { resetArm = Date.now(); toast(L('Press again within 4 s to reset', 'Sıfırlamak için 4 sn içinde tekrar bas'), 'red'); return; }
        break;
    }
    renderPanel(true);
  }
  function refreshAll() { renderPanel(true); }

  // ---------- coach: finds the biggest bottleneck and says the one thing to do next ----------
  const upName = k => k[0] === 'h' && /^h\d+$/.test(k) ? L('Helper ', 'Yardımcı ') + (+k.slice(1) + 1) : N(CFG.up[k].name);
  function coachTip() {
    const S = E.get(), run = S.run, meta = S.meta, w = E.world();
    const resOpen = id => { const r = RESEARCH.find(x => x.id === id); return r && E.resState(r) === 'open' && meta.res.q.length < E.resSlots() && E.canPay(r.cost(E.res(id))); };
    if (run.locked) return { c: 'sam', t: L(`${w.stars - E.totalStars()} more ★ to open ${N(w.name)}. Staying on a hole pays bonus ★ (20 and 60 min); one-putts earn more.`, `${N(w.name)} için ${w.stars - E.totalStars()} ★ daha lazım. Bir delikte kalmak bonus ★ verir (20 ve 60 dk); tek putt daha çok kazandırır.`), go: 'worlds' };
    if (E.gateBlocked()) {
      const gap = E.holeWind() - E.windControl();
      const fix = resOpen('windr') ? [L('Research Wind reading (+6)', 'Rüzgâr okuma araştır (+6)'), 'res']
        : E.quote('accuracy', 1).cost <= run.yards ? [L('Buy Accuracy training', 'İsabet antrenmanı al'), 'buy:accuracy']
        : run.hitters.some(h => !h.type) || (meta.medals >= HELPER_SWITCH_COST && !run.hitters.some(h => h.type === 'acc')) ? [L('Make a helper Accurate', 'Bir yardımcıyı İsabetli yap'), 'team']
        : meta.bags.length ? [L('Open bags for grips and balls', 'Sap ve top için çanta aç'), 'gear'] : [L('Collect Data and Medals in Compete', 'Yarış\'ta Veri ve Madalya topla'), 'compete'];
      return { c: 'ada', t: L(`Wind gate: you need ${gap} more wind control. ${fix[0]}.`, `Rüzgâr kapısı: ${gap} rüzgâr kontrolü daha lazım. ${fix[0]}.`), go: fix[1] };
    }
    if (E.dailyReady()) return { c: 'iris', t: L('Your daily reward is ready.', 'Günlük ödülün hazır.'), go: 'compete' };
    const idle = run.hitters.findIndex(h => !h.type);
    if (idle >= 0) return { c: 'sam', t: L(`Pick a specialty for Helper ${idle + 1}: Power, Accuracy or Tempo.`, `Yardımcı ${idle + 1} için uzmanlık seç: Güç, İsabet ya da Tempo.`), go: 'team' };
    if (meta.bags.length) return { c: 'iris', t: L(`You have ${meta.bags.length} unopened gear bag${meta.bags.length > 1 ? 's' : ''}.`, `${meta.bags.length} açılmamış çantan var.`), go: 'gear' };
    if (E.windMul() < 0.8) return { c: 'ada', t: L(`Wind costs you ${Math.round((1 - E.windMul()) * 100)}% of your distance. Raise wind control.`, `Rüzgâr mesafenin %${Math.round((1 - E.windMul()) * 100)}'ini götürüyor. Rüzgâr kontrolünü artır.`), go: 'team' };
    if (E.heatF() < 0.9 && resOpen('cool')) return { c: 'iris', t: L('Heat slows your helpers. Research Cooling.', 'Sıcak yardımcılarını yavaşlatıyor. Soğutma araştır.'), go: 'res' };
    if (E.expLie() < 0.8) return { c: 'ada', t: L(`Bad lies cost you ${Math.round((1 - E.expLie()) * 100)}%. Train Accuracy.`, `Kötü zemin %${Math.round((1 - E.expLie()) * 100)} kaybettiriyor. İsabet çalış.`), go: 'buy:accuracy' };
    const firstFree = RESEARCH.find(r => resOpen(r.id));
    if (firstFree && !meta.res.q.length) return { c: 'iris', t: L(`The lab is idle. Start ${N(firstFree.name)}.`, `Laboratuvar boşta. ${N(firstFree.name)} başlat.`), go: 'res' };
    const rankable = run.hitters.findIndex(h => h.type && h.rank < HELPER_RANK_MAX && meta.medals >= helperRankCost(h.rank));
    if (rankable >= 0) return { c: 'sam', t: L(`You can train Helper ${rankable + 1} to rank ${run.hitters[rankable].rank + 1}.`, `Yardımcı ${rankable + 1}'i ${run.hitters[rankable].rank + 1}. kademeye çıkarabilirsin.`), go: 'team' };
    const b = E.bestUpgrade();
    if (b) {
      const pct = Math.max(1, Math.round(b.gainPct * 100)), wait = (b.cost - run.yards) / Math.max(1e-9, E.autoIncome());
      return { c: 'bruno', t: b.ok ? L(`Best buy now: ${upName(b.key)} (+${pct}% income).`, `Şu an en iyi alım: ${upName(b.key)} (+%${pct} gelir).`) : L(`Save for ${upName(b.key)} (+${pct}%) in ${U.fmtTime(wait)}.`, `${upName(b.key)} için biriktir (+%${pct}), ${U.fmtTime(wait)} sonra.`), go: b.ok ? 'buy:' + b.key : 'up' };
    }
    return null;
  }
  let lastCoach = '';
  function renderCoach() {
    const tip = coachTip(), el = $('coach');
    if (!tip) { el.hidden = true; return; }
    el.hidden = false;
    const key = tip.c + tip.t + tip.go;
    if (key === lastCoach) return;
    lastCoach = key;
    const co = COACHES[tip.c], btn = tip.go.startsWith('buy:') ? L('Buy', 'Al') : L('Go', 'Git');
    el.innerHTML = `<canvas class="face" width="88" height="88"></canvas><div><b>${co.name}</b><span>${tip.t}</span></div><button class="btn gold mini-btn" data-coach="${tip.go}">${btn}</button>`;
    const cv = el.querySelector('canvas'), ctx = cv.getContext('2d');
    ctx.fillStyle = co.look.shirt; ctx.beginPath(); ctx.arc(44, 44, 44, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(44, 44, 42, 0, Math.PI * 2); ctx.clip();
    Art.golfer(ctx, 29, 44 + 57 * 2.1, 2.1, Object.assign({ pants: '#2a2f3a', club: 'chrome' }, co.look), -1);
    ctx.restore();
  }

  // ---------- HUD ----------
  function hud() {
    const S = E.get(), run = S.run, meta = S.meta, rates = shareRates(), w = E.world();
    const inc = Math.max(E.autoIncome(), rates.total);
    $('sYards').textContent = U.fmt(run.yards); $('sIncome').textContent = U.fmt(inc); $('sStars').textContent = E.totalStars();
    $('sData').textContent = U.fmt(meta.data); $('sShards').textContent = U.fmt(meta.shards); $('sMedals').textContent = U.fmt(meta.medals); $('sBags').textContent = meta.bags.length;
    $('clock').textContent = `${L('Day', 'Gün')} ${E.dayIndex() - Math.floor(meta.epoch / 86400) + 1} · ${U.fmtClock(meta.gt)}`;
    $('worldName').textContent = `${L('World', 'Dünya')} ${E.worldOf(run.n) + 1} · ${N(w.name)}`;
    const len = E.holeLen(run.n), par = E.parOf(run.n), S2 = E.segCount(run.n);
    $('holeTitle').innerHTML = `${L('Hole', 'Delik')} <em>${E.holeIn(run.n)}</em>/24 · Par ${par}${E.gateIdx() >= 0 ? ` <span class="gatetag">${L('WIND GATE', 'RÜZGÂR KAPISI')}</span>` : ''}`;
    $('holeMeta').innerHTML = `${L('Strokes', 'Vuruş')} <b>${run.shot.strokes}</b> · ${E.greenPhase() ? L('on the green', 'yeşilde') : L(`shot ${Math.min(run.shot.k + 1, S2)} of ${S2} to the green`, `yeşile ${S2} vuruştan ${Math.min(run.shot.k + 1, S2)}.`)} · ${U.fmt(len)} yd · ⏱ ${U.fmtTime(run.holeTime)}${E.patienceNext() != null ? L(` (+★ in ${U.fmtTime(E.patienceNext())})`, ` (+★ ${U.fmtTime(E.patienceNext())} sonra)`) : ''}`;
    let strip = ''; const first = E.worldOf(run.n) * WORLD_HOLES + 1;
    for (let n = first; n < first + WORLD_HOLES; n++) { const st = meta.stars[n], gate = w.gates.includes(n - first + 1); strip += `<div class="${n === run.n ? 'cur' : n < run.n ? 'past' : ''} ${gate ? 'gate' : ''}"><span>${n - first + 1}</span><b>${n < run.n ? '★'.repeat(st || 0) + '<i>' + '★'.repeat(3 - (st || 0)) + '</i>' : E.parOf(n)}</b></div>`; }
    if ($('courseStrip').dataset.h !== strip) { $('courseStrip').innerHTML = strip; $('courseStrip').dataset.h = strip; }
    const p = Math.min(1, run.prog / len);
    $('pfill').style.width = (p * 100).toFixed(2) + '%';
    let marks = ''; for (let k = 1; k < S2; k++) marks += `<i style="left:${(90 * k / S2).toFixed(1)}%"></i>`;
    if ($('pmarks').dataset.h !== marks) { $('pmarks').innerHTML = marks; $('pmarks').dataset.h = marks; }
    $('pText').textContent = `${U.fmt(run.prog)} / ${U.fmt(len)} yd`;
    // requirement line
    const wind = E.wind(), wc = E.windControl(), blocked = E.gateBlocked();
    let req;
    if (run.locked) req = `<b class="bad">${L('World locked', 'Dünya kilitli')}:</b> ${L(`need ${w.stars} ★, you have ${E.totalStars()} ★. Replay putts in the Worlds tab.`, `${w.stars} ★ gerekli, sende ${E.totalStars()} ★. Dünyalar sekmesinde putt tekrar oyna.`)} <button class="btn mini-btn" data-go="worlds">${L('Worlds', 'Dünyalar')}</button>`;
    else if (blocked) req = `<b class="bad">${L('Wind gate', 'Rüzgâr kapısı')}:</b> ${N(w.windName)} ${E.holeWind()} km/h · ${L('your wind control', 'rüzgâr kontrolün')} ${wc}. ${L('Raise Accuracy, research Wind reading, hire Accurate helpers or equip grips/balls.', 'İsabeti artır, Rüzgâr okuma araştır, İsabetli yardımcı tut ya da sap/top tak.')} <button class="btn mini-btn" data-go="team">${L('Team', 'Takım')}</button>`;
    else req = `${N(w.windName)} <b>${wind.kmh} km/h</b> (${{ calm: L('calm', 'sakin'), head: L('headwind', 'karşıdan'), tail: L('tailwind', 'arkadan') }[wind.kind]}) · ${L('wind control', 'rüzgâr kontrolü')} <b class="${wc >= wind.kmh ? 'good' : 'bad'}">${wc}</b> → ×${E.windMul().toFixed(2)}${E.shieldOn() ? ' · ' + L('shield on', 'kalkan açık') : ''}${E.heatF() < 1 ? ` · ${L('heat', 'sıcak')} ×${E.heatF().toFixed(2)}` : ''}`;
    if ($('reqLine').dataset.h !== req) { $('reqLine').innerHTML = req; $('reqLine').dataset.h = req; $('reqLine').className = 'reqline' + (blocked || run.locked ? ' alert' : ''); }
    if (blocked && !wasBlocked) Stage.banner(L('WIND GATE', 'RÜZGÂR KAPISI'), L(`${E.holeWind()} km/h · you have ${wc} wind control`, `${E.holeWind()} km/s · rüzgâr kontrolün ${wc}`), '#ff9a8a', 3);
    wasBlocked = blocked;
    $('pEta').textContent = run.locked ? '' : blocked ? L('Blocked by the wind', 'Rüzgâr geçit vermiyor') : E.greenPhase() ? (run.prog >= len ? L(`On the green · ${Math.max(0, Math.ceil(CFG.greenGrace - run.greenWait))}s until 2 putts`, `Yeşilde · ${Math.max(0, Math.ceil(CFG.greenGrace - run.greenWait))} sn sonra 2 putt`) : L('Green: play the putt', 'Yeşil: putt oyna')) : (eta => eta > 86400 * 3 ? L('Very slow here: follow the coach tip', 'Burada çok yavaş: koçun ipucuna bak') : L(`Next shot in ~${U.fmtTime(eta)}`, `Sonraki vuruşa ~${U.fmtTime(eta)}`))((E.segBoundary(run.shot.k + 1) - run.prog) / Math.max(1e-9, inc) / Math.max(1, speed));
    const lie = E.curLie(), tm = E.terrainMult(lie), o = E.landingOdds();
    $('lieV').innerHTML = `<span class="${tm < 0.95 ? 'bad' : 'good'}">${N(TERRAIN[lie])} ×${tm.toFixed(2)}</span> <small>${L('Accuracy', 'İsabet')} ${E.accuracy()} / ${L('terrain', 'zemin')} ${E.terrainDiff()}</small>`;
    $('lieOdds').innerHTML = ['fairway', 'rough', 'bunker', 'water'].filter(k => o[k] > 0).map(k => `<i style="flex:${o[k]};background:${TERRAIN_COL[k]}" title="${N(TERRAIN[k])} ${Math.round(o[k] * 100)}%">${o[k] > 0.08 ? N(TERRAIN[k]) + ' ' + Math.round(o[k] * 100) + '%' : ''}</i>`).join('');
    const cols = { auto: '#3f9a52', man: '#3a6ee8', pd: '#ff8a3d', gold: '#d9a521', bag: '#8d4fd1' }, names = { auto: L('Helpers', 'Yardımcı'), man: L('Manual', 'Elle'), pd: 'Power Drive', gold: L('Golden ball', 'Altın top'), bag: N(CUR.bags) }, tot = rates.total || 1;
    $('share').innerHTML = Object.keys(cols).map(k => `<i style="width:${(rates[k] / tot * 100).toFixed(1)}%;background:${cols[k]}"></i>`).join('');
    $('shareLegend').innerHTML = Object.keys(cols).filter(k => rates[k] > 0).map(k => `<span><b style="background:${cols[k]}"></b>${names[k]} ${Math.round(rates[k] / tot * 100)}%</span>`).join('');
    const g = meta.gt, ab = [];
    for (const [id, nm, until, cd] of [['focus', L('Focus', 'Odak'), run.focusUntil, run.focusCd], ['tempo', L('Tempo Rush', 'Tempo'), run.tempoUntil, run.tempoCd], ['shield', L('Wind Shield', 'Kalkan'), run.shieldUntil, run.shieldCd]]) {
      if (E.skill(id)) ab.push(`<button data-ab="${id}" ${cd > g ? 'disabled' : ''}>${nm}<small>${until > g ? L('on ', 'açık ') + Math.ceil(until - g) + 's' : cd > g ? Math.ceil(cd - g) + 's' : L('ready', 'hazır')}</small></button>`);
    }
    const abH = ab.join(''); if ($('abil').dataset.h !== abH) { $('abil').innerHTML = abH; $('abil').dataset.h = abH; }
    $('puttBtn').hidden = !E.greenPhase() || Putt.isOpen() || run.locked;
    const dots = { gear: meta.bags.length > 0 || Object.values(meta.equip.seen).some(v => v === false), res: meta.res.q.length < E.resSlots() && RESEARCH.some(r => E.resState(r) === 'open' && E.canPay(r.cost(E.res(r.id)))), team: run.hitters.some(h => !h.type), compete: E.dailyReady() || meta.daily.tries < 3, worlds: run.locked };
    document.querySelectorAll('#tabs button').forEach(b => { const has = !!dots[b.dataset.tab], c = !!b.querySelector('.dot'); if (has && !c) b.appendChild(U.el('span', 'dot')); else if (!has && c) b.querySelector('.dot').remove(); });
    $('dailyChip').hidden = !E.dailyReady();
  }
  function shareRates() {
    const r = { auto: 0, man: 0, pd: 0, gold: 0, bag: 0, total: 0 }; let dt = 0;
    for (const h of hist) { for (const k in h.d) r[k] += h.d[k]; dt += h.dt; }
    if (dt <= 0) return r;
    for (const k of ['auto', 'man', 'pd', 'gold', 'bag']) { r[k] /= dt; r.total += r[k]; }
    return r;
  }
  function sampleStats(dtGame) {
    const c = Object.assign({}, E.stats); if (!prevStats) prevStats = c;
    const d = {}; for (const k in c) d[k] = c[k] - (prevStats[k] || 0); prevStats = c;
    if (!hist.length || hist[hist.length - 1].age > 1) hist.push({ d, dt: dtGame, age: 0 });
    else { const h = hist[hist.length - 1]; for (const k in d) h.d[k] = (h.d[k] || 0) + d[k]; h.dt += dtGame; }
  }

  // ---------- main loop ----------
  let last = performance.now();
  function frame(now) {
    const dtR = Math.min(0.1, (now - last) / 1000); last = now;
    const S = E.get();
    if (Putt.isOpen() && !Tour.isOpen()) S.run.greenWait = 0;
    if (speed > 0) E.tickOnline(dtR * speed, dtR);
    hist.forEach(h => h.age += dtR); sampleStats(dtR * speed); while (hist.length && hist[0].age > 30) hist.shift();
    ring.update(dtR);
    ring.pd = S.run.pd; ring.pdReady = S.run.pd >= 100; ring.focus = S.run.focusUntil > S.meta.gt;
    ring.enabled = !Putt.isOpen() && !Tour.isOpen() && !modalOpen;
    ring.center = ring.pdReady ? 'POWER' : S.run.streak > 0 ? L('STREAK ', 'SERİ ') + S.run.streak : L('SWING', 'VURUŞ');
    ring.sub = ring.pdReady ? 'DRIVE' : S.run.streak > 0 ? '×' + E.streakMult().toFixed(2) : L('SPACE / CLICK', 'BOŞLUK / TIKLA');
    ring.draw();
    Stage.update(dtR); viewA.draw(); viewB.draw(); HoleMap.draw();
    hud(); renderCoach();
    if (tab === 'look') { previewT = (previewT + dtR / 1.6) % 1.6; const cv = $('lookPreview'); const wi = lookWorld < 0 ? E.worldOf(S.run.n) : lookWorld; cv && Art.preview(cv, S.meta.looks[lookSel], WORLDS[wi], S.meta.worldOutfit, previewT < 1 ? previewT : -1); }
    panelTimer += dtR; if (panelTimer > 0.4) { panelTimer = 0; renderPanel(false); }
    saveTimer += dtR; if (saveTimer > 10) { saveTimer = 0; save(); }
    requestAnimationFrame(frame);
  }

  function help() {
    modal(`<h3>Par Factory · ${L('prototype 3', 'prototip 3')}</h3><ol class="help">
      <li>${L('<b>Swing:</b> press <kbd>Space</kbd> when the needle is in the yellow zone. The outer ring charges a Power Drive.', '<b>Vuruş:</b> ibre sarı bölgedeyken <kbd>Boşluk</kbd>. Dış halka Power Drive\'ı doldurur.')}</li>
      <li>${L('<b>Holes and par:</b> each hole is par−2 shots, then a putt. Every shot lands on fairway, rough, bunker or water.', '<b>Delik ve par:</b> her delik par−2 vuruş ve bir putt. Her vuruş fairway, rough, bunker ya da suya düşer.')}</li>
      <li>${L('<b>Worlds:</b> the map changes every 24 holes (rain, storm, forest, desert, snow, ice, moon, space, Mercury). Each needs stars to open.', '<b>Dünyalar:</b> harita her 24 delikte değişir (yağmur, fırtına, orman, çöl, kar, buz, ay, uzay, Merkür). Her biri yıldızla açılır.')}</li>
      <li>${L('<b>Wind gates:</b> on some holes the wind is too strong. Raise wind control: Accuracy training, research, Accurate helpers, grips and balls.', '<b>Rüzgâr kapıları:</b> bazı deliklerde rüzgâr çok güçlü. Rüzgâr kontrolünü artır: İsabet antrenmanı, araştırma, İsabetli yardımcı, sap ve top.')}</li>
      <li>${L('<b>Team:</b> choose Power, Accuracy or Tempo helpers to cover your weak side. Train them with Medals.', '<b>Takım:</b> zayıf yanını kapatmak için Güçlü, İsabetli ya da Hızlı yardımcı seç. Madalyayla geliştir.')}</li>
      <li>${L('<b>Gear bags</b> hold items in 10 rarities. Higher rarities must be researched first.', '<b>Ekipman çantaları</b> 10 nadirlikte parça içerir. Yüksek nadirlikler önce araştırılmalı.')}</li>
      <li>${L('<b>View:</b> switch between A (side) and B (driving range), or show both to compare.', '<b>Görünüm:</b> A (yandan) ile B (driving range) arasında geç ya da karşılaştırmak için ikisini birden göster.')}</li></ol>
      <div class="btnrow"><button class="btn primary" id="hOk">${L('Play', 'Oyna')}</button></div>`, { onMount: c => c.querySelector('#hOk').addEventListener('click', closeModal) });
  }

  // ---------- boot ----------
  function boot(hotData) {
    const saved = (hotData && hotData.S && hotData.S.v === 3 ? hotData.S : null) || load();
    let offline = null;
    if (saved) { E.attach(saved); const dt = (Date.now() - (saved.lastSeen || Date.now())) / 1000; if (!hotData && dt >= 60) offline = dt; } else E.fresh();
    LANG.cur = E.get().settings.lang || 'en';
    ring = new Ring($('ring'));
    viewA = makeSideView($('sceneA')); viewB = makeRangeView($('sceneB'));
    Stage.views.push(viewA, viewB); Stage.sync();
    HoleMap.init($('holemap')); Putt.init(); Tour.init(); Escape.init();
    window.addEventListener('resize', () => { viewA.resize(); viewB.resize(); });
    for (const v of [viewA, viewB]) v.cv.addEventListener('pointerdown', e => {
      const r = v.cv.getBoundingClientRect(), [nx, ny, W, H] = v.toNorm(e.clientX - r.left, e.clientY - r.top);
      if (Stage.hitGold(nx, ny, W, H)) { const res = E.goldReward(); Stage.banner(L('GOLDEN BALL', 'ALTIN TOP'), res.text, '#ffd23f', 2); toast(L('Golden ball: ', 'Altın top: ') + res.text, 'gold'); return; }
      swing();
    });
    $('ring').addEventListener('pointerdown', e => { e.preventDefault(); swing(); });
    $('puttBtn').addEventListener('click', openPutt);
    $('abil').addEventListener('click', e => { const b = e.target.closest('[data-ab]'); if (b && E.useAbility(b.dataset.ab)) toast(b.textContent, 'blue'); });
    $('sBagBtn').addEventListener('click', () => setTab('gear'));
    $('dailyChip').addEventListener('click', () => setTab('compete'));
    $('skipBtn').addEventListener('click', skipModal);
    $('helpBtn').addEventListener('click', help);
    $('reqLine').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) setTab(b.dataset.go); });
    $('coach').addEventListener('click', e => { const b = e.target.closest('[data-coach]'); if (!b) return; const g = b.dataset.coach; if (g.startsWith('buy:')) { E.buy(g.slice(4), 1); lastCoach = ''; renderPanel(true); } else setTab(g); });
    for (const ev of ['pointerdown', 'keydown']) document.addEventListener(ev, () => { lastInput = performance.now(); }, true);
    $('speed').addEventListener('click', e => { const b = e.target.closest('[data-speed]'); if (!b) return; speed = +b.dataset.speed; document.querySelectorAll('#speed [data-speed]').forEach(x => x.classList.toggle('on', x === b)); });
    $('viewBtn').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });
    $('langBtn').addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) { E.get().settings.lang = b.dataset.lang; applyLang(); } });
    $('tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
    const body = $('tabBody');
    body.addEventListener('pointerdown', e => { const b = e.target.closest('button[data-act]'); if (b && !b.disabled && e.button === 0) { e.preventDefault(); onAct(b); } });
    body.addEventListener('click', e => { const b = e.target.closest('button[data-act]'); if (b && e.detail === 0 && !b.disabled) onAct(b); });
    body.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.cfg) { const v = parseFloat(t.value); if (isFinite(v) && v > 0) { CFG[t.dataset.cfg] = v; E.get().cfg[t.dataset.cfg] = v; } }
      if (t.dataset.act === 'autoAll' || t.dataset.act === 'worldOutfit') onAct(t);
    });
    $('modal').addEventListener('pointerdown', e => { if (e.target === $('modal')) closeModal(); });
    document.addEventListener('keydown', e => {
      if (e.code === 'Escape' && modalOpen) { closeModal(); return; }
      if (e.code !== 'Space') return;
      if (e.target.tagName === 'INPUT' || (e.target.tagName === 'BUTTON' && e.target.closest('.mcard'))) return;
      e.preventDefault();
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
      if (e.repeat) return;
      if (Escape.isOpen()) { Escape.press(); return; }
      if (Putt.isOpen()) { Putt.release(); return; }
      if (Tour.isOpen()) { Tour.press(); return; }
      swing();
    });
    document.addEventListener('keyup', e => { if (e.code === 'Space' && !(e.target.tagName === 'INPUT' || (e.target.closest && e.target.closest('.mcard')))) e.preventDefault(); });
    window.addEventListener('beforeunload', save);
    document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
    window.claude?.hot?.snapshot?.(() => ({ S: E.get() }));
    setView(E.get().settings.view || 'side');
    applyLang(); setTab('up');
    requestAnimationFrame(frame);
    if (offline) runSkip(offline, 'offline', 'none', L('While you were away', 'Sen yokken'));
    else if (!saved) help();
  }
  return { boot, modal, closeModal, toast, refreshAll, save, setTab, get speed() { return speed; } };
})();

window.claude?.hot?.ready ? window.claude.hot.ready(UI.boot) : UI.boot(window.claude?.hot?.data ?? null);
