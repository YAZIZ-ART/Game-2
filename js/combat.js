/* ============================================================
   COMBAT: pemain, statistik, damage, monster, spawn, proyektil
   ============================================================ */
'use strict';
const num = (x, y, txt, color, crit) => { G.nums.push({ x:x + rand(-6, 6), y:y - 20, txt:String(txt), color:color || '#fff', crit:!!crit, t:0, life:crit ? 1.0 : .8 }); if (G.nums.length > 60) G.nums.shift(); };
const later = (sec, fn) => G.timers.push({ t:sec, fn });
const expNeed = (c, lv) => Math.round(c.expBase * (1 + .55 * (lv - 1) + .06 * (lv - 1) * (lv - 1)));

function pwLv(id){ return pwLvOf(G.P, id); }
function pwLvOf(P, id){
  const p = P.powers;
  for (const a of p.passive) if (a.id === id) return a.lv;
  for (const a of p.active) if (a.id === id) return a.lv;
  return (p.curse && p.curse.id === id) ? p.curse.lv : 0;
}

function newPlayer(name){
  const c = CHAR_STATS[name];
  const P = { name, c, x:WORLD / 2, y:WORLD / 2 + 70, dir:2, ang:Math.PI / 2, lv:1, exp:0, hp:1, mp:1, st:null, act:null, dash:null,
    cd:[0, 0, 0], dashCd:0, atkCd:0, powers:{ passive:[], active:[], curse:null }, pcd:[0, 0, 0],
    sinceHit:99, sinceCast:99, hitCount:0, momentum:{ n:0, t:0 }, killStack:{ n:0, t:0 }, dragon:{ n:0, t:0 }, shard:0, abs:{ v:0, t:0 },
    drBuff:{ v:0, t:0 }, guardCd:0, willCd:0, invul:0, walkT:0, moving:false, clone:null, kx:0, ky:0, bonusAtk:0, flash:0, dead:false, curseKillBase:0, bleed:0,
    hpFx:null };
  calcStats(P); P.hp = P.st.maxHp; P.mp = P.st.maxMp; P.lastMaxHp = P.st.maxHp;
  return P;
}

function calcStats(P){
  const c = P.c, L = P.lv - 1, hr = P.st ? clamp(P.hp / P.st.maxHp, 0, 1) : 1;
  const s = { maxHp:c.hp + c.hpG * L, maxMp:c.mp + c.mpG * L, atk:c.atk + c.atkG * L, def:c.def + c.defG * L, spd:c.spd, aspd:c.aspd, crit:c.crit, cdmg:c.cdmg,
    hpRegen:.3 + L * .04, mpRegen:2.5 + L * .12, range:1, skillPow:1, costMul:1, dodge:0, lifesteal:0, resist:0, ranged:1, vsLow:0, healCap:1, healMul:1, dashCd:1,
    miss:0, mpDrain:0, hpOnSkill:0, dr:0 };
  let atkM = 1 + P.bonusAtk, defM = 1, hpM = 1, mpM = 1, spdM = 1, aspdM = 1, hpRegM = 1, mpRegM = 1;
  // pasif karakter
  switch (P.name) {
    case 'Azarel': if (hr < .5) { defM *= 1.3; s.hpRegen += 0; P.lowRegen = true; } else P.lowRegen = false; break;
    case 'Draven': atkM *= 1 + .02 * P.dragon.n; break;
    case 'Guts': s.dr = .15; break;
    case 'Isolde': spdM *= 1.12; break;
    case 'Lunaria': mpRegM *= 1.5; s.skillPow *= 1.15; break;
    case 'Sylas': s.range *= 1.25; break;
  }
  const lv = id => pwLvOf(P, id);
  let l;
  if ((l = lv(2))) mpM *= 1 + .2 + .08 * l;
  if ((l = lv(3)) && hr < .4) atkM *= 1 + .25 + .08 * l;
  if ((l = lv(4)) && hr > .7) defM *= 1 + .3 + .1 * l;
  if ((l = lv(5))) { spdM *= 1 + .08 + .03 * l; s.dashCd *= 1 - (.1 + .04 * l); }
  if ((l = lv(6))) s.crit += .06 + .03 * l;
  if ((l = lv(8))) s.costMul *= 1 - (.12 + .04 * l);
  if ((l = lv(9))) s.vsLow += .15 + .05 * l;
  if ((l = lv(10))) s.dodge += .08 + .03 * l;
  if ((l = lv(11))) s.resist += .3 + .1 * l;
  if ((l = lv(12))) { s.ranged *= 1 + .15 + .06 * l; s.crit += .02 * l; }
  if ((l = lv(14))) atkM *= 1 + (.03 + .01 * l) * P.momentum.n;
  if ((l = lv(15)) && P.sinceCast > 2) mpRegM *= 1 + .4 + .15 * l;
  // kutukan
  const cu = P.powers.curse;
  if (cu) {
    l = cu.lv;
    switch (cu.id) {
      case 31: atkM *= 1 + (.03 + .01 * l) * P.killStack.n; hpRegM *= Math.max(.05, 1 - (.6 + .05 * l)); s.healMul *= .6; break;
      case 32: s.cdmg += .5 + .15 * l; defM *= .55; break;
      case 33: mpM *= 1 + .4 + .1 * l; s.skillPow *= 1 + .2 + .08 * l; hpM *= .65; break;
      case 34: s.lifesteal += .04 + .01 * l; s.mpDrain = 1.5; break;
      case 35: aspdM *= 1 + .35 + .08 * l; spdM *= .75; break;
      case 36: s.crit += .25 + .05 * l; s.miss = .25; break;
      case 37: { const ms = 1 - hr; atkM *= 1 + (.5 + .1 * l) * ms; aspdM *= 1 + (.3 + .05 * l) * ms; spdM *= 1 + (.3 + .05 * l) * ms * .5; s.healCap = .6; break; }
      case 38: defM *= 1 + .4 + .1 * l; s.resist += .5; aspdM *= .75; break;
      case 39: s.skillPow *= 1 + .5 + .1 * l; s.hpOnSkill = Math.max(5, 12 - l) / 100; break;
      case 40: s.skillPow *= 1 + .3 + .1 * l; defM *= .6; mpRegM *= .3; break;
    }
  }
  s.maxHp *= hpM; s.maxMp *= mpM; s.atk *= atkM; s.def *= defM; s.spd *= spdM; s.aspd *= aspdM; s.hpRegen *= hpRegM; s.mpRegen *= mpRegM;
  s.crit = clamp(s.crit, 0, .95); s.dodge = clamp(s.dodge, 0, .6); s.resist = clamp(s.resist, 0, .85); s.costMul = Math.max(.3, s.costMul);
  P.st = s;
  if (P.lastMaxHp != null) { if (s.maxHp > P.lastMaxHp) P.hp += s.maxHp - P.lastMaxHp; P.hp = Math.min(P.hp, s.maxHp); }
  P.lastMaxHp = s.maxHp; P.mp = Math.min(P.mp, s.maxMp);
}

function heal(v){
  const P = G.P, s = P.st; if (P.dead) return;
  v *= s.healMul; const cap = s.maxHp * s.healCap;
  if (P.hp >= cap) return; const a = Math.min(v, cap - P.hp); P.hp += a;
  if (a >= 1) num(P.x, P.y - 24, '+' + Math.round(a), '#7dff9a');
}
function reduceCd(sec){ const P = G.P; for (let i = 0; i < 3; i++) P.cd[i] = Math.max(0, P.cd[i] - sec); }

/* ---------------- menerima damage ---------------- */
function hurtPlayer(raw){
  const P = G.P; if (P.invul > 0 || P.dead) return;
  const s = P.st;
  if (Math.random() < s.dodge) { num(P.x, P.y - 26, 'HINDAR', '#9ef'); return; }
  let d = raw * (100 / (100 + s.def * 4)) * (1 - s.dr);
  if (P.drBuff.t > 0) d *= 1 - P.drBuff.v;
  if (P.abs.t > 0 && P.abs.v > 0) { const a = Math.min(P.abs.v, d); P.abs.v -= a; d -= a; if (d <= 0) { num(P.x, P.y - 26, 'SERAP', '#ffe58a'); Snd.play('block'); FX.spawn('hit-spark', P.x, P.y - 20, { s:.5 }); return; } }
  d = Math.max(1, d); P.hp -= d; P.sinceHit = 0; P.flash = .15; P.momentum.n = Math.max(0, P.momentum.n);
  num(P.x, P.y - 26, Math.round(d), '#ff6a6a'); Snd.play('hurt', .7); G.cam.shake = Math.max(G.cam.shake, 2.5);
  if (P.hp <= 0) {
    if (P.name === 'Guts' && P.willCd <= 0) { P.hp = 1; P.willCd = 60; P.invul = 1.2; num(P.x, P.y - 40, 'TAK TERPATAHKAN!', '#ffd24a', true); FX.spawn('divine-shield', P.x, P.y, { follow:P, oy:0, loopSec:1.4 }); return; }
    P.hp = 0; P.dead = true; playerDie(); return;
  }
  const g = pwLv(13);
  if (g && P.hp / s.maxHp < .25 && P.guardCd <= 0) { P.guardCd = 40; P.abs = { v:s.maxHp * (.2 + .05 * g), t:6 }; FX.spawn('divine-shield', P.x, P.y, { follow:P, loopSec:6 }); num(P.x, P.y - 40, 'ROH PELINDUNG', '#ffe58a'); Snd.play('power'); }
}

/* ---------------- memberi damage ---------------- */
function dealDamage(m, mult, o){
  o = o || {}; const P = G.P, s = P.st; if (m.dead) return 0;
  if (s.miss > 0 && !o.noMiss && Math.random() < s.miss) { num(m.x, m.y - 24, 'MISS', '#ccc'); return 0; }
  let cc = s.crit + (o.critBonus || 0); if (P.name === 'Arcelia' && m.hp > m.maxHp * .8) cc += .25;
  let crit = Math.random() < cc, pierce = false;
  if (P.name === 'Isolde' && o.kind === 'basic') { P.hitCount++; if (P.hitCount % 5 === 0) { crit = true; pierce = true; } }
  let d = s.atk * mult * rand(.92, 1.08);
  if (o.kind !== 'basic') d *= s.skillPow;
  if (o.ranged) d *= s.ranged;
  if (P.name === 'Sylas' && m.hp < m.maxHp * .5) d *= 1.15;
  if (m.hp < m.maxHp * .35) d *= 1 + s.vsLow;
  if (crit) d *= s.cdmg;
  if (!pierce) d *= 100 / (100 + m.armor * 3);
  d = Math.max(1, d); m.hp -= d; m.flash = .1;
  if (m.def.tier !== 'Boss' && m.state !== 'attack' && o.kind !== 'tick' && Math.random() < .55) { m.state = 'hurt'; m.st = 0; }
  const a = angTo(P.x, P.y, m.x, m.y), kb = (o.kb == null ? (m.def.tier === 'Boss' ? 12 : 50) : o.kb) / (m.def.scale > 1.3 ? 2 : 1); m.kx += Math.cos(a) * kb; m.ky += Math.sin(a) * kb;
  num(m.x, m.y - 22 * m.def.scale, Math.round(d), crit ? '#ffe040' : '#ffffff', crit);
  FX.spawn(crit ? 'crit-hit' : 'hit-spark', m.x, m.y - 14 * m.def.scale, { s:crit ? .5 : .45, rot:a });
  if (o.kind !== 'tick') Snd.play(crit ? 'crit' : pick(['hit1', 'hit2', 'hit3']), crit ? .9 : .6);
  if (pwLv(14)) { P.momentum.n = Math.min(4 + pwLv(14), P.momentum.n + 1); P.momentum.t = 4; }
  if (s.lifesteal) heal(d * s.lifesteal);
  if (P.name === 'Arcelia' && crit) reduceCd(.4);
  if (P.name === 'Xaviera' && o.kind === 'basic' && P.shard < 5) P.shard++;
  if (m.hp <= 0) killMonster(m);
  return d;
}
function areaDamage(x, y, r, mult, o){
  let n = 0; for (const m of G.mons.slice()) if (!m.dead && dist(x, y, m.x, m.y) <= r + m.r) { dealDamage(m, mult, o); n++; } return n;
}
function nearestEnemy(x, y, maxR, skip){
  let best = null, bd = maxR || 1e9; for (const m of G.mons) { if (m.dead || (skip && skip.includes(m))) continue; const d = dist(x, y, m.x, m.y); if (d < bd) { bd = d; best = m; } } return best;
}
function applyStun(m, sec, frozen){
  const rs = (m.def.tier === 'Boss') ? .35 : 1; m.stun = Math.max(m.stun, sec * rs); if (frozen) m.frozen = Math.max(m.frozen, sec * rs);
}

function killMonster(m){
  if (m.dead) return; m.dead = true; G.kills++; const P = G.P;
  Snd.play(pick(['die1', 'die2']), .45);
  FX.spawn('poof', m.x, m.y - 8, { s:.55 * m.def.scale });
  G.orbs.push({ x:m.x, y:m.y, v:m.xp, vx:rand(-30, 30), vy:rand(-30, 30), t:0, ph:Math.random() });
  if (Math.random() < .06) G.orbs.push({ x:m.x + 6, y:m.y + 4, heal:true, v:0, vx:0, vy:0, t:0, ph:0 });
  if (m.def.tier !== 'Normal') { G.eliteKills++; P.curseKillBase++; }
  let l;
  if ((l = pwLv(7))) heal(P.st.maxHp * (.02 + .008 * l));
  if (P.name === 'Draven') { P.dragon.n = Math.min(10, P.dragon.n + 1); P.dragon.t = 8; heal(P.st.maxHp * .03); }
  if (P.powers.curse && P.powers.curse.id === 31) { P.killStack.n = Math.min(12, P.killStack.n + 1); P.killStack.t = 6; }
  if (m.def.tier === 'Boss') { G.boss = null; G.banner && G.banner('BOS DIKALAHKAN!'); G.orbs.push({ x:m.x, y:m.y, v:m.xp * 1.5, vx:0, vy:-40, t:0, ph:.3 }); Snd.play('boss'); }
}
function gainExp(v){
  const P = G.P; P.exp += v * P.c.expMul;
  while (P.exp >= expNeed(P.c, P.lv)) {
    P.exp -= expNeed(P.c, P.lv); P.lv++; G.levelUps++;
    calcStats(P); P.hp = Math.min(P.st.maxHp, P.hp + P.st.maxHp * .25); P.mp = P.st.maxMp;
    FX.spawn('level-up', P.x, P.y + 4, { s:.7, follow:P }); Snd.play('levelup', .9); num(P.x, P.y - 44, 'LEVEL UP!', '#ffe36a', true);
  }
}
function playerDie(){ Snd.play('dead', .9); FX.spawn('poof', G.P.x, G.P.y - 10, { s:1 }); G.state = 'dead'; setTimeout(() => window.UI && UI.showDead(), 900); }

/* ---------------- monster ---------------- */
function spawnMonster(key, lv, x, y, boss){
  const d = MONSTERS[key], sc = lv - 1, bm = boss ? 1.6 : 1;
  Assets.loadMonster(d.sheet);
  const m = { def:d, key, lv, x, y, maxHp:d.hp * (1 + .28 * sc) * bm, atk:d.atk * (1 + .12 * sc), armor:d.def * (1 + .1 * sc), spd:Math.min(d.spd * (1 + .012 * sc), d.spd * 1.6), r:d.r * (d.scale > 1.3 ? .8 : 1), xp:d.xp * (1 + .1 * sc) * (boss ? 2 : 1),
    dir:2, state:'walk', st:0, wt:rand(0, 1), atkCd:rand(.3, 1.2), stun:0, frozen:0, slow:0, flash:0, kx:0, ky:0, dead:false, hitDone:false };
  m.hp = m.maxHp; G.mons.push(m); return m;
}
function pickMonsterType(){
  const lv = G.P.lv, opts = [];
  for (const k in MONSTERS) { const d = MONSTERS[k]; if (d.tier === 'Boss' || lv < d.minLv) continue; let w = d.w; if (d.tier === 'Normal') w = Math.max(d.fade, d.w - (lv - d.minLv) * 3); opts.push([k, w]); }
  let tot = opts.reduce((a, b) => a + b[1], 0), r = Math.random() * tot; for (const o of opts) { r -= o[1]; if (r <= 0) return o[0]; } return 'Undead';
}
function spawnRing(key, lv){
  const P = G.P;
  for (let i = 0; i < 12; i++) {
    const a = rand(0, 6.283), d = rand(285, 360), x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
    if (x < 70 || y < 70 || x > WORLD - 70 || y > WORLD - 70 || blockedAt(x, y, 14)) continue;
    return spawnMonster(key, lv, x, y, key === 'Minotour');
  }
  return null;
}
function updateSpawner(dt){
  const P = G.P; G.spawnT -= dt; G.bossT += dt;
  const alive = G.mons.length, target = Math.min(9 + P.lv * 2.2, 46);
  if (G.spawnT <= 0 && alive < target) {
    G.spawnT = clamp(1.5 - P.lv * .05, .4, 1.5);
    const n = Math.min(3, Math.ceil((target - alive) / 6));
    for (let i = 0; i < n; i++) { const k = pickMonsterType(), off = k === 'Cyclops' ? -1 : 0; spawnRing(k, Math.max(1, P.lv + randi(-1, 1) + off)); }
  }
  if (P.lv >= 8 && !G.boss && G.bossT > 90) {
    G.bossT = 0; const b = spawnRing('Minotour', P.lv + 2);
    if (b) { G.boss = b; G.banner && G.banner('BOS MUNCUL: MINOTAUR Lv' + b.lv); Snd.play('boss'); }
  }
}
function updateMonsters(dt){
  const P = G.P;
  for (const m of G.mons) {
    m.flash -= dt; m.atkCd -= dt; m.slow = Math.max(0, m.slow - dt);
    if (m.stun > 0) { m.stun -= dt; if (m.frozen > 0) m.frozen -= dt; }
    m.x += m.kx * dt; m.y += m.ky * dt; const kd = Math.pow(.001, dt); m.kx *= kd; m.ky *= kd;
    const a = angTo(m.x, m.y, P.x, P.y), dd = dist(m.x, m.y, P.x, P.y); m.dir = dirFromAngle(a);
    if (m.state === 'hurt') { m.st += dt; if (m.st > .18) { m.state = 'walk'; m.st = 0; } }
    else if (m.state === 'attack') {
      m.st += dt;
      if (!m.hitDone && m.st >= .27) { m.hitDone = true; if (m.stun <= 0 && dd < m.def.range + 16 + 7) hurtPlayer(m.atk * rand(.9, 1.1)); }
      if (m.st >= .54) { m.state = 'walk'; m.st = 0; m.atkCd = 1.05 - Math.min(.35, m.lv * .01); }
    } else if (m.stun <= 0 && !P.dead) {
      if (dd < m.def.range + 8 && m.atkCd <= 0) { m.state = 'attack'; m.st = 0; m.hitDone = false; }
      else if (dd > m.def.range - 2) { const v = m.spd * (m.slow > 0 ? .5 : 1); m.x += Math.cos(a) * v * dt; m.y += Math.sin(a) * v * dt; m.wt += dt * (v / 38) * 1.1; }
    }
  }
  // pemisahan antar monster + rintangan
  const L = G.mons;
  for (let i = 0; i < L.length; i++) {
    const a = L[i];
    for (let j = i + 1; j < L.length; j++) {
      const b = L[j], dx = b.x - a.x, dy = b.y - a.y; if (Math.abs(dx) > 30 || Math.abs(dy) > 30) continue;
      const d = Math.hypot(dx, dy), mn = (a.r + b.r) * .85; if (d < mn && d > .01) { const p = (mn - d) / 2; a.x -= dx / d * p; a.y -= dy / d * p; b.x += dx / d * p; b.y += dy / d * p; }
    }
    const c = collide(a.x, a.y, a.r * .8); a.x = c.x; a.y = c.y;
  }
  G.mons = G.mons.filter(m => !m.dead && dist(m.x, m.y, P.x, P.y) < 900);
}

/* ---------------- proyektil ---------------- */
function addProj(o){ o = Object.assign({ t:0, life:1, speed:280, hit:[], pierce:false, kind:'crystal', mult:1, ranged:true, ang:0 }, o); G.projs.push(o); return o; }
function updateProjs(dt){
  for (const p of G.projs) {
    p.t += dt; p.x += Math.cos(p.ang) * p.speed * dt; p.y += Math.sin(p.ang) * p.speed * dt;
    for (const m of G.mons) {
      if (m.dead || p.hit.includes(m)) continue;
      if (dist(p.x, p.y, m.x, m.y - 6) < m.r + (p.rad || 9)) { p.hit.push(m); dealDamage(m, p.mult, { kind:p.dkind || 'skill', ranged:p.ranged, critBonus:p.critBonus }); if (p.stun) applyStun(m, p.stun); if (!p.pierce) { p.t = 1e9; break; } }
    }
    if (blockedAt(p.x, p.y, 2)) p.t = 1e9;
  }
  G.projs = G.projs.filter(p => p.t < p.life);
}
