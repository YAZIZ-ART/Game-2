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
