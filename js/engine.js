/* ============================================================
   ENGINE: util, loader aset, pemutar efek pixelfx, audio, input
   ============================================================ */
'use strict';
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const rand  = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick  = a => a[Math.floor(Math.random() * a.length)];
const dist  = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const lerp  = (a, b, t) => a + (b - a) * t;
const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const DIRS = ['up', 'left', 'down', 'right'];               // urutan baris pada sprite sheet
const dirFromAngle = a => { const x = Math.cos(a), y = Math.sin(a); return Math.abs(x) > Math.abs(y) ? (x < 0 ? 1 : 3) : (y < 0 ? 0 : 2); };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------------- Loader gambar (lazy, tanpa kompres) ---------------- */
const Assets = {
  img: {}, pending: {},
  load(key, src) {
    if (this.img[key]) return Promise.resolve(this.img[key]);
    if (this.pending[key]) return this.pending[key];
    return this.pending[key] = new Promise(res => {
      const i = new Image();
      i.onload = () => { this.img[key] = i; res(i); };
      i.onerror = () => { console.warn('Gagal memuat', src); res(null); };
      i.src = encodeURI(src);
    });
  },
  loadFx(id) { const d = MANIFEST.fx[id]; return d ? this.load('fx:' + id, d.file) : Promise.resolve(null); },
  charPaths(n) {
    const b = 'assets/characters/' + n + '/', o = [];
    for (let s = 1; s <= 3; s++) {
      o.push(['c:' + n + s, b + 'character_skills/' + n + '_skill' + s + '_character.png']);
      o.push(['w:' + n + s, b + 'weapon_skills/' + n + '_skill' + s + '_weapon_layer.png']);
    }
    o.push(['e:' + n, b + 'element/' + n + '_elements.png']);
    return o;
  },
  loadChar(n, onlyFirst) {
    let list = this.charPaths(n);
    if (onlyFirst) list = list.filter(x => x[0].endsWith('1'));
    return Promise.all(list.map(x => this.load(x[0], x[1])));
  },
  loadMonster(n) {
    const b = 'assets/monsters/' + n + '/standard/';
    return Promise.all(['walk', 'idle', 'slash', 'hurt'].map(s => this.load('m:' + n + s, b + s + '.png')));
  },
  loadCommon() { return Promise.all([this.load('tiles', 'assets/tileset/BROWNROCK_Full_Tileset_V1.png'), this.loadFx('level-up'), this.loadFx('xp-orb'), this.loadFx('hit-spark'), this.loadFx('crit-hit'), this.loadFx('poof')]); },
};

/* ---------------- Efek pixelfx (sprite sheet hasil render library pixelfx) ---------------- */
const FX = {
  list: [],
  spawn(id, x, y, o) {
    o = o || {}; const d = MANIFEST.fx[id]; if (!d) return null;
    const f = { id, d, x, y, t: -(o.delay || 0), s: o.s || 1, rot: o.rot || 0, alpha: o.alpha == null ? 1 : o.alpha, follow: o.follow || null, ox: o.ox || 0, oy: o.oy || 0,
      dur: o.loopSec || (d.loop ? 1.5 : d.n / d.fps), layer: o.layer || 'top', flip: o.flip || 0, speed: o.speed || 1, fade: o.fade == null ? .25 : o.fade, dead: false };
    this.list.push(f); Assets.loadFx(id); return f;
  },
  update(dt) {
    for (const f of this.list) {
      f.t += dt * f.speed;
      if (f.follow) { f.x = f.follow.x + f.ox; f.y = f.follow.y + f.oy; }
      if (f.t >= f.dur) f.dead = true;
    }
    this.list = this.list.filter(f => !f.dead);
  },
  draw(ctx, layer, cam) {
    for (const f of this.list) {
      if (f.layer !== layer || f.t < 0) continue;
      const img = Assets.img['fx:' + f.id]; if (!img) continue;
      const d = f.d; let idx = Math.floor(f.t * d.fps);
      if (d.loop) idx %= d.n; else idx = Math.min(idx, d.n - 1);
      const sx = (idx % d.cols) * d.fw, sy = Math.floor(idx / d.cols) * d.fh;
      let a = f.alpha; if (f.dur - f.t < f.fade && (d.loop || f.dur < d.n / d.fps)) a *= clamp((f.dur - f.t) / f.fade, 0, 1);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(f.x, f.y); if (f.rot) ctx.rotate(f.rot); ctx.scale(f.s * (f.flip ? -1 : 1), f.s);
      ctx.drawImage(img, sx, sy, d.fw, d.fh, -d.pivot[0], -d.pivot[1], d.fw, d.fh); ctx.restore();
    }
  },
  clear() { this.list.length = 0; },
};

/* ---------------- Audio: SFX dari koleksi yang dikirim ---------------- */
const Snd = {
  on: true, vol: .7, cache: {}, last: {}, ready: false,
  init() {
    if (this.ready) return; this.ready = true;
    for (const k in SFX_FILES) { const a = new Audio(); a.preload = 'auto'; a.src = encodeURI('assets/sfx/' + SFX_FILES[k]); this.cache[k] = a; }
  },
  play(k, vol, rate) {
    if (!this.on || !this.ready) return; const a = this.cache[k]; if (!a) return;
    const now = performance.now(); if (this.last[k] && now - this.last[k] < 45) return; this.last[k] = now;
    try { const n = a.cloneNode(); n.volume = clamp(this.vol * (vol == null ? 1 : vol), 0, 1); n.playbackRate = rate || 1; const p = n.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  },
};

/* ---------------- Musik latar chiptune (dibangkitkan lewat WebAudio; tidak mati saat skill di-spam) ---------------- */
const Music = {
  ctx: null, on: true, vol: .35, timer: null, step: 0, next: 0, mode: 'menu',
  chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
  start(mode) {
    if (mode) this.mode = mode;
    if (!this.on) return;
    if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination); }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.timer) return;
    this.next = this.ctx.currentTime + .1; this.step = 0;
    this.timer = setInterval(() => this.sched(), 60);
  },
  stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } },
  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = v; },
  hz(m) { return 440 * Math.pow(2, (m - 69) / 12); },
  tone(t, m, len, type, g) {
    const c = this.ctx, o = c.createOscillator(), e = c.createGain();
    o.type = type; o.frequency.value = this.hz(m); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + .01); e.gain.exponentialRampToValueAtTime(.0001, t + len);
    o.connect(e); e.connect(this.master); o.start(t); o.stop(t + len + .02);
  },
  sched() {
    const c = this.ctx; if (!c) return;
    const sd = this.mode === 'battle' ? .15 : .24;
    while (this.next < c.currentTime + .25) {
      const s = this.step, ch = this.chords[Math.floor(s / 8) % 4], t = this.next;
      const arp = [0, 1, 2, 1, 2, 1, 0, 2][s % 8];
      this.tone(t, ch[arp] + 12, sd * 1.6, 'square', this.mode === 'battle' ? .05 : .035);
      if (s % 4 === 0) this.tone(t, ch[0] - 12, sd * 3.5, 'triangle', .12);
      if (this.mode === 'battle' && s % 2 === 1) this.tone(t, ch[2] + 24, sd * .6, 'square', .018);
      this.next += sd; this.step++;
    }
  },
};

/* ---------------- Input: keyboard + analog + tombol layar ---------------- */
const Input = {
  keys: {}, joy: { x: 0, y: 0 }, held: {}, pressed: {},
  press(n) { this.pressed[n] = true; this.held[n] = true; },
  release(n) { this.held[n] = false; },
  take(n) { const v = this.pressed[n]; this.pressed[n] = false; return !!v; },
  moveVec() {
    let x = 0, y = 0; const k = this.keys;
    if (k['KeyA'] || k['ArrowLeft']) x -= 1; if (k['KeyD'] || k['ArrowRight']) x += 1;
    if (k['KeyW'] || k['ArrowUp']) y -= 1;   if (k['KeyS'] || k['ArrowDown']) y += 1;
    if (x || y) { const l = Math.hypot(x, y); return { x: x / l, y: y / l }; }
    return { x: this.joy.x, y: this.joy.y };
  },
  init() {
    const map = { Space: 'atk', KeyJ: 'atk', Digit1: 's1', KeyU: 's1', Digit2: 's2', KeyI: 's2', Digit3: 's3', KeyO: 's3', ShiftLeft: 'dash', ShiftRight: 'dash', KeyK: 'dash', KeyQ: 'p0', KeyE: 'p1', KeyR: 'p2' };
    addEventListener('keydown', e => {
      if (e.repeat) { if (map[e.code] === 'atk') this.held.atk = true; return; }
      this.keys[e.code] = true;
      if (map[e.code]) { this.press(map[e.code]); if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); }
      if (e.code === 'Escape' || e.code === 'KeyP') this.press('pause');
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; if (map[e.code]) this.release(map[e.code]); });
    addEventListener('blur', () => { this.keys = {}; this.held = {}; this.joy.x = this.joy.y = 0; });
    // analog
    const pad = $('#joy'), knob = $('#joyKnob'); let pid = null, cx = 0, cy = 0;
    const R = () => pad.getBoundingClientRect().width * .42;
    const setv = e => { const r = pad.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; let dx = e.clientX - cx, dy = e.clientY - cy; const m = Math.hypot(dx, dy), rr = R(); if (m > rr) { dx = dx / m * rr; dy = dy / m * rr; }
      const kk = (r.width / pad.offsetWidth) || 1; knob.style.transform = `translate(${dx / kk}px,${dy / kk}px)`; const dead = .12; let jx = dx / rr, jy = dy / rr; const jm = Math.hypot(jx, jy); if (jm < dead) { jx = jy = 0; } this.joy.x = jx; this.joy.y = jy; };
    pad.addEventListener('pointerdown', e => { if (pid !== null) return; pid = e.pointerId; pad.setPointerCapture(pid); setv(e); e.preventDefault(); });
    pad.addEventListener('pointermove', e => { if (e.pointerId === pid) setv(e); });
    const up = e => { if (e.pointerId === pid) { pid = null; this.joy.x = this.joy.y = 0; knob.style.transform = 'translate(0,0)'; } };
    pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
    // tombol layar
    $$('[data-btn]').forEach(b => {
      const n = b.dataset.btn;
      b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); this.press(n); b.classList.add('down'); });
      const rel = e => { this.release(n); b.classList.remove('down'); };
      b.addEventListener('pointerup', rel); b.addEventListener('pointercancel', rel); b.addEventListener('lostpointercapture', rel);
      b.addEventListener('contextmenu', e => e.preventDefault());
    });
  },
};
