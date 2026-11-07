'use strict';
/* ===== assets.js — sprite pixel prosedural, gambar senjata, musuh, bos, audio ===== */
function shade(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  const cl = v => Math.max(0, Math.min(255, v));
  const r = cl((n >> 16) + a), g = cl(((n >> 8) & 255) + a), b = cl((n & 255) + a);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ---------- Gambar referensi karakter (characters.png, opsional) ---------- */
const Sheet = { img: new Image(), ok: false, onload: [] };
Sheet.img.onload = () => { Sheet.ok = true; Sheet.onload.forEach(f => f()); };
Sheet.img.src = 'characters.png';
const ART_COL = [16, 317, 623, 926, 1230], ART_ROW = [126, 320, 506, 695];
function drawArt(g, idx, x, y, w, h) {
  if (!Sheet.ok) return false;
  const sx = ART_COL[idx % 5] + 45, sy = ART_ROW[(idx / 5) | 0] + 6, sw = 235, sh = 130;
  const k = Math.min(w / sw, h / sh), dw = sw * k, dh = sh * k;
  g.imageSmoothingEnabled = false;
  g.drawImage(Sheet.img, sx, sy, sw, sh, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  return true;
}

/* ---------- Sprite karakter (24x34) ---------- */
const SPR = {};
function makeSprite(c, dir, f) {
  const cv = document.createElement('canvas'); cv.width = 24; cv.height = 34;
  const g = cv.getContext('2d');
  if (dir === 'r') { g.translate(24, 0); g.scale(-1, 1); }
  const d = dir === 'r' ? 'l' : dir, side = d === 'l', back = d === 'u';
  const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x + 2, y + 8, w, h); };
  const out = c.outfit, dk = shade(out, -45), lt = shade(out, 40), hr = c.hair, hd = shade(hr, -40), sk = c.skin, ac = c.accent;
  const ec = ELEMENTS[c.el].c, st = c.style, boot = shade(ac, -90);
  if (st === 'long' || st === 'twin') { if (!back) P(4, 5, 12, 13, hd); }
  if (st === 'hood') P(3, 3, 14, 16, dk);
  const h1 = f ? 4 : 5, h2 = f ? 5 : 4;
  P(6, 19, 3, h1, dk); P(11, 19, 3, h2, dk); P(6, 19 + h1 - 2, 3, 2, boot); P(11, 19 + h2 - 2, 3, 2, boot);
  P(5, 11, 10, 8, out); P(5, 11, 10, 1, lt); P(5, 17, 10, 2, ac); P(5, 19 - 1, 10, 1, dk);
  if (d === 'd') P(9, 13, 2, 2, ec);
  if (side) { P(7, 12, 3, 7, shade(out, -15)); P(7, 18, 3, 2, sk); }
  else { P(3, 12, 2, 7, out); P(15, 12, 2, 7, out); P(3, 18, 2, 2, sk); P(15, 18, 2, 2, sk); }
  const hoodFace = st === 'hood';
  if (d === 'd') {
    if (hoodFace) { P(4, 1, 12, 10, dk); P(6, 5, 8, 5, '#12101c'); P(7, 7, 2, 1, '#fff'); P(11, 7, 2, 1, '#fff'); }
    else {
      P(5, 2, 10, 9, sk); P(4, 1, 12, 3, hr); P(4, 3, 2, 6, hr); P(14, 3, 2, 6, hr); P(5, 3, 4, 2, hr); P(11, 3, 4, 2, hr);
      P(7, 7, 2, 2, c.eyes); P(11, 7, 2, 2, c.eyes); P(7, 7, 1, 1, '#fff'); P(11, 7, 1, 1, '#fff');
      if (st === 'beard') P(5, 9, 10, 3, hr);
    }
    if (st === 'long') { P(3, 4, 2, 12, hr); P(15, 4, 2, 12, hr); }
    if (st === 'twin') { P(1, 3, 3, 10, hr); P(16, 3, 3, 10, hr); P(1, 3, 3, 1, ac); P(16, 3, 3, 1, ac); }
  } else if (back) {
    if (hoodFace) P(4, 1, 12, 10, dk);
    else { P(4, 1, 12, 10, hr); P(4, 9, 12, 2, hd); }
    if (st === 'long') { P(4, 10, 12, 8, hr); P(4, 17, 12, 1, hd); }
    if (st === 'twin') { P(1, 3, 3, 10, hr); P(16, 3, 3, 10, hr); }
  } else {
    if (hoodFace) { P(4, 1, 12, 10, dk); P(5, 5, 5, 5, '#12101c'); P(6, 7, 2, 1, '#fff'); }
    else {
      P(5, 2, 10, 9, sk); P(4, 1, 12, 3, hr); P(9, 3, 6, 8, hr); P(4, 3, 2, 3, hr); P(6, 7, 2, 2, c.eyes); P(6, 7, 1, 1, '#fff');
      if (st === 'beard') P(5, 9, 5, 3, hr);
    }
    if (st === 'twin') P(12, 5, 3, 9, hr);
  }
  if (st === 'spiky') { P(5, 0, 2, 1, hr); P(9, -1, 2, 2, hr); P(13, 0, 2, 1, hr); }
  if (st === 'witch') {
    const hat = shade(out, -15);
    P(0, 1, 20, 2, hat); P(5, -4, 10, 5, hat); P(8, -8, 5, 4, hat); P(11, -9, 3, 2, hat); P(5, 0, 10, 1, ac);
  }
  return cv;
}
function buildSprites() {
  CHARACTERS.forEach(c => {
    SPR[c.id] = {};
    ['d', 'u', 'l', 'r'].forEach(d => { SPR[c.id][d] = [makeSprite(c, d, 0), makeSprite(c, d, 1)]; });
  });
}
buildSprites();

/* ---------- Gambar senjata (pangkal di (0,0), arah +x) ---------- */
function drawWeapon(g, k, L, glow) {
  const steel = '#e3ebf7', dark = '#4a4f66', gold = '#d8b04a', brown = '#6b4423';
  const ln = (x1, y1, x2, y2, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
  const poly = (pts, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
  g.lineCap = 'butt'; g.lineJoin = 'miter';
  switch (k) {
    case 'katana': ln(-4, 0, 3, 0, 2, '#2a1a2a'); ln(3, -2, 3, 2, 1, gold); ln(4, 0, L, -0.5, 1.8, steel); ln(4, -0.8, L, -1.3, 0.6, '#fff'); break;
    case 'rapier': ln(-3, 0, 4, 0, 1.6, gold); ln(4, -3, 4, 3, 1.2, gold); ln(5, 0, L, 0, 1, steel); break;
    case 'longsword': ln(-3, 0, 3, 0, 2, brown); ln(3, -4, 3, 4, 1.6, gold); ln(4, 0, L, 0, 3, steel); ln(4, -0.8, L, -0.8, 0.8, '#fff'); break;
    case 'tanto': ln(-3, 0, 2, 0, 2, '#2a1a2a'); ln(3, 0, L, 0, 2.4, '#ff9aa8'); ln(3, -0.6, L, -0.6, 0.6, '#fff'); break;
    case 'spear': ln(-6, 0, L, 0, 1.8, brown); poly([L, -3, L + 8, 0, L, 3], steel); break;
    case 'naginata': ln(-6, 0, L - 8, 0, 1.8, brown); g.fillStyle = steel; poly([L - 10, -1, L + 6, -4, L, 1], steel); break;
    case 'halberd': ln(-6, 0, L, 0, 1.8, brown); poly([L - 8, 0, L - 4, -8, L + 2, -3, L, 0], steel); poly([L, -1, L + 7, 0, L, 1], steel); break;
    case 'battleaxe': ln(-5, 0, L, 0, 2, brown); poly([L - 8, -1, L - 10, -9, L + 1, -7, L + 2, 0], steel); poly([L - 8, 1, L - 10, 9, L + 1, 7, L + 2, 0], '#b8c4d8'); break;
    case 'warhammer': ln(-5, 0, L, 0, 2.2, brown); g.fillStyle = '#b8c0d0'; g.fillRect(L - 4, -6, 10, 12); g.fillStyle = gold; g.fillRect(L - 4, -6, 10, 2); g.fillRect(L - 4, 4, 10, 2); break;
    case 'mace': ln(-4, 0, L - 4, 0, 2, brown); g.fillStyle = '#b8c0d0'; g.beginPath(); g.arc(L, 0, 5, 0, 6.283); g.fill(); g.fillStyle = gold; for (let i = 0; i < 6; i++) { const a = i * 1.047; g.fillRect(L + Math.cos(a) * 5 - 1, Math.sin(a) * 5 - 1, 2, 2); } break;
    case 'scythe': ln(-6, 0, L, 0, 1.8, '#4a4a66'); g.strokeStyle = '#d8e0f0'; g.lineWidth = 2.4; g.beginPath(); g.arc(L, -8, 9, Math.PI * 0.5, Math.PI * 1.55); g.stroke(); break;
    case 'kusarigama': ln(-4, 0, 8, 0, 1.8, brown); g.strokeStyle = steel; g.lineWidth = 2; g.beginPath(); g.arc(8, -5, 5, Math.PI * 0.5, Math.PI * 1.5); g.stroke(); g.strokeStyle = '#c8c8d8'; g.setLineDash([2, 2]); g.lineWidth = 1; g.beginPath(); g.moveTo(8, 3); g.lineTo(L, 8); g.stroke(); g.setLineDash([]); g.fillStyle = '#8a8a9a'; g.fillRect(L - 2, 6, 5, 5); break;
    case 'nunchaku': ln(-2, 0, 8, 0, 2.2, gold); ln(8, 0, 14, -7, 2.2, gold); g.strokeStyle = '#aaa'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(8, 0); g.lineTo(9, -1); g.stroke(); break;
    case 'bow': g.strokeStyle = '#b8863a'; g.lineWidth = 2; g.beginPath(); g.arc(-6, 0, L * 0.55, -1.2, 1.2); g.stroke(); g.strokeStyle = '#eee'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(-6 + Math.cos(1.2) * L * 0.55, Math.sin(1.2) * L * 0.55); g.lineTo(-6 + Math.cos(1.2) * L * 0.55, -Math.sin(1.2) * L * 0.55); g.stroke(); break;
    case 'crossbow': ln(-4, 0, L - 4, 0, 3, brown); ln(L - 8, -8, L - 8, 8, 2, '#b8863a'); ln(L - 8, -8, L - 2, 0, 0.8, '#eee'); ln(L - 8, 8, L - 2, 0, 0.8, '#eee'); ln(0, 0, L - 2, 0, 1, steel); break;
    case 'chakram': g.strokeStyle = '#dfe6ff'; g.lineWidth = 2.5; g.beginPath(); g.arc(4, 0, 7, 0, 6.283); g.stroke(); g.strokeStyle = '#8a6aff'; g.lineWidth = 1; g.beginPath(); g.arc(4, 0, 4.5, 0, 6.283); g.stroke(); break;
    case 'knives': ln(-2, -3, 4, -3, 2, brown); poly([4, -4.5, 12, -3, 4, -1.5], steel); ln(-2, 3, 4, 3, 2, brown); poly([4, 1.5, 12, 3, 4, 4.5], steel); break;
    case 'trident': ln(-6, 0, L, 0, 1.8, gold); ln(L, -5, L, 5, 1.6, steel); ln(L, -5, L + 8, -5, 1.4, steel); ln(L, 5, L + 8, 5, 1.4, steel); ln(L, 0, L + 9, 0, 1.4, steel); break;
    case 'staff': ln(-8, 0, L, 0, 2, '#6a4a2a'); g.fillStyle = glow || '#c86aff'; g.beginPath(); g.arc(L + 3, 0, 4, 0, 6.283); g.fill(); g.fillStyle = '#fff'; g.fillRect(L + 2, -2, 2, 2); ln(L - 3, -4, L - 3, 4, 1.2, gold); break;
    case 'shield': g.fillStyle = '#9fb4e8'; g.beginPath(); g.moveTo(2, -9); g.lineTo(11, -6); g.lineTo(11, 3); g.lineTo(6, 10); g.lineTo(2, 8); g.closePath(); g.fill(); g.strokeStyle = gold; g.lineWidth = 1.4; g.stroke(); g.fillStyle = '#fff'; g.fillRect(6, -2, 2, 6); g.fillRect(4, 0, 6, 2); break;
  }
  if (glow && k !== 'staff') { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5; g.fillStyle = glow; g.beginPath(); g.arc(Math.max(4, L * 0.9), 0, 3.2, 0, 6.283); g.fill(); g.restore(); }
}

/* ---------- Musuh ---------- */
function drawMobBody(g, e, t) {
  const col = ELEMENTS[e.el].c, lt = ELEMENTS[e.el].l, dk = ELEMENTS[e.el].d;
  g.save(); g.translate(Math.round(e.x), Math.round(e.y));
  if (e.flash > 0) g.globalAlpha = 0.6;
  const sc = e.face >= 0 ? 1 : -1;
  if (e.type === 'slime') {
    const b = Math.abs(Math.sin(t * 4 + e.ph)), w = 15 + b * 2, h = 11 - b * 3;
    g.fillStyle = col; g.beginPath(); g.ellipse(0, -h / 2, w / 2, h / 2, 0, 0, 6.283); g.fill();
    g.fillStyle = dk; g.fillRect(-w / 2 + 1, -2, w - 2, 2);
    g.fillStyle = lt; g.fillRect(-4, -h + 1, 3, 2); g.fillStyle = '#111'; g.fillRect(-3, -h / 2, 2, 3); g.fillRect(2, -h / 2, 2, 3);
  } else if (e.type === 'bat') {
    const fl = Math.sin(t * 16 + e.ph) * 5, y = -12 + Math.sin(t * 3 + e.ph) * 2;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 0, 6, 2, 0, 0, 6.283); g.fill();
    g.fillStyle = dk; g.beginPath(); g.moveTo(-2, y); g.lineTo(-14, y - 4 + fl); g.lineTo(-10, y + 4); g.lineTo(-2, y + 3); g.fill();
    g.beginPath(); g.moveTo(2, y); g.lineTo(14, y - 4 + fl); g.lineTo(10, y + 4); g.lineTo(2, y + 3); g.fill();
    g.fillStyle = col; g.beginPath(); g.ellipse(0, y + 1, 4, 5, 0, 0, 6.283); g.fill();
    g.fillStyle = '#ff3a3a'; g.fillRect(-3, y - 1, 2, 2); g.fillRect(1, y - 1, 2, 2); g.fillStyle = '#fff'; g.fillRect(-3, y + 4, 1, 2); g.fillRect(2, y + 4, 1, 2);
  } else if (e.type === 'wolf') {
    g.scale(sc, 1); const lg = Math.sin(t * 12 + e.ph) * 2;
    g.fillStyle = dk; g.fillRect(-7, -4, 2, 4 + lg); g.fillRect(-2, -4, 2, 4 - lg); g.fillRect(3, -4, 2, 4 + lg); g.fillRect(7, -4, 2, 4 - lg);
    g.fillStyle = col; g.fillRect(-8, -11, 16, 8); g.fillRect(6, -14, 7, 7); g.fillStyle = lt; g.fillRect(-8, -11, 16, 2);
    g.fillStyle = dk; g.fillRect(7, -16, 2, 3); g.fillRect(11, -16, 2, 3); g.fillRect(-12, -11, 5, 3);
    g.fillStyle = '#ffec6a'; g.fillRect(10, -12, 2, 2); g.fillStyle = '#fff'; g.fillRect(12, -8, 2, 1);
  } else { // mage
    const fy = Math.sin(t * 3 + e.ph) * 2;
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 0, 7, 2.5, 0, 0, 6.283); g.fill();
    g.fillStyle = dk; g.beginPath(); g.moveTo(-8, -2 + fy); g.lineTo(-4, -18 + fy); g.lineTo(4, -18 + fy); g.lineTo(8, -2 + fy); g.fill();
    g.fillStyle = col; g.fillRect(-4, -12 + fy, 8, 6); g.fillStyle = '#e8e8f0'; g.fillRect(-4, -23 + fy, 8, 7);
    g.fillStyle = '#111'; g.fillRect(-3, -21 + fy, 2, 3); g.fillRect(1, -21 + fy, 2, 3);
    g.fillStyle = col; g.beginPath(); g.moveTo(-6, -23 + fy); g.lineTo(0, -31 + fy); g.lineTo(6, -23 + fy); g.fill();
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = lt; g.beginPath(); g.arc(10 * Math.cos(t * 3), -12 + fy + 4 * Math.sin(t * 3), 3, 0, 6.283); g.fill(); g.restore();
  }
  g.restore();
}

/* ---------- Bos ---------- */
function drawBossBody(g, b, t) {
  const col = ELEMENTS[b.el].c, lt = ELEMENTS[b.el].l, dk = ELEMENTS[b.el].d;
  g.save(); g.translate(Math.round(b.x), Math.round(b.y));
  if (b.flash > 0) g.globalAlpha = 0.65;
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, 0, b.r * 1.3, b.r * 0.5, 0, 0, 6.283); g.fill();
  const p = Math.sin(t * 3);
  if (b.id === 'brontus') {
    const arm = Math.sin(t * 2) * 3;
    g.fillStyle = '#4a3c30'; g.fillRect(-14, -10, 9, 10); g.fillRect(5, -10, 9, 10);
    g.fillStyle = '#6a5a4a'; g.fillRect(-16, -34, 32, 26); g.fillStyle = '#7a6a58'; g.fillRect(-16, -34, 32, 5);
    g.fillStyle = '#4a8a3a'; g.fillRect(-16, -34, 10, 4); g.fillRect(6, -28, 8, 3); g.fillRect(-12, -20, 5, 3);
    g.fillStyle = '#5a4a3a'; g.beginPath(); g.arc(-22, -26 + arm, 8, 0, 6.283); g.arc(22, -26 - arm, 8, 0, 6.283); g.fill();
    g.fillStyle = '#6a5a4a'; g.fillRect(-9, -44, 18, 12); g.fillStyle = '#4a8a3a'; g.fillRect(-9, -44, 18, 3);
    g.fillStyle = col; g.fillRect(-6, -39, 4, 3); g.fillRect(2, -39, 4, 3);
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6 + p * 0.3; g.fillStyle = lt; g.beginPath(); g.arc(0, -22, 5 + p, 0, 6.283); g.fill(); g.restore();
  } else if (b.id === 'ignareth') {
    const fl = Math.sin(t * 5) * 6;
    g.fillStyle = '#7a1500'; g.beginPath(); g.moveTo(-8, -26); g.lineTo(-34, -42 + fl); g.lineTo(-26, -20); g.fill(); g.beginPath(); g.moveTo(8, -26); g.lineTo(34, -42 + fl); g.lineTo(26, -20); g.fill();
    g.fillStyle = '#c42a0a'; g.beginPath(); g.ellipse(0, -18, 20, 15, 0, 0, 6.283); g.fill();
    g.fillStyle = '#ffb04a'; g.beginPath(); g.ellipse(0, -14, 11, 9, 0, 0, 6.283); g.fill();
    g.fillStyle = '#c42a0a'; g.fillRect(-9, -42, 18, 15); g.fillStyle = '#7a1500'; g.fillRect(-12, -46, 4, 8); g.fillRect(8, -46, 4, 8);
    g.fillStyle = '#ffe14a'; g.fillRect(-6, -38, 4, 3); g.fillRect(2, -38, 4, 3); g.fillStyle = '#2a0a00'; g.fillRect(-4, -30, 8, 3);
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35; g.fillStyle = col; g.beginPath(); g.arc(0, -20, 28 + p * 2, 0, 6.283); g.fill(); g.restore();
  } else {
    const fy = Math.sin(t * 2.2) * 3;
    g.translate(0, fy - 8);
    g.fillStyle = '#2a1a5a'; g.beginPath(); g.moveTo(-18, 0); g.lineTo(-8, -34); g.lineTo(8, -34); g.lineTo(18, 0); g.lineTo(8, 6); g.lineTo(-8, 6); g.fill();
    g.fillStyle = '#5a3ab8'; g.fillRect(-9, -34, 18, 4); g.fillStyle = '#e8e8ff'; g.fillRect(-7, -46, 14, 13);
    g.fillStyle = '#7a5aff'; g.fillRect(-7, -48, 14, 3); g.fillStyle = col; g.fillRect(-5, -42, 3, 3); g.fillRect(2, -42, 3, 3);
    g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = col; g.lineWidth = 1.5; g.globalAlpha = 0.8;
    g.beginPath(); g.ellipse(0, -52, 14, 4, 0, 0, 6.283); g.stroke();
    for (let i = 0; i < 4; i++) { const a = t * 2 + i * 1.57; g.fillStyle = lt; g.fillRect(Math.cos(a) * 24 - 1, -22 + Math.sin(a) * 7 - 4, 3, 6); }
    g.restore();
  }
  g.restore();
}

/* ---------- Audio (WebAudio prosedural) ---------- */
const SND = {
  ctx: null, mg: null, sg: null, timer: null, step: 0, mode: null,
  init() {
    if (!this.ctx) {
      try {
        const A = window.AudioContext || window.webkitAudioContext; this.ctx = new A();
        this.mg = this.ctx.createGain(); this.mg.connect(this.ctx.destination);
        this.sg = this.ctx.createGain(); this.sg.connect(this.ctx.destination); this.setVol();
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },
  setVol() { if (this.mg) { this.mg.gain.value = Settings.music * 0.22; this.sg.gain.value = Settings.sfx * 0.5; } },
  tone(f, d, type, v, slide, dest) {
    const c = this.ctx; if (!c) return;
    const o = c.createOscillator(), g = c.createGain(); o.type = type || 'square';
    o.frequency.setValueAtTime(f, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), c.currentTime + d);
    g.gain.setValueAtTime(v || 0.3, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
    o.connect(g); g.connect(dest || this.sg); o.start(); o.stop(c.currentTime + d + 0.02);
  },
  noise(d, v) {
    const c = this.ctx; if (!c) return;
    const n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), a = b.getChannelData(0);
    for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = v; s.connect(g); g.connect(this.sg); s.start();
  },
  sfx(n) {
    if (!this.ctx || Settings.sfx <= 0) return;
    switch (n) {
      case 'hit': this.tone(190, 0.08, 'square', 0.25, -90); break;
      case 'slash': this.noise(0.1, 0.25); this.tone(520, 0.08, 'sawtooth', 0.08, -320); break;
      case 'cast': this.tone(300, 0.25, 'sine', 0.3, 500); this.tone(450, 0.2, 'triangle', 0.15, 300); break;
      case 'ult': this.tone(90, 0.8, 'sawtooth', 0.3, 500); this.noise(0.5, 0.3); break;
      case 'boom': this.noise(0.4, 0.5); this.tone(70, 0.4, 'sine', 0.5, -35); break;
      case 'zap': this.tone(900, 0.1, 'sawtooth', 0.15, -600); break;
      case 'hurt': this.tone(130, 0.22, 'sawtooth', 0.3, -70); break;
      case 'lvl': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 'square', 0.2), i * 90)); break;
      case 'click': this.tone(660, 0.05, 'square', 0.12); break;
      case 'boss': this.tone(80, 1, 'sawtooth', 0.4, 60); this.noise(0.6, 0.3); break;
      case 'dodge': this.noise(0.12, 0.15); break;
    }
  },
  startMusic(mode) {
    if (this.mode === mode) return; this.mode = mode;
    clearInterval(this.timer); if (!this.ctx) return;
    const ch = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 293.7]];
    const bossCh = [[110, 130.8, 164.8], [123.5, 146.8, 185], [98, 116.5, 146.8], [110, 130.8, 164.8]];
    const pat = [0, 1, 2, 1, 0, 2, 1, 2];
    this.step = 0;
    this.timer = setInterval(() => {
      const s = this.step++, boss = mode === 'boss', c = (boss ? bossCh : ch)[(s >> 3) % 4], n = c[pat[s % 8]];
      this.tone(n * (mode === 'menu' ? 2 : boss ? 2 : 1), boss ? 0.2 : 0.35, boss ? 'sawtooth' : 'triangle', boss ? 0.35 : 0.5, 0, this.mg);
      if (s % 8 === 0) this.tone(c[0] / 2, 1.1, 'sine', 0.7, 0, this.mg);
      if (boss && s % 2 === 0) this.tone(c[0] / 2, 0.12, 'square', 0.3, -20, this.mg);
    }, mode === 'boss' ? 190 : 320);
  },
  stopMusic() { clearInterval(this.timer); this.mode = null; }
};
