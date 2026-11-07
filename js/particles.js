/* =====================================================================
   js/particles.js : partikel, efek elemen, tebasan, ledakan, petir, getar layar
   Semua efek digambar pixel-style. Urutan gambar di game.js:
     peta -> FX.draw(ctx,camX,camY,0)  (efek di tanah)
          -> musuh & pemain
          -> FX.draw(ctx,camX,camY,1)  (efek di atas) -> FX.drawOverlay(ctx)
   Awal frame : dt = FX.tick(dt)   (hitstop), lalu FX.update(dt)
   Kamera     : tambahkan FX.offset() ke posisi kamera saat menggambar
   ===================================================================== */
'use strict';

const FX = (function () {
  const TAU = Math.PI * 2;
  const MAX = 2200;
  const parts = [];
  const zones = [];
  const texts = [];
  let shakeP = 0, shakeT = 0, shakeDur = 1;
  let flashA = 0, flashT = 0, flashDur = 1, flashCol = '#fff';
  let stopT = 0;
  const poolCache = {};

  function R(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }

  /* ---------------------------------------------------------------
     Partikel dasar
     shape: sq | circle | ring | arc | line | bolt | img | crystal | rune | star
     fade : 1 = memudar linear, 0 = tahan lalu memudar di akhir, 2 = muncul lalu hilang
     age negatif = tunda munculnya
     --------------------------------------------------------------- */
  function add(o) {
    if (parts.length >= MAX) return null;
    const p = {
      x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, drag: 0, life: 0.5, age: 0,
      size: 2, size1: -1, color: '#fff', alpha: 1, add: false, shape: 'sq',
      layer: 1, rot: 0, spin: 0, fade: 1, data: null
    };
    for (const k in o) p[k] = o[k];
    if (Array.isArray(p.color)) p.color = pick(p.color);
    if (p.size1 < 0) p.size1 = p.size;
    parts.push(p);
    return p;
  }

  function sparks(x, y, n, colors, s0, s1, life, angle, spread, o) {
    for (let i = 0; i < n; i++) {
      const a = (angle === undefined ? R(0, TAU) : angle + R(-spread, spread));
      const s = R(s0, s1);
      add(Object.assign({
        x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 2.4,
        life: R(life * 0.6, life), size: 2, size1: 1, color: colors, add: true
      }, o || {}));
    }
  }
  function puffs(x, y, n, colors, spread, size0, size1, life, rise, alpha) {
    for (let i = 0; i < n; i++) {
      add({
        x: x + R(-spread, spread), y: y + R(-spread, spread), vx: R(-8, 8), vy: -R(rise * 0.4, rise),
        drag: 1, life: R(life * 0.7, life), size: size0, size1: size1, color: colors,
        alpha: alpha || 0.5, shape: 'circle', fade: 2
      });
    }
  }
  function ring(x, y, r0, r1, life, color, layer, delay) {
    add({ x: x, y: y, shape: 'ring', size: r0, size1: r1, life: life, color: color, layer: layer === undefined ? 0 : layer, add: true, age: -(delay || 0) });
  }
  function bolt(x0, y0, x1, y1, color, life, jag) {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1;
    const n = Math.max(3, Math.round(d / 7));
    const nx = -dy / d, ny = dx / d;
    const pts = [{ x: x0, y: y0 }];
    for (let i = 1; i < n; i++) {
      const o = R(-1, 1) * (jag === undefined ? 5 : jag);
      pts.push({ x: x0 + dx * i / n + nx * o, y: y0 + dy * i / n + ny * o });
    }
    pts.push({ x: x1, y: y1 });
    add({ shape: 'bolt', data: { pts: pts }, color: color, life: life || 0.16, fade: 0, add: true, layer: 1 });
  }
  function explode(x, y, r, colors) {
    add({ x: x, y: y, shape: 'circle', size: r * 0.9, size1: r * 0.25, life: 0.2, color: '#ffffff', add: true, layer: 1 });
    ring(x, y, 3, r, 0.32, colors[0], 1);
    ring(x, y, 2, r * 0.7, 0.24, '#ffffff', 1);
    sparks(x, y, Math.round(r * 0.9), colors, 40, 140, 0.55);
    puffs(x, y, Math.round(r / 8), [colors[0], colors[1] || colors[0], '#6a6680'], r * 0.4, 5, 12, 0.8, 22, 0.5);
    shake(Math.min(6, r / 9), 0.25);
  }
  function diskPt(z, k) {
    const a = R(0, TAU), d = Math.sqrt(Math.random()) * z.r * (k || 1);
    return { x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d };
  }
  function every(z, key, interval, dt, fn) {
    z.data[key] = (z.data[key] || 0) + dt;
    while (z.data[key] >= interval) { z.data[key] -= interval; fn(); }
  }

  /* ---------------------------------------------------------------
     Layar: getar, kilat, hitstop
     --------------------------------------------------------------- */
  function shake(p, t) { if (p >= shakeP * (shakeT / shakeDur)) { shakeP = p; shakeT = t; shakeDur = t; } }
  function flash(color, alpha, t) { flashCol = color; flashA = alpha; flashT = t; flashDur = t; }
  function hitstop(sec) { stopT = Math.max(stopT, sec); }

  /* ---------------------------------------------------------------
     Kolam (cache) untuk lava, lumpur
     --------------------------------------------------------------- */
  function poolCanvas(r, colors) {
    const key = r + colors.join('');
    if (poolCache[key]) return poolCache[key];
    const c = document.createElement('canvas');
    c.width = c.height = r * 2 + 4;
    const x = c.getContext('2d');
    const cx = r + 2, cy = r + 2;
    function disc(rad, col) {
      x.fillStyle = col;
      for (let yy = -rad; yy <= rad; yy++) {
        const half = Math.floor(Math.sqrt(Math.max(0, rad * rad - yy * yy)));
        x.fillRect(cx - half, cy + yy, half * 2, 1);
      }
    }
    disc(r, colors[2] || colors[0]);
    disc(Math.round(r * 0.86), colors[0]);
    for (let i = 0; i < r * 1.5; i++) {
      const a = R(0, TAU), d = Math.sqrt(Math.random()) * r * 0.78;
      x.fillStyle = Math.random() < 0.5 ? colors[1] : colors[2] || colors[0];
      const s = Math.random() < 0.3 ? 3 : 2;
      x.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), s, s);
    }
    poolCache[key] = c;
    return c;
  }

  /* ---------------------------------------------------------------
     Gaya efek kombinasi elemen (dipanggil lewat FX.zone)
     start(z) tick(z,dt) end(z) ground(z,ctx,cx,cy) top(z,ctx,cx,cy)
     life = lama hidup (detik) kalau kombinasi tidak punya durasi
     --------------------------------------------------------------- */
  const S = {};

  function drawPoolGround(z, ctx, cx, cy) {
    const c = poolCanvas(Math.round(z.r), z.colors);
    const a = Math.min(1, z.age / 0.2, (z.life - z.age) / 0.6);
    ctx.globalAlpha = Math.max(0, a) * 0.95;
    ctx.drawImage(c, Math.round(z.x - cx - c.width / 2), Math.round(z.y - cy - c.height / 2));
  }

  S.steam = {
    start: function (z) { puffs(z.x, z.y, 22, ['#ffffff', '#dfe6f5', '#aab4cc'], z.r * 0.6, 6, 14, 1.4, 26, 0.6); },
    tick: function (z, dt) {
      every(z, 'p', 0.035, dt, function () {
        const p = diskPt(z, 0.95);
        add({ x: p.x, y: p.y, vx: R(-6, 6), vy: -R(8, 22), size: 5, size1: 13, life: R(1, 1.6), color: ['#ffffff', '#e4eaf7', '#b8c2d8'], alpha: 0.55, shape: 'circle', fade: 2 });
      });
    }
  };

  S.lava = {
    start: function (z) { ring(z.x, z.y, 4, z.r * 1.1, 0.4, '#ffb347', 0); sparks(z.x, z.y, 24, ['#ff3a10', '#ff9a2a', '#ffe08a'], 30, 110, 0.6); shake(2, 0.15); },
    ground: drawPoolGround,
    tick: function (z, dt) {
      every(z, 'e', 0.05, dt, function () {
        const p = diskPt(z, 0.9);
        add({ x: p.x, y: p.y, vx: R(-6, 6), vy: -R(20, 50), ay: 30, life: R(0.5, 1), size: 2, size1: 1, color: ['#ff3a10', '#ff9a2a', '#ffe08a'], add: true });
      });
      every(z, 'b', 0.18, dt, function () {
        const p = diskPt(z, 0.85);
        add({ x: p.x, y: p.y, shape: 'ring', size: 1, size1: 4, life: 0.35, color: '#ffb347', layer: 0, add: true });
      });
      every(z, 's', 0.3, dt, function () {
        const p = diskPt(z, 0.8);
        add({ x: p.x, y: p.y, vy: -14, size: 6, size1: 12, life: 1, color: '#4a3a3a', alpha: 0.3, shape: 'circle', fade: 2 });
      });
    },
    end: function (z) { puffs(z.x, z.y, 8, ['#4a3a3a', '#6a6680'], z.r * 0.5, 6, 12, 1, 18, 0.4); }
  };

  S.plasma = {
    start: function (z) {
      if (z.vx === undefined) { z.vx = Math.cos(z.angle) * 150; z.vy = Math.sin(z.angle) * 150; }
      sparks(z.x, z.y, 12, z.colors, 30, 90, 0.4, z.angle, 0.5);
    },
    tick: function (z, dt) {
      add({ x: z.x, y: z.y, shape: 'circle', size: 14, size1: 10, life: 0.07, color: z.colors[0], alpha: 0.5, add: true });
      add({ x: z.x, y: z.y, shape: 'circle', size: 7, size1: 5, life: 0.07, color: '#ffffff', add: true });
      add({ x: z.x + R(-3, 3), y: z.y + R(-3, 3), vx: R(-20, 20), vy: R(-20, 20), size: 3, size1: 0, life: 0.4, color: z.colors, add: true });
      every(z, 'z', 0.06, dt, function () {
        const a = R(0, TAU);
        bolt(z.x, z.y, z.x + Math.cos(a) * R(12, 20), z.y + Math.sin(a) * R(12, 20), z.colors[1], 0.1, 3);
      });
    },
    end: function (z) { explode(z.x, z.y, z.r * 1.3, z.colors); }
  };

  S.firevortex = {
    start: function (z) { ring(z.x, z.y, 4, z.r, 0.4, '#ffb347', 0); },
    ground: function (z, ctx, cx, cy) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.18 + Math.sin(z.age * 9) * 0.05;
      ctx.fillStyle = '#ff5a2a';
      const r = Math.round(z.r);
      for (let yy = -r; yy <= r; yy += 2) {
        const half = Math.floor(Math.sqrt(r * r - yy * yy));
        ctx.fillRect(Math.round(z.x - cx - half), Math.round(z.y - cy + yy), half * 2, 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    tick: function (z, dt) {
      for (let k = 0; k < 6; k++) {
        const a = z.age * 8 + k * (TAU / 6), d = R(0.25, 1) * z.r;
        add({
          x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d,
          vx: -Math.sin(a) * 60, vy: Math.cos(a) * 60 - R(10, 30), drag: 1.2, life: R(0.35, 0.7),
          size: 3, size1: 1, color: z.colors, add: true
        });
      }
      every(z, 'c', 0.05, dt, function () {
        const a = R(0, TAU);
        add({ x: z.x + Math.cos(a) * z.r * 0.5, y: z.y + Math.sin(a) * z.r * 0.5, vy: -R(30, 60), size: 5, size1: 1, life: 0.6, color: '#ffe08a', add: true });
      });
    }
  };

  S.mud = {
    start: function (z) { sparks(z.x, z.y, 20, ['#6b4a2a', '#8a6b3a', '#3a2a18'], 30, 100, 0.5, undefined, 0, { add: false, ay: 200 }); ring(z.x, z.y, 3, z.r, 0.35, '#8a6b3a', 0); },
    ground: drawPoolGround,
    tick: function (z, dt) {
      every(z, 'b', 0.12, dt, function () {
        const p = diskPt(z, 0.85);
        add({ x: p.x, y: p.y, shape: 'ring', size: 1, size1: 5, life: 0.5, color: '#b08a5a', layer: 0, add: false });
      });
    }
  };

  S.chargedwater = {
    life: 0.5,
    start: function (z) {
      ring(z.x, z.y, 4, z.r, 0.4, '#3aa0ff', 0);
      sparks(z.x, z.y, 18, ['#3aa0ff', '#9fd8ff', '#ffffff'], 30, 110, 0.5, undefined, 0, { ay: 160 });
      for (let i = 0; i < 4; i++) { const a = R(0, TAU); bolt(z.x, z.y, z.x + Math.cos(a) * 22, z.y + Math.sin(a) * 22, '#ffd93a', 0.14, 4); }
    }
  };

  S.ice = {
    life: 0.9,
    start: function (z) {
      for (let i = 0; i < 14; i++) {
        const a = z.angle + R(-0.5, 0.5), d = R(10, z.r);
        add({ x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d, shape: 'crystal', size: 0, size1: R(5, 10), life: R(0.7, 1), color: ['#bfeaff', '#7fe8ff', '#ffffff'], fade: 0, layer: 1 });
      }
      sparks(z.x, z.y, 26, ['#ffffff', '#bfeaff', '#7fe8ff'], 60, 190, 0.6, z.angle, 0.5);
      ring(z.x, z.y, 4, z.r * 0.8, 0.3, '#bfeaff', 1);
    },
    tick: function (z, dt) {
      every(z, 's', 0.04, dt, function () {
        const a = z.angle + R(-0.5, 0.5), d = R(8, z.r);
        add({ x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d, vy: -R(4, 14), size: 2, size1: 0, life: 0.6, color: '#ffffff', add: true });
      });
    },
    end: function (z) { sparks(z.x, z.y, 20, ['#ffffff', '#bfeaff'], 20, 70, 0.5, z.angle, 0.6); }
  };

  S.tidal = {
    life: 0.55,
    start: function (z) {
      const sp = z.r / 0.5;
      z.vx = Math.cos(z.angle) * sp; z.vy = Math.sin(z.angle) * sp;
      sparks(z.x, z.y, 14, ['#ffffff', '#9fd8ff'], 30, 90, 0.4, z.angle, 0.8);
    },
    tick: function (z, dt) {
      const px = -Math.sin(z.angle), py = Math.cos(z.angle);
      add({ x: z.x, y: z.y, shape: 'arc', rot: z.angle, data: { arc: 1.9, reach: 13, th: 3 }, life: 0.14, color: ['#ffffff', '#9fd8ff'], add: true });
      for (let i = 0; i < 5; i++) {
        const o = R(-16, 16);
        add({ x: z.x + px * o, y: z.y + py * o, vx: Math.cos(z.angle) * R(-20, 40) + px * o, vy: Math.sin(z.angle) * R(-20, 40) + py * o, drag: 2, life: R(0.25, 0.5), size: 3, size1: 1, color: ['#2a7fe0', '#9fd8ff', '#ffffff'], add: false });
      }
    },
    end: function (z) { puffs(z.x, z.y, 8, ['#ffffff', '#9fd8ff'], 10, 5, 10, 0.5, 10, 0.5); }
  };

  /* Hujan batu / sambaran petir memakai daftar titik jatuh z.data.impacts
     Tiap titik: {x, y, t, landed}. game bisa memberi damage saat landed = true. */
  function makeImpacts(z, n, spread) {
    z.data.impacts = [];
    for (let i = 0; i < n; i++) {
      const p = diskPt(z, spread || 1);
      z.data.impacts.push({ x: p.x, y: p.y, t: 0.25 + (i / n) * (z.life - 0.7) + R(0, 0.12), landed: false, warned: false });
    }
  }

  S.hotrock = {
    life: 1.8,
    start: function (z) { makeImpacts(z, z.combo.count || 7); ring(z.x, z.y, 4, z.r, 0.4, '#ff7a2a', 0); },
    tick: function (z) {
      z.data.impacts.forEach(function (im) {
        if (!im.warned && z.age >= im.t - 0.38) {
          im.warned = true;
          add({ x: im.x, y: im.y, shape: 'ring', size: 12, size1: 4, life: 0.38, color: '#ff7a2a', layer: 0, add: true });
          add({ x: im.x, y: im.y - 90, vx: 0, vy: 240, size: 5, size1: 5, life: 0.38, color: '#8a6b3a', fade: 0, layer: 1 });
          add({ x: im.x, y: im.y - 90, vy: 240, size: 8, size1: 2, life: 0.38, color: '#ff7a2a', alpha: 0.6, shape: 'circle', add: true, layer: 1 });
        }
        if (!im.landed && z.age >= im.t) {
          im.landed = true;
          explode(im.x, im.y, 14, ['#ff7a2a', '#ffb347', '#c8944f']);
          sparks(im.x, im.y, 8, ['#8a6b3a', '#5a3b16'], 40, 110, 0.6, undefined, 0, { add: false, ay: 220, size: 3 });
        }
      });
    }
  };

  S.magnet = {
    life: 1.2,
    start: function (z) { ring(z.x, z.y, z.r, 4, 0.5, '#b04dff', 0); },
    tick: function (z, dt) {
      every(z, 'r', 0.16, dt, function () { ring(z.x, z.y, z.r, 4, 0.45, pick(['#b04dff', '#ffd93a']), 0); });
      every(z, 's', 0.03, dt, function () {
        const a = R(0, TAU);
        add({ x: z.x + Math.cos(a) * z.r, y: z.y + Math.sin(a) * z.r, vx: -Math.cos(a) * 140, vy: -Math.sin(a) * 140, life: 0.45, size: 2, size1: 1, color: ['#b04dff', '#ffd93a', '#c8944f'], add: true });
      });
      for (let i = 0; i < 3; i++) {
        const a = z.age * 5 + i * 2.1, d = 14 + i * 4;
        add({ x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d, life: 0.06, size: 3, color: '#8a6b3a', fade: 0 });
      }
    },
    end: function (z) { explode(z.x, z.y, 14, z.colors); }
  };

  S.dust = {
    start: function (z) { puffs(z.x, z.y, 18, ['#d8b27a', '#c8944f', '#f0d29a'], z.r * 0.6, 6, 14, 1.4, 14, 0.5); },
    tick: function (z, dt) {
      every(z, 'p', 0.04, dt, function () {
        const p = diskPt(z, 0.95), a = Math.atan2(p.y - z.y, p.x - z.x);
        add({ x: p.x, y: p.y, vx: -Math.sin(a) * 24, vy: Math.cos(a) * 24, size: 4, size1: 11, life: R(1, 1.5), color: ['#d8b27a', '#c8944f', '#f0d29a'], alpha: 0.42, shape: 'circle', fade: 2 });
      });
    }
  };

  S.rockwall = {
    start: function (z) {
      const n = 6, width = z.r * 1.7, pa = z.angle + Math.PI / 2;
      z.data.blocks = [];
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * (width / (n - 1));
        z.data.blocks.push({ x: z.x + Math.cos(pa) * off, y: z.y + Math.sin(pa) * off, w: 13, h: 13, v: R(0.8, 1) });
      }
      z.data.blocks.forEach(function (b) {
        puffs(b.x, b.y, 3, ['#d8b27a', '#c8944f'], 5, 4, 9, 0.7, 12, 0.5);
        sparks(b.x, b.y, 5, ['#9a7a4a', '#5a3b16'], 30, 80, 0.5, undefined, 0, { add: false, ay: 200, size: 3 });
      });
      shake(2.5, 0.2);
    },
    top: function (z, ctx, cx, cy) {
      const rise = Math.min(1, z.age / 0.18) * Math.min(1, Math.max(0, (z.life - z.age) / 0.3));
      ctx.globalAlpha = 1;
      z.data.blocks.forEach(function (b) {
        const h = Math.round(b.h * rise * b.v), x = Math.round(b.x - cx - b.w / 2), y = Math.round(b.y - cy + b.h / 2);
        if (h <= 0) return;
        ctx.fillStyle = '#5a3b16'; ctx.fillRect(x - 1, y - h - 1, b.w + 2, h + 2);
        ctx.fillStyle = '#8a6b3a'; ctx.fillRect(x, y - h, b.w, h);
        ctx.fillStyle = '#c8944f'; ctx.fillRect(x, y - h, b.w, 3);
        ctx.fillStyle = '#f0d29a'; ctx.fillRect(x + 1, y - h + 1, 4, 1);
        ctx.fillStyle = '#5a3b16'; ctx.fillRect(x + 3, y - h + 5, 1, Math.max(0, h - 5)); ctx.fillRect(x + 8, y - h + 4, 1, Math.max(0, h - 4));
      });
    },
    end: function (z) {
      z.data.blocks.forEach(function (b) {
        puffs(b.x, b.y, 2, ['#d8b27a', '#c8944f'], 5, 4, 10, 0.7, 12, 0.5);
        sparks(b.x, b.y, 5, ['#9a7a4a', '#5a3b16'], 30, 90, 0.6, undefined, 0, { add: false, ay: 220, size: 3 });
      });
    }
  };

  S.blast = {
    life: 0.6,
    start: function (z) {
      explode(z.x, z.y, z.r, z.colors);
      ring(z.x, z.y, 4, z.r * 1.2, 0.45, '#ffffff', 1, 0.05);
      for (let i = 0; i < 9; i++) { const a = i * TAU / 9 + R(-0.2, 0.2); bolt(z.x, z.y, z.x + Math.cos(a) * z.r * R(0.8, 1.2), z.y + Math.sin(a) * z.r * R(0.8, 1.2), pick(['#ffd93a', '#ffffff']), 0.2, 5); }
      flash('#fff3b0', 0.45, 0.18); hitstop(0.06); shake(7, 0.35);
    }
  };

  S.efield = {
    start: function (z) { ring(z.x, z.y, 4, z.r, 0.35, '#ffd93a', 0); },
    ground: function (z, ctx, cx, cy) {
      const a = Math.min(1, z.age / 0.2, (z.life - z.age) / 0.5);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, a) * (0.14 + Math.random() * 0.05);
      ctx.fillStyle = '#3aa0ff';
      const r = Math.round(z.r);
      for (let yy = -r; yy <= r; yy += 2) {
        const half = Math.floor(Math.sqrt(r * r - yy * yy));
        ctx.fillRect(Math.round(z.x - cx - half), Math.round(z.y - cy + yy), half * 2, 2);
      }
      ctx.globalAlpha = Math.max(0, a) * 0.9;
      ctx.fillStyle = '#ffd93a';
      for (let i = 0; i < 48; i++) {
        const an = i / 48 * TAU + z.age * 0.8;
        if (i % 2 === 0) ctx.fillRect(Math.round(z.x - cx + Math.cos(an) * r), Math.round(z.y - cy + Math.sin(an) * r), 2, 1);
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    tick: function (z, dt) {
      every(z, 'b', 0.09, dt, function () {
        const a = R(0, TAU), b = a + R(-1.2, 1.2);
        bolt(z.x + Math.cos(a) * z.r, z.y + Math.sin(a) * z.r, z.x + Math.cos(b) * z.r * R(0.1, 0.8), z.y + Math.sin(b) * z.r * R(0.1, 0.8), pick(['#ffd93a', '#9fd8ff', '#ffffff']), 0.1, 4);
      });
      every(z, 's', 0.05, dt, function () {
        const p = diskPt(z, 0.95);
        add({ x: p.x, y: p.y, vy: -R(6, 20), life: 0.5, size: 2, size1: 0, color: ['#ffd93a', '#3aa0ff'], add: true });
      });
    }
  };

  S.thunderstorm = {
    start: function (z) { makeImpacts(z, z.combo.strikes || 9, 1); ring(z.x, z.y, 4, z.r, 0.45, '#b8a0ff', 0); },
    ground: function (z, ctx, cx, cy) {
      const a = Math.min(1, z.age / 0.3, (z.life - z.age) / 0.5);
      ctx.globalAlpha = Math.max(0, a) * 0.2;
      ctx.fillStyle = '#2a1a5a';
      const r = Math.round(z.r);
      for (let yy = -r; yy <= r; yy += 2) {
        const half = Math.floor(Math.sqrt(r * r - yy * yy));
        ctx.fillRect(Math.round(z.x - cx - half), Math.round(z.y - cy + yy), half * 2, 2);
      }
    },
    tick: function (z, dt) {
      every(z, 'w', 0.04, dt, function () {
        const a = R(0, TAU), d = R(0.5, 1) * z.r;
        add({ x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d, vx: -Math.sin(a) * 40, vy: Math.cos(a) * 40, life: 0.5, size: 2, size1: 1, color: ['#7fe8ff', '#b8a0ff'], add: true });
      });
      z.data.impacts.forEach(function (im) {
        if (!im.warned && z.age >= im.t - 0.3) {
          im.warned = true;
          add({ x: im.x, y: im.y, shape: 'ring', size: 10, size1: 3, life: 0.3, color: '#ffd93a', layer: 0, add: true });
        }
        if (!im.landed && z.age >= im.t) {
          im.landed = true;
          bolt(im.x + R(-14, 14), im.y - 130, im.x, im.y, '#ffffff', 0.18, 8);
          bolt(im.x + R(-6, 6), im.y - 130, im.x, im.y, '#ffd93a', 0.22, 10);
          ring(im.x, im.y, 2, 16, 0.25, '#ffd93a', 1);
          sparks(im.x, im.y, 12, ['#ffd93a', '#ffffff', '#7fe8ff'], 40, 120, 0.4);
          add({ x: im.x, y: im.y, shape: 'circle', size: 12, size1: 2, life: 0.12, color: '#ffffff', add: true });
          shake(2, 0.1);
        }
      });
    }
  };

  S.quake = {
    life: 0.9,
    start: function (z) {
      for (let i = 0; i < 3; i++) ring(z.x, z.y, 4, z.r * (0.6 + i * 0.2), 0.45 + i * 0.1, i ? '#ffd93a' : '#c8944f', 0, i * 0.08);
      for (let i = 0; i < 9; i++) {
        const a = i * TAU / 9 + R(-0.15, 0.15);
        add({ x: z.x, y: z.y, shape: 'line', rot: a, size: 4, size1: z.r * R(0.8, 1.1), life: 0.9, color: '#3a2410', data: { th: 2 }, layer: 0, fade: 0 });
      }
      sparks(z.x, z.y, 22, ['#c8944f', '#8a6b3a', '#5a3b16'], 40, 120, 0.7, undefined, 0, { add: false, ay: 240, size: 3 });
      puffs(z.x, z.y, 14, ['#d8b27a', '#c8944f'], z.r * 0.4, 6, 14, 1, 16, 0.5);
      shake(6, 0.4); hitstop(0.04);
    }
  };

  S.firewind = {
    life: 0.5,
    tick: function (z, dt) {
      for (let i = 0; i < 7; i++) {
        const a = z.angle + R(-0.45, 0.45), s = R(110, 230);
        add({ x: z.x, y: z.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 2.2, life: R(0.25, 0.5), size: 4, size1: 1, color: ['#ff5a2a', '#ffb347', '#ffe08a'], add: true });
      }
      for (let i = 0; i < 2; i++) {
        const a = z.angle + R(-0.4, 0.4), d = R(6, z.r * 0.6);
        add({ x: z.x + Math.cos(a) * d, y: z.y + Math.sin(a) * d, shape: 'line', rot: a, size: R(8, 16), size1: 2, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, life: 0.22, color: ['#e0fbff', '#7fe8ff'], data: { th: 1 }, add: true });
      }
    },
    start: function (z) { shake(3, 0.2); sparks(z.x, z.y, 10, ['#7fe8ff', '#ffffff'], 80, 200, 0.3, z.angle, 0.4); }
  };

  S.mist = {
    start: function (z) { puffs(z.x, z.y, 14, ['#b8a0ff', '#9fd8ff', '#ffffff'], z.r * 0.6, 8, 18, 1.8, 10, 0.3); },
    tick: function (z, dt) {
      every(z, 'p', 0.05, dt, function () {
        const p = diskPt(z, 0.95);
        add({ x: p.x, y: p.y, vx: R(-10, 10), vy: R(-8, 4), size: 8, size1: 18, life: R(1.4, 2.2), color: ['#b8a0ff', '#9fd8ff', '#e4d8ff'], alpha: 0.28, shape: 'circle', fade: 2 });
      });
      every(z, 's', 0.08, dt, function () {
        const p = diskPt(z, 0.9);
        add({ x: p.x, y: p.y, vy: -R(6, 14), size: 2, size1: 0, life: 0.8, color: '#ffffff', add: true });
      });
    }
  };

  S.magicdust = {
    start: function (z) { ring(z.x, z.y, 4, 22, 0.4, '#e0b8ff', 1); sparks(z.x, z.y, 18, ['#e0b8ff', '#f0d29a', '#ffffff'], 30, 90, 0.5); },
    tick: function (z, dt) {
      for (let i = 0; i < 2; i++) {
        const a = z.age * 7 + i * Math.PI, h = (z.age * 40 + i * 14) % 28;
        add({ x: z.x + Math.cos(a) * (10 + Math.sin(z.age * 3) * 2), y: z.y + 6 - h + Math.sin(a) * 4, life: 0.5, size: 2, size1: 0, color: z.colors, add: true });
      }
      every(z, 'g', 0.08, dt, function () {
        add({ x: z.x + R(-12, 12), y: z.y + R(-14, 8), vy: -R(8, 20), life: 0.7, size: 2, size1: 0, color: ['#ffffff', '#f0d29a'], add: true });
      });
    }
  };

  S.tornado = {
    start: function (z) { ring(z.x, z.y, 3, 20, 0.3, '#7fe8ff', 0); },
    tick: function (z, dt) {
      for (let i = 0; i < 8; i++) {
        const h = Math.random(), rad = 4 + h * z.r * 0.8, a = z.age * 11 + h * 9 + i;
        add({ x: z.x + Math.cos(a) * rad, y: z.y - h * 42 + Math.sin(a) * rad * 0.35, vx: z.vx || 0, vy: z.vy || 0, life: 0.18, size: 2 + h * 2, size1: 1, color: ['#7fe8ff', '#e0fbff', '#ffd93a'], add: true, alpha: 0.9 });
      }
      add({ x: z.x, y: z.y + 4, shape: 'circle', size: 12, size1: 14, life: 0.08, color: '#2a4a5a', alpha: 0.3, layer: 0 });
      every(z, 'z', 0.15, dt, function () {
        const a = R(0, TAU), h = R(0.2, 0.9);
        bolt(z.x, z.y - h * 40, z.x + Math.cos(a) * z.r, z.y - h * 20 + Math.sin(a) * z.r * 0.6, '#ffd93a', 0.1, 4);
      });
    }
  };

  /* ---------------------------------------------------------------
     Zona = efek yang punya posisi, radius, durasi
     z.x z.y z.r z.age z.life z.angle z.data  (z.follow: objek yang diikuti)
     z.vx z.vy: kecepatan gerak. z.life = z.age  -> efek berakhir sekarang
     --------------------------------------------------------------- */
  function zone(combo, x, y, o) {
    o = o || {};
    const st = S[combo.fx] || {};
    const z = {
      combo: combo, x: x, y: y, r: o.r || combo.r,
      life: o.life || (combo.dur ? combo.dur / 1000 : (st.life || 0.6)),
      age: 0, angle: o.angle || 0, data: {}, follow: o.follow || null,
      vx: o.vx, vy: o.vy, colors: combo.colors, st: st, dead: false
    };
    zones.push(z);
    if (st.start) st.start(z);
    return z;
  }

  /* ---------------------------------------------------------------
     Efek umum
     --------------------------------------------------------------- */
  function slash(x, y, angle, arcDeg, reach, color, glow) {
    const arc = arcDeg * Math.PI / 180;
    add({ x: x, y: y, shape: 'arc', rot: angle, data: { arc: arc, reach: reach, th: 4 }, life: 0.17, color: glow || '#ffffff', add: true, fade: 1 });
    add({ x: x, y: y, shape: 'arc', rot: angle, data: { arc: arc * 0.9, reach: reach - 2, th: 2 }, life: 0.22, color: color, add: true, fade: 1 });
    for (let i = 0; i < 5; i++) {
      const a = angle + R(-arc / 2, arc / 2);
      add({ x: x + Math.cos(a) * reach, y: y + Math.sin(a) * reach, vx: Math.cos(a) * R(20, 70), vy: Math.sin(a) * R(20, 70), drag: 2.5, life: 0.3, size: 2, size1: 0, color: color, add: true });
    }
  }
  function thrust(x, y, angle, reach, color) {
    add({ x: x + Math.cos(angle) * 4, y: y + Math.sin(angle) * 4, shape: 'line', rot: angle, size: reach, size1: reach * 0.6, life: 0.14, color: '#ffffff', data: { th: 3 }, add: true });
    add({ x: x + Math.cos(angle) * 4, y: y + Math.sin(angle) * 4, shape: 'line', rot: angle, size: reach, size1: reach * 0.8, life: 0.2, color: color, data: { th: 1 }, add: true });
    sparks(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach, 5, [color, '#ffffff'], 30, 100, 0.3, angle, 0.6);
  }
  function smash(x, y, r, color) {
    ring(x, y, 2, r, 0.3, color, 1);
    ring(x, y, 2, r * 0.7, 0.2, '#ffffff', 1);
    puffs(x, y, 6, ['#d8b27a', '#a89a8a'], r * 0.5, 4, 10, 0.6, 10, 0.5);
    sparks(x, y, 12, [color, '#ffffff'], 40, 120, 0.4, undefined, 0, { ay: 160 });
    shake(4, 0.2);
  }
  function hit(x, y, color, angle, power) {
    const n = 5 + Math.round((power || 1) * 3);
    add({ x: x, y: y, shape: 'circle', size: 9, size1: 2, life: 0.09, color: '#ffffff', add: true });
    sparks(x, y, n, [color, '#ffffff'], 60, 160, 0.3, angle, 0.9);
    for (let i = 0; i < 3; i++) add({ x: x, y: y, vx: R(-50, 50), vy: R(-70, -20), ay: 240, life: 0.4, size: 2, size1: 1, color: color });
  }
  function trail(x, y, color, size) {
    add({ x: x + R(-1, 1), y: y + R(-1, 1), vx: R(-8, 8), vy: R(-8, 8), life: 0.25, size: size || 3, size1: 0, color: color, add: true });
  }
  function dust(x, y) {
    add({ x: x + R(-2, 2), y: y + R(-1, 1), vx: R(-10, 10), vy: R(-8, 0), life: 0.35, size: 3, size1: 6, color: '#b8a98a', alpha: 0.35, shape: 'circle', fade: 1, layer: 0 });
  }
  function afterimage(x, y, img, alpha) {
    add({ x: x, y: y, shape: 'img', data: { img: img }, life: 0.22, alpha: alpha || 0.5, fade: 1, add: true });
  }
  function death(x, y, color, size) {
    ring(x, y, 2, size * 1.4, 0.35, color, 1);
    sparks(x, y, 14 + size, [color, '#ffffff', ELEMENTS.petir.color], 30, 120, 0.7, undefined, 0, { ay: 90, size: 3 });
    puffs(x, y, 5, ['#6a6680', color], size * 0.4, 5, 12, 0.8, 16, 0.5);
    shake(1.5, 0.12);
  }
  function levelUp(x, y) {
    ring(x, y, 4, 36, 0.6, '#ffd24a', 1);
    ring(x, y, 4, 26, 0.5, '#ffffff', 1, 0.1);
    for (let i = 0; i < 26; i++) {
      add({ x: x + R(-12, 12), y: y + R(-4, 8), vy: -R(30, 90), vx: R(-10, 10), life: R(0.7, 1.3), size: 3, size1: 0, color: ['#ffd24a', '#ffffff', '#b56bff'], add: true });
    }
    flash('#fff3b0', 0.3, 0.3);
  }
  function pickup(x, y, color) {
    ring(x, y, 2, 12, 0.25, color, 1);
    sparks(x, y, 8, [color, '#ffffff'], 30, 80, 0.4);
  }
  /* Lingkaran sihir di tanah saat skill dipakai */
  function cast(x, y, combo) {
    add({ x: x, y: y, shape: 'rune', data: { r: 22, c2: combo.colors[1] }, color: combo.colors[0], life: 0.55, rot: R(0, TAU), spin: 4, layer: 0, add: true, fade: 2 });
    sparks(x, y, 14, combo.colors, 20, 70, 0.5, undefined, 0, { vy: -30 });
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU;
      add({ x: x + Math.cos(a) * 20, y: y + Math.sin(a) * 20, vy: -R(30, 70), life: 0.5, size: 2, size1: 0, color: combo.colors, add: true });
    }
  }
  /* Rantai petir antar titik: FX.chain([{x,y},{x,y},...], colors) */
  function chain(points, colors) {
    for (let i = 0; i < points.length - 1; i++) {
      bolt(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, colors[1] || '#ffd93a', 0.2, 5);
      bolt(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, '#ffffff', 0.12, 3);
      sparks(points[i + 1].x, points[i + 1].y, 6, colors, 30, 90, 0.3);
    }
  }
  /* Efek status di atas musuh/pemain, panggil tiap frame: FX.status(x,y,'burn',dt) */
  function status(x, y, name, dt) {
    const rate = dt * 18;
    if (Math.random() > rate) return;
    switch (name) {
      case 'burn':    add({ x: x + R(-4, 4), y: y + R(-2, 4), vy: -R(20, 40), life: 0.5, size: 3, size1: 0, color: ['#ff5a2a', '#ffb347'], add: true }); break;
      case 'bleed':   add({ x: x + R(-4, 4), y: y, vy: R(10, 30), ay: 100, life: 0.4, size: 2, size1: 1, color: '#d02a3a' }); break;
      case 'freeze':  add({ x: x + R(-6, 6), y: y + R(-8, 6), life: 0.4, size: 2, size1: 0, color: ['#ffffff', '#bfeaff'], add: true }); break;
      case 'stun': {
        const a = performance.now() / 120;
        add({ x: x + Math.cos(a) * 7, y: y - 12 + Math.sin(a) * 2.5, life: 0.12, size: 3, size1: 2, color: '#ffd93a', add: true });
        break;
      }
      case 'slow':    add({ x: x + R(-4, 4), y: y + R(2, 6), vy: R(6, 16), life: 0.45, size: 2, size1: 1, color: '#8a6b3a' }); break;
      case 'blind':   add({ x: x + R(-5, 5), y: y - 8, vy: -R(4, 12), life: 0.6, size: 3, size1: 6, color: '#cfd8e8', alpha: 0.4, shape: 'circle' }); break;
      case 'confuse': {
        const a = performance.now() / 150;
        add({ x: x + Math.cos(a) * 6, y: y - 12 + Math.sin(a * 1.3) * 3, life: 0.2, size: 2, size1: 1, color: '#b8a0ff', add: true });
        break;
      }
    }
  }
  /* Debu cahaya melayang di sekitar layar */
  function ambient(camX, camY, dt, colors) {
    if (Math.random() > dt * 7) return;
    add({
      x: camX + R(0, CFG.W), y: camY + R(0, CFG.H), vx: R(-4, 4), vy: -R(3, 10),
      life: R(3, 5), size: pick([1, 1, 2]), size1: 1, color: colors || ['#b8a0ff', '#9fd8ff', '#ffe08a'],
      alpha: 0.7, add: true, fade: 2, layer: 1
    });
  }
  function text(x, y, str, color, big) {
    texts.push({ x: x, y: y, vy: -34, age: 0, life: big ? 0.95 : 0.7, str: String(str), color: color || '#ffffff', big: !!big });
  }

  /* ---------------------------------------------------------------
     Update
     --------------------------------------------------------------- */
  function tick(dt) {
    if (stopT > 0) { stopT -= dt; return dt * 0.05; }
    return dt;
  }

  function update(dt) {
    // zona
    for (let i = zones.length - 1; i >= 0; i--) {
      const z = zones[i];
      z.age += dt;
      if (z.follow) { z.x = z.follow.x; z.y = z.follow.y; }
      if (z.vx !== undefined) { z.x += z.vx * dt; z.y += z.vy * dt; }
      if (z.st.tick) z.st.tick(z, dt);
      if (z.age >= z.life) {
        if (z.st.end) z.st.end(z);
        z.dead = true;
        zones[i] = zones[zones.length - 1]; zones.pop();
      }
    }
    // partikel
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      if (p.age < 0) continue;
      p.vx += p.ax * dt; p.vy += p.ay * dt;
      if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
    // teks damage
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.age += dt; t.y += t.vy * dt; t.vy *= Math.max(0, 1 - 3 * dt);
      if (t.age >= t.life) texts.splice(i, 1);
    }
    if (shakeT > 0) shakeT -= dt;
    if (flashT > 0) flashT -= dt;
  }

  /* ---------------------------------------------------------------
     Gambar
     --------------------------------------------------------------- */
  function rpx(ctx, x, y, s) {
    s = Math.max(1, Math.round(s));
    ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
  }
  function pxLine(ctx, x0, y0, x1, y1, w) {
    const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) ctx.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), w, w);
  }
  function pxRing(ctx, x, y, r, th) {
    if (r < 1) { ctx.fillRect(Math.round(x), Math.round(y), th, th); return; }
    const n = Math.max(12, Math.round(r * 4));
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU;
      ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), th, th);
    }
  }
  function pxDisc(ctx, x, y, r) {
    r = Math.max(1, Math.round(r));
    for (let yy = -r; yy <= r; yy++) {
      const half = Math.floor(Math.sqrt(r * r - yy * yy));
      ctx.fillRect(Math.round(x) - half, Math.round(y) + yy, half * 2 + 1, 1);
    }
  }

  function draw(ctx, cx, cy, layer) {
    ctx.save();
    const W = CFG.W, H = CFG.H;

    if (layer === 0) {
      for (let i = 0; i < zones.length; i++) {
        const z = zones[i];
        if (z.st.ground) { ctx.globalCompositeOperation = 'source-over'; z.st.ground(z, ctx, cx, cy); }
      }
    }

    let curAdd = false;
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.layer !== layer || p.age < 0) continue;
      const t = p.age / p.life;
      let a = p.alpha;
      if (p.fade === 1) a *= 1 - t;
      else if (p.fade === 2) a *= Math.sin(Math.PI * t);
      else a *= t > 0.75 ? (1 - t) / 0.25 : 1;
      if (a <= 0.02) continue;
      const sx = p.x - cx, sy = p.y - cy;
      if (p.shape !== 'bolt' && (sx < -60 || sy < -60 || sx > W + 60 || sy > H + 60)) continue;
      if (p.add !== curAdd) { curAdd = p.add; ctx.globalCompositeOperation = curAdd ? 'lighter' : 'source-over'; }
      ctx.globalAlpha = Math.min(1, a);
      ctx.fillStyle = p.color;
      const s = p.size + (p.size1 - p.size) * t;

      switch (p.shape) {
        case 'sq':
          if (p.add && s >= 3) { ctx.globalAlpha = Math.min(1, a) * 0.3; rpx(ctx, sx, sy, s + 2); ctx.globalAlpha = Math.min(1, a); }
          rpx(ctx, sx, sy, s); break;
        case 'circle': pxDisc(ctx, sx, sy, s); break;
        case 'ring': pxRing(ctx, sx, sy, s, 1); if (s > 8) pxRing(ctx, sx, sy, s - 1, 1); break;
        case 'arc': {
          const d = p.data, grow = 1 + t * 0.12;
          const steps = Math.max(8, Math.round(d.reach * d.arc * 0.7));
          for (let k = 0; k <= steps; k++) {
            const u = k / steps, an = p.rot - d.arc / 2 + d.arc * u;
            const th = Math.max(1, Math.round(d.th * Math.sin(Math.PI * u) * (1 - t * 0.5)));
            ctx.fillRect(Math.round(sx + Math.cos(an) * d.reach * grow), Math.round(sy + Math.sin(an) * d.reach * grow), th, th);
          }
          break;
        }
        case 'line': {
          const len = s, th = (p.data && p.data.th) || 1;
          pxLine(ctx, sx, sy, sx + Math.cos(p.rot) * len, sy + Math.sin(p.rot) * len, th);
          break;
        }
        case 'bolt': {
          const pts = p.data.pts;
          ctx.globalAlpha = Math.min(1, a) * 0.35;
          for (let k = 0; k < pts.length - 1; k++) pxLine(ctx, pts[k].x - cx - 1, pts[k].y - cy - 1, pts[k + 1].x - cx - 1, pts[k + 1].y - cy - 1, 3);
          ctx.globalAlpha = Math.min(1, a);
          ctx.fillStyle = '#ffffff';
          for (let k = 0; k < pts.length - 1; k++) pxLine(ctx, pts[k].x - cx, pts[k].y - cy, pts[k + 1].x - cx, pts[k + 1].y - cy, 1);
          break;
        }
        case 'crystal': {
          const h = Math.max(1, Math.round(s));
          for (let k = -h; k <= h; k++) {
            const w = h - Math.abs(k);
            ctx.fillRect(Math.round(sx) - w, Math.round(sy) + k, w * 2 + 1, 1);
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - h + 1, 1, Math.max(1, Math.round(h * 0.8)));
          break;
        }
        case 'rune': {
          const r = p.data.r * (0.8 + 0.2 * Math.min(1, t * 4));
          pxRing(ctx, sx, sy, r, 1); pxRing(ctx, sx, sy, r * 0.72, 1);
          ctx.fillStyle = p.data.c2;
          for (let k = 0; k < 6; k++) {
            const a0 = p.rot + k * TAU / 6, a1 = p.rot + (k + 2) * TAU / 6;
            pxLine(ctx, sx + Math.cos(a0) * r * 0.72, sy + Math.sin(a0) * r * 0.72, sx + Math.cos(a1) * r * 0.72, sy + Math.sin(a1) * r * 0.72, 1);
          }
          for (let k = 0; k < 12; k++) { const an = -p.rot + k * TAU / 12; rpx(ctx, sx + Math.cos(an) * r, sy + Math.sin(an) * r, 2); }
          break;
        }
        case 'img': {
          const im = p.data.img;
          ctx.drawImage(im, Math.round(sx - im.width / 2), Math.round(sy - im.height / 2));
          break;
        }
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    if (layer === 1) {
      for (let i = 0; i < zones.length; i++) {
        const z = zones[i];
        if (z.st.top) z.st.top(z, ctx, cx, cy);
      }
      // angka damage
      ctx.textAlign = 'center';
      for (let i = 0; i < texts.length; i++) {
        const t = texts[i];
        const k = t.age / t.life;
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        const pop = t.age < 0.1 ? 1 + (0.1 - t.age) * 5 : 1;
        ctx.font = Math.round((t.big ? 9 : 7) * pop) + 'px "Press Start 2P", monospace';
        ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round';
        const tx = Math.round(t.x - cx), ty = Math.round(t.y - cy);
        ctx.strokeText(t.str, tx, ty);
        ctx.fillStyle = t.color;
        ctx.fillText(t.str, tx, ty);
      }
    }
    ctx.restore();
  }

  function drawOverlay(ctx) {
    if (flashT > 0) {
      ctx.save();
      ctx.globalAlpha = flashA * (flashT / flashDur);
      ctx.fillStyle = flashCol;
      ctx.fillRect(0, 0, CFG.W, CFG.H);
      ctx.restore();
    }
  }

  function offset() {
    if (shakeT <= 0) return { x: 0, y: 0 };
    const k = shakeP * (shakeT / shakeDur);
    return { x: Math.round(R(-k, k)), y: Math.round(R(-k, k)) };
  }

  function clear() { parts.length = 0; zones.length = 0; texts.length = 0; shakeT = 0; flashT = 0; stopT = 0; }

  return {
    add: add, sparks: sparks, puffs: puffs, ring: ring, bolt: bolt, explode: explode,
    zone: zone, zones: zones, slash: slash, thrust: thrust, smash: smash, hit: hit, trail: trail,
    dust: dust, afterimage: afterimage, death: death, levelUp: levelUp, pickup: pickup, cast: cast,
    chain: chain, status: status, ambient: ambient, text: text,
    shake: shake, flash: flash, hitstop: hitstop, offset: offset,
    tick: tick, update: update, draw: draw, drawOverlay: drawOverlay, clear: clear,
    count: function () { return parts.length; }
  };
})();
