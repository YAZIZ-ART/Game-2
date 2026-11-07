'use strict';
/* ===== entities.js — pemain, monster, bos (AI + gambar) ===== */
const FACE_ANG = { d: Math.PI / 2, u: -Math.PI / 2, l: Math.PI, r: 0 };
function faceFromAng(a) { const c = Math.cos(a), s = Math.sin(a); return Math.abs(c) > Math.abs(s) ? (c > 0 ? 'r' : 'l') : (s > 0 ? 'd' : 'u'); }
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283; return d; }

/* ---------- PEMAIN ---------- */
function createPlayer(ch) {
  const p = { ch, w: WEAPONS[ch.wk], wk: ch.wk, el: ch.el, x: World.spawn.x, y: World.spawn.y, face: 'd', ang: Math.PI / 2, lvl: 1, exp: 0,
    mxhp: 1, mxmp: 1, atk: 1, spd: 1, hp: 1, mp: 1, slots: [null, null, null, null, null], sec: {}, cd: {}, atkT: 0, castT: 0, inv: 0, dashCd: 0,
    hurt: 0, walk: 0, moving: false, anim: null, pending: [], stun: 0, dash: null, kbx: 0, kby: 0, lastHit: 9, kills: 0, glowT: 0, charge: null,
    dmgMul: ch.el === 'fire' ? 1.12 : 1 };
  secList(ch).slice(0, 2).forEach(e => { p.sec[e] = true; });
  recalc(p, true); autoFill(p); return p;
}
function recalc(p, full) {
  const b = baseStats(p.ch), L = p.lvl;
  p.mxhp = Math.round(b.hp + (L - 1) * 16 * (p.el === 'earth' ? 1.2 : 1)); p.mxmp = Math.round(b.mp + (L - 1) * 7);
  p.atk = b.atk + (L - 1) * 2.6; p.spd = b.spd;
  if (full) { p.hp = p.mxhp; p.mp = p.mxmp; }
}
function otherElem(p, s) { return s.elems.find(e => e !== p.el); }
function skillReq(p, s) { return Math.max(s.req, SEC_REQ[secList(p.ch).indexOf(otherElem(p, s))]); }
function skillUnlocked(p, s) { return p.lvl >= skillReq(p, s); }
function skillUsable(p, s) { return s.elems.includes(p.el) && !!p.sec[otherElem(p, s)] && skillUnlocked(p, s); }
function skillsOfSec(p, e) { return [0, 1, 2, 3].map(t => SKILLS[pairKey(p.el, e) + ':' + t]); }
function autoFill(p) {
  for (let i = 0; i < 5; i++) { const id = p.slots[i]; if (id && (!skillUsable(p, SKILLS[id]) || (i === 4) !== (SKILLS[id].tier === 3))) p.slots[i] = null; }
  const usable = []; secList(p.ch).forEach(e => skillsOfSec(p, e).forEach(s => { if (skillUsable(p, s)) usable.push(s); }));
  usable.sort((a, b) => a.tier - b.tier);
  for (let i = 0; i < 4; i++) if (!p.slots[i]) { const c = usable.find(s => s.tier < 3 && !p.slots.includes(s.id)); if (c) p.slots[i] = c.id; }
  if (!p.slots[4]) { const c = usable.find(s => s.tier === 3 && !p.slots.includes(s.id)); if (c) p.slots[4] = c.id; }
}
function movePlayer(p, dx, dy) {
  if (!World.blocked(p.x + dx, p.y, 5)) p.x += dx;
  if (!World.blocked(p.x, p.y + dy, 5)) p.y += dy;
  p.x = clamp(p.x, 20, WORLD_W * TILE - 20); p.y = clamp(p.y, 20, WORLD_H * TILE - 20);
}
function updatePlayer(p, dt) {
  p.atkT = Math.max(0, p.atkT - dt); p.castT = Math.max(0, p.castT - dt); p.inv = Math.max(0, p.inv - dt); p.hurt = Math.max(0, p.hurt - dt);
  p.dashCd = Math.max(0, p.dashCd - dt); p.stun = Math.max(0, p.stun - dt); p.lastHit += dt;
  for (let i = p.pending.length - 1; i >= 0; i--) { const q = p.pending[i]; q.t -= dt; if (q.t <= 0) { p.pending.splice(i, 1); q.fn(); } }
  for (const id in p.cd) if (p.cd[id] > 0) p.cd[id] = Math.max(0, p.cd[id] - dt);
  if (p.anim) { p.anim.t += dt; if (p.anim.t >= p.anim.dur) p.anim = null; }
  if (p.charge) { p.charge.t -= dt; if (Math.random() < 0.7) FX.motif('swirl', p.x, p.y - 8, p.charge.cols, 2, 22); if (p.charge.t <= 0) p.charge = null; }
  p.mp = Math.min(p.mxmp, p.mp + 2.4 * (p.el === 'water' ? 1.35 : 1) * dt);
  if (p.lastHit > 5) p.hp = Math.min(p.mxhp, p.hp + p.mxhp * 0.012 * dt);
  if (p.kbx || p.kby) { movePlayer(p, p.kbx * dt, p.kby * dt); const f = Math.pow(0.01, dt); p.kbx *= f; p.kby *= f; if (Math.abs(p.kbx) + Math.abs(p.kby) < 4) p.kbx = p.kby = 0; }
  if (p.dash) {
    const d = p.dash; movePlayer(p, d.vx * dt, d.vy * dt); d.t -= dt;
    FX.puff(p.x, p.y - 8, ELEMENTS[p.el].c, 2, 12, 0.3, 3); if (d.t <= 0) p.dash = null; p.moving = false;
  } else {
    const m = Input.move(), len = Math.hypot(m.x, m.y);
    if (len > 0.12 && p.stun <= 0) {
      const sp = p.spd * (p.castT > 0 ? 0.5 : 1) * Math.min(1, len); const k = 1 / Math.max(1, len);
      movePlayer(p, m.x * k * sp * dt, m.y * k * sp * dt);
      if (!p.anim) { p.ang = Math.atan2(m.y, m.x); p.face = faceFromAng(p.ang); } p.moving = true; p.walk += dt;
      if (Math.random() < 0.15) FX.puff(p.x, p.y, '#8a7a60', 1, 8, 0.4, 2, { add: false, al: 0.4 });
    } else p.moving = false;
  }
}
function drawPlayer(g, p, t) {
  const c = p.ch, E = ELEMENTS[p.el], x = Math.round(p.x), y = Math.round(p.y), pul = 0.5 + 0.5 * Math.sin(t * 3);
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = E.c; g.strokeStyle = E.c; g.lineWidth = 1.5;
  g.globalAlpha = 0.14 + 0.1 * pul; g.beginPath(); g.ellipse(x, y - 1, 12 + pul * 2, 5.5 + pul, 0, 0, 6.283); g.fill();
  g.globalAlpha = 0.45; g.stroke(); g.globalAlpha = 0.9;
  for (let i = 0; i < 3; i++) { const a = t * 2.2 + i * 2.094; g.fillStyle = i ? E.l : E.c; g.fillRect(Math.round(x + Math.cos(a) * 12), Math.round(y - 9 + Math.sin(a) * 5 - 6 + Math.sin(t * 3 + i) * 2), 2, 2); }
  g.restore();
  g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x, y, 7, 3, 0, 0, 6.283); g.fill();
  if (p.inv > 0 && p.hurt <= 0 && !p.dash && Math.floor(t * 20) % 2 && p.charge == null) g.globalAlpha = 0.5;
  if (p.hurt > 0 && Math.floor(t * 30) % 2) g.globalAlpha = 0.4;
  let ang = FACE_ANG[p.face] + ({ d: -0.9, u: 0.9, l: 0.7, r: -0.7 }[p.face]), ext = 0, a = p.anim, arcCol = E.l;
  if (a) {
    const k = clamp(a.t / a.dur, 0, 1), ae = 1 - (1 - k) * (1 - k);
    switch (a.kind) {
      case 'slash': ang = a.ang - a.arc / 2 + a.arc * ae; break;
      case 'thrust': ang = a.ang; ext = Math.sin(k * Math.PI) * 14; break;
      case 'smash': ang = a.ang + (k < 0.45 ? -1.5 * (k / 0.45) : -1.5 + 2.1 * ((k - 0.45) / 0.55)); break;
      case 'spin': ang = a.ang + k * 6.283; break;
      case 'shoot': ang = a.ang; ext = -3 * (1 - k); break;
    }
  }
  const hand = { d: [6, -11], u: [-6, -11], l: [-2, -11], r: [2, -11] }[p.face], wx = x + hand[0] + Math.cos(ang) * ext, wy = y + hand[1] + Math.sin(ang) * ext;
  const drawW = () => { g.save(); g.translate(wx, wy); g.rotate(ang); drawWeapon(g, c.wk, p.w.len, E.c); g.restore(); };
  const behind = Math.sin(ang) < -0.2;
  if (behind) drawW();
  const bob = p.moving ? (((p.walk * 8) | 0) % 2) : 0;
  g.drawImage(SPR[c.id][p.face][bob], x - 12, y - 32 + (p.moving && bob ? -1 : 0));
  if (!behind) drawW();
  if (a && (a.kind === 'slash' || a.kind === 'spin' || a.kind === 'smash')) {
    const k = clamp(a.t / a.dur, 0, 1); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (1 - k) * 0.9; g.strokeStyle = arcCol; g.lineWidth = 3;
    g.beginPath(); const r = p.w.len * 0.95 + 6, s0 = a.kind === 'spin' ? a.ang : a.ang - a.arc / 2; g.arc(wx, wy, r, s0, ang); g.stroke(); g.restore();
  }
  g.globalAlpha = 1;
}

/* ---------- MUSUH ---------- */
function makeEnemy(type, lv, el, x, y) {
  const T = ENEMY_TYPES[type];
  const e = { kind: 'mob', type, lv, el, x, y, hx: x, hy: y, r: T.r, mx: Math.round(T.hp * (1 + 0.3 * (lv - 1))), dmg: Math.round(T.dmg * (1 + 0.2 * (lv - 1))), spd: T.spd,
    exp: Math.round(T.exp * (1 + 0.22 * (lv - 1))), hp: 0, atkT: Math.random(), flash: 0, st: {}, ph: Math.random() * 6, face: 1, dead: false, respawn: 0,
    kbx: 0, kby: 0, fly: !!T.fly, ranged: !!T.ranged, lunge: 2, lungeT: 0, shootT: 1 + Math.random() * 2, wt: 0, wx: x, wy: y, fxT: 0 };
  e.hp = e.mx; return e;
}
function makeBoss(def) {
  const x = (def.tx + 0.5) * TILE, y = (def.ty + 0.5) * TILE;
  return { kind: 'boss', id: def.id, name: def.name, type: def.id, lv: def.lv, el: def.el, x, y, hx: x, hy: y, r: def.r, mx: def.hp, hp: def.hp, dmg: def.dmg, spd: def.spd, exp: def.exp,
    flash: 0, st: {}, ph: 0, face: 1, dead: false, respawn: 0, kbx: 0, kby: 0, engaged: false, pending: [], cdT: 2, busy: 0, phase: 1, dash: null, contactT: 0, bi: BOSSES.indexOf(def), rec: def.rec };
}
function moveEnt(e, dx, dy, r) {
  r = r || e.r * 0.7;
  if (e.fly) { e.x += dx; e.y += dy; } else { if (!World.blocked(e.x + dx, e.y, r)) e.x += dx; if (!World.blocked(e.x, e.y + dy, r)) e.y += dy; }
  e.x = clamp(e.x, 24, WORLD_W * TILE - 24); e.y = clamp(e.y, 24, WORLD_H * TILE - 24);
}
function enemyStatus(e, dt) { // return multiplier kecepatan; <0 = stun
  const st = e.st; let sp = 1;
  if (st.burn) { st.burn.t -= dt; st.burn.k -= dt; if (st.burn.k <= 0) { st.burn.k = 0.5; Combat.dot(e, st.burn.d); } if (Math.random() < 0.3) FX.motif('ember', e.x, e.y - 8, [ELEMENTS.fire.c], 1, 6); if (st.burn.t <= 0) delete st.burn; }
  if (st.slow) { st.slow.t -= dt; sp *= 0.45; if (Math.random() < 0.15) FX.motif('drop', e.x, e.y - 6, [ELEMENTS.water.c], 1, 6); if (st.slow.t <= 0) delete st.slow; }
  if (st.stun) { st.stun.t -= dt; if (Math.random() < 0.2) FX.motif('spark', e.x, e.y - e.r - 8, [ELEMENTS.lightning.l], 1, 5); if (st.stun.t <= 0) delete st.stun; sp = -1; }
  return sp;
}
function updateEnemy(e, dt) {
  const P = Game.player;
  if (e.dead) {
    if (e.temp) return; e.respawn -= dt;
    if (e.respawn <= 0) { if (Math.hypot(P.x - e.hx, P.y - e.hy) > 240) { e.dead = false; e.hp = e.mx; e.x = e.hx; e.y = e.hy; e.st = {}; } else e.respawn = 3; }
    return;
  }
  e.flash = Math.max(0, e.flash - dt); e.atkT -= dt;
  if (e.kbx || e.kby) { moveEnt(e, e.kbx * dt, e.kby * dt); const f = Math.pow(0.02, dt); e.kbx *= f; e.kby *= f; if (Math.abs(e.kbx) + Math.abs(e.kby) < 4) e.kbx = e.kby = 0; }
  const sm = enemyStatus(e, dt); if (sm < 0) return;
  const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1, aggro = d < 140 && P.hp > 0, spd = e.spd * sm;
  if (aggro) {
    e.face = dx >= 0 ? 1 : -1; const ux = dx / d, uy = dy / d;
    if (e.type === 'slime') { const hop = (Game.t * 0.9 + e.ph) % 1; const f = hop < 0.45 ? 1.7 : 0.1; moveEnt(e, ux * spd * f * dt, uy * spd * f * dt); }
    else if (e.type === 'wolf') {
      e.lunge -= dt; let f = 1; if (e.lungeT > 0) { e.lungeT -= dt; f = 3.2; } else if (e.lunge <= 0 && d < 110) { e.lunge = 3; e.lungeT = 0.35; FX.text(e.x, e.y - 18, '!', '#ff4a4a', 10); }
      moveEnt(e, ux * spd * f * dt, uy * spd * f * dt);
    } else if (e.type === 'bat') { const w = Math.sin(Game.t * 4 + e.ph) * 0.9; moveEnt(e, (ux * Math.cos(w) - uy * Math.sin(w)) * spd * dt, (uy * Math.cos(w) + ux * Math.sin(w)) * spd * dt); }
    else { // mage
      if (d > 120) moveEnt(e, ux * spd * dt, uy * spd * dt); else if (d < 70) moveEnt(e, -ux * spd * dt, -uy * spd * dt);
      e.shootT -= dt; if (e.shootT <= 0 && d < 190) { e.shootT = 2.2; Combat.eProj({ x: e.x, y: e.y - 14, ang: Math.atan2(dy, dx), speed: 95, dmg: e.dmg, r: 5, life: 2.5, kind: 'orb', col: ELEMENTS[e.el].c }); }
    }
    if (d < e.r + 8 && e.atkT <= 0 && !e.ranged) { e.atkT = 1; Combat.damagePlayer(e.dmg, e); }
  } else {
    e.wt -= dt; if (e.wt <= 0) { e.wt = rnd(2, 4); e.wx = e.hx + rnd(-40, 40); e.wy = e.hy + rnd(-40, 40); }
    const wx = e.wx - e.x, wy = e.wy - e.y, wd = Math.hypot(wx, wy);
    if (wd > 3) moveEnt(e, wx / wd * spd * 0.4 * dt, wy / wd * spd * 0.4 * dt);
    if (Math.hypot(e.x - e.hx, e.y - e.hy) > 200) { e.x += (e.hx - e.x) * dt; e.y += (e.hy - e.y) * dt; }
    e.hp = Math.min(e.mx, e.hp + e.mx * 0.05 * dt);
  }
}
function drawMob(g, e, t) {
  drawMobBody(g, e, t);
  if (e.hp < e.mx) { const w = 16, x = Math.round(e.x - w / 2), y = Math.round(e.y - (e.type === 'mage' ? 36 : e.type === 'bat' ? 24 : 20)); g.fillStyle = '#1a0f2a'; g.fillRect(x - 1, y - 1, w + 2, 4); g.fillStyle = '#ff4a5a'; g.fillRect(x, y, Math.max(1, w * e.hp / e.mx), 2); }
  if (e.st.slow) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25; g.fillStyle = '#4ac8ff'; g.beginPath(); g.ellipse(e.x, e.y - 6, 9, 9, 0, 0, 6.283); g.fill(); g.restore(); }
}

/* ---------- BOS ---------- */
function bossAttack(b, name) {
  const P = Game.player, ph = b.phase, col = ELEMENTS[b.el].c, a = Math.atan2(P.y - b.y, P.x - b.x), q = (t, fn) => b.pending.push({ t, fn });
  FX.ring(b.x, b.y, 4, b.r * 2, 0.4, col, 2);
  switch (name) {
    case 'charge': FX.text(b.x, b.y - 56, '!', '#ff4a4a', 14); b.busy = 1.5;
      q(0.8, () => { const a2 = Math.atan2(P.y - b.y, P.x - b.x); b.dash = { vx: Math.cos(a2) * 250, vy: Math.sin(a2) * 250, t: 0.55 }; SND.sfx('dodge'); }); break;
    case 'slam': b.busy = 1.6; Combat.eRing(b.x, b.y, 105, b.dmg * 1.2, 0.8, col);
      q(0.5, () => { for (let i = 0; i < (ph === 2 ? 7 : 4); i++) { const an = Math.random() * 6.283, d = Math.random() * 70; Combat.hazard(P.x + Math.cos(an) * d, P.y + Math.sin(an) * d * 0.7, 24, b.dmg, 0.9, col); } }); break;
    case 'rocks': b.busy = 1.3; for (let i = -2; i <= 2; i++) if (ph === 2 || Math.abs(i) < 2) q(0.4, () => Combat.eProj({ x: b.x, y: b.y - 14, ang: a + i * 0.22, speed: 125, dmg: b.dmg * 0.7, r: 6, life: 3, kind: 'rock', col })); break;
    case 'fan': b.busy = 1.4; for (let i = -3; i <= 3; i++) if (ph === 2 || Math.abs(i) < 3) q(0.5, () => Combat.eProj({ x: b.x, y: b.y - 20, ang: a + i * 0.25, speed: 130, dmg: b.dmg * 0.8, r: 7, life: 3, kind: 'fireball', col })); break;
    case 'meteors': b.busy = 2; for (let i = 0; i < (ph === 2 ? 8 : 5); i++) q(0.2 + i * 0.22, () => { const an = Math.random() * 6.283, d = i ? Math.random() * 80 : 0; Combat.hazard(P.x + Math.cos(an) * d, P.y + Math.sin(an) * d * 0.7, 28, b.dmg * 1.2, 0.8, col, { meteor: true }); }); break;
    case 'breath': b.busy = 1.6; for (let i = 0; i < (ph === 2 ? 14 : 9); i++) q(0.4 + i * 0.09, () => Combat.eProj({ x: b.x, y: b.y - 22, ang: a + rnd(-0.3, 0.3), speed: 150, dmg: b.dmg * 0.45, r: 5, life: 1.3, kind: 'fireball', col })); break;
    case 'bolts': b.busy = 2.4; for (let i = 0; i < (ph === 2 ? 7 : 5); i++) q(0.3 + i * 0.45, () => Combat.hazard(P.x, P.y, 22, b.dmg * 1.1, 0.6, col, { strike: true })); break;
    case 'tornado': b.busy = 1.4; for (let i = 0; i < (ph === 2 ? 3 : 2); i++) q(0.4 + i * 0.3, () => Combat.eProj({ x: b.x, y: b.y - 10, ang: a + (i - 1) * 0.6, speed: 55, dmg: b.dmg * 0.8, r: 10, life: 5, kind: 'tornado', col: '#5ff0e0', homing: 1.6 })); break;
    case 'nova': b.busy = 2; Combat.eRing(b.x, b.y, 150, b.dmg * 1.3, 0.9, col);
      for (let i = 0; i < 4; i++) { const an = i * 1.57 + Math.random(); Combat.hazard(b.x + Math.cos(an) * 90, b.y + Math.sin(an) * 70, 22, b.dmg, 1.1, col, { strike: true }); }
      if (ph === 2) q(0.6, () => { for (let i = 0; i < 2; i++) { const m = makeEnemy('bat', 8, 'lightning', b.x + rnd(-40, 40), b.y + rnd(-30, 30)); m.temp = true; Game.enemies.push(m); } }); break;
  }
  SND.sfx('cast');
}
const BOSS_ATK = { brontus: ['charge', 'slam', 'rocks'], ignareth: ['fan', 'meteors', 'breath'], zephyron: ['bolts', 'tornado', 'nova'] };
function updateBoss(b, dt) {
  const P = Game.player;
  if (b.dead) return;
  b.flash = Math.max(0, b.flash - dt); b.contactT -= dt;
  const dx = P.x - b.x, dy = P.y - b.y, d = Math.hypot(dx, dy) || 1;
  if (!b.engaged) { if (d < 230 && P.hp > 0) Game.engageBoss(b); else return; }
  if (d > 650 || P.hp <= 0) { Game.disengageBoss(b); return; }
  b.face = dx >= 0 ? 1 : -1;
  if (b.phase === 1 && b.hp < b.mx * 0.5) { b.phase = 2; b.spd *= 1.25; FX.text(b.x, b.y - 60, 'FASE 2!', '#ff4a4a', 14); FX.ring(b.x, b.y, 5, 160, 0.7, ELEMENTS[b.el].c, 3); FX.flashAdd(ELEMENTS[b.el].c, 0.4); FX.shk(6); SND.sfx('boss'); }
  for (let i = b.pending.length - 1; i >= 0; i--) { const q = b.pending[i]; q.t -= dt; if (q.t <= 0) { b.pending.splice(i, 1); q.fn(); } }
  if (b.kbx || b.kby) { moveEnt(b, b.kbx * dt, b.kby * dt); const f = Math.pow(0.02, dt); b.kbx *= f; b.kby *= f; }
  const sm = enemyStatus(b, dt);
  if (b.st.stun) delete b.st.stun; // bos kebal stun
  b.busy -= dt; b.cdT -= dt;
  if (b.dash) { moveEnt(b, b.dash.vx * dt, b.dash.vy * dt, 10); b.dash.t -= dt; FX.motif('chunk', b.x, b.y, [ELEMENTS[b.el].c], 1, 10); if (b.dash.t <= 0) b.dash = null; }
  else if (b.busy <= 0) {
    if (d > 90) moveEnt(b, dx / d * b.spd * Math.max(0.3, sm) * dt, dy / d * b.spd * Math.max(0.3, sm) * dt, 10);
    if (b.cdT <= 0) { const list = BOSS_ATK[b.id]; bossAttack(b, list[(Math.random() * list.length) | 0]); b.cdT = b.phase === 2 ? 1.3 : 2.2; }
  }
  if (d < b.r + 8 && b.contactT <= 0) { b.contactT = 0.9; Combat.damagePlayer(b.dmg * (b.dash ? 1.6 : 0.8), b); }
}
