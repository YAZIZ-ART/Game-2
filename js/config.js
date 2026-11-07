/* =====================================================================
   Aetheria: Echoes of the Five Elements
   js/config.js : semua data game (elemen, 40 kombinasi, senjata, karakter, musuh)
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
  }
};

/* ---------- 5 elemen dasar (kunci "petir" = elemen Listrik) ---------- */
const ELEMENTS = {
  api:   { id: 'api',   name: 'Api',     icon: '\uD83D\uDD25', color: '#ff5a2a', dark: '#5a1608', glow: '#ffb07a' },
  air:   { id: 'air',   name: 'Air',     icon: '\uD83D\uDCA7', color: '#3aa0ff', dark: '#0c2e5a', glow: '#9fd8ff' },
  tanah: { id: 'tanah', name: 'Tanah',   icon: '\uD83E\uDEA8', color: '#c8944f', dark: '#4a3318', glow: '#f0d09a' },
  petir: { id: 'petir', name: 'Listrik', icon: '\u26A1',       color: '#ffd93a', dark: '#544508', glow: '#fff3a0' },
