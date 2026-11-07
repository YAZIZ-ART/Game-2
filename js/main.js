/* =====================================================================
   Aetheria: Echoes of the Five Elements
   js/config.js : semua data game (elemen, kombinasi, senjata, karakter, musuh)
   ===================================================================== */
'use strict';

const CFG = {
  W: 480,          // lebar kanvas internal
  H: 270,          // tinggi kanvas internal
  TILE: 16,        // ukuran satu tile
  GAME_TITLE: 'Aetheria: Echoes of the Five Elements',
  PATH: {          // lokasi gambar, nama file = id (huruf kecil) + .png
    characters: 'assets/characters/',
    weapons:    'assets/weapons/',
    enemies:    'assets/enemies/',
    effects:    'assets/effects/',
    tiles:      'assets/tiles/',
    maps:       'assets/maps/',
    ui:         'assets/ui/',
    audio:      'assets/audio/'
  },
  PLAYER: {
    baseHp: 100, baseMp: 60, mpRegen: 4,   // MP per detik
    xpBase: 40, xpGrowth: 1.35,
    dashSpeed: 220, dashTime: 140, dashCd: 900
  }
};

/* ---------------------------------------------------------------------
   5 ELEMEN
   --------------------------------------------------------------------- */
const ELEMENTS = {
  api:   { id: 'api',   name: 'Api',   icon: '🔥', color: '#ff5a2a', glow: '#ffb347', dark: '#7a1c08' },
  air:   { id: 'air',   name: 'Air',   icon: '💧', color: '#3aa0ff', glow: '#9fd8ff', dark: '#0d3c7a' },
  tanah: { id: 'tanah', name: 'Tanah', icon: '🪨', color: '#c8944f', glow: '#f0d29a', dark: '#5a3b16' },
  petir: { id: 'petir', name: 'Petir', icon: '⚡', color: '#ffd93a', glow: '#fff7b0', dark: '#8a6b00' },
  udara: { id: 'udara', name: 'Udara', icon: '🌀', color: '#7fe8ff', glow: '#e0fbff', dark: '#1f7a8c' }
};
const ELEMENT_ORDER = ['api', 'air', 'tanah', 'petir', 'udara'];

/* ---------------------------------------------------------------------
   20 KOMBINASI ELEMEN (urutan penting: elemen utama + elemen kedua)
   kind : bentuk efek  -> dipakai combat.js
   fx   : gaya partikel -> dipakai particles.js
   dmg  : pengali damage, r : radius (px), dur : durasi (ms)
   status: burn | slow | stun | freeze | blind | confuse | pull | knock
   --------------------------------------------------------------------- */
const COMBOS = {};
(function () {
  function C(a, b, name, kind, fx, o) {
    COMBOS[a + '+' + b] = Object.assign({
      key: a + '+' + b, a: a, b: b, name: name, kind: kind, fx: fx,
      dmg: 1, r: 40, dur: 0, mp: 25, status: null, statusTime: 0,
      colors: [ELEMENTS[a].color, ELEMENTS[b].color, ELEMENTS[b].glow]
    }, o || {});
  }

  /* Baris Api */
  C('api', 'air',     'Uap',            'area',   'steam',    { dmg: 0.8, r: 46, dur: 3000, mp: 22, status: 'blind',   statusTime: 2000, colors: ['#ffffff', '#cfd8e8', '#9aa6c0'] });
  C('api', 'tanah',   'Lava',           'pool',   'lava',     { dmg: 0.6, r: 38, dur: 4500, mp: 30, status: 'burn',    statusTime: 2500, colors: ['#ff3a10', '#ff9a2a', '#5a1a08'] });
  C('api', 'petir',   'Plasma',         'orb',    'plasma',   { dmg: 2.2, r: 30, dur: 0,    mp: 34, status: 'stun',    statusTime: 600,  colors: ['#ff4dff', '#b04dff', '#ffffff'] });
  C('api', 'udara',   'Pusaran Api',    'vortex', 'firevortex',{ dmg: 0.7, r: 44, dur: 3200, mp: 30, status: 'pull',    statusTime: 300,  colors: ['#ff5a2a', '#ffb347', '#ffe08a'] });

  /* Baris Air */
  C('air', 'tanah',   'Lumpur',         'pool',   'mud',      { dmg: 0.3, r: 46, dur: 5000, mp: 20, status: 'slow',    statusTime: 2500, colors: ['#6b4a2a', '#8a6b3a', '#3a2a18'] });
  C('air', 'petir',   'Air Bermuatan',  'chain',  'chargedwater',{ dmg: 1.3, r: 80, dur: 0, mp: 28, status: 'stun',    statusTime: 700,  chain: 4, colors: ['#3aa0ff', '#ffd93a', '#ffffff'] });
  C('air', 'udara',   'Es',             'cone',   'ice',      { dmg: 1.5, r: 70, dur: 0,    mp: 30, status: 'freeze',  statusTime: 1600, colors: ['#bfeaff', '#7fe8ff', '#ffffff'] });
  C('air', 'api',     'Gelombang Pasang','line',  'tidal',    { dmg: 1.7, r: 120, dur: 0,   mp: 32, status: 'knock',   statusTime: 250,  colors: ['#2a7fe0', '#9fd8ff', '#ffffff'] });

  /* Baris Tanah */
  C('tanah', 'api',   'Batu Panas',     'rain',   'hotrock',  { dmg: 1.6, r: 56, dur: 1800, mp: 34, status: 'burn',    statusTime: 2000, count: 7, colors: ['#ff7a2a', '#c8944f', '#3a2a18'] });
  C('tanah', 'petir', 'Magnetisme',     'pull',   'magnet',   { dmg: 0.9, r: 70, dur: 1200, mp: 28, status: 'stun',    statusTime: 900,  colors: ['#b04dff', '#ffd93a', '#c8944f'] });
  C('tanah', 'udara', 'Debu Angin',     'area',   'dust',     { dmg: 0.4, r: 52, dur: 3500, mp: 22, status: 'blind',   statusTime: 2500, colors: ['#d8b27a', '#c8944f', '#f0d29a'] });
  C('tanah', 'air',   'Tembok Batu',    'wall',   'rockwall', { dmg: 0.0, r: 48, dur: 5000, mp: 26, status: null,      statusTime: 0,    colors: ['#9a7a4a', '#c8944f', '#5a3b16'] });

  /* Baris Petir */
  C('petir', 'api',   'Ledakan Petir',  'blast',  'blast',    { dmg: 2.6, r: 52, dur: 0,    mp: 38, status: 'knock',   statusTime: 300,  colors: ['#ffd93a', '#ff5a2a', '#ffffff'] });
  C('petir', 'air',   'Medan Listrik',  'area',   'efield',   { dmg: 0.7, r: 56, dur: 4000, mp: 32, status: 'stun',    statusTime: 400,  colors: ['#ffd93a', '#3aa0ff', '#ffffff'] });
  C('petir', 'udara', 'Badai Petir',    'storm',  'thunderstorm',{ dmg: 1.4, r: 80, dur: 3500, mp: 40, status: 'stun',  statusTime: 500,  strikes: 9, colors: ['#ffd93a', '#7fe8ff', '#b8a0ff'] });
  C('petir', 'tanah', 'Getaran Seismik','ring',   'quake',    { dmg: 1.8, r: 72, dur: 0,    mp: 34, status: 'stun',    statusTime: 1000, colors: ['#c8944f', '#ffd93a', '#5a3b16'] });

  /* Baris Udara */
  C('udara', 'api',   'Angin Topan',    'cone',   'firewind', { dmg: 1.9, r: 80, dur: 0,    mp: 34, status: 'burn',    statusTime: 2000, colors: ['#7fe8ff', '#ff5a2a', '#ffe08a'] });
  C('udara', 'air',   'Kabut Ilusi',    'area',   'mist',     { dmg: 0.0, r: 60, dur: 4500, mp: 28, status: 'confuse', statusTime: 3000, colors: ['#b8a0ff', '#9fd8ff', '#ffffff'] });
  C('udara', 'tanah', 'Debu Sihir',     'buff',   'magicdust',{ dmg: 0.0, r: 40, dur: 8000, mp: 30, status: null,      statusTime: 0,    buff: { speed: 1.3, def: 1.4, regen: 3 }, colors: ['#e0b8ff', '#f0d29a', '#ffffff'] });
  C('udara', 'petir', 'Tornado Petir',  'tornado','tornado',  { dmg: 0.9, r: 36, dur: 3500, mp: 40, status: 'stun',    statusTime: 400,  colors: ['#7fe8ff', '#ffd93a', '#ffffff'] });
})();

/* Ambil kombinasi dari dua elemen (urutan: utama, kedua). Elemen sama = tidak ada kombinasi. */
function getCombo(a, b) { return COMBOS[a + '+' + b] || null; }

/* ---------------------------------------------------------------------
   20 SENJATA
   kind: arc (tebasan) | thrust (tusukan) | smash (hantam area) | chain (rantai)
         flurry (serangan cepat) | projectile | boomerang | bash (perisai)
   dmg: damage dasar, cd: jeda serang (ms), reach: jangkauan (px), arc: sudut tebasan (derajat)
   skill: nama senjata khusus seperti di gambar rancangan
   --------------------------------------------------------------------- */
const WEAPONS = {
  katana:    { id: 'katana',    name: 'Katana',         skill: 'Moonveil',      kind: 'arc',        dmg: 14, cd: 380, reach: 26, arc: 100, trail: '#b58cff' },
  rapier:    { id: 'rapier',    name: 'Rapier',         skill: 'Pierce',        kind: 'thrust',     dmg: 11, cd: 240, reach: 34, width: 8,  trail: '#ffe08a' },
  longsword: { id: 'longsword', name: 'Longsword',      skill: 'Soulrend',      kind: 'arc',        dmg: 18, cd: 520, reach: 32, arc: 120, lifesteal: 0.08, trail: '#7dff6a' },
  tanto:     { id: 'tanto',     name: 'Tanto',          skill: 'Bloodlust',     kind: 'arc',        dmg: 9,  cd: 180, reach: 20, arc: 80,  bleed: true, trail: '#ff4a5a' },
  spear:     { id: 'spear',     name: 'Spear (Yari)',   skill: 'Tempest',       kind: 'thrust',     dmg: 15, cd: 420, reach: 44, width: 10, trail: '#9fd8ff' },
  naginata:  { id: 'naginata',  name: 'Naginata',       skill: 'Beheading',     kind: 'arc',        dmg: 16, cd: 480, reach: 40, arc: 180, trail: '#c08cff' },
  halberd:   { id: 'halberd',   name: 'Halberd',        skill: 'Chrono Break',  kind: 'arc',        dmg: 20, cd: 600, reach: 38, arc: 140, slowOnHit: 0.3, trail: '#6fb8ff' },
  battleaxe: { id: 'battleaxe', name: 'Battle Axe',     skill: 'Dimensional',   kind: 'smash',      dmg: 26, cd: 760, reach: 30, radius: 30, trail: '#b06cff' },
  warhammer: { id: 'warhammer', name: 'War Hammer',     skill: 'Earthshatter',  kind: 'smash',      dmg: 30, cd: 900, reach: 34, radius: 36, stun: 500, trail: '#ffc36a' },
  mace:      { id: 'mace',      name: 'Mace',           skill: 'Phantom',       kind: 'arc',        dmg: 17, cd: 500, reach: 28, arc: 110, fear: 900, trail: '#c08cff' },
  scythe:    { id: 'scythe',    name: 'Scythe',         skill: 'Voidbind',      kind: 'arc',        dmg: 19, cd: 560, reach: 38, arc: 200, trail: '#8a4aff' },
  rantai:    { id: 'rantai',    name: 'Kusarigama (Rantai)', skill: 'Tidal Chain', kind: 'chain',   dmg: 13, cd: 450, reach: 58, width: 6,  pull: true, trail: '#6fb8ff' },
  nunchaku:  { id: 'nunchaku',  name: 'Nunchaku',       skill: 'Cyclone',       kind: 'flurry',     dmg: 7,  cd: 160, reach: 22, arc: 150, trail: '#ffb066' },
  bow:       { id: 'bow',       name: 'Bow',            skill: 'Wildshot',      kind: 'projectile', dmg: 12, cd: 420, speed: 230, range: 210, pierce: 0, proj: 'arrow',  trail: '#9bff5a' },
  crossbow:  { id: 'crossbow',  name: 'Crossbow',       skill: 'Frostbite',     kind: 'projectile', dmg: 18, cd: 650, speed: 290, range: 230, pierce: 1, proj: 'bolt',   trail: '#9fe8ff' },
  chakram:   { id: 'chakram',   name: 'Chakram',        skill: 'Anti-Gravity',  kind: 'boomerang',  dmg: 11, cd: 600, speed: 210, range: 120, proj: 'ring',   trail: '#ffb066' },
  knives:    { id: 'knives',    name: 'Throwing Knives',skill: 'Ricochet',      kind: 'projectile', dmg: 6,  cd: 380, speed: 260, range: 170, count: 3, spread: 16, ricochet: 2, proj: 'knife', trail: '#9fd8ff' },
  trident:   { id: 'trident',   name: 'Trident',        skill: 'Deepcurrent',   kind: 'thrust',     dmg: 14, cd: 400, reach: 40, width: 12, trail: '#4ad0ff' },
  staff:     { id: 'staff',     name: 'Staff',          skill: 'Soulflare',     kind: 'projectile', dmg: 15, cd: 520, speed: 170, range: 190, homing: true, proj: 'orb', trail: '#c9a0ff' },
  shield:    { id: 'shield',    name: 'Shield',         skill: 'Aegis',         kind: 'bash',       dmg: 10, cd: 500, reach: 24, arc: 120, block: 0.5, knock: 180, trail: '#ffd24a' }
};

/* ---------------------------------------------------------------------
   20 KARAKTER (urutan sama dengan gambar rancangan)
   element = elemen utama (bisa kamu ubah). Masing-masing elemen dipakai 4 karakter.
   color = warna sementara kalau gambar assets/characters/<id>.png belum ada.
   hp/mp/atk/def/spd = pengali dari nilai dasar.
   --------------------------------------------------------------------- */
const CHARACTERS = [
  { no: 1,  id: 'akira',     name: 'Akira',     weapon: 'katana',    element: 'petir', color: '#7b5cff', hp: 1.0, mp: 1.0, atk: 1.1, def: 0.9, spd: 1.1 },
  { no: 2,  id: 'seraphina', name: 'Seraphina', weapon: 'rapier',    element: 'api',   color: '#ffd98a', hp: 0.9, mp: 1.2, atk: 1.1, def: 0.9, spd: 1.2 },
  { no: 3,  id: 'varkas',    name: 'Varkas',    weapon: 'longsword', element: 'tanah', color: '#5dff4a', hp: 1.2, mp: 0.9, atk: 1.2, def: 1.1, spd: 0.9 },
  { no: 4,  id: 'evelyne',   name: 'Evelyne',   weapon: 'tanto',     element: 'api',   color: '#e8334a', hp: 0.8, mp: 1.0, atk: 1.2, def: 0.8, spd: 1.3 },
  { no: 5,  id: 'raiden',    name: 'Raiden',    weapon: 'spear',     element: 'air',   color: '#6fb8ff', hp: 1.0, mp: 1.0, atk: 1.1, def: 1.0, spd: 1.1 },
  { no: 6,  id: 'amaya',     name: 'Amaya',     weapon: 'naginata',  element: 'udara', color: '#59e08a', hp: 1.0, mp: 1.1, atk: 1.1, def: 0.9, spd: 1.1 },
  { no: 7,  id: 'chronos',   name: 'Chronos',   weapon: 'halberd',   element: 'air',   color: '#4a7cff', hp: 1.1, mp: 1.2, atk: 1.1, def: 1.1, spd: 0.9 },
  { no: 8,  id: 'nyxara',    name: 'Nyxara',    weapon: 'battleaxe', element: 'petir', color: '#a050ff', hp: 1.2, mp: 1.0, atk: 1.3, def: 1.0, spd: 0.8 },
  { no: 9,  id: 'tharion',   name: 'Tharion',   weapon: 'warhammer', element: 'tanah', color: '#e8b04a', hp: 1.4, mp: 0.8, atk: 1.3, def: 1.3, spd: 0.7 },
  { no: 10, id: 'mirael',    name: 'Mirael',    weapon: 'mace',      element: 'udara', color: '#c08cff', hp: 1.1, mp: 1.2, atk: 1.0, def: 1.1, spd: 0.9 },
  { no: 11, id: 'kurozora',  name: 'Kurozora',  weapon: 'scythe',    element: 'petir', color: '#8a4aff', hp: 1.0, mp: 1.1, atk: 1.3, def: 0.8, spd: 1.0 },
  { no: 12, id: 'rindou',    name: 'Rindou',    weapon: 'rantai',    element: 'api',   color: '#c0243c', hp: 1.0, mp: 1.0, atk: 1.1, def: 0.9, spd: 1.1 },
  { no: 13, id: 'renji',     name: 'Renji',     weapon: 'nunchaku',  element: 'api',   color: '#ff8a2a', hp: 1.0, mp: 0.9, atk: 1.0, def: 0.9, spd: 1.3 },
  { no: 14, id: 'elenara',   name: 'Elenara',   weapon: 'bow',       element: 'tanah', color: '#9bff5a', hp: 0.8, mp: 1.2, atk: 1.1, def: 0.8, spd: 1.2 },
  { no: 15, id: 'darius',    name: 'Darius',    weapon: 'crossbow',  element: 'air',   color: '#5ab8ff', hp: 0.9, mp: 1.0, atk: 1.3, def: 0.9, spd: 1.0 },
  { no: 16, id: 'zephyra',   name: 'Zephyra',   weapon: 'chakram',   element: 'udara', color: '#b08cff', hp: 0.9, mp: 1.1, atk: 1.0, def: 0.9, spd: 1.3 },
  { no: 17, id: 'kaelthas',  name: 'Kaelthas',  weapon: 'knives',    element: 'petir', color: '#7a5cd0', hp: 0.8, mp: 1.0, atk: 1.1, def: 0.8, spd: 1.4 },
  { no: 18, id: 'isolde',    name: 'Isolde',    weapon: 'trident',   element: 'air',   color: '#4ad0ff', hp: 1.0, mp: 1.2, atk: 1.1, def: 1.0, spd: 1.0 },
  { no: 19, id: 'sylvana',   name: 'Sylvana',   weapon: 'staff',     element: 'udara', color: '#c9a0ff', hp: 0.8, mp: 1.5, atk: 1.2, def: 0.7, spd: 1.0 },
  { no: 20, id: 'valdrik',   name: 'Valdrik',   weapon: 'shield',    element: 'tanah', color: '#ffd24a', hp: 1.5, mp: 0.8, atk: 0.8, def: 1.5, spd: 0.8 }
];

function getCharacter(id) { return CHARACTERS.find(function (c) { return c.id === id; }) || CHARACTERS[0]; }

/* ---------------------------------------------------------------------
   MUSUH (gambar: assets/enemies/<id>.png, kalau belum ada pakai warna)
   behavior: chase (mengejar) | ranged (menembak) | charge (menyerbu) | boss
   --------------------------------------------------------------------- */
const ENEMIES = {
  slime_api:   { id: 'slime_api',   name: 'Slime Bara',      element: 'api',   hp: 30,  atk: 6,  spd: 34, xp: 8,  size: 12, color: '#ff6a3a', behavior: 'chase'  },
  slime_air:   { id: 'slime_air',   name: 'Slime Embun',     element: 'air',   hp: 30,  atk: 6,  spd: 34, xp: 8,  size: 12, color: '#4aa8ff', behavior: 'chase'  },
  golem_tanah: { id: 'golem_tanah', name: 'Golem Kerikil',   element: 'tanah', hp: 70,  atk: 10, spd: 22, xp: 16, size: 16, color: '#a8794a', behavior: 'chase'  },
  wisp_petir:  { id: 'wisp_petir',  name: 'Wisp Kilat',      element: 'petir', hp: 24,  atk: 8,  spd: 46, xp: 12, size: 10, color: '#ffe24a', behavior: 'ranged', range: 110, shootCd: 1800, projSpeed: 120 },
  sprite_udara:{ id: 'sprite_udara',name: 'Peri Angin',      element: 'udara', hp: 26,  atk: 7,  spd: 50, xp: 12, size: 10, color: '#8ff0ff', behavior: 'charge' },
  guardian:    { id: 'guardian',    name: 'Penjaga Aetheria',element: 'api',   hp: 600, atk: 18, spd: 28, xp: 200,size: 28, color: '#b06cff', behavior: 'boss'   }
};

/* Status efek: durasi default dan warna partikel */
const STATUS = {
  burn:    { color: '#ff7a2a', tick: 4  },   // damage per detik
  slow:    { color: '#8a6b3a', mult: 0.5 },
  stun:    { color: '#ffd93a' },
  freeze:  { color: '#bfeaff' },
  blind:   { color: '#cfd8e8' },
  confuse: { color: '#b8a0ff' },
  pull:    { color: '#ffb347' },
  knock:   { color: '#9fd8ff' },
  bleed:   { color: '#ff4a5a', tick: 3 }
};
