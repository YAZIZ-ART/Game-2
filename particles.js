/* Aetheria — particles.js : efek partikel, cincin, teks damage */
'use strict';

const FX = {
  ps: [], rings: [], texts: [],

  clear: function () { this.ps.length = 0; this.rings.length = 0; this.texts.length = 0; },

  burst: function (x, y, color, n, speed) {
    n = n || 10; speed = speed || 60;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7);
      this.ps.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.4, max: 0.8, color: color, size: 1 + Math.random() * 2 });
    }
  },

  slash: function (x, y, fx, fy, color) {
    for (let i = -3; i <= 3; i++) {
      const a = Math.atan2(fy, fx) + i * 0.28;
      this.ps.push({ x: x, y: y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, life: 0.18, max: 0.18, color: color, size: 2 });
    }
  },

  ring: function (x, y, r, color) { this.rings.push({ x: x, y: y, r: 0, max: r, color: color, t: 0 }); },

  text: function (x, y, str, color) { this.texts.push({ x: x, y: y, str: String(str), color: color || '#fff', t: 0 }); },

  update: function (dt) {
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94;
      if (p.life <= 0) this.ps.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt; r.r = r.max * Math.min(1, r.t / 0.3);
      if (r.t > 0.45) this.rings.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.t += dt; t.y -= 24 * dt;
      if (t.t > 0.7) this.texts.splice(i, 1);
    }
  },

  draw: function (ctx, cam) {
    this.rings.forEach(function (r) {
      ctx.globalAlpha = Math.max(0, 1 - r.t / 0.45);
      ctx.strokeStyle = r.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(r.x - cam.x, r.y - cam.y, r.r, 0, Math.PI * 2); ctx.stroke();
    });
    this.ps.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - cam.x), Math.round(p.y - cam.y), p.size, p.size);
    });
    ctx.globalAlpha = 1;
    ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
    this.texts.forEach(function (t) {
      ctx.globalAlpha = Math.max(0, 1 - t.t / 0.7);
      ctx.fillStyle = '#000'; ctx.fillText(t.str, t.x - cam.x + 1, t.y - cam.y + 1);
      ctx.fillStyle = t.color; ctx.fillText(t.str, t.x - cam.x, t.y - cam.y);
    });
    ctx.globalAlpha = 1;
  }
};
