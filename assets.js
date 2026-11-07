/* Aetheria — assets.js : muat PNG dari folder assets/, jika tidak ada pakai gambar pengganti */
'use strict';

const Assets = (function () {
  const cache = {};

  function placeholder(kind, id) {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const g = c.getContext('2d');
    let el = 'api';
    if (kind === 'characters' && CHARACTERS[id]) el = CHARACTERS[id].element;
    else if (kind === 'enemies' && ENEMIES[id]) el = ENEMIES[id].element;
    else if (kind === 'weapons' && WEAPONS[id]) el = WEAPONS[id].element;
    const col = ELEMENTS[el].color, dark = ELEMENTS[el].dark;
    if (kind === 'enemies') {
      g.fillStyle = dark; g.fillRect(3, 4, 10, 10);
      g.fillStyle = col; g.fillRect(4, 5, 8, 8);
      g.fillStyle = '#fff'; g.fillRect(5, 7, 2, 2); g.fillRect(9, 7, 2, 2);
      g.fillStyle = '#000'; g.fillRect(6, 8, 1, 1); g.fillRect(10, 8, 1, 1);
    } else {
      g.fillStyle = dark; g.fillRect(4, 7, 8, 8);          // badan
      g.fillStyle = col;  g.fillRect(5, 8, 6, 6);
      g.fillStyle = '#f2c9a0'; g.fillRect(5, 2, 6, 5);      // kepala
      g.fillStyle = col;  g.fillRect(4, 1, 8, 2);           // rambut
      g.fillStyle = '#000'; g.fillRect(6, 4, 1, 1); g.fillRect(9, 4, 1, 1);
      g.fillStyle = '#ddd'; g.fillRect(12, 4, 1, 9);        // senjata
    }
    return c;
  }

  return {
    sprite: function (kind, id) { return cache[kind + '/' + id] || (cache[kind + '/' + id] = placeholder(kind, id)); },
    /* Coba muat PNG; yang gagal diabaikan (pakai gambar pengganti). */
    load: function (done) {
      const jobs = [];
      CHARACTER_IDS.forEach(function (id) { jobs.push(['characters', id]); });
      ENEMY_IDS.forEach(function (id) { jobs.push(['enemies', id]); });
      let left = jobs.length, finished = false;
      const finish = function () { if (!finished) { finished = true; done(); } };
      if (!left) return finish();
      jobs.forEach(function (j) {
        const img = new Image();
        img.onload = function () { cache[j[0] + '/' + j[1]] = img; if (--left === 0) finish(); };
        img.onerror = function () { if (--left === 0) finish(); };
        img.src = CFG.PATH[j[0]] + j[1] + '.png';
      });
      setTimeout(finish, 2500);
    }
  };
})();
