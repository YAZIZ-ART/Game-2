/* =====================================================================
   js/map.js : dunia game (pulau melayang), tabrakan, kamera, latar
   Pulau dibuat otomatis setiap kali game dimulai:
     - Pusat (hub) lalu 5 wilayah elemen: Api, Air, Tanah, Petir, Udara
     - Arena bos di utara
   Pemakaian:
     GameMap.build(seed)        GameMap.draw(ctx, camX, camY, t)
     GameMap.drawBackground(ctx, camX, camY, t)
     GameMap.move(e, dx, dy, half)   gerak dengan tabrakan (e.x, e.y)
     GameMap.solidAt(px, py)    GameMap.biomeAt(px, py)
     GameMap.randomSpot(biome, px, py, minDist, maxDist) -> {x, y}
     GameMap.spawn  GameMap.bossPos  GameMap.pw  GameMap.ph
     Camera.snap(target)  Camera.follow(target, dt)  Camera.pos()
   ===================================================================== */
'use strict';

const GameMap = (function () {
  const T = CFG.TILE;
  const COLS = 90, ROWS = 64;
  const SECTORS = ['api', 'air', 'tanah', 'petir', 'udara'];
  const TINT = { api: '#ff5a2a', air: '#3aa0ff', tanah: '#c8944f', petir: '#ffd93a', udara: '#7fe8ff', boss: '#b06cff', hub: null };
  const SOLID = { wall: 1, tree: 1, rock: 1, water: 1, cliff1: 1, cliff2: 1 };

  const M = {
    cols: COLS, rows: ROWS, pw: COLS * T, ph: ROWS * T,
    tiles: [], biome: [], spots: {}, spawn: { x: 0, y: 0 }, bossPos: { x: 0, y: 0 },
    seed: 1, layer: null, waterList: []
  };
  let bgStars = [], bgClouds = [], bgIslands = [];

  /* ---------- Noise ---------- */
  function hash(ix, iy, s) {
    let h = (ix * 374761393 + iy * 668265263 + s * 2147483647) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, s) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function idx(x, y) { return y * COLS + x; }
  function inb(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS; }
  function tileAt(x, y) { return inb(x, y) ? M.tiles[idx(x, y)] : null; }
  function isSolidTile(x, y) {
    const n = tileAt(x, y);
    return n === null || !!SOLID[n];
  }

  /* ---------- Bangun peta ---------- */
  function build(seed) {
    seed = seed || ((Math.random() * 1e9) | 0);
    M.seed = seed;
    const rnd = Assets.rng(seed);
    const cx = COLS / 2, cy = ROWS / 2;
    const rx = COLS / 2 - 3, ry = ROWS / 2 - 3;
    const arena = { x: Math.round(cx), y: 11, r: 6 };
    const hubR = 9;

    M.tiles = new Array(COLS * ROWS).fill(null);
    M.biome = new Array(COLS * ROWS).fill('hub');

    // 1. bentuk pulau + tanah dasar
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const nx = (x - cx) / rx, ny = (y - cy) / ry;
        const d = Math.sqrt(nx * nx + ny * ny);
        const n = vnoise(x * 0.11, y * 0.11, seed);
        const da = Math.hypot(x - arena.x, y - arena.y);
        const land = d < 0.8 + (n - 0.5) * 0.55 || da < arena.r + 3 || Math.hypot(x - cx, y - cy) < hubR + 1;
        if (!land) continue;
        const r = rnd();
        M.tiles[idx(x, y)] = r < 0.07 ? 'flower' : (r < 0.5 ? 'grass2' : 'grass');

        // wilayah elemen berdasarkan sudut dari pusat
        const dist = Math.hypot(x - cx, y - cy);
        let b = 'hub';
        if (dist > hubR) {
          let ang = Math.atan2(y - cy, x - cx) * 180 / Math.PI + 90;
          ang = ((ang % 360) + 360) % 360;
          b = SECTORS[Math.floor(ang / 72) % 5];
        }
        if (da < arena.r + 4) b = 'boss';
        M.biome[idx(x, y)] = b;
      }
    }

    function setTile(x, y, name) { if (inb(x, y) && M.tiles[idx(x, y)] !== null) M.tiles[idx(x, y)] = name; }
    function sectorCenter(i) {
      const a = (-90 + 72 * i + 36) * Math.PI / 180;
      return { x: cx + Math.cos(a) * rx * 0.55, y: cy + Math.sin(a) * ry * 0.55 };
    }
    function inSector(x, y, b) { return inb(x, y) && M.biome[idx(x, y)] === b && M.tiles[idx(x, y)] !== null; }

    // 2. hutan, batu, kolam tiap wilayah
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = idx(x, y);
        if (M.tiles[i] === null) continue;
        const b = M.biome[i];
        if (b === 'hub' || b === 'boss') continue;
        const f = vnoise(x * 0.24, y * 0.24, seed + 7), r = rnd();
        if (b === 'air'   && f > 0.6 && r < 0.75) M.tiles[i] = 'tree';
        else if (b === 'udara' && f > 0.64 && r < 0.6) M.tiles[i] = 'tree';
        else if (b === 'tanah' && r < 0.075) M.tiles[i] = 'rock';
        else if (b === 'api'   && (r < 0.045 || (f > 0.7 && r < 0.5))) M.tiles[i] = 'rock';
        else if (b === 'petir' && r < 0.02) M.tiles[i] = 'rock';
      }
    }
    // kolam di wilayah Air
    for (let k = 0; k < 4; k++) {
      const s = sectorCenter(1), a = rnd() * Math.PI * 2, d = rnd() * 12;
      const px = s.x + Math.cos(a) * d, py = s.y + Math.sin(a) * d, pr = 3 + rnd() * 2.5;
      for (let y = Math.floor(py - 7); y <= Math.ceil(py + 7); y++) {
        for (let x = Math.floor(px - 7); x <= Math.ceil(px + 7); x++) {
          const n = vnoise(x * 0.4, y * 0.4, seed + 3);
          if (Math.hypot(x - px, y - py) < pr * (0.7 + n * 0.6) && inSector(x, y, 'air')) setTile(x, y, 'water');
        }
      }
    }
    // reruntuhan di wilayah Petir
    for (let k = 0; k < 4; k++) {
      const s = sectorCenter(3);
      const w = 7 + ((rnd() * 3) | 0), h = 6 + ((rnd() * 2) | 0);
      const x0 = Math.round(s.x + (rnd() - 0.5) * 24 - w / 2), y0 = Math.round(s.y + (rnd() - 0.5) * 18 - h / 2);
      let ok = true;
      for (let y = y0; y < y0 + h && ok; y++) for (let x = x0; x < x0 + w; x++) if (!inSector(x, y, 'petir')) { ok = false; break; }
      if (!ok) continue;
      for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
          const edge = x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + h - 1;
          setTile(x, y, edge && rnd() < 0.85 ? 'wall' : 'floor');
        }
      }
      // pintu masuk
      const gx = x0 + 1 + ((rnd() * (w - 2)) | 0);
      setTile(gx, y0, 'floor'); setTile(gx, y0 + h - 1, 'floor');
      setTile(x0, y0 + 1 + ((rnd() * (h - 2)) | 0), 'floor');
    }

    // 3. hub: alun-alun batu
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (M.tiles[idx(x, y)] === null) continue;
        if (d < 5.2) setTile(x, y, 'floor');
        else if (d < hubR) { M.tiles[idx(x, y)] = rnd() < 0.08 ? 'flower' : (rnd() < 0.5 ? 'grass2' : 'grass'); }
      }
    }

    // 4. arena bos: lantai bulat + dinding melingkar dengan celah di selatan
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (M.tiles[idx(x, y)] === null) continue;
        const d = Math.hypot(x - arena.x, y - arena.y);
        if (d < arena.r - 0.5) M.tiles[idx(x, y)] = 'floor';
        else if (d < arena.r + 0.7) {
          const gap = y > arena.y && Math.abs(x - arena.x) <= 2;
          M.tiles[idx(x, y)] = gap ? 'floor' : 'wall';
        } else if (d < arena.r + 2.5 && M.tiles[idx(x, y)] !== 'floor') {
          if (M.tiles[idx(x, y)] === 'tree' || M.tiles[idx(x, y)] === 'rock' || M.tiles[idx(x, y)] === 'water') M.tiles[idx(x, y)] = 'grass';
        }
      }
    }

    // 5. jalan setapak dari hub ke tiap wilayah dan ke arena
    function carvePath(x0, y0, x1, y1, wob) {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5);
      const ph = rnd() * 6;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        let px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t;
        const w = Math.sin(t * 9 + ph) * wob * Math.sin(Math.PI * t);
        const dx = x1 - x0, dy = y1 - y0, dl = Math.hypot(dx, dy) || 1;
        px += -dy / dl * w; py += dx / dl * w;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            if (Math.abs(ox) + Math.abs(oy) > 1 && rnd() < 0.6) continue;
            const tx = Math.round(px) + ox, ty = Math.round(py) + oy;
            const cur = tileAt(tx, ty);
            if (cur !== null && cur !== 'floor') M.tiles[idx(tx, ty)] = 'path';
            else if (cur === 'floor' && Math.hypot(tx - cx, ty - cy) > 5.2 && Math.hypot(tx - arena.x, ty - arena.y) > arena.r + 1) M.tiles[idx(tx, ty)] = 'path';
          }
        }
      }
    }
    for (let i = 0; i < 5; i++) { const s = sectorCenter(i); carvePath(cx, cy, s.x, s.y, 3); }
    carvePath(cx, cy - 4, arena.x, arena.y + arena.r, 2);

    // 6. tebing di bawah tepi pulau
    for (let y = 1; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (M.tiles[idx(x, y)] !== null) continue;
        const up = M.tiles[idx(x, y - 1)];
        if (up !== null && up !== 'cliff1' && up !== 'cliff2') M.tiles[idx(x, y)] = 'cliff1';
      }
    }
    for (let y = 1; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (M.tiles[idx(x, y)] === null && M.tiles[idx(x, y - 1)] === 'cliff1') M.tiles[idx(x, y)] = 'cliff2';
      }
    }

    // 7. titik awal, bos, dan titik muncul musuh (hanya yang bisa dijangkau)
    M.spawn = { x: cx * T + T / 2, y: (cy + 2) * T + T / 2 };
    M.bossPos = { x: arena.x * T + T / 2, y: (arena.y - 1) * T + T / 2 };
    M.spots = { api: [], air: [], tanah: [], petir: [], udara: [], boss: [], hub: [] };
    const seen = new Uint8Array(COLS * ROWS);
    const q = [[Math.floor(M.spawn.x / T), Math.floor(M.spawn.y / T)]];
    seen[idx(q[0][0], q[0][1])] = 1;
    while (q.length) {
      const c = q.pop();
      const x = c[0], y = c[1];
      const b = M.biome[idx(x, y)];
      if (M.spots[b]) M.spots[b].push({ x: x * T + T / 2, y: y * T + T / 2 });
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        const nx = x + d[0], ny = y + d[1];
        if (!inb(nx, ny) || seen[idx(nx, ny)] || isSolidTile(nx, ny)) return;
        seen[idx(nx, ny)] = 1; q.push([nx, ny]);
      });
    }
    M.reach = seen;

    // 8. latar belakang
    const br = Assets.rng(seed + 99);
    bgStars = []; bgClouds = []; bgIslands = [];
    for (let i = 0; i < 90; i++) bgStars.push({ x: br() * CFG.W, y: br() * CFG.H, s: br() < 0.15 ? 2 : 1, tw: br() * 6, c: br() < 0.3 ? '#b8a0ff' : '#ffffff' });
    for (let i = 0; i < 7; i++) bgClouds.push({ x: br() * (CFG.W + 160), y: br() * CFG.H, w: 22 + br() * 30, v: 2 + br() * 5, a: 0.07 + br() * 0.08 });
    for (let i = 0; i < 4; i++) bgIslands.push({ x: br() * (CFG.W + 200), y: 30 + br() * (CFG.H - 90), w: 36 + br() * 40, h: 10 + br() * 14 });

    prerender();
    return M;
  }

  /* ---------- Gambar statis sekali saja ---------- */
  function prerender() {
    const cv = document.createElement('canvas');
    cv.width = M.pw; cv.height = M.ph;
    const x = cv.getContext('2d');
    x.imageSmoothingEnabled = false;
    M.waterList = [];
    const rnd = Assets.rng(M.seed + 5);

    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        const n = M.tiles[idx(tx, ty)];
        if (n === null) continue;
        const px = tx * T, py = ty * T;
        if (n === 'cliff1' || n === 'cliff2') {
          const top = n === 'cliff1';
          x.fillStyle = top ? '#4a3f66' : '#2a2244';
          x.fillRect(px, py, T, T);
          x.fillStyle = top ? '#5c5080' : '#352c55';
          x.fillRect(px, py, T, 2);
          x.fillStyle = top ? '#3a3052' : '#1c1632';
          for (let i = 0; i < 7; i++) x.fillRect(px + ((rnd() * 15) | 0), py + 3 + ((rnd() * 12) | 0), 1 + ((rnd() * 3) | 0), 1);
          if (top) { x.fillStyle = '#2f2748'; x.fillRect(px + 4, py + 6, 1, 8); x.fillRect(px + 11, py + 4, 1, 9); }
          else { x.fillStyle = 'rgba(10,8,20,0.45)'; x.fillRect(px, py + 8, T, 8); }
          continue;
        }
        if (n === 'water') {
          M.waterList.push(tx, ty);
          x.drawImage(Assets.tile('water', 0), px, py, T, T);
        } else {
          x.drawImage(Assets.tile(n, 0), px, py, T, T);
        }
        // warna wilayah (tipis)
        const tint = TINT[M.biome[idx(tx, ty)]];
        if (tint && n !== 'water' && n !== 'wall') {
          x.globalAlpha = 0.1; x.fillStyle = tint; x.fillRect(px, py, T, T); x.globalAlpha = 1;
        }
      }
    }
    // tepi rumput gelap di atas tebing
    for (let ty = 0; ty < ROWS - 1; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        const n = M.tiles[idx(tx, ty)], d = M.tiles[idx(tx, ty + 1)];
        if (n !== null && n !== 'cliff1' && n !== 'cliff2' && d === 'cliff1') {
          x.fillStyle = 'rgba(15,10,30,0.35)'; x.fillRect(tx * T, ty * T + T - 2, T, 2);
        }
      }
    }
    M.layer = cv;
  }

  /* ---------- Gambar ke layar ---------- */
  function draw(ctx, camX, camY, t) {
    // bagian statis
    const sx = Math.max(0, camX), sy = Math.max(0, camY);
    const ex = Math.min(M.pw, camX + CFG.W), ey = Math.min(M.ph, camY + CFG.H);
    if (ex > sx && ey > sy) ctx.drawImage(M.layer, sx, sy, ex - sx, ey - sy, sx - camX, sy - camY, ex - sx, ey - sy);
    // air bergerak
    const frame = Math.floor(t * 2) % 2;
    const img = Assets.tile('water', frame);
    const wl = M.waterList;
    for (let i = 0; i < wl.length; i += 2) {
      const px = wl[i] * T - camX, py = wl[i + 1] * T - camY;
      if (px < -T || py < -T || px > CFG.W || py > CFG.H) continue;
      ctx.drawImage(img, px, py, T, T);
    }
  }

  /* ---------- Latar belakang langit ---------- */
  function drawBackground(ctx, camX, camY, t) {
    const W = CFG.W, H = CFG.H;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#07050f'); g.addColorStop(0.6, '#150f33'); g.addColorStop(1, '#241a52');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    bgStars.forEach(function (s) {
      const x = (((s.x - camX * 0.1) % W) + W) % W, y = (((s.y - camY * 0.1) % H) + H) % H;
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + s.tw));
      ctx.fillStyle = s.c; ctx.fillRect(Math.round(x), Math.round(y), s.s, s.s);
    });
    ctx.globalAlpha = 1;
    bgIslands.forEach(function (isl) {
      const x = ((isl.x - camX * 0.22) % (W + 200) + (W + 200)) % (W + 200) - 100;
      const y = isl.y - camY * 0.12;
      ctx.fillStyle = '#1b1438'; ctx.fillRect(Math.round(x), Math.round(y), Math.round(isl.w), 3);
      for (let i = 0; i < isl.h; i += 2) {
        const w = Math.round(isl.w * (1 - i / isl.h) * 0.9);
        ctx.fillRect(Math.round(x + (isl.w - w) / 2), Math.round(y + 3 + i), w, 2);
      }
      ctx.fillStyle = '#2a1f55'; ctx.fillRect(Math.round(x), Math.round(y), Math.round(isl.w), 1);
    });
    bgClouds.forEach(function (c) {
      const x = ((c.x + t * c.v - camX * 0.45) % (W + 160) + (W + 160)) % (W + 160) - 80;
      const y = ((c.y - camY * 0.3) % H + H) % H;
      ctx.globalAlpha = c.a; ctx.fillStyle = '#b8a0ff';
      for (let k = -2; k <= 2; k++) {
        const w = Math.round(c.w * (1 - Math.abs(k) * 0.22));
        ctx.fillRect(Math.round(x - w / 2), Math.round(y + k * 3), w, 3);
      }
    });
    ctx.globalAlpha = 1;
  }

  /* ---------- Tabrakan ---------- */
  function solidAt(px, py) { return isSolidTile(Math.floor(px / T), Math.floor(py / T)); }

  function boxHits(x, y, h) {
    const x0 = Math.floor((x - h) / T), x1 = Math.floor((x + h - 0.01) / T);
    const y0 = Math.floor((y - h) / T), y1 = Math.floor((y + h - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolidTile(tx, ty)) return true;
    return false;
  }

  /* Gerakkan e.x/e.y sejauh dx,dy; berhenti di dinding (geser di sepanjang dinding). half = setengah ukuran badan */
  function move(e, dx, dy, half) {
    half = half || 5;
    let hitX = false, hitY = false;
    if (dx !== 0) { if (boxHits(e.x + dx, e.y, half)) hitX = true; else e.x += dx; }
    if (dy !== 0) { if (boxHits(e.x, e.y + dy, half)) hitY = true; else e.y += dy; }
    return { x: hitX, y: hitY };
  }

  function biomeAt(px, py) {
    const tx = Math.floor(px / T), ty = Math.floor(py / T);
    return inb(tx, ty) ? M.biome[idx(tx, ty)] : 'hub';
  }

  function randomSpot(biome, px, py, minDist, maxDist) {
    const list = (biome && M.spots[biome] && M.spots[biome].length) ? M.spots[biome] : M.spots.hub;
    minDist = minDist || 0; maxDist = maxDist || 1e9;
    for (let i = 0; i < 40; i++) {
      const s = list[(Math.random() * list.length) | 0];
      const d = Math.hypot(s.x - px, s.y - py);
      if (d >= minDist && d <= maxDist) return { x: s.x, y: s.y };
    }
    const s = list[(Math.random() * list.length) | 0];
    return { x: s.x, y: s.y };
  }

  M.build = build; M.draw = draw; M.drawBackground = drawBackground;
  M.solidAt = solidAt; M.move = move; M.biomeAt = biomeAt; M.randomSpot = randomSpot;
  M.SECTORS = SECTORS; M.TINT = TINT;
  return M;
})();

/* =====================================================================
   Kamera mengikuti pemain dengan halus
   ===================================================================== */
const Camera = {
  x: 0, y: 0,
  clamp: function () {
    const mx = Math.max(0, GameMap.pw - CFG.W), my = Math.max(0, GameMap.ph - CFG.H);
    this.x = Math.max(0, Math.min(mx, this.x));
    this.y = Math.max(0, Math.min(my, this.y));
  },
  snap: function (t) { this.x = t.x - CFG.W / 2; this.y = t.y - CFG.H / 2; this.clamp(); },
  follow: function (t, dt) {
    const k = 1 - Math.exp(-7 * dt);
    this.x += (t.x - CFG.W / 2 - this.x) * k;
    this.y += (t.y - CFG.H / 2 - this.y) * k;
    this.clamp();
  },
  /* posisi kamera bulat + getaran layar */
  pos: function () {
    const o = (typeof FX !== 'undefined') ? FX.offset() : { x: 0, y: 0 };
    return { x: Math.round(this.x) + o.x, y: Math.round(this.y) + o.y };
  }
};
