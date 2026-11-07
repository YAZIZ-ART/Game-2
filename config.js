/* =====================================================================
   Aetheria: Echoes of the Five Elements
   config.js : semua data game (elemen, 40 kombinasi, senjata, karakter, musuh)
   ===================================================================== */
'use strict';

const CFG = {
  W: 480,
  H: 270,
  TILE: 16,
  GAME_TITLE: 'Aetheria: Echoes of the Five Elements',
  PATH: {
    characters: 'assets/characters/',
    weapons:    'assets/weapons/',
    enemies:    'assets/enemies/',
    effects:    'assets/effects/',
    tiles:      'assets/tiles/',
    maps:       'assets/maps/',
    ui:         'assets/ui/',
    audio:      'assets/audio/'
  }
};

/* ---------- 5 elemen dasar (kunci "petir" = elemen Listrik, "angin" = Udara) ---------- */
const ELEMENTS = {
  api:   { id: 'api',   name: 'Api',     icon: '\uD83D\uDD25', color: '#ff5a2a', dark: '#5a1608', glow: '#ffb07a' },
  air:   { id: 'air',   name: 'Air',     icon: '\uD83D\uDCA7', color: '#3aa0ff', dark: '#0c2e5a', glow: '#9fd8ff' },
  tanah: { id: 'tanah', name: 'Tanah',   icon: '\uD83E\uDEA8', color: '#c8944f', dark: '#4a3318', glow: '#f0d09a' },
  petir: { id: 'petir', name: 'Listrik', icon: '\u26A1',       color: '#ffd93a', dark: '#544508', glow: '#fff3a0' },
  angin: { id: 'angin', name: 'Udara',   icon: '\uD83C\uDF00', color: '#5eead4', dark: '#0f3d3a', glow: '#b8fff3' }
};
const ELEMENT_IDS = ['api', 'air', 'tanah', 'petir', 'angin'];

/* ---------- 40 kombinasi ----------
   Urutan penting: elemen A = elemen utama (senjata), elemen B = elemen tambahan.
   Ada 20 pasangan berurutan, masing-masing punya 2 kombinasi:
   tier 1 = dasar, tier 2 = lanjutan (lebih kuat).
   Format: [id, nama, A, B, tier] */
const COMBO_DATA = [
  // ---- Api ----
  ['uap',            'Uap',              'api', 'air',   1],
  ['lava',           'Lava',             'api', 'tanah', 1],
  ['plasma',         'Plasma',           'api', 'petir', 1],
  ['pusaran_api',    'Pusaran Api',      'api', 'angin', 1],
  ['geyser_panas',   'Geyser Panas',     'api', 'air',   2],
  ['naga_bara',      'Naga Bara',        'api', 'tanah', 2],
  ['halilintar',     'Halilintar',       'api', 'petir', 2],
  ['semburan_surya', 'Semburan Surya',   'api', 'angin', 2],
  // ---- Air ----
  ['lumpur',         'Lumpur',           'air', 'tanah', 1],
  ['air_bermuatan',  'Air Bermuatan',    'air', 'petir', 1],
  ['es',             'Es',               'air', 'angin', 1],
  ['gelombang_pasang','Gelombang Pasang','air', 'api',   1],
  ['rimba_purba',    'Rimba Purba',      'air', 'tanah', 2],
  ['nadi_kehidupan', 'Nadi Kehidupan',   'air', 'petir', 2],
  ['pelangi',        'Pelangi',          'air', 'angin', 2],
  ['tsunami',        'Tsunami',          'air', 'api',   2],
  // ---- Tanah ----
  ['batu_panas',     'Batu Panas',       'tanah', 'api',   1],
  ['magnetisme',     'Magnetisme',       'tanah', 'petir', 1],
  ['debu_angin',     'Debu Angin',       'tanah', 'angin', 1],
  ['tembok_batu',    'Tembok Batu',      'tanah', 'air',   1],
  ['meteor_bara',    'Meteor Bara',      'tanah', 'api',   2],
  ['titan_mekanik',  'Titan Mekanik',    'tanah', 'petir', 2],
  ['langkah_gemuruh','Langkah Gemuruh',  'tanah', 'angin', 2],
  ['banjir_bandang', 'Banjir Bandang',   'tanah', 'air',   2],
  // ---- Listrik (petir) ----
  ['ledakan_petir',  'Ledakan Petir',    'petir', 'api',   1],
  ['medan_listrik',  'Medan Listrik',    'petir', 'air',   1],
  ['badai_petir',    'Badai Petir',      'petir', 'angin', 1],
  ['getaran_seismik','Getaran Seismik',  'petir', 'tanah', 1],
  ['kilat_membara',  'Kilat Membara',    'petir', 'api',   2],
  ['arus_listrik',   'Arus Listrik',     'petir', 'air',   2],
  ['kilat_ruang',    'Kilat Ruang',      'petir', 'angin', 2],
  ['gelombang_sonik','Gelombang Sonik',  'petir', 'tanah', 2],
  // ---- Udara (angin) ----
  ['angin_topan',    'Angin Topan',      'angin', 'api',   1],
  ['kabut_ilusi',    'Kabut Ilusi',      'angin', 'air',   1],
  ['debu_silir',     'Debu Silir',       'angin', 'tanah', 1],
  ['tornado_petir',  'Tornado Petir',    'angin', 'petir', 1],
  ['badai_bara',     'Badai Bara',       'angin', 'api',   2],
  ['hujan',          'Hujan',            'angin', 'air',   2],
  ['fatamorgana',    'Fatamorgana',      'angin', 'tanah', 2],
  ['aurora',         'Aurora',           'angin', 'petir', 2]
];

const COMBOS = {};
COMBO_DATA.forEach(function (c, i) {
  var tier = c[4];
  COMBOS[c[0]] = {
    id: c[0], name: c[1], a: c[2], b: c[3], tier: tier,
    color: ELEMENTS[c[2]].color, glow: ELEMENTS[c[3]].glow,
    damage: (tier === 1 ? 1.5 : 2.0) + (i % 5) * 0.1,  // pengali damage
    cost: (tier === 1 ? 20 : 35) + (i % 4) * 5,        // biaya mana
    cooldown: (tier === 1 ? 3 : 5) + (i % 3)           // detik
  };
});

/* Semua kombinasi untuk pasangan (A utama, B tambahan), tier 1 lalu tier 2. */
function getCombos(a, b) {
  return COMBO_DATA.filter(function (c) { return c[2] === a && c[3] === b; })
                   .sort(function (x, y) { return x[4] - y[4]; })
                   .map(function (c) { return COMBOS[c[0]]; });
}

/* Satu kombinasi untuk pasangan elemen. tier default 1. Null jika tidak ada. */
function getCombo(a, b, tier) {
  var list = getCombos(a, b);
  var t = tier || 1;
  for (var i = 0; i < list.length; i++) if (list[i].tier === t) return list[i];
  return list.length ? list[0] : null;
}

/* ---------- 20 senjata + karakter: [id, karakter, senjata, elemen] ---------- */
const WEAPON_DATA = [
  ['katana',   'Akira',     'Katana',        'api'],
  ['rapier',   'Seraphina', 'Rapier',        'petir'],
  ['longsword','Varkas',    'Longsword',     'tanah'],
  ['tanto',    'Evelyne',   'Tanto',         'air'],
  ['spear',    'Raiden',    'Spear',         'angin'],
  ['naginata', 'Amaya',     'Naginata',      'angin'],
  ['halberd',  'Chronos',   'Halberd',       'tanah'],
  ['battleaxe','Nyxara',    'Battle Axe',    'api'],
  ['warhammer','Tharion',   'War Hammer',    'petir'],
  ['mace',     'Mirael',    'Mace',          'air'],
  ['scythe',   'Rurozora',  'Scythe',        'air'],
  ['kusarigama','Rindou',   'Kusarigama',    'tanah'],
  ['nunchaku', 'Renji',     'Nunchaku',      'petir'],
  ['bow',      'Elenara',   'Bow',           'angin'],
  ['crossbow', 'Darius',    'Crossbow',      'api'],
  ['chakram',  'Zephyra',   'Chakram',       'petir'],
  ['knives',   'Kaelthas',  'Throwing Knives','angin'],
  ['trident',  'Isolde',    'Trident',       'api'],
  ['staff',    'Sylvana',   'Staff',         'air'],
  ['shield',   'Valdrik',   'Shield',        'tanah']
];

const WEAPONS = {};
const CHARACTERS = {};
WEAPON_DATA.forEach(function (w, i) {
  WEAPONS[w[0]] = {
    id: w[0], name: w[2], element: w[3],
    damage: 8 + (i % 6) * 2,
    range: 18 + (i % 5) * 6,
    speed: 0.35 + (i % 4) * 0.05
  };
  CHARACTERS[w[1].toLowerCase()] = {
    id: w[1].toLowerCase(), name: w[1], weapon: w[0], element: w[3],
    hp: 100 + (i % 5) * 10,
    mana: 60 + (i % 4) * 10,
    speed: 70 + (i % 3) * 5
  };
});
const CHARACTER_IDS = Object.keys(CHARACTERS);
const WEAPON_IDS = Object.keys(WEAPONS);

/* ---------- Musuh ---------- */
const ENEMIES = {
  slime:    { id: 'slime',    name: 'Slime',        element: 'air',   hp: 30,  damage: 4,  speed: 30, xp: 5 },
  imp:      { id: 'imp',      name: 'Imp Bara',     element: 'api',   hp: 40,  damage: 6,  speed: 45, xp: 8 },
  golem:    { id: 'golem',    name: 'Golem Batu',   element: 'tanah', hp: 90,  damage: 10, speed: 22, xp: 15 },
  wisp:     { id: 'wisp',     name: 'Wisp Kilat',   element: 'petir', hp: 35,  damage: 7,  speed: 55, xp: 10 },
  sylph:    { id: 'sylph',    name: 'Sylph Badai',  element: 'angin', hp: 45,  damage: 6,  speed: 60, xp: 10 },
  boss:     { id: 'boss',     name: 'Penjaga Lima Elemen', element: 'api', hp: 600, damage: 18, speed: 35, xp: 200 }
};
const ENEMY_IDS = Object.keys(ENEMIES);
