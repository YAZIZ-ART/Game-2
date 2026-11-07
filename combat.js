'use strict';
/* ===== combat.js — serangan dasar, skill kombinasi elemen, proyektil, zona, status ===== */
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy; let t = l ? ((px - x1) * dx + (py - y1) * dy) / l : 0; t = clamp(t, 0, 1);
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}
const ANIMK = { slash: 'slash', thrust: 'thrust', smash: 'smash', spin: 'spin', whip: 'thrust', proj: 'shoot', counter: 'slash' };

const Combat = {
  proj: [], zones: [],
  reset() { this.proj = []; this.zones = []; },
  nearest(x, y, r) { let b = null, bd = r; for (const e of Game.enemies) { if (e.dead) continue; const d = Math.hypot(e.x - x, e.y - y) - e.r * 0.5; if (d < bd) { bd = d; b = e; } } return b; },
  aim(p) { const t = this.nearest(p.x, p.y, p.w.kind === 'proj' ? 260 : 150); return t ? Math.atan2(t.y - p.y, t.x - p.x) : p.ang; },
  circle(x, y, r, fn) { for (const e of Game.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) <= r + e.r) fn(e); },
  sector(p, ang, range, arc, fn) {
    for (const e of Game.enemies) {
      if (e.dead) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d > range + e.r) continue;
      if (d < e.r + 10 || Math.abs(angDiff(Math.atan2(e.y - p.y, e.x - p.x), ang)) <= arc / 2) fn(e);
    }
  },
  capsule(x1, y1, x2, y2, w, fn) { for (const e of Game.enemies) if (!e.dead && segDist(e.x, e.y, x1, y1, x2, y2) <= w + e.r) fn(e); },

  /* ---------- damage & status ---------- */
  hurt(e, base, o) {
    if (e.dead) return; o = o || {}; const P = Game.player, el = o.elems || [P.el];
    const m = elemMult(el, e.el), cr = Math.random() < (o.critChance == null ? 0.1 : o.critChance);
    const d = Math.max(1, Math.round(base * m * (cr ? (o.crit || 1.5) : 1) * rnd(0.92, 1.08)));
    e.hp -= d; e.flash = 0.12;
    FX.text(e.x + rnd(-4, 4), e.y - e.r - 10, String(d), cr ? '#ffe14a' : m > 1 ? '#ff9a4a' : m < 1 ? '#9aa4b8' : '#ffffff', cr ? 11 : m > 1 ? 10 : 8);
    FX.puff(e.x, e.y - 8, ELEMENTS[el[0]].l, 5, 50, 0.3, 2);
    if (o.kb) { const a = Math.atan2(e.y - o.kb.y, e.x - o.kb.x), f = o.kb.f * (e.kind === 'boss' ? 0.1 : 1); e.kbx += Math.cos(a) * f; e.kby += Math.sin(a) * f; }
    if (e.hp > 0) { if (o.status) this.applyStatus(e, el, o.pw || 1, o, d); else if (o.basic && Math.random() < 0.22) this.applyStatus(e, el, 0.7, o, d); }
    SND.sfx('hit');
    if (e.kind === 'boss' && !e.engaged && e.hp > 0) Game.engageBoss(e);
    if (e.hp <= 0) this.kill(e);
  },
  applyStatus(e, elems, pw, o, d) {
    const P = Game.player;
    for (const el of elems) {
      if (el === 'fire') e.st.burn = { t: 3, d: P.atk * 0.28 * pw, k: 0.5 };
      else if (el === 'water') e.st.slow = { t: 2.5 };
      else if (el === 'earth') { if (e.kind !== 'boss') { if (pw >= 0.8) e.st.stun = { t: 0.6 * pw }; else e.st.slow = { t: 1.2 }; } }
      else if (el === 'lightning') { if (!o.nochain) this.chain(e, d * 0.4, o); if (e.kind !== 'boss' && pw >= 1) e.st.stun = { t: 0.35 }; }
      else if (el === 'air') { if (e.kind !== 'boss') { const a = Math.atan2(P.y - e.y, P.x - e.x); e.kbx += Math.cos(a) * 70 * pw; e.kby += Math.sin(a) * 70 * pw; } }
    }
  },
  chain(e, dmg, o) {
    let n = 0;
    for (const t of Game.enemies) {
      if (t === e || t.dead || n >= 2) continue;
      if (Math.hypot(t.x - e.x, t.y - e.y) < 120) { n++; FX.bolt(e.x, e.y - 8, t.x, t.y - 8, ELEMENTS.lightning.c, 0.2, 2); SND.sfx('zap'); this.hurt(t, dmg, { elems: o.elems, nochain: true, critChance: 0 }); }
    }
  },
  dot(e, d) { if (e.dead) return; d = Math.max(1, Math.round(d)); e.hp -= d; FX.text(e.x, e.y - e.r - 8, String(d), '#ff8a3a', 7); if (e.hp <= 0) this.kill(e); },
  kill(e) {
    e.dead = true; e.respawn = 28; const big = e.kind === 'boss', c = ELEMENTS[e.el].c;
    FX.puff(e.x, e.y - 8, c, big ? 60 : 14, big ? 130 : 60, 0.7, 3); FX.ring(e.x, e.y - 6, 4, big ? 90 : 26, 0.5, c, 2);
    if (big) { FX.shk(10); FX.flashAdd('#fff', 0.6); }
    FX.text(e.x, e.y - e.r - 22, '+' + e.exp + ' EXP', '#8affc0', 8); SND.sfx(big ? 'boom' : 'hit');
    Game.player.kills++; Game.gainExp(e.exp); if (big) Game.bossDefeated(e);
  },
  damagePlayer(d, src) {
    const p = Game.player; if (p.inv > 0 || p.hp <= 0 || Game.state !== 'play') return;
    d *= (p.el === 'earth' ? 0.9 : 1) * (p.wk === 'shield' ? 0.8 : 1); d = Math.max(1, Math.round(d));
    p.hp -= d; p.inv = 0.65; p.hurt = 0.3; p.lastHit = 0; FX.shk(3); FX.text(p.x, p.y - 34, '-' + d, '#ff5a6a', 10); FX.flashAdd('#ff2a3a', 0.25); SND.sfx('hurt');
    if (src && src.x !== undefined) { const a = Math.atan2(p.y - src.y, p.x - src.x); p.kbx += Math.cos(a) * 90; p.kby += Math.sin(a) * 90; }
    if (p.hp <= 0) { p.hp = 0; Game.playerDied(); }
  },

  /* ---------- serangan dasar (tergantung senjata) ---------- */
  basicAttack(p) {
    if (p.atkT > 0 || p.castT > 0 || p.stun > 0 || p.hp <= 0 || p.dash) return false;
    const w = p.w, ang = this.aim(p); p.ang = ang; p.face = faceFromAng(ang); p.atkT = w.cd * (p.el === 'lightning' ? 0.92 : 1);
    const dmg = p.atk * w.dmg * p.dmgMul, E = ELEMENTS[p.el], cols = [E.c, E.l], dx = Math.cos(ang), dy = Math.sin(ang);
    const o = { elems: [p.el], crit: 1.6, critChance: 0.12, basic: true, kb: { x: p.x, y: p.y, f: 55 } }, hit = e => this.hurt(e, dmg, o);
    const arcFx = (range, arc) => { FX.arc(p.x, p.y - 8, ang - arc / 2, ang + arc / 2, range * 0.7, 0.22, E.l, 3); for (let k = 0; k <= 4; k++) { const a = ang - arc / 2 + arc * k / 4; FX.motif(E.motif, p.x + Math.cos(a) * range * 0.75, p.y - 8 + Math.sin(a) * range * 0.75, cols, 1, 4); } };
    switch (w.kind) {
      case 'slash': p.anim = { kind: 'slash', t: 0, dur: Math.min(0.26, w.cd * 0.9), ang, arc: w.arc }; this.sector(p, ang, w.range, w.arc, hit); arcFx(w.range, w.arc); SND.sfx('slash'); break;
      case 'counter': p.anim = { kind: 'slash', t: 0, dur: 0.25, ang, arc: w.arc }; p.inv = Math.max(p.inv, 0.25); o.kb.f = 140; this.sector(p, ang, w.range, w.arc, hit); arcFx(w.range, w.arc); SND.sfx('slash'); break;
      case 'thrust': case 'whip': {
        p.anim = { kind: 'thrust', t: 0, dur: 0.2, ang, arc: 0 }; this.capsule(p.x, p.y, p.x + dx * w.range, p.y + dy * w.range, 9, hit);
        for (let k = 1; k <= 6; k++) FX.motif(E.motif, p.x + dx * w.range * k / 6, p.y - 8 + dy * w.range * k / 6, cols, 1, 3);
        if (w.kind === 'whip') FX.bolt(p.x + dx * 8, p.y - 10, p.x + dx * w.range, p.y - 10 + dy * w.range, '#c8c8d8', 0.12, 1); SND.sfx('slash'); break; }
      case 'smash': { p.anim = { kind: 'smash', t: 0, dur: 0.4, ang, arc: 1.5 }; const x = p.x + dx * 30, y = p.y + dy * 30;
        p.pending.push({ t: 0.18, fn: () => { this.circle(x, y, 40, hit); FX.ring(x, y, 4, 40, 0.35, E.c, 3); FX.motif('chunk', x, y, cols, 8, 20); FX.motif(E.motif, x, y, cols, 6, 20); FX.shk(2); SND.sfx('boom'); } }); break; }
      case 'spin': p.anim = { kind: 'spin', t: 0, dur: 0.3, ang, arc: 6.283 }; this.circle(p.x, p.y, w.range * 0.85, hit); FX.arc(p.x, p.y - 8, ang, ang + 6.283, w.range * 0.6, 0.3, E.l, 3); FX.motif(E.motif, p.x, p.y - 8, cols, 8, w.range * 0.7); SND.sfx('slash'); break;
      case 'proj': {
        p.anim = { kind: 'shoot', t: 0, dur: 0.18, ang, arc: 0 }; const n = w.fan || 1;
        for (let i = 0; i < n; i++) { const a = ang + (n > 1 ? (i - (n - 1) / 2) * 0.22 : 0);
          this.spawnProj({ x: p.x + Math.cos(a) * 8, y: p.y - 8 + Math.sin(a) * 8, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, ang: a, dmg, o, cols, fx: [E.motif], kind: w.shot, r: 4, life: w.range / w.speed, pierce: w.pierce, aoe: w.shot === 'orb' ? 26 : 0 }); }
        SND.sfx('slash'); break; }
    }
    return true;
  },

  /* ---------- skill kombinasi ---------- */
  castSkill(p, i) {
    const id = p.slots[i]; if (!id) return false; const s = SKILLS[id];
    if (p.castT > 0 || p.stun > 0 || p.hp <= 0 || p.dash) return false;
    if ((p.cd[id] || 0) > 0) return false;
    if (p.mp < s.mana) { Game.toast('Mana tidak cukup'); return false; }
    p.mp -= s.mana; p.cd[id] = s.cd;
    const w = p.w, k = w.kind, ang = this.aim(p); p.ang = ang; p.face = faceFromAng(ang);
    const cols = s.elems.map(e => ELEMENTS[e].c), dmg = p.atk * s.dmg * (0.75 + 0.25 * w.dmg) * p.dmgMul, cast = Math.max(0.18, s.cast * (w.cd / 0.4));
    p.castT = cast; p.anim = { kind: ANIMK[k], t: 0, dur: Math.min(0.5, cast + 0.12), ang, arc: Math.max(w.arc, 1.8) };
    const c = { s, p, k, ang, dmg, cols, dx: Math.cos(ang), dy: Math.sin(ang), o: { elems: s.elems, crit: s.crit, critChance: 0.2, status: true, pw: 1, kb: { x: p.x, y: p.y, f: s.tier >= 1 ? 80 : 50 } } };
    FX.motif(s.fx[0], p.x, p.y - 10, cols, 8, 14); FX.ring(p.x, p.y - 4, 4, 26, 0.35, cols[0], 2); SND.sfx(s.tier === 3 ? 'ult' : 'cast');
    this['tier' + s.tier](c); return true;
  },
  hitFn(c, extra) { const o = extra ? Object.assign({}, c.o, extra) : c.o; return e => this.hurt(e, c.dmg, o); },
  shot(c, count, spread, dmg, extra) {
    const { p, s, ang, cols, o } = c, w = p.w, kind = w.kind === 'proj' ? w.shot : 'orb';
    for (let i = 0; i < count; i++) {
      const a = ang + (count > 1 ? (i - (count - 1) / 2) * spread : 0), sp = (extra && extra.speed) || 260;
      this.spawnProj(Object.assign({ x: p.x + Math.cos(a) * 8, y: p.y - 8 + Math.sin(a) * 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ang: a, dmg, o, cols, fx: s.fx, kind, r: 5, life: s.range / sp + 0.25, pierce: 1 }, extra));
    }
  },
  /* tier 0 — Teknik: serangan cepat sesuai senjata */
  tier0(c) {
    const { p, s, k, ang, dmg, cols, dx, dy } = c, hit = this.hitFn(c);
    if (k === 'slash' || k === 'whip' || k === 'spin') {
      const dd = Math.min(115 * (p.el === 'air' ? 1.25 : 1), s.range * 0.8);
      if (k === 'spin') { this.circle(p.x, p.y, s.aoe + 34, hit); FX.arc(p.x, p.y - 8, ang, ang + 6.283, 40, 0.35, cols[0], 4); FX.arc(p.x, p.y - 8, ang + 1, ang + 7.3, 28, 0.35, cols[1], 3); FX.motif(s.fx[0], p.x, p.y - 8, cols, 14, 40); FX.motif(s.fx[1], p.x, p.y - 8, cols, 10, 40); return; }
      p.dash = { vx: dx * dd / 0.16, vy: dy * dd / 0.16, t: 0.16 }; p.inv = Math.max(p.inv, 0.25);
      this.capsule(p.x, p.y, p.x + dx * dd, p.y + dy * dd, 14 + s.aoe * 0.3, hit);
      for (let j = 0; j <= 8; j++) { const px = p.x + dx * dd * j / 8, py = p.y - 8 + dy * dd * j / 8; FX.motif(s.fx[0], px, py, cols, 2, 6); FX.motif(s.fx[1], px, py, cols, 1, 8); }
      FX.arc(p.x + dx * dd * 0.5, p.y - 8 + dy * dd * 0.5, ang - 1.3, ang + 1.3, 26, 0.3, cols[0], 4); FX.arc(p.x + dx * dd * 0.5, p.y - 8 + dy * dd * 0.5, ang - 1, ang + 1, 20, 0.3, cols[1], 2);
    } else if (k === 'thrust') {
      const L = s.range * 1.5; this.capsule(p.x, p.y, p.x + dx * L, p.y + dy * L, 10 + s.aoe * 0.15, hit);
      for (let j = 1; j <= 10; j++) { FX.motif(s.fx[0], p.x + dx * L * j / 10, p.y - 8 + dy * L * j / 10, cols, 1, 5); FX.motif(s.fx[1], p.x + dx * L * j / 10, p.y - 8 + dy * L * j / 10, cols, 1, 5); }
      FX.bolt(p.x, p.y - 8, p.x + dx * L, p.y - 8 + dy * L, cols[0], 0.25, 3); FX.bolt(p.x, p.y - 8, p.x + dx * L, p.y - 8 + dy * L, cols[1], 0.2, 2);
    } else if (k === 'proj') this.shot(c, 1, 0, c.dmg, { aoe: s.aoe, speed: 270, pierce: 1 });
    else if (k === 'smash') { const x = p.x + dx * 34, y = p.y + dy * 34; this.circle(x, y, s.aoe + 26, hit); FX.ring(x, y, 5, s.aoe + 26, 0.4, cols[0], 3); FX.motif('chunk', x, y, cols, 10, 24); FX.motif(s.fx[0], x, y, cols, 14, 30); FX.motif(s.fx[1], x, y, cols, 10, 30); FX.shk(4); SND.sfx('boom'); }
    else { p.inv = Math.max(p.inv, 0.7); this.circle(p.x, p.y, s.aoe + 30, this.hitFn(c, { kb: { x: p.x, y: p.y, f: 150 } })); FX.ring(p.x, p.y - 4, 6, s.aoe + 30, 0.4, cols[0], 3); FX.ring(p.x, p.y - 4, 3, s.aoe + 10, 0.5, cols[1], 2); FX.motif(s.fx[0], p.x, p.y - 8, cols, 14, 30); FX.shk(3); }
  },
  /* tier 1 — Gelombang */
  tier1(c) {
    const { p, s, k, ang, dmg, cols, dx, dy } = c;
    if (k === 'slash' || k === 'whip') {
      this.spawnProj({ x: p.x + dx * 10, y: p.y - 8 + dy * 10, vx: dx * 190, vy: dy * 190, ang, dmg, o: c.o, cols, fx: s.fx, kind: 'crescent', r: 14, life: s.range / 190 + 0.2, pierce: 99, ghost: true });
      FX.arc(p.x, p.y - 8, ang - 1.4, ang + 1.4, 22, 0.3, cols[0], 4);
    } else if (k === 'thrust') this.shot(c, 3, 0.2, dmg * 0.6, { kind: 'spear', speed: 300, pierce: 3, r: 5 });
    else if (k === 'proj') this.shot(c, 5, 0.15, dmg * 0.5, { aoe: 22, speed: 270 });
    else if (k === 'smash') { for (let i = 0; i < 6; i++) this.spawnZone({ x: p.x + dx * (30 + i * 26), y: p.y + dy * (30 + i * 26), r: 22 + s.aoe * 0.2, once: true, delay: i * 0.08, dmg: dmg * 0.55, o: c.o, cols, fx: s.fx }); FX.shk(4); }
    else if (k === 'spin') this.spawnZone({ x: p.x, y: p.y, r: s.aoe + 30, dur: 1.3, tick: 0.22, dmg: dmg * 0.3, follow: true, o: Object.assign({}, c.o, { pw: 0.6, kb: { x: p.x, y: p.y, f: 40 } }), cols, fx: s.fx });
    else { this.spawnZone({ x: p.x, y: p.y, r: s.aoe + 80, r0: 10, ring: true, dur: 0.45, dmg, o: Object.assign({}, c.o, { kb: { x: p.x, y: p.y, f: 140 } }), cols, fx: s.fx }); p.inv = Math.max(p.inv, 0.6); FX.shk(4); }
  },
  /* tier 2 — Zona (persisten di target) */
  tier2(c) {
    const { p, s, k, dmg, cols, dx, dy } = c, tg = this.nearest(p.x, p.y, 260), zx = tg ? tg.x : p.x + dx * 110, zy = tg ? tg.y : p.y + dy * 110;
    const o = Object.assign({}, c.o, { pw: 0.5, kb: null }), pull = s.elems.includes('air') ? 70 : 0;
    const offs = k === 'proj' ? [[0, 0], [-34, 18], [34, 18]] : [[0, 0]], r = (k === 'proj' ? 0.68 : 1) * (s.aoe + 10);
    offs.forEach(f => this.spawnZone({ x: zx + f[0], y: zy + f[1], r, dur: 3.4, tick: 0.45, dmg: dmg * (k === 'proj' ? 0.6 : 1), o, cols, fx: s.fx, pull }));
    FX.ring(zx, zy, 4, s.aoe, 0.5, cols[1], 3); FX.motif(s.fx[0], zx, zy, cols, 16, s.aoe * 0.6);
  },
  /* tier 3 — Ultimate */
  tier3(c) {
    const { p, s, dmg, cols, o } = c; p.inv = Math.max(p.inv, 1.2); p.charge = { t: 0.7, cols };
    FX.ring(p.x, p.y - 4, 130, 10, 0.7, cols[0], 3); FX.ring(p.x, p.y - 4, 90, 6, 0.7, cols[1], 2); FX.flashAdd(cols[0], 0.2);
    p.pending.push({ t: 0.7, fn: () => {
      const ox = p.x, oy = p.y; FX.flashAdd('#ffffff', 0.55); FX.shk(10); SND.sfx('boom');
      this.spawnZone({ x: ox, y: oy, r: s.aoe, r0: 10, ring: true, dur: 0.55, dmg, o: Object.assign({}, o, { kb: { x: ox, y: oy, f: 140 } }), cols, fx: s.fx });
      for (let j = 0; j < 3; j++) FX.ring(ox, oy, 8, s.aoe * (0.6 + j * 0.2), 0.5 + j * 0.15, cols[j % 2], 3 - j * 0.5);
      FX.motif(s.fx[0], ox, oy - 10, cols, 40, 50); FX.motif(s.fx[1], ox, oy - 10, cols, 30, 60);
      const tg = Game.enemies.filter(e => !e.dead && Math.hypot(e.x - ox, e.y - oy) < s.aoe + 120);
      for (let j = 0; j < 6; j++) { const t = tg.length ? tg[(Math.random() * tg.length) | 0] : null; const mx = t ? t.x : ox + rnd(-130, 130), my = t ? t.y : oy + rnd(-100, 100);
        this.spawnZone({ x: mx, y: my, r: 44, once: true, delay: 0.25 + j * 0.14, dmg: dmg * 0.3, o: Object.assign({}, o, { kb: null }), cols, fx: s.fx, meteor: true, col: cols[j % 2] }); }
    } });
  },

  /* ---------- proyektil ---------- */
  spawnProj(o) {
    this.proj.push(Object.assign({ team: 'p', x: 0, y: 0, vx: 0, vy: 0, r: 5, dmg: 1, life: 1, pierce: 1, hit: new Set(), o: {}, cols: ['#fff'], fx: null, aoe: 0, kind: 'orb', ang: 0, t: 0, homing: 0, ghost: false }, o));
  },
  eProj(o) {
    this.spawnProj(Object.assign({ team: 'e', vx: Math.cos(o.ang) * o.speed, vy: Math.sin(o.ang) * o.speed, cols: [o.col || '#ff4a4a'], ghost: true, pierce: 1 }, o));
  },
  updateProj(dt) {
    const P = Game.player;
    for (let i = this.proj.length - 1; i >= 0; i--) {
      const pr = this.proj[i]; pr.t += dt; pr.life -= dt;
      if (pr.homing) {
        const tg = pr.team === 'p' ? this.nearest(pr.x, pr.y, 200) : P;
        if (tg) { const ta = Math.atan2(tg.y - 8 - pr.y, tg.x - pr.x), cur = Math.atan2(pr.vy, pr.vx), nd = cur + clamp(angDiff(ta, cur), -pr.homing * dt, pr.homing * dt), sp = Math.hypot(pr.vx, pr.vy); pr.vx = Math.cos(nd) * sp; pr.vy = Math.sin(nd) * sp; pr.ang = nd; }
      }
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      if (Math.random() < 0.7) { if (pr.fx) FX.motif(pr.fx[(Math.random() * pr.fx.length) | 0], pr.x, pr.y, pr.cols, 1, 3); else FX.puff(pr.x, pr.y, pr.cols[0], 1, 10, 0.25, 2); }
      let end = pr.life <= 0;
      if (!end && World.t[((pr.y / TILE) | 0) * World.W + ((pr.x / TILE) | 0)] === 9) end = true;
      if (!end) {
        if (pr.team === 'p') {
          for (const e of Game.enemies) {
            if (e.dead || pr.hit.has(e)) continue;
            if (Math.hypot(e.x - pr.x, (e.y - 6) - pr.y) < pr.r + e.r) { pr.hit.add(e); this.hurt(e, pr.dmg, pr.o); pr.pierce--; if (pr.pierce <= 0) { end = true; break; } }
          }
        } else if (Math.hypot(P.x - pr.x, (P.y - 8) - pr.y) < pr.r + 5) { this.damagePlayer(pr.dmg, pr); end = true; }
      }
      if (end) {
        if (pr.aoe && pr.team === 'p') { this.circle(pr.x, pr.y + 6, pr.aoe, e => { if (!pr.hit.has(e)) this.hurt(e, pr.dmg * 0.6, pr.o); }); FX.ring(pr.x, pr.y, 3, pr.aoe, 0.3, pr.cols[0], 2); FX.motif((pr.fx || ['spark'])[0], pr.x, pr.y, pr.cols, 8, pr.aoe * 0.6); }
        else FX.puff(pr.x, pr.y, pr.cols[0], 6, 40, 0.3, 2);
        this.proj[i] = this.proj[this.proj.length - 1]; this.proj.pop();
      }
    }
  },
  drawProj(g, t) {
    for (const pr of this.proj) {
      const c0 = pr.cols[0], c1 = pr.cols[1] || c0; g.save(); g.translate(Math.round(pr.x), Math.round(pr.y));
      const glow = (r, c, a) => { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.fillStyle = c; g.beginPath(); g.arc(0, 0, r, 0, 6.283); g.fill(); g.restore(); };
      switch (pr.kind) {
        case 'arrow': g.rotate(pr.ang); g.fillStyle = '#8a6a3a'; g.fillRect(-9, -0.5, 12, 1); g.fillStyle = '#e3ebf7'; g.beginPath(); g.moveTo(3, -2); g.lineTo(7, 0); g.lineTo(3, 2); g.fill(); g.fillStyle = c1; g.fillRect(-9, -2, 3, 1); g.fillRect(-9, 1, 3, 1); glow(5, c0, 0.4); break;
        case 'bolt': g.rotate(pr.ang); g.fillStyle = '#c8d0e0'; g.fillRect(-6, -1, 11, 2); g.fillStyle = c0; g.fillRect(2, -1.5, 4, 3); glow(5, c0, 0.45); break;
        case 'chakram': g.rotate(t * 18); g.strokeStyle = '#dfe6ff'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 6, 0, 6.283); g.stroke(); g.strokeStyle = c0; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 3.5, 0, 6.283); g.stroke(); glow(8, c0, 0.3); break;
        case 'dagger': g.rotate(pr.ang); g.fillStyle = '#e3ebf7'; g.beginPath(); g.moveTo(-4, -2); g.lineTo(6, 0); g.lineTo(-4, 2); g.fill(); g.fillStyle = c0; g.fillRect(-6, -1, 3, 2); glow(5, c0, 0.4); break;
        case 'spear': g.rotate(pr.ang); g.fillStyle = c1; g.fillRect(-10, -1, 16, 2); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(6, -3); g.lineTo(13, 0); g.lineTo(6, 3); g.fill(); glow(7, c0, 0.45); break;
        case 'crescent': g.rotate(pr.ang); g.strokeStyle = c1; g.lineWidth = 4; g.beginPath(); g.arc(-6, 0, 16, -1.1, 1.1); g.stroke(); g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = c0; g.lineWidth = 2.5; g.globalAlpha = 0.9; g.beginPath(); g.arc(-6, 0, 12, -1.1, 1.1); g.stroke(); g.restore(); break;
        case 'fireball': glow(pr.r + 4, c0, 0.4); glow(pr.r, '#ffb04a', 0.9); glow(pr.r * 0.5, '#fff', 0.9); break;
        case 'rock': g.rotate(t * 6); g.fillStyle = '#6a5a4a'; g.fillRect(-pr.r, -pr.r, pr.r * 2, pr.r * 2); g.fillStyle = '#8a7a68'; g.fillRect(-pr.r, -pr.r, pr.r, pr.r); glow(pr.r + 3, c0, 0.2); break;
        case 'tornado': for (let j = 0; j < 4; j++) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6; g.strokeStyle = j % 2 ? '#d8fffa' : c0; g.lineWidth = 1.5; g.beginPath(); g.ellipse(Math.sin(t * 8 + j) * 2, -j * 4 + 6, 4 + j * 2.5, 2 + j, 0, 0, 6.283); g.stroke(); g.restore(); } break;
        default: glow(pr.r + 3, c0, 0.35); glow(pr.r, c1, 0.9); glow(pr.r * 0.45, '#fff', 0.9);
      }
      g.restore();
    }
  },

  /* ---------- zona area ---------- */
  spawnZone(o) {
    const z = Object.assign({ team: 'p', x: 0, y: 0, r: 50, r0: 0, age: 0, delay: 0, dur: 1, tick: 0.4, tk: 0, dmg: 1, o: {}, cols: ['#fff', '#fff'], fx: [], ring: false, once: false, follow: false, pull: 0, fired: false, hit: new Set(), strike: false, meteor: false, col: null, started: false, cr: 0, vt: 0 }, o);
    if (!z.col) z.col = z.cols[0]; this.zones.push(z); return z;
  },
  hazard(x, y, r, dmg, delay, col, opt) { this.spawnZone(Object.assign({ team: 'e', x, y, r, dmg, delay, once: true, col, cols: [col, '#ffffff'], fx: opt && opt.strike ? ['spark'] : ['ember', 'chunk'] }, opt || {})); },
  eRing(x, y, r, dmg, delay, col) { this.spawnZone({ team: 'e', x, y, r, r0: 8, ring: true, dur: 0.55, dmg, delay, col, cols: [col, '#ffffff'], fx: ['ember'] }); },
  burst(z) {
    FX.ring(z.x, z.y, 4, z.r, 0.4, z.cols[0], 3); FX.puff(z.x, z.y - 4, z.cols[1] || z.cols[0], 12, 70, 0.4, 2);
    z.fx.forEach(f => FX.motif(f, z.x, z.y - 4, z.cols, 8, z.r * 0.8));
    if (z.strike) { FX.bolt(z.x, z.y - 100, z.x, z.y, z.col, 0.3, 3); SND.sfx('zap'); } else if (z.team === 'e' || Math.random() < 0.4) SND.sfx('boom');
    FX.shk(z.team === 'e' ? 2.5 : 1.5);
  },
  zoneHit(z, tick) {
    if (z.team === 'p') { this.circle(z.x, z.y, z.ring ? z.cr : z.r, e => { if ((z.ring || z.once) && z.hit.has(e)) return; if (z.ring || z.once) z.hit.add(e); this.hurt(e, z.dmg, z.o); }); }
    else { const P = Game.player; if (Math.hypot(P.x - z.x, P.y - z.y) <= (z.ring ? z.cr : z.r) + 4) this.damagePlayer(z.dmg, z); }
  },
  updateZone(z, dt) {
    z.age += dt; const P = Game.player;
    if (z.follow) { z.x = P.x; z.y = P.y - 4; }
    if (z.age < z.delay) return false;
    const ta = z.age - z.delay;
    if (!z.started) { z.started = true; if (z.once || z.ring) this.burst(z); }
    if (z.once) { if (!z.fired) { z.fired = true; this.zoneHit(z); } return ta > 0.3; }
    if (z.ring) {
      z.cr = z.r0 + (z.r - z.r0) * Math.min(1, ta / z.dur);
      if (z.team === 'p') this.circle(z.x, z.y, z.cr, e => { if (!z.hit.has(e)) { z.hit.add(e); this.hurt(e, z.dmg, z.o); } });
      else if (!z.hit.has('p') && Math.hypot(P.x - z.x, P.y - z.y) <= z.cr + 4) { z.hit.add('p'); this.damagePlayer(z.dmg, z); }
      if (Math.random() < 0.6) { const a = Math.random() * 6.283; FX.motif(z.fx[0] || 'spark', z.x + Math.cos(a) * z.cr, z.y + Math.sin(a) * z.cr, z.cols, 1, 3); }
      return ta >= z.dur;
    }
    z.tk -= dt; if (z.tk <= 0) { z.tk = z.tick; this.zoneHit(z, true); FX.ring(z.x, z.y, 4, z.r, 0.35, z.cols[1], 1.5); }
    if (z.pull) this.circle(z.x, z.y, z.r * 1.3, e => { if (e.kind === 'boss') return; const d = Math.hypot(z.x - e.x, z.y - e.y) || 1; if (d > 6) moveEnt(e, (z.x - e.x) / d * z.pull * dt, (z.y - e.y) / d * z.pull * dt); });
    if (Math.random() < dt * 16) { z.fx.forEach(f => FX.motif(f, z.x, z.y, z.cols, 1, z.r * 0.8)); }
    return ta >= z.dur;
  },
  update(dt) {
    this.updateProj(dt);
    for (let i = this.zones.length - 1; i >= 0; i--) if (this.updateZone(this.zones[i], dt)) this.zones.splice(i, 1);
  },
  drawZones(g, t) {
    for (const z of this.zones) {
      g.save(); const e = z.team === 'e', col = e ? '#ff2a3a' : z.cols[0];
      if (z.age < z.delay) {
        const k = z.age / z.delay; g.globalAlpha = 0.18 + 0.12 * Math.sin(t * 14); g.fillStyle = col; g.beginPath(); g.arc(z.x, z.y, z.r, 0, 6.283); g.fill();
        g.globalAlpha = 0.85; g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); g.arc(z.x, z.y, z.r, 0, 6.283); g.stroke();
        g.globalAlpha = 0.3; g.beginPath(); g.arc(z.x, z.y, z.r * k, 0, 6.283); g.fill();
        if (z.meteor) { const fy = z.y - (1 - k) * 110; g.globalCompositeOperation = 'lighter'; g.fillStyle = z.col; g.globalAlpha = 0.9; g.beginPath(); g.arc(z.x, fy, 6, 0, 6.283); g.fill(); g.globalAlpha = 0.4; g.fillRect(z.x - 2, fy - 24, 4, 24); g.fillStyle = '#fff'; g.beginPath(); g.arc(z.x, fy, 3, 0, 6.283); g.fill(); }
      } else {
        const ta = z.age - z.delay; g.globalCompositeOperation = 'lighter';
        if (z.once) { g.globalAlpha = Math.max(0, 1 - ta / 0.3) * 0.7; g.fillStyle = z.cols[1]; g.beginPath(); g.arc(z.x, z.y, z.r * (0.6 + ta), 0, 6.283); g.fill(); }
        else if (z.ring) { g.globalAlpha = 0.9 * (1 - ta / z.dur * 0.6); g.strokeStyle = z.cols[0]; g.lineWidth = 4; g.beginPath(); g.arc(z.x, z.y, z.cr, 0, 6.283); g.stroke(); g.strokeStyle = z.cols[1]; g.lineWidth = 1.5; g.stroke(); g.globalAlpha = 0.12; g.fillStyle = z.cols[0]; g.fill(); }
        else {
          const f = Math.min(1, (z.dur - ta) / 0.5); g.globalAlpha = 0.14 * f; g.fillStyle = z.cols[1]; g.beginPath(); g.arc(z.x, z.y, z.r, 0, 6.283); g.fill();
          g.globalAlpha = 0.7 * f; g.strokeStyle = z.cols[0]; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.lineDashOffset = -t * 22; g.beginPath(); g.arc(z.x, z.y, z.r, 0, 6.283); g.stroke();
          g.strokeStyle = z.cols[1]; g.lineDashOffset = t * 26; g.beginPath(); g.arc(z.x, z.y, z.r * 0.6, 0, 6.283); g.stroke(); g.setLineDash([]);
        }
      }
      g.restore();
    }
  }
};
