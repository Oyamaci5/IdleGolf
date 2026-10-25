// Game data (prototype 3). English is the primary language; Turkish is the secondary translation.
// L('English', 'Türkçe') picks the active language. Data names are {en, tr} pairs read with N().
const LANG = { cur: 'en' };
const L = (en, tr) => (LANG.cur === 'tr' && tr != null ? tr : en);
const N = o => (o && typeof o === 'object' ? (LANG.cur === 'tr' && o.tr ? o.tr : o.en) : o);

// ---------- currencies ----------
const CUR = {
  yards:  { en: 'Yards',  tr: 'Yarda',    icon: 'yd' },
  stars:  { en: 'Stars',  tr: 'Yıldız',   icon: '★' },
  data:   { en: 'Data',   tr: 'Veri',     icon: 'D' },
  shards: { en: 'Shards', tr: 'Parça',    icon: '◆' },
  medals: { en: 'Medals', tr: 'Madalya',  icon: 'M' },
  bags:   { en: 'Gear Bags', tr: 'Ekipman Çantası', icon: 'B' },
};

// ---------- worlds: the map changes every 24 holes ----------
// wind: base wind on the world's first hole; step: added per wind gate; gates: hole numbers inside the world.
// terrain: added to lie difficulty. heat: helper speed factor without cooling. gravity: visual/flight only.
const WORLD_HOLES = 24;
const WORLDS = [
  { id: 'meadow', name: { en: 'Green Meadows', tr: 'Yeşil Çayırlar' }, stars: 0, wind: 3, step: 6, gates: [16, 24], terrain: 0, heat: 1, gravity: 1, weather: 'sun', suit: null, windName: { en: 'Wind', tr: 'Rüzgâr' },
    desc: { en: 'Calm fairways. Learn the basics.', tr: 'Sakin fairway\'ler. Temelleri öğren.' },
    sky: ['#7fc3f0', '#d9f0ff'], hill: ['#7fae86', '#5f9468'], tree: '#2f6b3a', grass: ['#6fb04f', '#7dbd5a'], rough: '#4f8a3f', sand: '#e8d49a', green: '#9ad874', sun: '#fff6c8' },
  { id: 'rain', hazard: { en: 'Mud pit', tr: 'Çamur' }, water: { en: 'Puddle', tr: 'Su birikintisi' }, name: { en: 'Rainy Links', tr: 'Yağmurlu Kıyı' }, stars: 40, wind: 10, step: 6, gates: [8, 16, 24], terrain: 2, heat: 1, gravity: 1, weather: 'rain', suit: 'rain', windName: { en: 'Wind', tr: 'Rüzgâr' }, roughBias: 0.06,
    desc: { en: 'Wet grass. The ball stops in the rough more often.', tr: 'Islak çim. Top rough\'ta daha sık kalır.' },
    sky: ['#6f7d8a', '#b9c4cc'], hill: ['#6d8f78', '#56775f'], tree: '#264f30', grass: ['#5c9a48', '#68a653'], rough: '#3f7434', sand: '#cbb98a', green: '#86c46a', sun: null },
  { id: 'storm', hazard: { en: 'Mud pit', tr: 'Çamur' }, water: { en: 'Surf', tr: 'Dalga' }, name: { en: 'Storm Coast', tr: 'Fırtına Burnu' }, stars: 80, wind: 22, step: 8, gates: [8, 16, 24], terrain: 2, heat: 1, gravity: 1, weather: 'storm', suit: 'storm', windName: { en: 'Gale', tr: 'Fırtına' },
    desc: { en: 'Strong gales. Wind control decides everything.', tr: 'Sert rüzgâr. Her şeyi rüzgâr kontrolü belirler.' },
    sky: ['#3c4654', '#7f8c99'], hill: ['#56705f', '#455c4d'], tree: '#1f3d28', grass: ['#4f8a42', '#5a964c'], rough: '#365f2e', sand: '#bfae80', green: '#7cb862', sun: null },
  { id: 'forest', hazard: { en: 'Mud pit', tr: 'Çamur' }, water: { en: 'Creek', tr: 'Dere' }, name: { en: 'Deep Forest', tr: 'Derin Orman' }, stars: 120, wind: 12, step: 8, gates: [8, 16, 24], terrain: 4, heat: 1, gravity: 1, weather: 'fog', suit: 'forest', windName: { en: 'Wind', tr: 'Rüzgâr' }, roughBias: 0.08,
    desc: { en: 'Narrow corridors between tall trees.', tr: 'Uzun ağaçlar arasında dar koridorlar.' },
    sky: ['#8fb3a0', '#d4e4d6'], hill: ['#3f6b45', '#2f5636'], tree: '#1b3d22', grass: ['#5fa048', '#6aac52'], rough: '#335f2c', sand: '#d6c48e', green: '#8fd06a', sun: '#f4f8d8' },
  { id: 'desert', hazard: { en: 'Dune', tr: 'Kum tepesi' }, water: { en: 'Oasis', tr: 'Vaha' }, name: { en: 'Dune Desert', tr: 'Kum Çölü' }, stars: 165, wind: 20, step: 10, gates: [8, 16, 24], terrain: 3, heat: 0.85, gravity: 1, weather: 'dust', suit: 'desert', windName: { en: 'Sandstorm', tr: 'Kum fırtınası' }, bunkerX: 2,
    desc: { en: 'Sand everywhere. Heat slows helpers without cooling.', tr: 'Her yer kum. Soğutma yoksa sıcak yardımcıları yavaşlatır.' },
    sky: ['#f0b46a', '#ffe7b5'], hill: ['#d9a868', '#c48f50'], tree: '#7a8a3a', grass: ['#9db15a', '#a8bb65'], rough: '#b49a5a', sand: '#f1d89a', green: '#a9cf6a', sun: '#fff3c8' },
  { id: 'snow', hazard: { en: 'Snow drift', tr: 'Kar yığını' }, water: { en: 'Frozen pond', tr: 'Donmuş gölet' }, name: { en: 'Snow Peaks', tr: 'Karlı Zirveler' }, stars: 210, wind: 24, step: 10, gates: [8, 16, 24], terrain: 4, heat: 1, gravity: 1, weather: 'snow', suit: 'snow', windName: { en: 'Blizzard', tr: 'Tipi' },
    desc: { en: 'Snow on the fairway, cold crosswinds.', tr: 'Fairway\'de kar, soğuk yan rüzgâr.' },
    sky: ['#9fb4c8', '#e7eef5'], hill: ['#dfe8ef', '#c4d2de'], tree: '#2c4a3a', grass: ['#e8eef2', '#f4f7fa'], rough: '#c9d6df', sand: '#d9d2c0', green: '#b8d8b0', sun: '#ffffff' },
  { id: 'ice', hazard: { en: 'Ice crevasse', tr: 'Buz yarığı' }, water: { en: 'Thin ice', tr: 'İnce buz' }, name: { en: 'Frozen Glacier', tr: 'Buzul' }, stars: 255, wind: 30, step: 12, gates: [8, 16, 24], terrain: 5, heat: 1, gravity: 1, weather: 'aurora', suit: 'ice', windName: { en: 'Polar wind', tr: 'Kutup rüzgârı' },
    desc: { en: 'Slick ice and polar winds under the aurora.', tr: 'Kutup ışıkları altında kaygan buz ve kutup rüzgârı.' },
    sky: ['#0d1b3a', '#2d5277'], hill: ['#a9cbe0', '#88b1cc'], tree: '#1d3b4a', grass: ['#bfe3f2', '#d3eef8'], rough: '#9cc6d9', sand: '#e6eef2', green: '#a7e0d0', sun: null },
  { id: 'moon', hazard: { en: 'Crater', tr: 'Krater' }, water: { en: 'Dust pit', tr: 'Toz çukuru' }, name: { en: 'Lunar Base', tr: 'Ay Üssü' }, stars: 300, wind: 30, step: 12, gates: [8, 16, 24], terrain: 6, heat: 1, gravity: 0.17, weather: 'stars', suit: 'space', windName: { en: 'Low-gravity drift', tr: 'Düşük yerçekimi sapması' },
    desc: { en: 'One-sixth gravity: huge floaty shots that drift. Helmet required.', tr: 'Altıda bir yerçekimi: uzun, süzülen ve sapan vuruşlar. Kask zorunlu.' },
    sky: ['#05070f', '#141a2e'], hill: ['#8f9198', '#6f7178'], tree: null, grass: ['#a5a7ad', '#b3b5bb'], rough: '#7d7f86', sand: '#c9c6bd', green: '#7fd0a0', sun: '#ffffff' },
  { id: 'space', hazard: { en: 'Debris field', tr: 'Enkaz alanı' }, water: { en: 'Airlock gap', tr: 'Hava kilidi boşluğu' }, name: { en: 'Orbital Station', tr: 'Yörünge İstasyonu' }, stars: 345, wind: 45, step: 14, gates: [8, 16, 24], terrain: 6, heat: 1, gravity: 0.05, weather: 'space', suit: 'space', windName: { en: 'Solar wind', tr: 'Güneş rüzgârı' },
    desc: { en: 'Near zero gravity on a station deck. Solar wind pushes every ball.', tr: 'İstasyon güvertesinde neredeyse sıfır yerçekimi. Güneş rüzgârı her topu iter.' },
    sky: ['#020309', '#0b1030'], hill: ['#2a3150', '#1d2340'], tree: null, grass: ['#3b4a6b', '#45567a'], rough: '#2c3755', sand: '#8a8fa8', green: '#4fd1c5', sun: '#ffe9a8' },
  { id: 'mercury', hazard: { en: 'Slag', tr: 'Cüruf' }, water: { en: 'Lava pool', tr: 'Lav gölü' }, name: { en: 'Mercury', tr: 'Merkür' }, stars: 390, wind: 60, step: 15, gates: [8, 16, 24], terrain: 8, heat: 0.55, gravity: 0.38, weather: 'heat', suit: 'heat', windName: { en: 'Solar wind', tr: 'Güneş rüzgârı' },
    desc: { en: 'Next to the sun. Extreme heat and solar wind. Heat suit required.', tr: 'Güneşin yanı başı. Aşırı sıcak ve güneş rüzgârı. Isı giysisi zorunlu.' },
    sky: ['#3a0d05', '#b8481a'], hill: ['#6a3a22', '#4e2a18'], tree: null, grass: ['#8a5a3a', '#97664a'], rough: '#5f3a24', sand: '#d9884a', green: '#c9a35a', sun: '#fff1b0' },
];

// ---------- rarities (10) ----------
const RARITY = [
  { en: 'Common', tr: 'Sıradan', col: '#9aa3a0' },
  { en: 'Uncommon', tr: 'Seçkin', col: '#4caf50' },
  { en: 'Rare', tr: 'Nadir', col: '#2f7de1' },
  { en: 'Epic', tr: 'Epik', col: '#8d4fd1' },
  { en: 'Legendary', tr: 'Efsanevi', col: '#e09a1a' },
  { en: 'Mythic', tr: 'Mitik', col: '#d6362b' },
  { en: 'Ancient', tr: 'Kadim', col: '#13a39a' },
  { en: 'Celestial', tr: 'Göksel', col: '#4fb8f0' },
  { en: 'Cosmic', tr: 'Kozmik', col: '#c13fe0' },
  { en: 'Transcendent', tr: 'Uzay Ötesi', col: '#ff5fa2' },
];
const RARITY_BASE_W = [500, 300, 150, 60, 25, 10, 4, 1.5, 0.5, 0.12];

// ---------- gear: 4 slots × 10 rarities ----------
const SLOTS = {
  head: { en: 'Club Head', tr: 'Sopa Başı', stat: 'power' },
  shaft: { en: 'Shaft', tr: 'Şaft', stat: 'tempo' },
  grip: { en: 'Grip', tr: 'Sap', stat: 'acc' },
  ball: { en: 'Ball', tr: 'Top', stat: 'power+wc' },
};
const ITEM_NAMES = {
  head: [['Rusty Iron', 'Paslı Demir'], ['Steel Blade', 'Çelik Bıçak'], ['Forged Pro', 'Dövme Pro'], ['Carbon Driver', 'Karbon Driver'], ['Titan Driver', 'Titan Driver'], ['Dragon Head', 'Ejder Kafası'], ['Rune Iron', 'Run Demiri'], ['Starforged Head', 'Yıldız Dövmesi'], ['Nebula Driver', 'Bulutsu Driver'], ['Singularity', 'Tekillik']],
  shaft: [['Hickory', 'Ceviz'], ['Light Graphite', 'Hafif Grafit'], ['Flex X', 'Esnek X'], ['Tour Stiff', 'Tur Sert'], ['Crystal Shaft', 'Kristal Şaft'], ['Phoenix Shaft', 'Anka Şaftı'], ['Obelisk Shaft', 'Dikilitaş Şaftı'], ['Aurora Shaft', 'Aurora Şaftı'], ['Comet Shaft', 'Kuyrukluyıldız Şaftı'], ['Event Horizon', 'Olay Ufku']],
  grip: [['Rubber Grip', 'Lastik Sap'], ['Leather Grip', 'Deri Sap'], ['Velvet Wrap', 'Kadife Sarım'], ['Tacky Pro', 'Yapışkan Pro'], ['Gold Grip', 'Altın Sap'], ['Serpent Grip', 'Yılan Sap'], ['Pharaoh Grip', 'Firavun Sapı'], ['Halo Grip', 'Hale Sap'], ['Quasar Grip', 'Kuasar Sap'], ['Infinity Grip', 'Sonsuzluk Sapı']],
  ball: [['Range Ball', 'Antrenman Topu'], ['Two-Piece', 'İki Parça'], ['Soft Shell', 'Yumuşak Kabuk'], ['Tour Urethane', 'Tur Üretan'], ['Silver Core', 'Gümüş Çekirdek'], ['Lava Ball', 'Lav Topu'], ['Relic Ball', 'Kalıntı Topu'], ['Moonstone', 'Ay Taşı'], ['Supernova', 'Süpernova'], ['Big Bang', 'Büyük Patlama']],
};
const ITEMS = [];
for (const slot in ITEM_NAMES) ITEM_NAMES[slot].forEach((nm, r) => ITEMS.push({ id: slot + r, slot, rar: r, name: { en: nm[0], tr: nm[1] }, col: RARITY[r].col }));
// base stats at level 1; each level adds +25% of base. Level cap grows with rarity.
function itemStats(it, lv = 1) {
  const r = it.rar, m = 1 + 0.25 * (lv - 1);
  switch (it.slot) {
    case 'head': return { power: 0.05 * Math.pow(1.6, r) * m };
    case 'shaft': return { tempo: 0.04 * Math.pow(1.55, r) * m };
    case 'grip': return { acc: Math.round(2 * Math.pow(1.5, r) * m) };
    case 'ball': return { power: 0.03 * Math.pow(1.6, r) * m, wc: Math.round(1.5 * Math.pow(1.45, r) * m) };
  }
  return {};
}
const levelCap = it => 5 + it.rar;
const dupShards = it => 5 * Math.pow(2, it.rar);
const upgradeShards = (it, lv) => Math.round(8 * Math.pow(1.45, lv - 1) * Math.pow(1 + it.rar, 1.3));

// gear bag tiers
const BAGS = [
  { en: 'Bronze Bag', tr: 'Bronz Çanta', col: '#b07a45', items: 1, shards: 10 },
  { en: 'Silver Bag', tr: 'Gümüş Çanta', col: '#a9b4bd', items: 2, shards: 25 },
  { en: 'Gold Bag', tr: 'Altın Çanta', col: '#d9a521', items: 2, shards: 60 },
  { en: 'Platinum Bag', tr: 'Platin Çanta', col: '#7fd0e0', items: 3, shards: 120 },
  { en: 'Diamond Bag', tr: 'Elmas Çanta', col: '#c58cff', items: 3, shards: 250 },
];

// ---------- helpers ----------
const HELPER_TYPES = {
  pow: { en: 'Power hitter', tr: 'Güçlü vurucu', short: { en: 'Power', tr: 'Güç' }, col: '#d6362b',
    desc: { en: 'Each swing goes much farther, swings a bit slower.', tr: 'Her vuruşu çok daha uzağa gider, biraz daha yavaş vurur.' } },
  acc: { en: 'Accurate hitter', tr: 'İsabetli vurucu', short: { en: 'Accuracy', tr: 'İsabet' }, col: '#2f7de1',
    desc: { en: 'Adds team Accuracy: better lies and more wind control.', tr: 'Takıma İsabet ekler: daha iyi zemin, daha çok rüzgâr kontrolü.' } },
  fast: { en: 'Fast hitter', tr: 'Hızlı vurucu', short: { en: 'Tempo', tr: 'Tempo' }, col: '#2f9a52',
    desc: { en: 'Swings much more often, each swing a bit shorter.', tr: 'Çok daha sık vurur, her vuruşu biraz daha kısa.' } },
};
function helperMods(h) {
  const k = h.rank || 0;
  if (h.type === 'pow') return { value: 1.6 + 0.15 * k, rate: 0.85, acc: 0 };
  if (h.type === 'fast') return { value: 0.85, rate: 1.6 + 0.15 * k, acc: 0 };
  return { value: 1, rate: 1, acc: 2 + k };
}
const helperRankCost = k => Math.round(8 * Math.pow(1.7, k));
const HELPER_RANK_MAX = 10, HELPER_SWITCH_COST = 15;

// ---------- skills (upgraded with Medals) ----------
const SKILLS = [
  { id: 'pd', name: { en: 'Power Drive', tr: 'Power Drive' }, max: 5, base: 1, desc: l => L(`Charged manual shot worth ${20 + 10 * l}s of auto income; charges ${10 * (l - 1)}% faster`, `Dolu elle vuruş ${20 + 10 * l} sn otomatik gelir değerinde; %${10 * (l - 1)} hızlı dolar`) },
  { id: 'focus', name: { en: 'Focus', tr: 'Odak' }, max: 5, base: 0, desc: l => L(`Perfect zone ×2 for ${8 + 2 * l}s (60s cooldown)`, `Mükemmel bölgesi ${8 + 2 * l} sn boyunca ×2 (60 sn bekleme)`) },
  { id: 'tempo', name: { en: 'Tempo Rush', tr: 'Tempo Patlaması' }, max: 5, base: 0, desc: l => L(`Helpers swing ×3 for ${16 + 4 * l}s (120s cooldown)`, `Yardımcılar ${16 + 4 * l} sn boyunca ×3 vurur (120 sn bekleme)`) },
  { id: 'shield', name: { en: 'Wind Shield', tr: 'Rüzgâr Kalkanı' }, max: 5, base: 0, desc: l => L(`No wind penalty for ${8 + 3 * l}s (90s cooldown). Does not open wind gates.`, `${8 + 3 * l} sn rüzgâr cezası yok (90 sn bekleme). Rüzgâr kapısını açmaz.`) },
];
const skillCost = l => Math.round(10 * Math.pow(1.8, l));

// ---------- research (multiple currencies) ----------
// cost(l) returns {data, shards, medals}; dur(l) in game seconds
const RESEARCH = [
  { id: 'slot', br: { en: 'Helpers', tr: 'Yardımcılar' }, name: { en: 'Helper slot', tr: 'Yardımcı yuvası' }, max: 9, cost: l => ({ data: Math.round(8 * Math.pow(1.7, l)) }), dur: l => 300 * Math.pow(2, l), desc: l => L(`Opens helper slot ${l + 2}`, `${l + 2}. yardımcı yuvasını açar`) },
  { id: 'hspeed', br: { en: 'Helpers', tr: 'Yardımcılar' }, name: { en: 'Helper conditioning', tr: 'Yardımcı kondisyonu' }, max: 10, cost: l => ({ data: Math.round(10 * Math.pow(1.6, l)) }), dur: l => 600 * Math.pow(1.7, l), desc: () => L('All helpers swing +15% faster', 'Tüm yardımcılar %15 hızlı vurur') },
  { id: 'acc', br: { en: 'Course', tr: 'Saha' }, name: { en: 'Accuracy drills', tr: 'İsabet çalışması' }, max: 10, cost: l => ({ data: Math.round(10 * Math.pow(1.6, l)) }), dur: l => 600 * Math.pow(1.8, l), desc: () => L('+3 Accuracy', '+3 İsabet') },
  { id: 'windr', br: { en: 'Course', tr: 'Saha' }, name: { en: 'Wind reading', tr: 'Rüzgâr okuma' }, max: 10, cost: l => ({ data: Math.round(12 * Math.pow(1.6, l)), medals: l >= 3 ? 5 * l : 0 }), dur: l => 900 * Math.pow(1.8, l), desc: () => L('+6 Wind control', '+6 Rüzgâr kontrolü') },
  { id: 'rough', br: { en: 'Course', tr: 'Saha' }, name: { en: 'Rough mastery', tr: 'Rough ustalığı' }, max: 3, cost: l => ({ data: Math.round(12 * Math.pow(2.2, l)) }), dur: l => 900 * Math.pow(2.5, l), desc: () => L('Rough penalty +0.1', 'Rough cezası +0.1 azalır') },
  { id: 'bunker', br: { en: 'Course', tr: 'Saha' }, name: { en: 'Bunker escape', tr: 'Bunker çıkışı' }, max: 3, cost: l => ({ data: Math.round(15 * Math.pow(2.2, l)) }), dur: l => 1200 * Math.pow(2.5, l), desc: () => L('Bunker penalty +0.12', 'Bunker cezası +0.12 azalır') },
  { id: 'cool', br: { en: 'Course', tr: 'Saha' }, name: { en: 'Cooling', tr: 'Soğutma' }, max: 5, cost: l => ({ data: Math.round(40 * Math.pow(2, l)), shards: Math.round(50 * Math.pow(2, l)) }), dur: l => 3600 * Math.pow(2, l), desc: () => L('Heat penalty on helpers -10% (desert, Mercury)', 'Yardımcılardaki sıcak cezası -%10 (çöl, Merkür)') },
  { id: 'dist', br: { en: 'Economy', tr: 'Ekonomi' }, name: { en: 'Distance study', tr: 'Mesafe çalışması' }, max: 15, cost: l => ({ data: Math.round(10 * Math.pow(1.8, l)) }), dur: l => 1200 * Math.pow(1.6, l), desc: () => L('All distance +20%', 'Tüm mesafeler +%20') },
  { id: 'discount', br: { en: 'Economy', tr: 'Ekonomi' }, name: { en: 'Bargaining', tr: 'Pazarlık' }, max: 5, cost: l => ({ data: Math.round(20 * Math.pow(2, l)) }), dur: l => 1800 * Math.pow(2, l), desc: () => L('Upgrade costs -5%', 'Yükseltme maliyeti -%5') },
  { id: 'offline', br: { en: 'Economy', tr: 'Ekonomi' }, name: { en: 'Night shift', tr: 'Gece vardiyası' }, max: 2, cost: l => ({ data: Math.round(30 * Math.pow(3, l)) }), dur: l => 3600 * Math.pow(3, l), desc: () => L('Offline efficiency +10%', 'Çevrimdışı verim +%10') },
  { id: 'bagcap', br: { en: 'Gear', tr: 'Ekipman' }, name: { en: 'Bag rack', tr: 'Çanta rafı' }, max: 2, cost: l => ({ data: Math.round(12 * Math.pow(3, l)), shards: 30 * (l + 1) }), dur: l => 1200 * Math.pow(4, l), desc: () => L('+10 bag storage', '+10 çanta yeri') },
  { id: 'luck', br: { en: 'Gear', tr: 'Ekipman' }, name: { en: 'Lucky finds', tr: 'Şanslı buluş' }, max: 5, cost: l => ({ data: Math.round(20 * Math.pow(2.2, l)), shards: Math.round(40 * Math.pow(2, l)) }), dur: l => 1800 * Math.pow(2.3, l), desc: () => L('Higher rarities drop more often', 'Yüksek nadirlikler daha sık düşer') },
  { id: 'putt_read', br: { en: 'Putting', tr: 'Putt' }, name: { en: 'Green reading', tr: 'Yeşil okuma' }, max: 3, cost: l => ({ data: Math.round(10 * Math.pow(2, l)) }), dur: l => 600 * Math.pow(2.5, l), desc: () => L('Longer putt read line', 'Putt okuma çizgisi uzar') },
  { id: 'putt_calm', br: { en: 'Putting', tr: 'Putt' }, name: { en: 'Steady hands', tr: 'Sakin eller' }, max: 3, cost: l => ({ data: Math.round(10 * Math.pow(2, l)) }), dur: l => 600 * Math.pow(2.5, l), desc: () => L('+1s putt time, slower power bar', '+1 sn putt süresi, daha yavaş güç çubuğu') },
  { id: 'lab', br: { en: 'Lab', tr: 'Laboratuvar' }, name: { en: 'Extra lab bench', tr: 'Ek laboratuvar masası' }, max: 2, cost: l => ({ data: 40 * Math.pow(4, l), medals: 20 * (l + 1) }), dur: l => 3600 * Math.pow(4, l), desc: () => L('+1 research at the same time', 'Aynı anda +1 araştırma') },
];
// rarity research: one node per locked rarity (Epic … Transcendent); Common/Uncommon/Rare are known from the start
for (let r = 3; r < 10; r++) {
  const k = r - 3;
  RESEARCH.push({
    id: 'rar' + r, br: { en: 'Rarity research', tr: 'Nadirlik araştırması' }, name: { en: RARITY[r].en + ' gear', tr: RARITY[r].tr + ' ekipman' }, max: 1, req: r > 3 ? 'rar' + (r - 1) : null,
    cost: () => ({ data: Math.round(30 * Math.pow(2.6, k)), shards: Math.round(60 * Math.pow(2.8, k)), medals: k >= 2 ? Math.round(20 * Math.pow(2, k - 2)) : 0 }),
    dur: () => 1800 * Math.pow(2.4, k), desc: () => L(`${RARITY[r].en} items can drop from bags`, `${RARITY[r].tr} parçalar çantadan düşebilir`), rar: r,
  });
}

// ---------- daily rewards (7-day track; missing a day loses nothing) ----------
const DAILY = [
  { bag: 0, data: 10 }, { data: 30, shards: 20 }, { medals: 20 }, { bag: 1, data: 20 },
  { shards: 100 }, { medals: 40, data: 30 }, { bag: 2, medals: 30 },
];

// ---------- looks ----------
const LOOKS = {
  skin: [['#f1c7a1', { en: 'Light', tr: 'Açık' }], ['#d9a27a', { en: 'Wheat', tr: 'Buğday' }], ['#a8714d', { en: 'Tan', tr: 'Esmer' }], ['#6e4630', { en: 'Dark', tr: 'Koyu' }]],
  shirt: [['#c8281e', { en: 'Red', tr: 'Kırmızı' }], ['#2f64d6', { en: 'Blue', tr: 'Mavi' }], ['#f4f6f1', { en: 'White', tr: 'Beyaz' }], ['#2f8f4e', { en: 'Green', tr: 'Yeşil' }], ['#f0c419', { en: 'Yellow', tr: 'Sarı' }, 'w2'], ['#7d4fa3', { en: 'Purple', tr: 'Mor' }, 'ach10'], ['#1d2024', { en: 'Black', tr: 'Siyah' }, 'w3'], ['argyle', { en: 'Argyle', tr: 'Ekose' }, 'tour25'], ['gold', { en: 'Gold', tr: 'Altın' }, 'tour10']],
  pants: [['#2a2f3a', { en: 'Navy', tr: 'Lacivert' }], ['#e9e3d3', { en: 'Beige', tr: 'Bej' }], ['#f4f6f1', { en: 'White', tr: 'Beyaz' }], ['#5b6d62', { en: 'Khaki', tr: 'Haki' }], ['plaid', { en: 'Plaid', tr: 'Kareli' }, 'w2'], ['#c8281e', { en: 'Red', tr: 'Kırmızı' }, 'daily1']],
  hat: [['cap', { en: 'Cap', tr: 'Kep' }], ['visor', { en: 'Visor', tr: 'Vizör' }], ['none', { en: 'No hat', tr: 'Şapkasız' }], ['bucket', { en: 'Bucket', tr: 'Balıkçı' }, 'w2'], ['beanie', { en: 'Beanie', tr: 'Bere' }, 'w6'], ['sunhat', { en: 'Sun hat', tr: 'Hasır şapka' }, 'w5'], ['ranger', { en: 'Ranger hat', tr: 'Korucu şapkası' }, 'w4'], ['crown', { en: 'Crown', tr: 'Taç' }, 'stars200']],
  hatColor: [['#f4f6f1', { en: 'White', tr: 'Beyaz' }], ['#1d2024', { en: 'Black', tr: 'Siyah' }], ['#c8281e', { en: 'Red', tr: 'Kırmızı' }], ['#2f64d6', { en: 'Blue', tr: 'Mavi' }], ['#2f8f4e', { en: 'Green', tr: 'Yeşil' }], ['#d9a521', { en: 'Gold', tr: 'Altın' }, 'tour10']],
  club: [['chrome', { en: 'Chrome', tr: 'Krom' }], ['black', { en: 'Matte black', tr: 'Mat siyah' }], ['carbon', { en: 'Carbon', tr: 'Karbon' }, 'res10'], ['gold', { en: 'Gold', tr: 'Altın' }, 'w4']],
  trail: [['white', { en: 'White', tr: 'Beyaz' }], ['gold', { en: 'Gold', tr: 'Altın' }, 'birdie10'], ['fire', { en: 'Fire', tr: 'Alev' }, 'pd25'], ['rainbow', { en: 'Rainbow', tr: 'Gökkuşağı' }, 'tour10']],
};
// world outfits: worn automatically in that world when "World outfit" is on. Space and heat suits are always forced.
const WORLD_OUTFIT = {
  rain: { en: 'Rain jacket + bucket hat', tr: 'Yağmurluk + balıkçı şapka' }, storm: { en: 'Windbreaker + beanie', tr: 'Rüzgârlık + bere' },
  forest: { en: 'Ranger hat + vest', tr: 'Korucu şapkası + yelek' }, desert: { en: 'Sun hat + shades + scarf', tr: 'Hasır şapka + gözlük + atkı' },
  snow: { en: 'Puffer jacket + beanie + scarf', tr: 'Şişme mont + bere + atkı' }, ice: { en: 'Fur hood + goggles', tr: 'Kürk kapüşon + kar gözlüğü' },
  space: { en: 'Space suit + helmet (required)', tr: 'Uzay giysisi + kask (zorunlu)' }, heat: { en: 'Heat suit + gold visor (required)', tr: 'Isı giysisi + altın vizör (zorunlu)' },
};

// ---------- achievements ----------
const ACH = [];
(function () {
  const add = (id, name, check, reward) => ACH.push({ id, name, check, reward });
  [10, 24, 48, 72, 120, 168, 240].forEach((n, i) => add('holes' + n, { en: `Clear ${n} holes`, tr: `${n} delik bitir` }, s => s.run.n > n, i % 2 ? { bag: 1 } : { data: 20 + 15 * i }));
  [25, 50, 100, 200, 400].forEach((n, i) => add('stars' + n, { en: `Collect ${n} stars`, tr: `${n} yıldız topla` }, s => E.totalStars() >= n, { medals: 10 + 10 * i }));
  [5, 25, 100].forEach((n, i) => add('bags' + n, { en: `Open ${n} gear bags`, tr: `${n} ekipman çantası aç` }, s => s.meta.stats.bags >= n, { shards: 50 * (i + 1) }));
  for (let r = 2; r < 10; r++) add('rar' + r, { en: `Find a ${RARITY[r].en} item`, tr: `${RARITY[r].tr} bir parça bul` }, s => s.meta.stats.bestRar >= r, { data: 15 * r, medals: 5 * r });
  [1, 10, 50].forEach((n, i) => add('birdie' + n, { en: `Make ${n} birdie${n > 1 ? 's' : ''}`, tr: `${n} birdie yap` }, s => s.meta.stats.birdies >= n, { medals: 10 * (i + 1) }));
  [1, 25, 100].forEach((n, i) => add('pd' + n, { en: `Hit ${n} Power Drive${n > 1 ? 's' : ''}`, tr: `${n} Power Drive vur` }, s => s.meta.stats.pds >= n, { data: 15 * (i + 1) }));
  [1, 5, 15].forEach((n, i) => add('gate' + n, { en: `Beat ${n} wind gate${n > 1 ? 's' : ''}`, tr: `${n} rüzgâr kapısını geç` }, s => s.meta.stats.gates >= n, { medals: 15 * (i + 1) }));
  for (let w = 1; w < WORLDS.length; w++) add('world' + w, { en: `Reach ${WORLDS[w].name.en}`, tr: `${WORLDS[w].name.tr} dünyasına ulaş` }, s => E.worldOf(s.run.n) >= w, { bag: Math.min(4, 1 + Math.floor(w / 2)) });
  add('helpers3', { en: 'Hire 3 helpers', tr: '3 yardımcı tut' }, s => s.run.hitters.filter(h => h.L > 0).length >= 3, { medals: 15 });
  add('rank5', { en: 'Train a helper to rank 5', tr: 'Bir yardımcıyı 5. kademeye çıkar' }, s => s.run.hitters.some(h => h.rank >= 5), { data: 40 });
  add('daily1', { en: 'Play the daily hole', tr: 'Günlük deliği oyna' }, s => s.meta.stats.dailyPlayed >= 1, { medals: 10 });
  add('dailyPar', { en: 'Par or better on the daily hole', tr: 'Günlük delikte par ya da daha iyisi' }, s => s.meta.stats.dailyPar >= 1, { bag: 2 });
  add('tour1', { en: 'Finish a tournament round', tr: 'Bir turnuva turu bitir' }, s => s.meta.stats.tourPlayed >= 1, { medals: 20 });
  add('tour25', { en: 'Top 25% in a weekly tournament', tr: 'Haftalık turnuvada ilk %25' }, s => s.meta.stats.tourBest <= 25, { bag: 3 });
  [5, 25].forEach((n, i) => add('res' + n, { en: `Complete ${n} research levels`, tr: `${n} araştırma seviyesi bitir` }, s => E.resTotal() >= n, { shards: 100 * (i + 1) }));
})();
// achievement-based unlock conditions for looks
const UNLOCKS = {
  w2: [{ en: 'Reach Rainy Links', tr: 'Yağmurlu Kıyı\'ya ulaş' }, s => E.worldOf(s.run.n) >= 1],
  w3: [{ en: 'Reach Storm Coast', tr: 'Fırtına Burnu\'na ulaş' }, s => E.worldOf(s.run.n) >= 2],
  w4: [{ en: 'Reach Deep Forest', tr: 'Derin Orman\'a ulaş' }, s => E.worldOf(s.run.n) >= 3],
  w5: [{ en: 'Reach Dune Desert', tr: 'Kum Çölü\'ne ulaş' }, s => E.worldOf(s.run.n) >= 4],
  w6: [{ en: 'Reach Snow Peaks', tr: 'Karlı Zirveler\'e ulaş' }, s => E.worldOf(s.run.n) >= 5],
  ach10: [{ en: 'Earn 10 achievements', tr: '10 başarım kazan' }, s => Object.keys(s.meta.ach).length >= 10],
  stars200: [{ en: 'Collect 200 stars', tr: '200 yıldız topla' }, s => E.totalStars() >= 200],
  res10: [{ en: 'Complete 10 research levels', tr: '10 araştırma seviyesi bitir' }, s => E.resTotal() >= 10],
  daily1: [{ en: 'Par or better on the daily hole', tr: 'Günlük delikte par ya da daha iyisi' }, s => s.meta.stats.dailyPar >= 1],
  birdie10: [{ en: 'Make 10 birdies', tr: '10 birdie yap' }, s => s.meta.stats.birdies >= 10],
  pd25: [{ en: 'Hit 25 Power Drives', tr: '25 Power Drive vur' }, s => s.meta.stats.pds >= 25],
  tour25: [{ en: 'Top 25% in a weekly tournament', tr: 'Haftalık turnuvada ilk %25' }, s => s.meta.stats.tourBest <= 25],
  tour10: [{ en: 'Top 10% in a weekly tournament', tr: 'Haftalık turnuvada ilk %10' }, s => s.meta.stats.tourBest <= 10],
};

const TERRAIN = {
  tee: { en: 'Tee', tr: 'Tee' }, fairway: { en: 'Fairway', tr: 'Fairway' }, rough: { en: 'Rough', tr: 'Rough' },
  bunker: { en: 'Bunker', tr: 'Bunker' }, water: { en: 'Water', tr: 'Su' }, green: { en: 'Green', tr: 'Yeşil' },
};
const TERRAIN_COL = { tee: '#8fd36b', fairway: '#6db54d', rough: '#3f7a32', bunker: '#e8d49a', water: '#3d8fd1', green: '#9ddd7a' };

// Fictional coaches for in-game tips. Real golfers would need a likeness licence, so these are original characters.
const COACHES = {
  ada: { name: 'Coach Ada', look: { skin: '#a8714d', hat: 'visor', hatColor: '#2f7de1', shirt: '#2f7de1' }, topic: { en: 'Accuracy & wind', tr: 'İsabet ve rüzgâr' } },
  bruno: { name: 'Big Bruno', look: { skin: '#f1c7a1', hat: 'cap', hatColor: '#d6362b', shirt: '#d6362b' }, topic: { en: 'Power', tr: 'Güç' } },
  sam: { name: 'Swift Sam', look: { skin: '#d9a27a', hat: 'bucket', hatColor: '#2f9a52', shirt: '#2f9a52' }, topic: { en: 'Tempo & helpers', tr: 'Tempo ve yardımcılar' } },
  iris: { name: 'Prof. Iris', look: { skin: '#6e4630', hat: 'none', hatColor: '#8d4fd1', shirt: '#8d4fd1' }, topic: { en: 'Research & gear', tr: 'Araştırma ve ekipman' } },
};
