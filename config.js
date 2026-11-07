'use strict';
/* ===== config.js — database game (karakter, senjata, 40 skill, musuh, bos) ===== */
const TILE = 16, WORLD_W = 120, WORLD_H = 80, VIEW_H = 270;

/* ---------- PENGATURAN ---------- */
const Settings = { music: 0.5, sfx: 0.7, shake: true, quality: 2, fps: false, dmgnum: true };
(function loadSettings() {
  try { Object.assign(Settings, JSON.parse(localStorage.getItem('aetheria_settings') || '{}')); } catch (e) {}
})();
function saveSettings() { try { localStorage.setItem('aetheria_settings', JSON.stringify(Settings)); } catch (e) {} }

/* ---------- ELEMEN ---------- */
const ELEM_KEYS = ['fire', 'water', 'earth', 'lightning', 'air'];
const ELEMENTS = {
  fire:      { key: 'fire', name: 'Api', icon: '🔥', c: '#ff5a1f', l: '#ffd27a', d: '#7a1500', beats: 'air', motif: 'ember',
    passive: 'Bara Membara: +12% damage, serangan bisa membakar musuh.' },
  water:     { key: 'water', name: 'Air', icon: '💧', c: '#2aa8ff', l: '#aef0ff', d: '#0a3a8a', beats: 'fire', motif: 'drop',
    passive: 'Arus Tenang: +35% regen mana, serangan bisa memperlambat musuh.' },
  earth:     { key: 'earth', name: 'Tanah', icon: '🪨', c: '#c58a4a', l: '#f0cf98', d: '#5a3a1a', beats: 'lightning', motif: 'chunk',
    passive: 'Kulit Batu: +25% HP, -10% damage diterima, serangan mendorong musuh.' },
  lightning: { key: 'lightning', name: 'Listrik', icon: '⚡', c: '#ffd800', l: '#fff7a0', d: '#8a6a00', beats: 'water', motif: 'spark',
    passive: 'Kilat Cepat: +8% kecepatan, serangan bisa menyambar musuh lain.' },
  air:       { key: 'air', name: 'Udara', icon: '🌀', c: '#5ff0e0', l: '#d8fffa', d: '#137a82', beats: 'earth', motif: 'swirl',
    passive: 'Langkah Angin: +15% kecepatan, dodge lebih jauh, serangan menarik musuh.' }
};
/* api>udara>tanah>listrik>air>api */
function elemMult(atk, def) {
  if (!def) return 1;
  let m = 1;
  for (const a of atk) if (ELEMENTS[a].beats === def) m = 1.35;
  if (m === 1 && atk.includes(def)) m = 0.75;
  return m;
}
function pairKey(a, b) { return ELEM_KEYS.indexOf(a) < ELEM_KEYS.indexOf(b) ? a + '+' + b : b + '+' + a; }

/* ---------- SENJATA (kind = cara menyerang) ---------- */
const WEAPONS = {
  katana:    { name: 'Katana',         style: 'Tebasan',    kind: 'slash',   range: 62,  arc: 1.7, cd: 0.30, dmg: 1.00, len: 30 },
  rapier:    { name: 'Rapier',         style: 'Tusukan',    kind: 'thrust',  range: 78,  arc: 0.3, cd: 0.22, dmg: 0.75, len: 32 },
  longsword: { name: 'Longsword',      style: 'Tebasan Berat', kind: 'slash', range: 66, arc: 1.9, cd: 0.42, dmg: 1.25, len: 32 },
  tanto:     { name: 'Tanto',          style: 'Bayangan',   kind: 'slash',   range: 46,  arc: 1.8, cd: 0.16, dmg: 0.55, len: 18 },
  spear:     { name: 'Tombak',         style: 'Tusukan',    kind: 'thrust',  range: 90,  arc: 0.3, cd: 0.36, dmg: 1.00, len: 40 },
  naginata:  { name: 'Naginata',       style: 'Sapuan',     kind: 'slash',   range: 80,  arc: 2.2, cd: 0.45, dmg: 1.15, len: 38 },
  halberd:   { name: 'Halberd',        style: 'Hantaman',   kind: 'slash',   range: 84,  arc: 2.0, cd: 0.55, dmg: 1.40, len: 40 },
  battleaxe: { name: 'Battle Axe',     style: 'Belahan',    kind: 'slash',   range: 60,  arc: 2.0, cd: 0.60, dmg: 1.55, len: 30 },
  warhammer: { name: 'War Hammer',     style: 'Ledakan',    kind: 'smash',   range: 64,  arc: 1.2, cd: 0.80, dmg: 2.00, len: 32 },
  mace:      { name: 'Mace',           style: 'Remuk',      kind: 'smash',   range: 56,  arc: 1.2, cd: 0.55, dmg: 1.30, len: 26 },
  scythe:    { name: 'Scythe',         style: 'Putaran',    kind: 'spin',    range: 70,  arc: 6.28, cd: 0.50, dmg: 1.20, len: 36 },
  kusarigama:{ name: 'Kusarigama',     style: 'Rantai',     kind: 'whip',    range: 110, arc: 0.4, cd: 0.50, dmg: 1.10, len: 36 },
  nunchaku:  { name: 'Nunchaku',       style: 'Pukulan',    kind: 'slash',   range: 50,  arc: 1.6, cd: 0.18, dmg: 0.60, len: 22 },
  bow:       { name: 'Busur',          style: 'Panah',      kind: 'proj',    range: 340, arc: 0, cd: 0.45, dmg: 1.00, len: 26, shot: 'arrow', speed: 300, pierce: 1 },
  crossbow:  { name: 'Crossbow',       style: 'Baut',       kind: 'proj',    range: 300, arc: 0, cd: 0.65, dmg: 1.40, len: 24, shot: 'bolt', speed: 340, pierce: 2 },
  chakram:   { name: 'Chakram',        style: 'Cakram',     kind: 'proj',    range: 260, arc: 0, cd: 0.40, dmg: 0.90, len: 12, shot: 'chakram', speed: 200, pierce: 3 },
  knives:    { name: 'Throwing Knives',style: 'Lemparan',   kind: 'proj',    range: 260, arc: 0, cd: 0.30, dmg: 0.50, len: 14, shot: 'dagger', speed: 280, pierce: 1, fan: 3 },
  trident:   { name: 'Trisula',        style: 'Tusukan',    kind: 'thrust',  range: 84,  arc: 0.3, cd: 0.42, dmg: 1.20, len: 38 },
  staff:     { name: 'Staf Sihir',     style: 'Orb Sihir',  kind: 'proj',    range: 300, arc: 0, cd: 0.50, dmg: 1.10, len: 36, shot: 'orb', speed: 220, pierce: 1 },
  shield:    { name: 'Perisai',        style: 'Counter',    kind: 'counter', range: 48,  arc: 2.2, cd: 0.55, dmg: 1.00, len: 20 }
};

/* ---------- 20 KARAKTER (sesuai gambar) ---------- */
const CHARACTERS = [
  { id: 'akira',     name: 'Akira',     wk: 'katana',    el: 'fire',      hair: '#1b1b3a', skin: '#f3c9a5', outfit: '#2d2b6b', accent: '#c9a84a', eyes: '#3a7bff', style: 'spiky', desc: 'Samurai muda, tebasan cepat berapi.' },
  { id: 'seraphina', name: 'Seraphina', wk: 'rapier',    el: 'lightning', hair: '#f2d47a', skin: '#f6d6b8', outfit: '#f2f0ff', accent: '#e6b84a', eyes: '#4a8cff', style: 'long',  desc: 'Pendekar anggun, tusukan kilat.' },
  { id: 'varkas',    name: 'Varkas',    wk: 'longsword', el: 'earth',     hair: '#1d1d2a', skin: '#e8bf9a', outfit: '#2c5a38', accent: '#7bbf5a', eyes: '#3fd36a', style: 'short', desc: 'Ksatria tangguh, pedang berat bumi.' },
  { id: 'evelyne',   name: 'Evelyne',   wk: 'tanto',     el: 'water',     hair: '#d9253a', skin: '#f6d6b8', outfit: '#a8142c', accent: '#ffd0d0', eyes: '#4a8cff', style: 'long',  desc: 'Assassin lincah, bayangan air.' },
  { id: 'raiden',    name: 'Raiden',    wk: 'spear',     el: 'air',       hair: '#b9c8f0', skin: '#f3d2b4', outfit: '#2e4f9a', accent: '#9ad0ff', eyes: '#4a8cff', style: 'spiky', desc: 'Penombak angin, jangkauan panjang.' },
  { id: 'amaya',     name: 'Amaya',     wk: 'naginata',  el: 'air',       hair: '#1f9aa8', skin: '#f3d2b4', outfit: '#1f6f86', accent: '#ffd27a', eyes: '#22d0c0', style: 'twin',  desc: 'Penari naginata, sapuan luas.' },
  { id: 'chronos',   name: 'Chronos',   wk: 'halberd',   el: 'earth',     hair: '#a9c4ff', skin: '#f3d2b4', outfit: '#26356e', accent: '#6aa0ff', eyes: '#4a8cff', style: 'short', desc: 'Penjaga waktu, halberd kokoh.' },
  { id: 'nyxara',    name: 'Nyxara',    wk: 'battleaxe', el: 'fire',      hair: '#6a3ad6', skin: '#f0cfe0', outfit: '#3d2a7a', accent: '#ff7ad9', eyes: '#c86aff', style: 'long',  desc: 'Pejuang kapak, amarah membara.' },
  { id: 'tharion',   name: 'Tharion',   wk: 'warhammer', el: 'lightning', hair: '#e8e8ee', skin: '#e2b894', outfit: '#4a3f2e', accent: '#c9a84a', eyes: '#8a6a3a', style: 'beard', desc: 'Veteran tua, palu penghancur petir.' },
  { id: 'mirael',    name: 'Mirael',    wk: 'mace',      el: 'water',     hair: '#c9b8f0', skin: '#f6d6b8', outfit: '#5b4aa0', accent: '#e8d8ff', eyes: '#6a8cff', style: 'long',  desc: 'Pendeta mace, ombak penyembuh.' },
  { id: 'rurozora',  name: 'Rurozora',  wk: 'scythe',    el: 'water',     hair: '#1b1840', skin: '#e0c0a8', outfit: '#2a2560', accent: '#7a6ad6', eyes: '#ffffff', style: 'hood',  desc: 'Pemburu bertudung, sabit berputar.' },
  { id: 'rindou',    name: 'Rindou',    wk: 'kusarigama',el: 'earth',     hair: '#9a1f3a', skin: '#f6d6b8', outfit: '#7a1a2a', accent: '#f0e0e0', eyes: '#ff8a8a', style: 'long',  desc: 'Kunoichi rantai, serangan jarak jauh.' },
  { id: 'renji',     name: 'Renji',     wk: 'nunchaku',  el: 'lightning', hair: '#3a2a2a', skin: '#e8bf9a', outfit: '#6a4a30', accent: '#ffd84a', eyes: '#5a8cff', style: 'short', desc: 'Petarung jalanan, pukulan kilat.' },
  { id: 'elenara',   name: 'Elenara',   wk: 'bow',       el: 'air',       hair: '#e8d890', skin: '#f6d6b8', outfit: '#4a9a6a', accent: '#d8f0b0', eyes: '#3fd36a', style: 'long',  desc: 'Pemanah elf, panah angin.' },
  { id: 'darius',    name: 'Darius',    wk: 'crossbow',  el: 'fire',      hair: '#aab8f0', skin: '#f3d2b4', outfit: '#2a4a9a', accent: '#ffb84a', eyes: '#4a8cff', style: 'spiky', desc: 'Penembak jitu, baut api.' },
  { id: 'zephyra',   name: 'Zephyra',   wk: 'chakram',   el: 'lightning', hair: '#d0c8f5', skin: '#f6d6b8', outfit: '#e8e0ff', accent: '#b89cff', eyes: '#8a6aff', style: 'long',  desc: 'Penari cakram, kilat memantul.' },
  { id: 'kaelthas',  name: 'Kaelthas',  wk: 'knives',    el: 'air',       hair: '#1a1a40', skin: '#f3d2b4', outfit: '#202858', accent: '#8ab0ff', eyes: '#4a8cff', style: 'short', desc: 'Pelempar pisau, hujan bilah angin.' },
  { id: 'isolde',    name: 'Isolde',    wk: 'trident',   el: 'fire',      hair: '#8ad0f5', skin: '#f6d6b8', outfit: '#e8f4ff', accent: '#4a9cff', eyes: '#4a8cff', style: 'long',  desc: 'Ratu trisula, api di atas lautan.' },
  { id: 'sylvana',   name: 'Sylvana',   wk: 'staff',     el: 'water',     hair: '#b8a0e8', skin: '#f6d6b8', outfit: '#5a3ab8', accent: '#d8a8ff', eyes: '#c86aff', style: 'witch', desc: 'Penyihir agung, orb air sihir.' },
  { id: 'valdrik',   name: 'Valdrik',   wk: 'shield',    el: 'earth',     hair: '#8a4a22', skin: '#e8bf9a', outfit: '#3a3a4a', accent: '#5aa0ff', eyes: '#5a8cff', style: 'short', desc: 'Pelindung perisai, counter batu.' }
];

function baseStats(ch) {
  const w = WEAPONS[ch.wk], e = ch.el;
  return {
    hp: Math.round((90 + (w.dmg - 1) * 35) * (e === 'earth' ? 1.25 : 1)),
    mp: 50 + (e === 'water' ? 10 : 0),
    atk: 9,
    spd: Math.round((78 + (0.45 - w.cd) * 28) * (e === 'air' ? 1.15 : e === 'lightning' ? 1.08 : 1))
  };
}
function secList(ch) { return ELEM_KEYS.filter(e => e !== ch.el); }
const SEC_REQ = [1, 1, 3, 5]; // level unlock elemen sekunder

/* ---------- 40 SKILL KOMBINASI (10 pasangan x 4) ---------- */
const PAIRS = [['fire','water'],['fire','earth'],['fire','lightning'],['fire','air'],['water','earth'],
               ['water','lightning'],['water','air'],['earth','lightning'],['earth','air'],['lightning','air']];
const PAIR_NAMES = {
  'fire+water':      ['Steam Burst', 'Boiling Wave', 'Vapor Dragon', 'Scalding Cyclone'],
  'fire+earth':      ['Lava Slash', 'Magma Eruption', 'Molten Golem', 'Volcanic Meteor'],
  'fire+lightning':  ['Plasma Blade', 'Thunder Flame', 'Electric Inferno', 'Lightning Nova'],
  'fire+air':        ['Flame Cyclone', 'Burning Tornado', 'Solar Wind', 'Inferno Storm'],
  'water+earth':     ['Mud Surge', 'Crystal Wave', 'Swamp Prison', 'Tsunami Quake'],
  'water+lightning': ['Electric Current', 'Storm Surge', 'Aqua Chain', 'Thunder Tide'],
  'water+air':       ['Frost Gale', 'Ice Spear Storm', 'Mist Veil', 'Blizzard Tempest'],
  'earth+lightning': ['Magnetic Pulse', 'Quake Strike', 'Iron Storm', 'Titan Thunder'],
  'earth+air':       ['Sand Slash', 'Dust Devil', 'Rock Cyclone', 'Desert Tempest'],
  'lightning+air':   ['Thunder Gust', 'Sonic Boom', 'Storm Bolt', 'Tempest Nova']
};
const PAIR_FX = { // motif visual unik tiap pasangan
  'fire+water': ['puff','drop'], 'fire+earth': ['chunk','ember'], 'fire+lightning': ['spark','ember'], 'fire+air': ['swirl','ember'],
  'water+earth': ['chunk','drop'], 'water+lightning': ['spark','drop'], 'water+air': ['shard','swirl'],
  'earth+lightning': ['spark','chunk'], 'earth+air': ['swirl','dust'], 'lightning+air': ['spark','swirl']
};
const TIER_LABEL = ['Teknik', 'Gelombang', 'Zona', 'Ultimate'];
const TIER = [
  { mana: 12, cd: 3.5, dmg: 1.9, range: 150, aoe: 46,  cast: 0.25, crit: 1.5, req: 1 },
  { mana: 20, cd: 6,   dmg: 2.6, range: 190, aoe: 60,  cast: 0.35, crit: 1.6, req: 2 },
  { mana: 30, cd: 11,  dmg: 1.3, range: 170, aoe: 90,  cast: 0.45, crit: 1.7, req: 4 },
  { mana: 55, cd: 26,  dmg: 7.0, range: 300, aoe: 230, cast: 0.85, crit: 2.0, req: 7 }
];
const SKILLS = {}, SKILL_LIST = [];
PAIRS.forEach((pr, pi) => {
  const key = pr.join('+');
  PAIR_NAMES[key].forEach((nm, ti) => {
    const idx = pi * 4 + ti, T = TIER[ti], m = 1 + (((idx * 7) % 5) - 2) * 0.04;
    const s = { id: key + ':' + ti, pair: key, elems: pr, name: nm, tier: ti,
      mana: Math.round(T.mana * (2 - m)), cd: +(T.cd * (2 - m)).toFixed(1), dmg: +(T.dmg * m).toFixed(2),
      range: Math.round(T.range * m), aoe: Math.round(T.aoe * m), cast: T.cast, crit: +(T.crit + (idx % 3) * 0.05).toFixed(2),
      req: T.req, fx: PAIR_FX[key] };
    SKILLS[s.id] = s; SKILL_LIST.push(s);
  });
});
/* nama khusus sinergi karakter + senjata (menggantikan skill tier 1 tiap pasangan) */
const SYNERGY = {
  akira:     { water: 'Steam Katana Slash', earth: 'Magma Blade', lightning: 'Plasma Iaijutsu', air: 'Flame Cyclone Slash' },
  seraphina: { fire: 'Thunder Pierce', water: 'Electric Aqua Lance', earth: 'Magnetic Rapier', air: 'Lightning Dash Thrust' },
  varkas:    { fire: 'Magma Greatsword', water: 'Crystal Wave', lightning: 'Magnetic Earthquake', air: 'Stone Cyclone' },
  evelyne:   { fire: 'Steam Shadow Strike', earth: 'Mud Phantom Slash', lightning: 'Electric Water Dash', air: 'Aqua Wind Dance' },
  raiden:    { fire: 'Inferno Spear', water: 'Tidal Wind Pierce', earth: 'Sandstorm Spear', lightning: 'Thunderstorm Javelin' }
};
function skillName(ch, s) {
  if (s.tier === 0) { const o = s.elems.find(e => e !== ch.el); const n = SYNERGY[ch.id] && SYNERGY[ch.id][o]; if (n) return n; }
  return s.name;
}

/* ---------- MUSUH & BOS ---------- */
const ENEMY_TYPES = {
  slime: { name: 'Slime',     hp: 32, dmg: 6,  spd: 26, exp: 9,  r: 6 },
  bat:   { name: 'Kelelawar', hp: 20, dmg: 5,  spd: 58, exp: 8,  r: 5, fly: true },
  wolf:  { name: 'Serigala',  hp: 46, dmg: 9,  spd: 60, exp: 14, r: 7 },
  mage:  { name: 'Penyihir Bayangan', hp: 30, dmg: 8, spd: 30, exp: 16, r: 6, ranged: true }
};
const ZONES = [
  { name: 'Hutan Aetheria',     lv: [1, 3],  elems: ['earth', 'water', 'air'],   types: ['slime', 'slime', 'bat', 'wolf'], n: 26 },
  { name: 'Dataran Abu Bara',   lv: [4, 7],  elems: ['fire', 'earth'],           types: ['slime', 'wolf', 'mage', 'bat'],  n: 26 },
  { name: 'Puncak Badai Petir', lv: [7, 10], elems: ['lightning', 'air', 'water'], types: ['wolf', 'mage', 'bat', 'mage'],  n: 26 }
];
const BOSSES = [
  { id: 'brontus',  name: 'Brontus, Penjaga Hutan',   el: 'earth',     hp: 650,  dmg: 14, lv: 3, r: 16, spd: 34, exp: 220, tx: 32,  ty: 22, rec: 'Lv 3+' },
  { id: 'ignareth', name: 'Ignareth, Naga Abu',       el: 'fire',      hp: 1700, dmg: 22, lv: 6, r: 18, spd: 40, exp: 520, tx: 68,  ty: 58, rec: 'Lv 6+' },
  { id: 'zephyron', name: 'Zephyron, Raja Badai',     el: 'lightning', hp: 3800, dmg: 32, lv: 9, r: 15, spd: 44, exp: 1200, tx: 106, ty: 36, rec: 'Lv 9+' }
];
const SPAWN_TILE = [10, 40];
const EXP_NEED = L => Math.round(28 * Math.pow(L, 1.45));
const MAX_LV = 15;
