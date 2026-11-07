'use strict';
/* ===== particles.js — partikel, cincin, petir, busur tebasan, teks damage ===== */
const FX = {
  p: [], rings: [], bolts: [], arcs: [], texts: [], shake: 0, flash: 0, flashC: '#fff',
  qm() { return [0.4, 0.7, 1][Settings.quality] || 1; },
  clear() { this.p = []; this.rings = []; this.bolts = []; this.arcs = []; this.texts = []; this.shake = 0; this.flash = 0; },
  add(o) { if (this.p.length < 1300) this.p.push(o); },
  mk(x, y, vx, vy, life, s, c, o) {
    const L = life * (0.7 + Math.random() * 0.6);
    return Object.assign({ x, y, vx, vy, l: L, m: L, s, c, g: 0, dr: 1.5, add: true, al: 1, gr: 0, shr: true }, o);
  },
  puff(x, y, c, n, spd, life, size, o) {
    n = Math.ceil(n * this.qm());
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, s = (spd || 40) * (0.3 + Math.random() * 0.7);
      this.add(this.mk(x, y, Math.cos(a) * s, Math.sin(a) * s, life || 0.5, (size || 2) * (0.6 + Math.random() * 0.8), c, o));
    }
  },
  ring(x, y, r0, r1, life, c, w) { if (this.rings.length < 60) this.rings.push({ x, y, r0, r1, l: life, m: life, c, w: w || 2 }); },
  arc(x, y, a0, a1, r, life, c, w) { if (this.arcs.length < 40) this.arcs.push({ x, y, a0, a1, r, l: life, m: life, c, w: w || 3 }); },
  bolt(x1, y1, x2, y2, c, life, w) {
    if (this.bolts.length > 40) return;
    const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 9)), pts = [[x1, y1]];
    const nx = -(y2 - y1), ny = x2 - x1, nl = Math.hypot(nx, ny) || 1;
    for (let i = 1; i < n; i++) { const k = i / n, o = (Math.random() - 0.5) * 11; pts.push([x1 + (x2 - x1) * k + nx / nl * o, y1 + (y2 - y1) * k + ny / nl * o]); }
    pts.push([x2, y2]); this.bolts.push({ pts, l: life || 0.18, m: life || 0.18, c, w: w || 2 });
  },
  text(x, y, str, c, size) {
    if (!Settings.dmgnum && size < 12) return;
    this.texts.push({ x, y, vy: -26, l: 0.9, m: 0.9, s: str, c, z: size || 8 });
  },
  shk(v) { if (Settings.shake) this.shake = Math.max(this.shake, v); },
  flashAdd(c, a) { this.flashC = c; this.flash = Math.max(this.flash, a); },

  /* motif visual unik per elemen / kombinasi */
  motif(t, x, y, cols, n, r) {
    n = Math.ceil(n * this.qm()); r = r || 16;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, d = Math.random() * r, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.7;
      const c = cols[(Math.random() * cols.length) | 0], M = this.mk.bind(this);
      switch (t) {
        case 'puff': this.add(M(px, py, rnd(-8, 8), rnd(-26, -10), 0.8, rnd(3, 6), '#e8f0ff', { add: false, al: 0.55, shr: false, gr: 5, dr: 1 })); break;
        case 'drop': this.add(M(px, py - 6, rnd(-10, 10), rnd(-30, 10), 0.55, rnd(1.5, 2.5), '#7fd0ff', { g: 160, add: false })); break;
        case 'chunk': this.add(M(px, py, rnd(-36, 36), rnd(-90, -40), 0.7, rnd(2, 4), i % 2 ? '#8a6a44' : c, { g: 280, add: false })); break;
        case 'ember': this.add(M(px, py, rnd(-10, 10), rnd(-50, -18), 0.7, rnd(1, 2.2), c, { dr: 0.5 })); break;
        case 'spark': { const s = rnd(60, 150); this.add(M(px, py, Math.cos(a) * s, Math.sin(a) * s, 0.25, rnd(1, 2), i % 2 ? '#fff6a0' : c, { dr: 4 })); break; }
        case 'swirl': this.add(M(x, y, 0, 0, 0.6, rnd(1.2, 2), c, { orb: 1, cx: x, cy: y, a, rad: d + 3, w: rnd(6, 11), vr: rnd(8, 22) })); break;
        case 'shard': { const s = rnd(40, 100); this.add(M(px, py, Math.cos(a) * s, Math.sin(a) * s - 20, 0.45, 4, '#cfeeff', { line: 1, ang: a, dr: 2 })); break; }
        case 'dust': this.add(M(px, py, rnd(-18, 18), rnd(-12, 6), 0.7, rnd(2, 4), '#c8a86a', { add: false, al: 0.6, dr: 1 })); break;
        case 'bolt': this.bolt(px, py - rnd(40, 70), px, py, c, 0.2, 2); break;
        case 'ring': this.ring(x, y, 3, r, 0.4, c, 2); break;
      }
    }
  },

  update(dt) {
    for (let i = this.p.length - 1; i >= 0; i--) {
      const p = this.p[i]; p.l -= dt;
      if (p.l <= 0) { this.p[i] = this.p[this.p.length - 1]; this.p.pop(); continue; }
      if (p.orb) { p.a += p.w * dt; p.rad += p.vr * dt; p.x = p.cx + Math.cos(p.a) * p.rad; p.y = p.cy + Math.sin(p.a) * p.rad * 0.6; continue; }
      p.vy += p.g * dt; const d = Math.max(0, 1 - p.dr * dt); p.vx *= d; p.vy *= d; p.x += p.vx * dt; p.y += p.vy * dt;
    }
    for (const arr of [this.rings, this.bolts, this.arcs]) for (let i = arr.length - 1; i >= 0; i--) { arr[i].l -= dt; if (arr[i].l <= 0) arr.splice(i, 1); }
    for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.l -= dt; t.y += t.vy * dt; t.vy *= 0.94; if (t.l <= 0) this.texts.splice(i, 1); }
    this.shake = Math.max(0, this.shake - dt * 22); this.flash = Math.max(0, this.flash - dt * 2.2);
  },

  draw(g) {
    for (const p of this.p) {
      const k = p.l / p.m, sz = p.shr ? p.s * (0.3 + 0.7 * k) : p.s + p.gr * (p.m - p.l);
      g.globalCompositeOperation = p.add ? 'lighter' : 'source-over'; g.globalAlpha = Math.max(0, k * p.al);
      g.fillStyle = p.c;
      if (p.line) { g.strokeStyle = p.c; g.lineWidth = 1.5; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - Math.cos(p.ang) * 5, p.y - Math.sin(p.ang) * 5); g.stroke(); }
      else g.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), Math.ceil(sz), Math.ceil(sz));
    }
    g.globalCompositeOperation = 'lighter';
    for (const r of this.rings) {
      const k = 1 - r.l / r.m; g.globalAlpha = (1 - k) * 0.9; g.strokeStyle = r.c; g.lineWidth = r.w;
      g.beginPath(); g.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * k, 0, 6.283); g.stroke();
    }
    for (const a of this.arcs) {
      const k = 1 - a.l / a.m; g.globalAlpha = (1 - k) * 0.95; g.strokeStyle = a.c; g.lineWidth = a.w * (1 - k * 0.5);
      g.beginPath(); g.arc(a.x, a.y, a.r, a.a0, a.a0 + (a.a1 - a.a0) * Math.min(1, k * 3 + 0.3)); g.stroke();
    }
    for (const b of this.bolts) {
      g.globalAlpha = b.l / b.m; g.strokeStyle = b.c; g.lineWidth = b.w + 2; g.beginPath(); b.pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = b.w * 0.6; g.stroke();
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.textAlign = 'center';
    for (const t of this.texts) {
      g.globalAlpha = Math.min(1, t.l / t.m * 1.6); g.font = 'bold ' + t.z + 'px monospace';
      g.lineWidth = 2; g.strokeStyle = '#1a0f2a'; g.strokeText(t.s, Math.round(t.x), Math.round(t.y));
      g.fillStyle = t.c; g.fillText(t.s, Math.round(t.x), Math.round(t.y));
    }
    g.globalAlpha = 1;
  }
};
