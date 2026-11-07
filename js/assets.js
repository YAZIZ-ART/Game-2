/* =====================================================================
   js/assets.js : pemuat gambar + sprite pixel otomatis + suara
   - Gambar dari folder assets dipakai kalau ada (nama file = id huruf kecil + .png)
   - Kalau tidak ada, game membuat sprite pixel sendiri, jadi tidak pernah error
   Pemakaian:
     Assets.load(cb).then(...)       Assets.portrait('akira')
     Assets.charFrame('akira','down',0)   Assets.enemyFrame('slime_api', 0)
     Assets.weaponIcon('katana')     Assets.tile('grass', 0)
     Sound.play('attack')            Sound.music('bgm')
   ===================================================================== */
'use strict';

const Assets = (function () {
  const OUTLINE = '#0d0a1c';
  const SKIN = '#f1c7a1';
  const DIRS = ['down', 'up', 'left', 'right'];

  const imgs = { characters: {}, weapons: {}, enemies: {}, tiles: {} };
  const cache = { chars: {}, portraits: {}, enemies: {}, icons: {}, tiles: {} };

  /* ---------- Util warna ---------- */
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function shade(hex, amt) {
    const c = hexToRgb(hex);
    const out = c.map(function (v) {
      v = amt < 0 ? v * (1 + amt) : v + (255 - v) * amt;
      return Math.max(0, Math.min(255, Math.round(v)));
    });
    return 'rgb(' + out[0] + ',' + out[1] + ',' + out[2] + ')';
  }
  function rng(seed) {   // acak yang bisa diulang
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return { c: c, x: x };
  }
  function rect(x, px, py, w, h, col) { x.fillStyle = col; x.fillRect(px, py, w, h); }
  function ellipse(x, cx, cy, rx, ry, col) {
    x.fillStyle = col;
    for (let yy = Math.floor(cy - ry); yy <= Math.ceil(cy + ry); yy++) {
      for (let xx = Math.floor(cx - rx); xx <= Math.ceil(cx + rx); xx++) {
        const dx = (xx + 0.5 - cx) / rx, dy = (yy + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) x.fillRect(xx, yy, 1, 1);
      }
    }
  }
  /* Garis tepi 1 pixel di sekeliling bentuk */
  function outline(cv) {
    const w = cv.c.width, h = cv.c.height;
    const id = cv.x.getImageData(0, 0, w, h);
    const d = id.data;
    const src = new Uint8ClampedArray(d);
    const col = hexToRgb(OUTLINE);
    function solid(xx, yy) { return xx >= 0 && yy >= 0 && xx < w && yy < h && src[(yy * w + xx) * 4 + 3] > 10; }
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        if (solid(xx, yy)) continue;
        if (solid(xx - 1, yy) || solid(xx + 1, yy) || solid(xx, yy - 1) || solid(xx, yy + 1)) {
          const i = (yy * w + xx) * 4;
          d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
        }
      }
    }
    cv.x.putImageData(id, 0, 0);
  }

  /* ---------- Muat gambar (tidak error kalau file tidak ada) ---------- */
  function loadImg(url) {
    return new Promise(function (resolve) {
      const im = new Image();
      im.onload = function () { resolve(im); };
      im.onerror = function () { resolve(null); };
      im.src = url;
    });
  }

  function load(onProgress) {
    const jobs = [];
    CHARACTERS.forEach(function (c) { jobs.push({ k: 'characters', id: c.id, url: CFG.PATH.characters + c.id + '.png' }); });
    Object.keys(WEAPONS).forEach(function (id) { jobs.push({ k: 'weapons', id: id, url: CFG.PATH.weapons + id + '.png' }); });
    Object.keys(ENEMIES).forEach(function (id) { jobs.push({ k: 'enemies', id: id, url: CFG.PATH.enemies + id + '.png' }); });
    TILE_NAMES.forEach(function (n) { jobs.push({ k: 'tiles', id: n, url: CFG.PATH.tiles + n + '.png' }); });

    let done = 0;
    return Promise.all(jobs.map(function (j) {
      return loadImg(j.url).then(function (im) {
        if (im) imgs[j.k][j.id] = im;
        done++;
        if (onProgress) onProgress(done / jobs.length);
      });
    }));
  }

  /* ---------- Sprite karakter (top-down, 4 arah x 2 langkah) ---------- */
  function drawHumanoid(ch, dir, f) {
    const cv = makeCanvas(18, 18);
    const x = cv.x;
    const el = ELEMENTS[ch.element];
    const base = ch.color;
    const dark = shade(base, -0.4);
    const light = shade(base, 0.35);
    const hair = shade(base, -0.55);
    const flip = dir === 'right';
    if (flip) { x.translate(18, 0); x.scale(-1, 1); }
    x.translate(1, 1);                       // ruang untuk garis tepi
    const side = dir === 'left' || dir === 'right';

    // kaki
    if (side) {
      rect(x, f ? 4 : 6, 12, 3, 3, dark);
      rect(x, f ? 8 : 6, 12, 3, 3, shade(base, -0.25));
    } else {
      rect(x, 5, 12, 3, f ? 2 : 3, dark);
      rect(x, 8, 12, 3, f ? 3 : 2, dark);
    }
    // badan
    if (side) {
      rect(x, 5, 7, 7, 5, base);
      rect(x, 5, 10, 7, 1, dark);
      rect(x, 7, 8, 3, 3, f ? dark : shade(base, -0.2));   // lengan
      rect(x, 7, 11, 2, 1, SKIN);
    } else if (dir === 'down') {
      rect(x, 4, 7, 8, 5, base);
      rect(x, 7, 7, 2, 5, light);
      rect(x, 4, 10, 8, 1, dark);
      rect(x, 3, 8, 1, 3, dark); rect(x, 12, 8, 1, 3, dark);
      rect(x, 3, 11, 1, 1, SKIN); rect(x, 12, 11, 1, 1, SKIN);
      rect(x, 7, 6, 2, 1, el.color);                         // permata elemen
    } else {
      rect(x, 4, 7, 8, 5, dark);
      rect(x, 6, 8, 4, 3, base);
      rect(x, 3, 8, 1, 3, dark); rect(x, 12, 8, 1, 3, dark);
      rect(x, 7, 6, 2, 1, el.color);
    }
    // kepala
    if (dir === 'down') {
      rect(x, 4, 1, 8, 6, SKIN);
      rect(x, 4, 1, 8, 2, hair);
      rect(x, 4, 3, 1, 2, hair); rect(x, 11, 3, 1, 2, hair);
      rect(x, 6, 4, 1, 1, '#111'); rect(x, 9, 4, 1, 1, '#111');
    } else if (dir === 'up') {
      rect(x, 4, 1, 8, 6, hair);
      rect(x, 5, 5, 6, 1, shade(base, -0.65));
    } else {
      rect(x, 4, 1, 7, 6, SKIN);
      rect(x, 4, 1, 7, 2, hair);
      rect(x, 8, 3, 3, 3, hair);
      rect(x, 5, 4, 1, 1, '#111');
    }
    outline(cv);
    return cv.c;
  }

  function charSheet(id) {
    if (cache.chars[id]) return cache.chars[id];
    const ch = getCharacter(id);
    const sheet = {};
    DIRS.forEach(function (d) { sheet[d] = [drawHumanoid(ch, d, 0), drawHumanoid(ch, d, 1)]; });
    cache.chars[id] = sheet;
    return sheet;
  }

  function charFrame(id, dir, frame) {
    const s = charSheet(id);
    return (s[dir] || s.down)[frame ? 1 : 0];
  }

  /* Potret untuk HUD dan menu: pakai gambar asli kalau ada */
  function portrait(id) {
    if (imgs.characters[id]) return imgs.characters[id];
    if (cache.portraits[id]) return cache.portraits[id];
    const ch = getCharacter(id);
    const el = ELEMENTS[ch.element];
    const cv = makeCanvas(64, 64);
    const g = cv.x.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, el.dark); g.addColorStop(1, '#0a0814');
    cv.x.fillStyle = g; cv.x.fillRect(0, 0, 64, 64);
    cv.x.globalAlpha = 0.35;
    ellipse(cv.x, 32, 36, 26, 26, el.color);
    cv.x.globalAlpha = 1;
    cv.x.imageSmoothingEnabled = false;
    cv.x.drawImage(charFrame(id, 'down', 0), 2, 4, 60, 60);
    cache.portraits[id] = cv.c;
    return cv.c;
  }

  /* ---------- Sprite musuh ---------- */
  function drawEnemy(e, f) {
    const s = e.size;
    const pad = 3;
    const cv = makeCanvas(s + pad * 2, s + pad * 2 + 2);
    const x = cv.x;
    const el = ELEMENTS[e.element];
    const c = e.color, dark = shade(c, -0.4), light = shade(c, 0.4);
    const cx = (s + pad * 2) / 2, cy = (s + pad * 2) / 2 + 1;
    const r = s / 2;
    const bob = f ? 1 : 0;

    if (e.id.indexOf('slime') === 0) {
      ellipse(x, cx, cy + 1 + bob * 0.5, r, r * (0.8 - bob * 0.08), c);
      ellipse(x, cx - r * 0.3, cy - r * 0.2, r * 0.3, r * 0.2, light);
      rect(x, Math.round(cx - r * 0.45), Math.round(cy), 2, 2, '#111');
      rect(x, Math.round(cx + r * 0.2), Math.round(cy), 2, 2, '#111');
    } else if (e.id.indexOf('golem') === 0) {
      rect(x, pad + 1, pad + 3 + bob, s - 2, s - 3, c);
      rect(x, pad + 1, pad + 3 + bob, s - 2, 2, light);
      rect(x, pad + 3, pad + s - 3, 3, 3, dark); rect(x, pad + s - 6, pad + s - 3, 3, 3, dark);
      rect(x, pad, pad + 5, 2, 6, dark); rect(x, pad + s - 2, pad + 5, 2, 6, dark);
      rect(x, pad + 4, pad + 6 + bob, 2, 2, el.glow); rect(x, pad + s - 6, pad + 6 + bob, 2, 2, el.glow);
    } else if (e.id.indexOf('wisp') === 0) {
      x.globalAlpha = 0.35; ellipse(x, cx, cy, r + 2, r + 2, c); x.globalAlpha = 1;
      ellipse(x, cx, cy - bob, r * 0.8, r * 0.8, c);
      ellipse(x, cx, cy - bob, r * 0.4, r * 0.4, '#ffffff');
      rect(x, Math.round(cx - 1), Math.round(cy + r - 1 + bob), 2, 3, dark);
    } else if (e.id.indexOf('sprite') === 0) {
      const wy = f ? -1 : 1;
      rect(x, pad - 1, pad + 2 + wy, 4, 5, light); rect(x, pad + s - 3, pad + 2 + wy, 4, 5, light);
      ellipse(x, cx, cy, r * 0.6, r * 0.8, c);
      rect(x, Math.round(cx - 2), Math.round(cy - 2), 1, 1, '#111'); rect(x, Math.round(cx + 1), Math.round(cy - 2), 1, 1, '#111');
    } else {                                                   // bos
      rect(x, pad + 2, pad + 6 + bob, s - 4, s - 6, c);
      rect(x, pad + 2, pad + 6 + bob, s - 4, 3, light);
      rect(x, pad, pad + 8, 3, s - 10, dark); rect(x, pad + s - 3, pad + 8, 3, s - 10, dark);
      rect(x, pad + 3, pad + 1, 3, 6, dark); rect(x, pad + s - 6, pad + 1, 3, 6, dark);   // tanduk
      rect(x, pad + 7, pad + 11 + bob, 4, 4, el.glow); rect(x, pad + s - 11, pad + 11 + bob, 4, 4, el.glow);
      rect(x, pad + 8, pad + s - 6, s - 16, 2, '#111');
    }
    outline(cv);
    return cv.c;
  }

  function enemyFrame(id, frame) {
    if (imgs.enemies[id]) return imgs.enemies[id];
    const key = id + (frame ? '1' : '0');
    if (cache.enemies[key]) return cache.enemies[key];
    const e = ENEMIES[id];
    cache.enemies[key] = drawEnemy(e, frame ? 1 : 0);
    return cache.enemies[key];
  }

  /* ---------- Ikon senjata ---------- */
  function weaponIcon(id) {
    if (imgs.weapons[id]) return imgs.weapons[id];
    if (cache.icons[id]) return cache.icons[id];
    const w = WEAPONS[id];
    const cv = makeCanvas(18, 18);
    const x = cv.x;
    x.translate(1, 1);
    const col = w.trail, dark = shade(col, -0.5), wood = '#6b4a2a';
    function line(x0, y0, x1, y1, c) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) rect(x, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1, c);
    }
    switch (w.kind) {
      case 'smash':
        line(3, 13, 12, 4, wood); rect(x, 9, 2, 6, 4, col); rect(x, 9, 2, 6, 1, '#fff'); break;
      case 'projectile':
        if (id === 'bow' || id === 'crossbow') { line(8, 2, 8, 14, wood); line(8, 2, 13, 8, col); line(8, 14, 13, 8, col); line(3, 8, 13, 8, '#ddd'); }
        else if (id === 'staff') { line(3, 14, 11, 4, wood); ellipse(x, 12, 3, 3, 3, col); }
        else { line(3, 13, 13, 3, col); line(3, 9, 9, 3, col); line(7, 13, 13, 7, col); }
        break;
      case 'boomerang':
        ellipse(x, 8, 8, 6, 6, col); ellipse(x, 8, 8, 3, 3, '#0d0a1c'); break;
      case 'bash':
        rect(x, 3, 2, 10, 9, col); rect(x, 4, 11, 8, 2, col); rect(x, 6, 13, 4, 1, col); rect(x, 7, 4, 2, 6, '#fff'); break;
      case 'chain':
        for (let i = 0; i < 5; i++) rect(x, 2 + i * 2, 12 - i * 2, 2, 2, i % 2 ? dark : col);
        line(10, 5, 14, 1, '#ddd'); break;
      case 'flurry':
        line(3, 13, 8, 3, wood); line(8, 14, 13, 4, wood); line(5, 8, 11, 9, '#999'); break;
      default:                                                 // bilah
        line(3, 13, 13, 3, '#e8eefc'); line(4, 13, 14, 3, col);
        rect(x, 2, 12, 3, 3, wood); rect(x, 4, 10, 3, 1, dark);
    }
    outline(cv);
    cache.icons[id] = cv.c;
    return cv.c;
  }

  /* ---------- Tile 16x16 ---------- */
  const TILE_NAMES = ['grass', 'grass2', 'flower', 'path', 'water0', 'water1', 'wall', 'tree', 'rock', 'floor'];

  function drawTile(name) {
    const T = CFG.TILE;
    const cv = makeCanvas(T, T);
    const x = cv.x;
    const r = rng(name.split('').reduce(function (a, ch) { return a * 31 + ch.charCodeAt(0); }, 7));
    function speckle(base, cols, n) {
      rect(x, 0, 0, T, T, base);
      for (let i = 0; i < n; i++) rect(x, Math.floor(r() * T), Math.floor(r() * T), 1, 1, cols[Math.floor(r() * cols.length)]);
    }
    function grassBase(seedShift) {
      speckle(seedShift ? '#3a8a52' : '#3f9a52', ['#2f7a44', '#56b862', '#2f7a44'], 26);
      for (let i = 0; i < 4; i++) { const px = Math.floor(r() * 14) + 1, py = Math.floor(r() * 13) + 2; rect(x, px, py, 1, 2, '#6fd07a'); }
    }
    switch (name) {
      case 'grass':  grassBase(0); break;
      case 'grass2': grassBase(1); break;
      case 'flower': {
        grassBase(0);
        const cols = ['#ffd93a', '#ff7ac8', '#9fd8ff'];
        for (let i = 0; i < 3; i++) {
          const px = 2 + Math.floor(r() * 11), py = 2 + Math.floor(r() * 11), c = cols[i % 3];
          rect(x, px, py, 2, 2, c); rect(x, px, py + 2, 1, 2, '#2f7a44');
        }
        break;
      }
      case 'path':
        speckle('#b08a5a', ['#9a7648', '#c8a272', '#8a6a3e'], 30); break;
      case 'water0': case 'water1': {
        const s = name === 'water1' ? 1 : 0;
        rect(x, 0, 0, T, T, '#2a6fd0');
        rect(x, 0, 0, T, 4, '#2f7be0');
        for (let i = 0; i < 3; i++) {
          const yy = 3 + i * 5, off = (s * 3 + i * 4) % T;
          rect(x, off, yy, 5, 1, '#9fd8ff'); rect(x, (off + 8) % T, yy + 2, 3, 1, '#6fb8ff');
        }
        break;
      }
      case 'wall':
        rect(x, 0, 0, T, T, '#5a5470');
        rect(x, 0, 0, T, 2, '#7a7494');
        for (let yy = 0; yy < T; yy += 5) rect(x, 0, yy + 4, T, 1, '#3a3450');
        rect(x, 5, 0, 1, 5, '#3a3450'); rect(x, 11, 5, 1, 5, '#3a3450'); rect(x, 4, 10, 1, 5, '#3a3450');
        rect(x, 0, T - 2, T, 2, '#403a58');
        break;
      case 'tree':
        grassBase(0);
        rect(x, 7, 10, 3, 6, '#6b4a2a'); rect(x, 7, 10, 1, 6, '#4a3018');
        ellipse(x, 8, 7, 7, 6.5, '#2a6a3a'); ellipse(x, 7, 5.5, 5, 4, '#3f9a52'); ellipse(x, 6, 4.5, 2, 1.5, '#6fd07a');
        break;
      case 'rock':
        grassBase(1);
        ellipse(x, 8, 10, 6, 4.5, '#6a6680'); ellipse(x, 7, 8.5, 4, 3, '#8a86a0'); rect(x, 5, 7, 2, 1, '#bcb8d0');
        break;
      case 'floor':
        rect(x, 0, 0, T, T, '#3a3358');
        rect(x, 0, 0, T, 1, '#4a4270'); rect(x, 0, 0, 1, T, '#4a4270');
        rect(x, 8, 8, 1, 1, '#2a2444'); rect(x, 3, 12, 1, 1, '#2a2444'); rect(x, 12, 4, 1, 1, '#2a2444');
        break;
    }
    return cv.c;
  }

  function tile(name, frame) {
    let n = name;
    if (name === 'water') n = frame ? 'water1' : 'water0';
    if (imgs.tiles[n]) return imgs.tiles[n];
    if (!cache.tiles[n]) cache.tiles[n] = drawTile(n);
    return cache.tiles[n];
  }

  return {
    load: load, portrait: portrait, charFrame: charFrame, enemyFrame: enemyFrame,
    weaponIcon: weaponIcon, tile: tile, tileNames: TILE_NAMES,
    shade: shade, hexToRgb: hexToRgb, rng: rng, makeCanvas: makeCanvas
  };
})();
/* =====================================================================
   Sound : efek suara dibuat otomatis (WebAudio), musik opsional
   Musik: taruh file assets/audio/bgm.mp3 lalu panggil Sound.music('bgm')
   ===================================================================== */
const Sound = (function () {
  let ctx = null, master = null, muted = false, bgm = null, bgmName = null;
  let noiseBuf = null;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    const len = ctx.sampleRate * 0.5;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function tone(type, f0, f1, dur, vol, delay) {
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq, delay) {
    const t = ctx.currentTime + (delay || 0);
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuf;
    f.type = 'bandpass'; f.frequency.value = freq || 1200;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  const SFX = {
    attack:  function () { tone('sawtooth', 420, 120, 0.09, 0.25); noise(0.08, 0.15, 2400); },
    hit:     function () { tone('square', 240, 70, 0.1, 0.3); noise(0.09, 0.25, 900); },
    hurt:    function () { tone('sawtooth', 190, 55, 0.22, 0.35); },
    dash:    function () { noise(0.14, 0.25, 3200); },
    elem:    function () { tone('square', 660, 660, 0.05, 0.2); tone('square', 990, 990, 0.07, 0.2, 0.05); },
    skill:   function () { tone('sine', 280, 1100, 0.3, 0.35); tone('triangle', 140, 560, 0.3, 0.25); },
    explode: function () { noise(0.4, 0.5, 500); tone('sine', 130, 35, 0.4, 0.45); },
    zap:     function () { tone('sawtooth', 1400, 300, 0.12, 0.25); noise(0.1, 0.2, 4000); },
    pickup:  function () { tone('square', 880, 1320, 0.1, 0.25); },
    select:  function () { tone('square', 520, 520, 0.05, 0.2); },
    die:     function () { tone('sawtooth', 220, 40, 0.45, 0.35); noise(0.3, 0.2, 600); },
    levelup: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone('square', f, f, 0.14, 0.25, i * 0.09); }); }
  };

  document.addEventListener('pointerdown', function () { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); if (bgm && bgm.paused && !muted) bgm.play().catch(function () {}); }, { passive: true });
  window.addEventListener('keydown', function () { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); if (bgm && bgm.paused && !muted) bgm.play().catch(function () {}); });

  return {
    play: function (name) {
      if (muted || !ensure() || ctx.state !== 'running') return;
      const fn = SFX[name];
      if (fn) fn();
    },
    music: function (name) {
      if (bgmName === name) return;
      bgmName = name;
      if (bgm) { bgm.pause(); bgm = null; }
      if (!name) return;
      const a = new Audio(CFG.PATH.audio + name + '.mp3');
      a.loop = true; a.volume = 0.4;
      a.addEventListener('error', function () { if (bgm === a) bgm = null; });
      bgm = a;
      if (!muted) a.play().catch(function () {});
    },
    toggle: function () {
      muted = !muted;
      if (bgm) { if (muted) bgm.pause(); else bgm.play().catch(function () {}); }
      return !muted;
    },
    isOn: function () { return !muted; }
  };
})();
