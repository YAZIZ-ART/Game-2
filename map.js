'use strict';
/* ===== map.js — dunia 3 biome: hutan, dataran abu (lava), puncak badai ===== */
function hash2(x, y, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y, sc, s) {
  const fx = x / sc, fy = y / sc, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
  const sm = t => t * t * (3 - 2 * t), a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s);
  const u = sm(tx), v = sm(ty);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/* tile: 0 rumput,1 rumput gelap,2 jalan,3 air,4 air dalam,5 pasir,6 abu,7 lava,8 lantai batu,9 tebing,10 rumput ungu,11 air mana */
const World = {
  W: WORLD_W, H: WORLD_H, t: null, zt: null, props: [], grid: {}, base: null, spawn: { x: 0, y: 0 }, arenas: [],
  gen() {
    const W = this.W, H = this.H, t = new Uint8Array(W * H), zt = new Uint8Array(W * H);
    this.t = t; this.zt = zt; this.props = []; this.grid = {}; this.arenas = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const b = x + (vnoise(x, y, 18, 1) - 0.5) * 14, z = b < 40 ? 0 : b < 80 ? 1 : 2; let v;
      if (z === 0) { v = vnoise(x, y, 5, 3) > 0.62 ? 1 : 0; const l = vnoise(x, y, 13, 5); if (l > 0.68) v = 3; if (l > 0.76) v = 4; }
      else if (z === 1) { v = 6; if (vnoise(x, y, 11, 6) > 0.7) v = 7; else if (vnoise(x, y, 9, 7) > 0.74) v = 9; }
      else { v = 10; if (vnoise(x, y, 11, 8) > 0.7) v = 11; else if (vnoise(x, y, 9, 9) > 0.74) v = 9; }
      t[y * W + x] = v; zt[y * W + x] = z;
    }
    const carve = (cx, cy, r, v) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { if (x < 0 || y < 0 || x >= W || y >= H) continue; if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) t[y * W + x] = v; } };
    const path = (a, b) => { const n = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let i = 0; i <= n; i++) { const k = i / n; carve(a[0] + (b[0] - a[0]) * k + Math.sin(k * 9 + a[0]) * 3, a[1] + (b[1] - a[1]) * k + Math.cos(k * 7 + a[1]) * 3, 1.8, 2); } };
    const pts = [SPAWN_TILE, ...BOSSES.map(b => [b.tx, b.ty])];
    for (let i = 0; i < pts.length - 1; i++) path(pts[i], pts[i + 1]);
    carve(SPAWN_TILE[0], SPAWN_TILE[1], 6, 0);
    BOSSES.forEach(b => { carve(b.tx, b.ty, 9, 8); this.arenas.push({ x: (b.tx + 0.5) * TILE, y: (b.ty + 0.5) * TILE, r: 9 * TILE }); });
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) t[y * W + x] = 9;
    const c0 = t.slice();
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const v = c0[y * W + x]; if (v > 1) continue;
      if ([c0[y * W + x - 1], c0[y * W + x + 1], c0[(y - 1) * W + x], c0[(y + 1) * W + x]].some(n => n === 3 || n === 4)) t[y * W + x] = 5;
    }
    this.spawn = { x: (SPAWN_TILE[0] + 0.5) * TILE, y: (SPAWN_TILE[1] + 0.5) * TILE };
    /* props */
    const addP = (type, x, y, sr, v) => { const p = { t: type, x, y, sr: sr || 0, v: v || 0, sw: Math.random() * 6 }; this.props.push(p); const k = (x / 64 | 0) + (y / 64 | 0) * 1000; (this.grid[k] = this.grid[k] || []).push(p); };
    const nearPath = (x, y) => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const v = t[(y + j) * W + x + i]; if (v === 2 || v === 8) return true; } return false; };
    for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
      const v = t[y * W + x], z = zt[y * W + x]; if (nearPath(x, y)) continue;
      if (Math.hypot(x - SPAWN_TILE[0], y - SPAWN_TILE[1]) < 7) continue;
      const px = (x + 0.5) * TILE + (Math.random() - 0.5) * 8, py = (y + 0.5) * TILE + (Math.random() - 0.5) * 8, r = Math.random();
      if (z === 0 && (v === 0 || v === 1)) { const d = v === 1 ? 0.17 : 0.05; if (r < d) addP('tree', px, py, 4, Math.random() < 0.3 ? 1 : 0); else if (r < d + 0.02) addP('bush', px, py, 0); else if (r < d + 0.035) addP(Math.random() < 0.5 ? 'rock' : 'mush', px, py, 5); }
      else if (z === 1 && v === 6) { if (r < 0.025) addP('dead', px, py, 3); else if (r < 0.05) addP('rock', px, py, 5); }
      else if (z === 2 && v === 10) { if (r < 0.03) addP('crystal', px, py, 5, Math.random() < 0.5 ? 1 : 0); else if (r < 0.05) addP('rock', px, py, 5); }
    }
    this.arenas.forEach((a, ai) => {
      for (let i = 0; i < 10; i++) { const an = i / 10 * 6.283 + 0.3; addP(i % 2 ? 'torch' : 'pillar', a.x + Math.cos(an) * 8.3 * TILE, a.y + Math.sin(an) * 8.3 * TILE, 5); }
    });
    this.buildBase();
  },
  solid(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return true;
    const v = this.t[ty * this.W + tx]; return v === 3 || v === 4 || v === 7 || v === 9 || v === 11;
  },
  blocked(x, y, r) {
    const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE), y0 = Math.floor((y - r * 0.6) / TILE), y1 = Math.floor((y + r * 0.6) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.solid(tx, ty)) return true;
    const cx = (x / 64) | 0, cy = (y / 64) | 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const c = this.grid[(cx + i) + (cy + j) * 1000]; if (!c) continue;
      for (const p of c) if (p.sr && (p.x - x) ** 2 + (p.y - y) ** 2 < (p.sr + r) ** 2) return true;
    }
    return false;
  },
  zoneAt(x, y) { const tx = clamp(x / TILE | 0, 0, this.W - 1), ty = clamp(y / TILE | 0, 0, this.H - 1); return this.zt[ty * this.W + tx]; },
  nearestWalkable(x, y) { for (let r = 0; r < 80; r += 6) for (let a = 0; a < 6.3; a += 0.8) { const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (!this.blocked(px, py, 6)) return { x: px, y: py }; } return { x, y }; },

  buildBase() {
    const W = this.W, H = this.H, cv = document.createElement('canvas'); cv.width = W * TILE; cv.height = H * TILE;
    const g = cv.getContext('2d'); this.base = cv;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) this.drawTile(g, x, y);
  },
  drawTile(g, x, y) {
    const W = this.W, v = this.t[y * W + x], z = this.zt[y * W + x], X = x * TILE, Y = y * TILE;
    const h = k => hash2(x, y, k), R = (a, b, w, hh, c) => { g.fillStyle = c; g.fillRect(X + a, Y + b, w, hh); };
    const at = (tx, ty) => (tx < 0 || ty < 0 || tx >= W || ty >= H) ? 9 : this.t[ty * W + tx];
    const speck = (cols, n) => { for (let i = 0; i < n; i++) R((h(i + 10) * 15) | 0, (h(i + 30) * 15) | 0, 1 + (h(i + 50) > 0.7 ? 1 : 0), 1, cols[(h(i + 70) * cols.length) | 0]); };
    switch (v) {
      case 0: case 1: { const b = v ? ['#3d8f44', '#378840', '#43984a'] : ['#4fae4d', '#47a246', '#55b553']; R(0, 0, 16, 16, b[(h(1) * 3) | 0]); speck(v ? ['#2c7436', '#58b05a'] : ['#388a3c', '#6cc85a', '#5fbf58'], 7);
        if (h(2) > 0.93) { const fc = ['#ff8ad8', '#ffe85a', '#ffffff', '#8ad8ff'][(h(3) * 4) | 0]; R(7, 7, 2, 2, fc); R(8, 6, 1, 1, '#ffe85a'); } break; }
      case 2: { const c = z === 0 ? ['#c9a468', '#a88848', '#d8b878'] : z === 1 ? ['#6a6068', '#4a4048', '#7e747c'] : ['#7a7aa8', '#5a5a88', '#9090c0']; R(0, 0, 16, 16, c[0]); speck(c.slice(1), 8); break; }
      case 5: R(0, 0, 16, 16, '#e8d49a'); speck(['#c8b47a', '#f6e8b8'], 6); break;
      case 6: R(0, 0, 16, 16, '#4a4048'); speck(['#2a2228', '#6a5a60', '#3a3038'], 9); if (h(4) > 0.96) R(6, 6, 2, 2, '#ff6a2a'); break;
      case 10: R(0, 0, 16, 16, '#54449a'); speck(['#7a6ad0', '#3e3280', '#8a7ae0'], 8); if (h(5) > 0.95) R(7, 7, 2, 2, '#c8a8ff'); break;
      case 8: R(0, 0, 16, 16, '#6a6a8a'); R(0, 0, 16, 1, '#7e7ea0'); R(0, 0, 1, 16, '#7e7ea0'); R(0, 15, 16, 1, '#52527a'); R(15, 0, 1, 16, '#52527a'); speck(['#585878', '#7a7a9a'], 4); break;
      case 3: case 4: case 11: {
        const base = v === 3 ? '#2f7fe0' : v === 4 ? '#1f56b8' : '#6a3ad6', light = v === 11 ? '#c8a0ff' : '#aadcff';
        R(0, 0, 16, 16, base); R(0, 8, 16, 8, shade(base, -12));
        if (!(at(x, y - 1) === v)) R(0, 0, 16, 2, light); if (!(at(x, y + 1) === v)) R(0, 14, 16, 2, shade(base, -35));
        if (!(at(x - 1, y) === v)) R(0, 0, 2, 16, light); if (!(at(x + 1, y) === v)) R(14, 0, 2, 16, light); break; }
      case 7: R(0, 0, 16, 16, '#c83a0a'); for (let i = 0; i < 4; i++) R((h(i + 5) * 12) | 0, (h(i + 9) * 12) | 0, 4, 3, '#ff8a2a');
        if (at(x, y - 1) !== 7) R(0, 0, 16, 2, '#ffd24a'); if (at(x, y + 1) !== 7) R(0, 14, 16, 2, '#7a1a0a'); break;
      case 9: {
        const pal = z === 0 ? ['#8a7560', '#4a3c30', '#a58f78'] : z === 1 ? ['#8a7882', '#3a2e36', '#a8949e'] : ['#7a7ab0', '#34345a', '#9a9ad0'];
        const below = at(x, y + 1) === 9; R(0, 0, 16, 16, pal[0]); speck([pal[2], shade(pal[0], -20)], 8); R(0, 0, 16, 2, pal[2]);
        if (!below) { R(0, 8, 16, 8, pal[1]); R(0, 8, 16, 1, shade(pal[1], -25)); R(3, 10, 1, 6, shade(pal[1], -20)); R(10, 10, 1, 5, shade(pal[1], -20)); R(0, 15, 16, 1, shade(pal[1], -35)); }
        break; }
    }
  },
  drawAnim(g, cam, t) { // kilau air & lava
    const x0 = Math.max(0, (cam.x / TILE | 0) - 1), x1 = Math.min(this.W - 1, ((cam.x + cam.w) / TILE | 0) + 1), y0 = Math.max(0, (cam.y / TILE | 0) - 1), y1 = Math.min(this.H - 1, ((cam.y + cam.h) / TILE | 0) + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const v = this.t[y * this.W + x]; if (v !== 3 && v !== 4 && v !== 7 && v !== 11) continue;
      g.fillStyle = v === 7 ? 'rgba(255,214,90,.75)' : v === 11 ? 'rgba(225,190,255,.65)' : 'rgba(225,246,255,.6)';
      for (let k = 0; k < 2; k++) { const ox = ((hash2(x, y, k) * 16 + t * (v === 7 ? 5 : 11) * (k ? 0.7 : 1)) % 16), oy = hash2(x, y, k + 4) * 13 + 1; g.fillRect(x * TILE + (ox | 0), y * TILE + (oy | 0), 3, 1); }
      if (v === 7 && hash2(x, y, 9) > 0.9 && Math.sin(t * 4 + x) > 0.8) { g.fillStyle = '#fff3b0'; g.fillRect(x * TILE + 6, y * TILE + 6, 2, 2); }
    }
  },
  propsInView(cam) {
    const out = [], c0 = ((cam.x - 40) / 64) | 0, c1 = ((cam.x + cam.w + 40) / 64) | 0, r0 = ((cam.y - 40) / 64) | 0, r1 = ((cam.y + cam.h + 70) / 64) | 0;
    for (let j = Math.max(0, r0); j <= r1; j++) for (let i = Math.max(0, c0); i <= c1; i++) { const c = this.grid[i + j * 1000]; if (c) for (const p of c) out.push(p); }
    return out;
  },
  drawProp(g, p, t) {
    const x = Math.round(p.x), y = Math.round(p.y), sw = Math.sin(t * 1.4 + p.sw);
    const sh = (rx, ry) => { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x + 1, y, rx, ry, 0, 0, 6.283); g.fill(); };
    const circ = (cx, cy, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.fill(); };
    switch (p.t) {
      case 'tree': {
        sh(10, 4); g.fillStyle = '#4a2c14'; g.fillRect(x - 2, y - 11, 4, 11); g.fillStyle = '#6b4423'; g.fillRect(x - 2, y - 11, 2, 11);
        const a = p.v ? ['#c8842a', '#b87420', '#e8a848'] : ['#2f7a3a', '#276a31', '#58b04e'], o = sw * 1.2;
        circ(x - 5 + o * 0.5, y - 15, 8, a[1]); circ(x + 6 + o * 0.5, y - 16, 8, a[1]); circ(x + o, y - 21, 11, a[0]); circ(x - 3 + o, y - 25, 7, a[2]);
        g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(x + 4 + o, y - 17, 7, 0, 3.14); g.fill(); break; }
      case 'bush': sh(7, 3); circ(x - 3, y - 4, 5, '#2a6f35'); circ(x + 3, y - 4, 5, '#2f7a3a'); circ(x, y - 7, 5, '#58b04e'); g.fillStyle = '#ff5a7a'; g.fillRect(x - 3, y - 6, 2, 2); g.fillRect(x + 3, y - 4, 2, 2); break;
      case 'rock': sh(8, 3); g.fillStyle = '#7a7684'; g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x - 5, y - 8); g.lineTo(x + 2, y - 10); g.lineTo(x + 7, y - 4); g.lineTo(x + 7, y); g.fill(); g.fillStyle = '#a8a4b4'; g.beginPath(); g.moveTo(x - 5, y - 8); g.lineTo(x + 2, y - 10); g.lineTo(x + 1, y - 5); g.lineTo(x - 4, y - 4); g.fill(); break;
      case 'mush': sh(5, 2); g.fillStyle = '#e8e0d0'; g.fillRect(x - 1, y - 5, 3, 5); circ(x, y - 6, 5, '#d83a4a'); g.fillStyle = '#fff'; g.fillRect(x - 3, y - 8, 2, 2); g.fillRect(x + 1, y - 6, 2, 2); break;
      case 'dead': sh(6, 3); g.strokeStyle = '#2a2024'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 16); g.stroke(); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y - 10); g.lineTo(x - 8, y - 19); g.moveTo(x, y - 13); g.lineTo(x + 7, y - 22); g.moveTo(x - 4, y - 15); g.lineTo(x - 6, y - 24); g.stroke(); break;
      case 'crystal': {
        const pl = 0.6 + 0.4 * Math.sin(t * 2 + p.sw), c = p.v ? '#5ff0e0' : '#b06aff'; sh(7, 3);
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 * pl; circ(x, y - 8, 12, c); g.restore();
        g.fillStyle = shade(c, -60); g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x - 3, y - 14); g.lineTo(x, y); g.fill();
        g.fillStyle = c; g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x + 2, y - 20); g.lineTo(x + 7, y); g.fill(); g.fillStyle = '#fff'; g.fillRect(x + 1, y - 14, 1, 8); break; }
      case 'pillar': sh(8, 3); g.fillStyle = '#4a4a68'; g.fillRect(x - 5, y - 24, 10, 24); g.fillStyle = '#6a6a8a'; g.fillRect(x - 5, y - 24, 4, 24); g.fillStyle = '#8a8aaa'; g.fillRect(x - 7, y - 27, 14, 4); g.fillRect(x - 7, y - 3, 14, 3); g.fillStyle = '#33334a'; g.fillRect(x + 1, y - 16, 1, 7); break;
      case 'torch': { sh(5, 2); g.fillStyle = '#3a3248'; g.fillRect(x - 2, y - 14, 4, 14); g.fillRect(x - 4, y - 16, 8, 3);
        const f = 0.7 + 0.3 * Math.sin(t * 12 + p.sw); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.22 * f; circ(x, y - 20, 16, '#ff8a2a'); g.globalAlpha = 0.9; circ(x, y - 20, 4 * f, '#ffa83a'); circ(x, y - 21, 2, '#fff2b0'); g.restore(); break; }
    }
  }
};
