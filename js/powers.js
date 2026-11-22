/* ============================================================
   POWERS: sistem 40 kekuatan (Passive 15 / Active 15 / Curse 10),
   implementasi 15 skill active, rolling level-up, loop update
   ============================================================ */
'use strict';
const RITUAL_KILLS = 12;
const powerCols = { passive:'#5ab0ff', active:'#ffa24a', curse:'#c04aff' };

/* ---------------- pilih kekuatan saat naik level ---------------- */
function legalCards(){
  const P = G.P, out = { passive:[], active:[], curse:[] };
  for (const p of POWERS) {
    let owned = null;
    if (p.type === 'curse') owned = (P.powers.curse && P.powers.curse.id === p.id) ? P.powers.curse : null;
    else owned = P.powers[p.type].find(a => a.id === p.id) || null;
    if (owned) { if (owned.lv < POWER_MAXLV) out[p.type].push({ p, lv:owned.lv + 1, up:true }); }
    else if (p.type === 'curse') { if (!P.powers.curse) out.curse.push({ p, lv:1 }); }
    else if (P.powers[p.type].length < LIMITS[p.type]) out[p.type].push({ p, lv:1 });
  }
  return out;
}
function rollChoices(){
  const P = G.P, L = legalCards(), cards = [], used = new Set(), W = { passive:45, active:35, curse:20 };
  for (let n = 0; n < 3; n++) {
    const cats = Object.keys(L).filter(k => L[k].some(c => !used.has(c.p.id))); if (!cats.length) break;
    let tot = cats.reduce((a, k) => a + W[k], 0), r = Math.random() * tot, cat = cats[0];
    for (const k of cats) { r -= W[k]; if (r <= 0) { cat = k; break; } }
    const c = pick(L[cat].filter(c => !used.has(c.p.id))); used.add(c.p.id); cards.push(c);
  }
  if (P.powers.curse && P.curseKillBase >= RITUAL_KILLS && cards.length) cards[cards.length - 1] = { ritual:true };
  while (cards.length < 3) cards.push({ fallback:true });
  return cards;
}
function takeCard(c){
  const P = G.P;
  if (c.ritual) { const old = P.powers.curse; P.powers.curse = null; P.curseKillBase = 0; num(P.x, P.y - 40, 'KUTUKAN DILEPAS', '#d9a6ff', true); FX.spawn('mana-burst', P.x, P.y, { s:.8 }); Snd.play('power'); }
  else if (c.fallback) { P.bonusAtk += .06; heal(P.st.maxHp * .3); Snd.play('power'); }
  else {
    const p = c.p;
    if (p.type === 'curse') { P.powers.curse = { id:p.id, lv:c.lv }; if (c.lv === 1) P.curseKillBase = 0; Snd.play('curse', .9); FX.spawn('mana-burst', P.x, P.y, { s:.7 }); }
    else { const a = P.powers[p.type].find(a => a.id === p.id); if (a) a.lv = c.lv; else P.powers[p.type].push({ id:p.id, lv:1 }); Snd.play('pick', .8); }
    if (p.type === 'active') (POWER_FX[p.id] || []).forEach(f => Assets.loadFx(f));
  }
  calcStats(P);
}

/* ---------------- 15 skill ACTIVE ---------------- */
function addZone(z){ z.t = 0; G.zones.push(z); return z; }
function nearestN(x, y, r, n){ return G.mons.filter(m => !m.dead && dist(x, y, m.x, m.y) <= r).sort((a, b) => dist(x, y, a.x, a.y) - dist(x, y, b.x, b.y)).slice(0, n); }
function targetPoint(P, maxR, ahead){
  const t = nearestEnemy(P.x, P.y, maxR); if (t) return { x:t.x, y:t.y };
  return { x:P.x + Math.cos(P.ang) * ahead, y:P.y + Math.sin(P.ang) * ahead };
}
const PK = { kind:'power' };
const ACTIVE = {
  16(l, P){ const x = P.x, y = P.y, r = 90 + 8 * l; FX.spawn('fire-ring', x, y, { s:r / 100 }); Snd.play('exp', .8); later(.4, () => areaDamage(x, y, r, 2 + .4 * l, PK)); },
  17(l, P){ const c = targetPoint(P, 260, 0); if (!nearestEnemy(P.x, P.y, 260)) { c.x = P.x; c.y = P.y; } const r = 105 + 8 * l; FX.spawn('frost-nova', c.x, c.y, { s:r / 120 }); Snd.play('power', .7);
    later(.45, () => { for (const m of G.mons) if (!m.dead && dist(c.x, c.y, m.x, m.y) <= r + m.r) { applyStun(m, 1.6 + .3 * l, true); dealDamage(m, 1.2 + .3 * l, PK); } Snd.play('block', .7); }); },
  18(l, P){ const x0 = P.x, y0 = P.y, d = 150 + 10 * l, t = nearestEnemy(P.x, P.y, 220), a = t ? angTo(P.x, P.y, t.x, t.y) : ((Input.moveVec().x || Input.moveVec().y) ? Math.atan2(Input.moveVec().y, Input.moveVec().x) : P.ang);
    P.ang = a; P.dir = dirFromAngle(a); P.dash = { t:0, dur:.2, ang:a, d }; P.invul = .3; P.act = null; FX.spawn('chain-lightning', x0, y0 - 14, { rot:a, s:d / 190 }); Snd.play('laser', .9);
    later(.21, () => { let n = 0; for (const m of G.mons.slice()) if (!m.dead && segDist(m.x, m.y, x0, y0, P.x, P.y) <= 30 + m.r) { dealDamage(m, 2 + .4 * l, PK); applyStun(m, .6); if (n++ < 3) FX.spawn('lightning-strike', m.x, m.y, { s:.4 }); } }); },
  19(l, P){ const x = P.x + Math.cos(P.ang) * 85, y = P.y + Math.sin(P.ang) * 85; FX.spawn('quake', x, y, { s:.9 }); FX.spawn('earth-spike', x, y, { s:.75 }); Snd.play('expbig', .7);
    later(.5, () => { areaDamage(x, y, 85, 2.4 + .5 * l, PK); for (const m of G.mons) if (!m.dead && dist(x, y, m.x, m.y) <= 85 + m.r) applyStun(m, 1); G.cam.shake = 3; }); },
  20(l, P){ FX.spawn('scythe-reap', P.x, P.y - 12, { rot:P.ang, s:.8 }); Snd.play('sword3', .8); addProj({ x:P.x, y:P.y, ang:P.ang, speed:280, life:.95, kind:'wind', mult:1.8 + .4 * l, pierce:true, rad:22, dkind:'power', ranged:true }); },
  21(l, P){ const ts = nearestN(P.x, P.y, 240, 2 + l); ts.forEach(m => FX.spawn('grasping-hands', m.x, m.y, { s:.6 })); Snd.play('curse', .7);
    later(.5, () => ts.forEach(m => { if (m.dead) return; applyStun(m, 1.6 + .2 * l); dealDamage(m, 1.2, PK); const a = angTo(m.x, m.y, P.x, P.y); m.kx += Math.cos(a) * 170; m.ky += Math.sin(a) * 170; })); },
  22(l, P){ const c = targetPoint(P, 320, 120); FX.spawn('smite', c.x, c.y, { s:.8 }); Snd.play('power', .8); later(.6, () => { areaDamage(c.x, c.y, 62, 3.4 + .7 * l, PK); G.cam.shake = 3; Snd.play('exp', .7); }); },
  23(l, P){ const x = P.x, y = P.y, r = 120 + 8 * l; P.hp = Math.max(1, P.hp - P.st.maxHp * .1); P.flash = .15; num(x, y - 30, 'KORBAN HP', '#ff5577'); FX.spawn('small-explosion', x, y, { s:r / 105 }); Snd.play('expbig', .8);
    later(.12, () => { areaDamage(x, y, r, 4 + .8 * l, PK); G.cam.shake = 4; }); },
  24(l, P){ P.clone = { x:P.x, y:P.y, t:6 + l, dmg:.45 + .08 * l, side:Math.random() < .5 ? 1 : -1 }; FX.spawn('poof', P.x, P.y - 6, { s:.5 }); Snd.play('portal', .6); },
  25(l, P){ const c = targetPoint(P, 300, 110), r = 130 + 10 * l; FX.spawn('implosion', c.x, c.y, { s:r / 95 }); Snd.play('portal', .8);
    addZone({ dur:1.1, update(dt) { for (const m of G.mons) { const d = dist(c.x, c.y, m.x, m.y); if (!m.dead && d < r && d > 4) { const a = angTo(m.x, m.y, c.x, c.y); m.x += Math.cos(a) * 140 * dt; m.y += Math.sin(a) * 140 * dt; } } } });
    later(1.15, () => { areaDamage(c.x, c.y, r * .7, 2.6 + .5 * l, PK); G.cam.shake = 4; Snd.play('expbig', .8); }); },
  26(l, P){ const x = P.x, y = P.y, r = 150 + 10 * l, hit = []; FX.spawn('plasma-explosion', x, y, { s:r / 85 }); Snd.play('power', .9); let healed = 0;
    addZone({ dur:.55, update() { const rad = r * Math.min(1, this.t / .5); for (const m of G.mons) if (!m.dead && !hit.includes(m) && dist(x, y, m.x, m.y) <= rad + m.r) { hit.push(m); dealDamage(m, 2.2 + .4 * l, PK); if (healed < 5) { healed++; heal(P.st.maxHp * .01); } } } }); },
  27(l, P){ const x = P.x + Math.cos(P.ang) * 110, y = P.y + Math.sin(P.ang) * 110, dur = 4 + l; FX.spawn('black-hole', x, y, { s:.75, loopSec:dur, layer:'ground' }); Snd.play('portal', .9); let tk = 0;
    addZone({ dur, update(dt) { for (const m of G.mons) { const d = dist(x, y, m.x, m.y); if (!m.dead && d < 110 && d > 3) { const a = angTo(m.x, m.y, x, y); m.x += Math.cos(a) * 55 * dt; m.y += Math.sin(a) * 55 * dt; } }
      tk += dt; if (tk >= .4) { tk = 0; areaDamage(x, y, 75, 1 + .2 * l, { kind:'tick' }); } } }); },
  28(l, P){ const L = 140 + 10 * l, a = P.ang, x = P.x, y = P.y; FX.spawn('fire-breath', x + Math.cos(a) * 10, y - 12 + Math.sin(a) * 10, { rot:a, s:L / 150, loopSec:1.2 }); Snd.play('expbig', .6); let k = 0;
    addZone({ dur:1.25, update() { while (k < 4 && this.t >= .15 + k * .3) { k++; shapeHit('cone', P.x, P.y, a, L, 0, 55, m => dealDamage(m, (3 + .6 * l) / 4, { kind:'power', ranged:false })); } } }); },
  29(l, P){ const dur = 5 + l; P.abs = { v:P.st.maxHp * (.3 + .08 * l), t:dur }; FX.spawn('divine-shield', P.x, P.y, { s:1.05, follow:P, loopSec:dur }); Snd.play('power', .9); },
  30(l, P){ const c = targetPoint(P, 340, 160), r = 100 + 8 * l; FX.spawn('meteor', c.x, c.y, { s:r / 110 }); Snd.play('portal', .7);
    later(.75, () => { areaDamage(c.x, c.y, r, 5 + l, PK); for (const m of G.mons) if (!m.dead && dist(c.x, c.y, m.x, m.y) <= r + m.r) applyStun(m, .8); G.cam.shake = 6; Snd.play('expbig', 1); }); },
};
function usePower(slot){
  const P = G.P, a = P.powers.active[slot]; if (!a || P.dead || P.dash) return;
  const pw = POWER_BY_ID[a.id]; if (P.pcd[slot] > 0) return;
  if (!payCost(pw.mp)) { Snd.play('error', .5); num(P.x, P.y - 34, P.st.hpOnSkill ? 'HP KURANG' : 'MP KURANG', '#7aa8ff'); return; }
  P.pcd[slot] = pw.cd; P.pcdMax = P.pcdMax || [1, 1, 1]; P.pcdMax[slot] = pw.cd;
  P.ang = aimAngle(P, 260); P.dir = dirFromAngle(P.ang);
  ACTIVE[a.id](a.lv, P);
}

/* ---------------- langkah game ---------------- */
function stepGame(dt){
  if (G.state !== 'play') return;
  dt = Math.min(dt, .05); G.t += dt;
  const P = G.P;
  calcStats(P);
  updatePlayer(dt); updateMonsters(dt); updateSpawner(dt); updateProjs(dt);
  for (const z of G.zones) { z.t += dt; if (z.update) z.update(dt); }
  G.zones = G.zones.filter(z => z.t < z.dur);
  for (const t of G.timers) { t.t -= dt; if (t.t <= 0 && !t.done) { t.done = true; try { t.fn(); } catch (e) { console.error(e); } } }
  G.timers = G.timers.filter(t => !t.done);
  FX.update(dt);
  for (const n of G.nums) n.t += dt; G.nums = G.nums.filter(n => n.t < n.life);
  if (Input.take('pause')) { UI.pause(); return; }
  if (G.levelUps > 0 && G.state === 'play') UI.openLevelUp();
}
