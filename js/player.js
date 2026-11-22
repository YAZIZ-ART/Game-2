/* ============================================================
   PLAYER: gerak, serangan dasar, skill karakter (animasi dari sprite sheet), dash
   ============================================================ */
'use strict';

function aimAngle(P, range){
  const t = nearestEnemy(P.x, P.y, range);
  return t ? angTo(P.x, P.y, t.x, t.y) : P.ang;
}
function payCost(mp){
  const P = G.P, s = P.st;
  if (s.hpOnSkill) { const c = s.maxHp * s.hpOnSkill * Math.max(.5, mp / 15); if (P.hp <= c + 1) return false; P.hp -= c; P.flash = .1; num(P.x, P.y - 28, '-' + Math.round(c), '#ff5577'); P.sinceCast = 0; return true; }
  const c = mp * s.costMul; if (P.mp < c) return false; P.mp -= c; P.sinceCast = 0; return true;
}
function segDist(px, py, ax, ay, bx, by){
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy; let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = clamp(t, 0, 1);
  return dist(px, py, ax + dx * t, ay + dy * t);
}
/* area bentuk garis / kerucut / lingkaran dari titik (x,y) menghadap ang */
function shapeHit(shape, x, y, ang, len, wid, arc, fn){
  for (const m of G.mons.slice()) {
    if (m.dead) continue; const d = dist(x, y, m.x, m.y);
    if (shape === 'line') { const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len; if (segDist(m.x, m.y, x, y, ex, ey) <= wid / 2 + m.r) fn(m); }
    else if (shape === 'cone') { if (d <= len + m.r && Math.abs(angDiff(angTo(x, y, m.x, m.y), ang)) <= (arc * Math.PI / 180) / 2 + .15) fn(m); }
    else if (d <= len + m.r) fn(m);
  }
}

function startBasic(){
  const P = G.P, b = P.c.basic; P.ang = aimAngle(P, b.range * P.st.range + 60); P.dir = dirFromAngle(P.ang);
  const dur = .5 / P.st.aspd; P.act = { kind:'basic', t:0, dur, ang:P.ang, dir:P.dir, done:false, n:b.frames[1] - b.frames[0] + 1 };
  P.atkCd = dur * .9; Snd.play(b.sfx, .55);
}
function basicHit(P, x, y, ang, mult, clone){
  const b = P.c.basic, rng = b.range * P.st.range;
  if (b.type === 'bolt') {
    addProj({ x:x + Math.cos(ang) * 14, y, ang, speed:300, life:rng / 300 + .25, kind:'crystal', mult:mult, ranged:true, dkind:'basic', rad:8 }); return;
  }
  if (b.fx) FX.spawn(b.fx, x, y - 14, { rot:ang, s:b.type === 'line' ? .75 : .7, alpha:clone ? .5 : 1 });
  shapeHit(b.type === 'line' ? 'line' : 'cone', x, y, ang, rng, 34, b.arc, m => dealDamage(m, mult, { kind:'basic', ranged:P.name === 'Sylas' }));
}
function startSkill(i){
  const P = G.P; if (P.dash || P.dead) return;
  if (P.act && P.act.kind === 'skill') return;
  if (P.cd[i] > 0) { return; }
  const def = CHAR_SKILLS[P.name][i], dat = MANIFEST.chars[P.name].skills[i];
  if (!payCost(def.mp)) { Snd.play('error', .5); num(P.x, P.y - 34, P.st.hpOnSkill ? 'HP KURANG' : 'MP KURANG', '#7aa8ff'); return; }
  P.cd[i] = dat.cooldown_s; P.ang = aimAngle(P, 240); P.dir = dirFromAngle(P.ang);
  let bonus = 1; if (P.name === 'Xaviera' && P.shard >= 5) { bonus = 1.5; P.shard = 0; num(P.x, P.y - 44, 'KONVERGENSI!', '#7ef0ff', true); }
  P.act = { kind:'skill', i, def, dat, t:0, dur:dat.duration_s, ang:P.ang, dir:P.dir, pu:0, fx:def.fx.map(() => false), bonus, px:P.x, py:P.y, started:false, moveD:0 };
  if (def.shape === 'shield') {
    if (def.dr) P.drBuff = { v:def.dr, t:def.shieldDur }; if (def.absorb) P.abs = { v:P.st.maxHp * def.absorb, t:def.shieldDur };
  }
  if (P.name === 'Lunaria') heal(P.st.maxHp * .05);
  Snd.play(def.sfx, .8);
}
function skillPulse(P, A){
  const def = A.def, mult = def.dmg / def.pulses.length * A.bonus, ang = A.ang, o = { kind:'skill', critBonus:def.critBonus };
  const hit = m => { dealDamage(m, mult, o); if (def.stun) applyStun(m, def.stun * (1 - P.st.resist * 0)); };
  if (def.shape === 'line') shapeHit('line', P.x, P.y, ang, def.len, def.wid, 0, hit);
  else if (def.shape === 'cone') shapeHit('cone', P.x, P.y, ang, def.len, 0, def.arc, hit);
  else if (def.shape === 'circle' || def.shape === 'shield') {
    shapeHit('circle', P.x, P.y, 0, def.r, 0, 0, m => {
      hit(m);
      if (def.pull) { const a = angTo(m.x, m.y, P.x, P.y); m.kx += Math.cos(a) * 160; m.ky += Math.sin(a) * 160; }
      else if (def.shape === 'shield') { const a = angTo(P.x, P.y, m.x, m.y); m.kx += Math.cos(a) * 200; m.ky += Math.sin(a) * 200; }
    });
  } else if (def.shape === 'comet') {
    addProj({ x:P.x, y:P.y, ang, speed:def.speed, life:def.len / def.speed, kind:'crystal', big:true, pierce:true, mult:mult * 1.0, ranged:true, rad:16, dkind:'skill' });
  } else if (def.shape === 'bolt') {
    const n = def.count; for (let k = 0; k < n; k++) addProj({ x:P.x, y:P.y, ang:ang + (k - (n - 1) / 2) * def.spread, speed:def.speed, life:def.range / def.speed, kind:'crystal', mult:mult / n * (n > 1 ? 1.4 : 1), ranged:true, rad:10, pierce:false });
  }
  if (A.i === 2) G.cam.shake = Math.max(G.cam.shake, 2);
}
function updateSkill(P, A, dt){
  A.t += dt; const f = A.t / A.dur;
  // dash dalam skill
  if (A.def.dash && f >= A.def.dash.a && f <= A.def.dash.b) {
    const sp = A.def.dash.d / ((A.def.dash.b - A.def.dash.a) * A.dur); movePlayer(Math.cos(A.ang) * sp * dt, Math.sin(A.ang) * sp * dt); P.invul = Math.max(P.invul, .1);
  }
  while (A.pu < A.def.pulses.length && f >= A.def.pulses[A.pu]) { skillPulse(P, A); A.pu++; }
  A.def.fx.forEach((fx, k) => {
    if (A.fx[k] || f < fx.at) return; A.fx[k] = true;
    let x = P.x, y = P.y, ang = fx.rot ? A.ang : 0;
    if (fx.where === 'front') { x += Math.cos(A.ang) * 34; y += Math.sin(A.ang) * 34; }
    else if (fx.where === 'rand') { const a = rand(0, 6.283), r = rand(10, (A.def.r || 100) * .8); x += Math.cos(a) * r; y += Math.sin(a) * r; }
    FX.spawn(fx.id, x, y - (fx.where === 'front' ? 10 : 0), { s:fx.s, rot:ang, loopSec:fx.loopSec, follow:fx.where === 'self' && fx.loopSec ? P : null });
    if (fx.where === 'rand' && A.i === 2) Snd.play('exp', .3, rand(.9, 1.2));
  });
  if (A.t >= A.dur) P.act = null;
}

function movePlayer(dx, dy){
  const P = G.P; const c = collide(P.x + dx, P.y + dy, 7); P.x = c.x; P.y = c.y;
}
function startDash(){
  const P = G.P; if (P.dash || P.dashCd > 0 || P.dead || (P.act && P.act.kind === 'skill')) return;
  const mv = Input.moveVec(); let a = (mv.x || mv.y) ? Math.atan2(mv.y, mv.x) : P.ang;
  P.dash = { t:0, dur:.18, ang:a, d:112 }; P.dashCd = 2.8 * P.st.dashCd; P.invul = Math.max(P.invul, .24); P.act = null;
  FX.spawn('poof', P.x, P.y - 4, { s:.4 }); Snd.play('dash', .5);
}

function updatePlayer(dt){
  const P = G.P, s = P.st;
  // timer
  for (let i = 0; i < 3; i++) P.cd[i] = Math.max(0, P.cd[i] - dt);
  for (let i = 0; i < 3; i++) P.pcd[i] = Math.max(0, P.pcd[i] - dt);
  P.dashCd = Math.max(0, P.dashCd - dt); P.atkCd -= dt; P.sinceHit += dt; P.sinceCast += dt; P.invul -= dt; P.flash -= dt; P.guardCd -= dt; P.willCd -= dt;
  if (P.momentum.t > 0 && (P.momentum.t -= dt) <= 0) P.momentum.n = 0;
  if (P.killStack.t > 0 && (P.killStack.t -= dt) <= 0) P.killStack.n = 0;
  if (P.dragon.t > 0 && (P.dragon.t -= dt) <= 0) P.dragon.n = 0;
  if (P.abs.t > 0 && (P.abs.t -= dt) <= 0) P.abs.v = 0;
  if (P.drBuff.t > 0) P.drBuff.t -= dt;
  // regen
  let hr = s.hpRegen; const ev = pwLv(1); if (ev && P.sinceHit > 3) hr += s.maxHp * (.012 + .005 * ev) * (P.powers.curse && P.powers.curse.id === 31 ? .3 : 1);
  if (P.name === 'Azarel' && P.hp < s.maxHp * .5) hr += s.maxHp * .015;
  if (P.hp > 0 && P.hp < s.maxHp * s.healCap) P.hp = Math.min(s.maxHp * s.healCap, P.hp + hr * s.healMul * dt);
  P.mp = clamp(P.mp + (s.mpRegen - s.mpDrain) * dt, 0, s.maxMp);
  if (P.hp > s.maxHp * s.healCap && s.healCap < 1) P.hp = s.maxHp * s.healCap;
  // gerak
  const mv = Input.moveVec(); let spd = s.spd, factor = 1;
  if (P.act) factor = P.act.kind === 'skill' ? .35 : .65;
  P.moving = false;
  if (P.dash) {
    P.dash.t += dt; const sp = (P.dash.d || 112) / P.dash.dur; movePlayer(Math.cos(P.dash.ang) * sp * dt, Math.sin(P.dash.ang) * sp * dt); if (P.dash.t >= P.dash.dur) P.dash = null;
  } else if (mv.x || mv.y) {
    const mag = Math.min(1, Math.hypot(mv.x, mv.y)); movePlayer(mv.x * spd * factor * dt, mv.y * spd * factor * dt); P.moving = true; P.walkT += dt * (.6 + mag * .6);
    if (!P.act) { P.ang = Math.atan2(mv.y, mv.x); P.dir = dirFromAngle(P.ang); }
  }
  P.x += P.kx * dt; P.y += P.ky * dt; P.kx *= Math.pow(.01, dt); P.ky *= Math.pow(.01, dt);
  // aksi
  if (P.act && P.act.kind === 'basic') {
    const A = P.act; A.t += dt; const hf = (P.c.basic.hit + .5) / A.n;
    if (!A.done && A.t / A.dur >= hf) { A.done = true; basicHit(P, P.x, P.y, A.ang, 1, false); if (P.clone) { const c = P.clone; basicHit(P, c.x, c.y, A.ang, c.dmg, true); } }
    if (A.t >= A.dur) P.act = null;
  } else if (P.act && P.act.kind === 'skill') updateSkill(P, P.act, dt);
  if (!P.dash && !P.dead) {
    if (Input.take('dash')) startDash();
    for (let i = 0; i < 3; i++) if (Input.take('s' + (i + 1))) startSkill(i);
    for (let i = 0; i < 3; i++) if (Input.take('p' + i)) usePower(i);
    const wantAtk = Input.held.atk || (G.auto && G.mons.some(m => !m.dead && dist(P.x, P.y, m.x, m.y) < P.c.basic.range * s.range + 14));
    if (wantAtk && !P.act && P.atkCd <= 0) startBasic();
    if (Input.take('atk')) { /* tekan sekali: sudah ditangani held */ }
  }
  // klon
  if (P.clone) { const c = P.clone; c.t -= dt; c.x = lerp(c.x, P.x + 24 * (c.side || 1), Math.min(1, dt * 6)); c.y = lerp(c.y, P.y - 6, Math.min(1, dt * 6)); if (c.t <= 0) { FX.spawn('poof', c.x, c.y - 6, { s:.4 }); P.clone = null; } }
  // kamera
  const v = G.view, cam = G.cam;
  cam.x = lerp(cam.x, P.x - v.w / 2, Math.min(1, dt * 7)); cam.y = lerp(cam.y, P.y - 20 - v.h / 2, Math.min(1, dt * 7));
  cam.x = clamp(cam.x, 0, WORLD - v.w); cam.y = clamp(cam.y, 0, WORLD - v.h); cam.shake = Math.max(0, cam.shake - dt * 12);
  // orb
  for (const o of G.orbs) {
    o.t += dt; const d = dist(o.x, o.y, P.x, P.y), mag = 64 + (P.lv * 1.5);
    if (o.t > .35 && d < mag) { const a = angTo(o.x, o.y, P.x, P.y), sp = 120 + (mag - d) * 4; o.x += Math.cos(a) * sp * dt; o.y += Math.sin(a) * sp * dt; }
    else { o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= Math.pow(.02, dt); o.vy *= Math.pow(.02, dt); }
    if (d < 11 && o.t > .2) { o.dead = true; if (o.heal) { heal(P.st.maxHp * .1); Snd.play('pick', .5); } else { gainExp(o.v); Snd.play('coin', .35, 1 + Math.min(.5, o.v / 100)); } }
  }
  G.orbs = G.orbs.filter(o => !o.dead);
}

function drawPlayer(ctx, P, alpha, clone){
  const x = clone ? clone.x : P.x, y = clone ? clone.y : P.y, name = P.name, A = P.act;
  SHADOW(ctx, x, y - 1, 12, 4.5, clone ? .12 : .3);
  if (!clone) drawAura(ctx, name, G.t, x, y);
  if (P.invul > 0 && !clone && Math.floor(G.t * 20) % 2) alpha = .55;
  const ch = MANIFEST.chars[name];
  if (A && A.kind === 'skill') {
    const fr = Math.min(A.dat.frames - 1, Math.floor(A.t / (A.dat.frame_ms / 1000)));
    drawCharFrame(ctx, name, A.i + 1, fr, A.dir, x, y, alpha);
    if (!clone) drawElem(ctx, name, A.i + 1, A.t / A.dur, A.dir, x, y, 1);
  } else if (A && A.kind === 'basic') {
    const fr = Math.min(P.c.basic.frames[0] + Math.floor(A.t / A.dur * A.n), P.c.basic.frames[1]);
    drawCharFrame(ctx, name, 1, fr, A.dir, x, y, alpha);
  } else if (P.moving && ch.run && !P.dash) {
    drawCharFrame(ctx, name, ch.run, Math.floor(P.walkT * 10) % 8, P.dir, x, y, alpha);
  } else {
    const bob = P.moving ? -Math.abs(Math.sin(P.walkT * 10)) * 1.6 : Math.sin(G.t * 2.4) * .5;
    drawCharFrame(ctx, name, 1, 0, P.dir, x, y + bob, alpha);
  }
  if (!clone && P.flash > 0) { ctx.globalAlpha = .35; ctx.fillStyle = '#f33'; ctx.beginPath(); ctx.ellipse(x, y - 22, 12, 24, 0, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; }
  if (!clone && P.abs.t > 0 && P.abs.v > 0) { ctx.globalAlpha = .25; ctx.strokeStyle = '#ffe58a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y - 22, 20, 30, 0, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1; }
}
