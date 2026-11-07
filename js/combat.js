/* =====================================================================
   js/combat.js : serangan senjata, skill kombinasi elemen, proyektil, ledakan musuh
   Dipakai game.js:
     Combat.reset(world)       world = { player, enemies:[] } (objek yang sama sepanjang game)
     Combat.attack(player)     Combat.skill(player)
     Combat.update(dt)         Combat.draw(ctx, camX, camY, t, layer)   layer 0 = tanah, 1 = atas
   Dipakai entities.js:
     Combat.enemyShot(enemy, sudut, {speed, dmg, color, size, element})
     Combat.enemyAoe(enemy, x, y, radius, dmg, tunda, warna[])
   ===================================================================== */
'use strict';

const Combat = (function () {
  const TAU = Math.PI * 2;
  const SKILL_BASE = 18;                       // damage dasar skill (dikali dmg kombinasi dan atkMult)
  // musuh dengan elemen kiri lemah terhadap elemen kanan (+30% damage)
  const WEAK = { api: 'air', air: 'petir', petir: 'tanah', tanah: 'udara', udara: 'api' };

  let world = { player: null, enemies: [] };
  const projs = [];
  const aoes = [];
  const fields = [];
  let sndT = 0;

  /* ---------- Bantuan ---------- */
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function angDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    return d;
  }
  function hitSound() {
    const n = performance.now();
    if (n - sndT > 45) { sndT = n; Sound.play('hit'); }
  }
  function nearestEnemy(x, y, range, skip) {
    let best = null, bd = range;
    const list = world.enemies;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.dead || (skip && skip.has(e))) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  /* Titik sasaran skill: musuh terdekat, kalau tidak ada titik di depan pemain yang bukan dinding */
  function targetPoint(pl, a, range, ahead) {
    const e = nearestEnemy(pl.x, pl.y, range);
    if (e) return { x: e.x, y: e.y };
    for (let d = ahead; d > 6; d -= 8) {
      const x = pl.x + Math.cos(a) * d, y = pl.y + Math.sin(a) * d;
      if (!GameMap.solidAt(x, y)) return { x: x, y: y };
    }
    return { x: pl.x, y: pl.y };
  }
  function disc(ctx, x, y, r) {
    r = Math.round(r);
    if (r < 1) return;
    for (let yy = -r; yy <= r; yy++) {
      const half = Math.floor(Math.sqrt(r * r - yy * yy));
      ctx.fillRect(Math.round(x) - half, Math.round(y) + yy, half * 2 + 1, 1);
    }
  }
  function ringPx(ctx, x, y, r) {
    const n = Math.max(16, Math.round(r * 3));
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU;
      ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1);
    }
  }

  /* Status: knock dan pull berupa dorongan, sisanya status biasa (detik) */
  function applyStatus(e, name, sec, cx, cy) {
    if (!name || e.dead) return;
    if (name === 'knock' || name === 'pull') {
      const k = e.isBoss ? 0.25 : 1;
      const a = Math.atan2(e.y - cy, e.x - cx) + (name === 'pull' ? Math.PI : 0);
      const f = (name === 'knock' ? 240 : 130) * k;
      e.kx += Math.cos(a) * f; e.ky += Math.sin(a) * f;
      return;
    }
    e.addStatus(name, sec || 1);
  }

  /* Satu pukulan ke musuh. o: {angle, color, elem, knock, lifesteal, status, sec, cx, cy} */
  function hitEnemy(e, base, o) {
    o = o || {};
    const pl = world.player;
    let d = base * pl.atkMult * (0.92 + Math.random() * 0.16);
    const crit = Math.random() < 0.1;
    if (crit) d *= 1.6;
    if (o.elem && [].concat(o.elem).indexOf(WEAK[e.element]) >= 0) d *= 1.3;
    const ang = (o.angle !== undefined) ? o.angle : Math.atan2(e.y - pl.y, e.x - pl.x);
    const kb = (o.knock === undefined) ? 70 : o.knock;
    const dealt = e.hurt(d, { kx: Math.cos(ang) * kb, ky: Math.sin(ang) * kb });
    if (dealt <= 0) return 0;
    FX.hit(e.x, e.y, o.color || '#ffffff', ang, crit ? 2 : 1);
    FX.text(e.x, e.y - e.r - 6, dealt, crit ? '#ffd24a' : '#ffffff', crit);
    hitSound();
    if (o.lifesteal) {
      const h = pl.heal(dealt * o.lifesteal);
      if (h >= 1) FX.text(pl.x, pl.y - 14, '+' + Math.round(h), '#7dff9a', false);
    }
    if (o.status) applyStatus(e, o.status, o.sec, o.cx !== undefined ? o.cx : pl.x, o.cy !== undefined ? o.cy : pl.y);
    return dealt;
  }

  /* Pukulan skill: dmg 0 berarti hanya status */
  function sHit(c, e, mult, extra) {
    const o = Object.assign({ color: c.colors[0], elem: [c.a, c.b], status: c.status, sec: c.statusTime / 1000 }, extra || {});
    if (c.dmg <= 0) { if (o.status) applyStatus(e, o.status, o.sec, o.cx !== undefined ? o.cx : world.player.x, o.cy !== undefined ? o.cy : world.player.y); return 0; }
    return hitEnemy(e, SKILL_BASE * c.dmg * mult, o);
  }

  /* =====================================================================
     SERANGAN SENJATA
     ===================================================================== */
  function meleeHit(pl, w, e, a) {
    const dealt = hitEnemy(e, w.dmg, { angle: a, color: w.trail, elem: pl.element, lifesteal: w.lifesteal, knock: w.pull ? 0 : (w.knock || 70) });
    if (!dealt) return;
    if (w.bleed) e.addStatus('bleed', 3);
    if (w.slowOnHit) e.addStatus('slow', 1.5);
    if (w.stun) applyStatus(e, 'stun', w.stun / 1000, pl.x, pl.y);
    if (w.fear) e.addStatus('fear', w.fear / 1000);
    if (w.pull) applyStatus(e, 'pull', 0, pl.x, pl.y);
  }

  const PSIZE = { arrow: 2, bolt: 2, knife: 2, ring: 5, orb: 4 };

  function fireProj(pl, w, a) {
    const n = w.count || 1, sp = (w.spread || 0) * Math.PI / 180;
    for (let i = 0; i < n; i++) {
      const an = a + (n === 1 ? 0 : (i - (n - 1) / 2) * sp);
      projs.push({
        owner: 'p', kind: w.kind === 'boomerang' ? 'boom' : 'proj', type: w.proj,
        x: pl.x + Math.cos(an) * 8, y: pl.y - 2 + Math.sin(an) * 8,
        vx: Math.cos(an) * w.speed, vy: Math.sin(an) * w.speed, speed: w.speed,
        dmg: w.dmg, range: w.range, trav: 0, age: 0,
        pierce: w.pierce || 0, ricochet: w.ricochet || 0, homing: !!w.homing,
        color: w.trail, size: PSIZE[w.proj] || 3, hit: new Set(), back: false
      });
    }
    FX.sparks(pl.x + Math.cos(a) * 10, pl.y - 2 + Math.sin(a) * 10, 4, [w.trail, '#ffffff'], 30, 80, 0.2, a, 0.4);
  }

  function attack(pl) {
    const w = pl.weapon, a = pl.aim;
    const ox = pl.x, oy = pl.y - 2;
    const el = ELEMENTS[pl.element];
    pl.useAttack();
    Sound.play('attack');

    switch (w.kind) {
      case 'arc': case 'flurry': case 'bash': {
        FX.slash(ox, oy, a, w.arc, w.reach, w.trail, el.glow);
        if (w.kind === 'flurry') FX.slash(ox, oy, a + 0.35, w.arc * 0.8, w.reach - 3, w.trail, '#ffffff');
        const half = w.arc * Math.PI / 360;
        world.enemies.forEach(function (e) {
          if (e.dead) return;
          const dx = e.x - pl.x, dy = e.y - pl.y, d = Math.hypot(dx, dy);
          if (d > w.reach + e.r) return;
          if (d > e.r + 6 && Math.abs(angDiff(Math.atan2(dy, dx), a)) > half) return;
          meleeHit(pl, w, e, a);
        });
        if (w.kind === 'bash') pl.invuln = Math.max(pl.invuln, 0.3);
        break;
      }
      case 'thrust': case 'chain': {
        FX.thrust(ox, oy, a, w.reach, w.trail);
        const cs = Math.cos(a), sn = Math.sin(a);
        world.enemies.forEach(function (e) {
          if (e.dead) return;
          const dx = e.x - ox, dy = e.y - oy;
          const along = dx * cs + dy * sn, perp = Math.abs(-dx * sn + dy * cs);
          if (along < -4 || along > w.reach + e.r) return;
          if (perp > (w.width || 8) / 2 + e.r) return;
          meleeHit(pl, w, e, a);
        });
        break;
      }
      case 'smash': {
        const cx = ox + Math.cos(a) * w.reach, cy = oy + Math.sin(a) * w.reach;
        FX.smash(cx, cy, w.radius, w.trail);
        world.enemies.forEach(function (e) {
          if (e.dead || Math.hypot(e.x - cx, e.y - cy) > w.radius + e.r) return;
          meleeHit(pl, w, e, Math.atan2(e.y - cy, e.x - cx));
        });
        break;
      }
      case 'projectile': case 'boomerang':
        fireProj(pl, w, a);
        break;
    }
  }

  /* =====================================================================
     SKILL KOMBINASI ELEMEN
     ===================================================================== */
  function addField(c, z, extra) {
    const f = { c: c, z: z, kind: c.kind, acc: 0, stCd: new Map(), hit: new Set() };
    if (extra) for (const k in extra) f[k] = extra[k];
    fields.push(f);
    return f;
  }

  function skill(pl) {
    const c = pl.useSkill();
    const a = pl.aim, cs = Math.cos(a), sn = Math.sin(a);
    FX.cast(pl.x, pl.y + 4, c);
    Sound.play('skill');

    switch (c.kind) {
      case 'area': case 'pool': case 'vortex': {
        const tp = targetPoint(pl, a, 130, 52);
        addField(c, FX.zone(c, tp.x, tp.y, { angle: a }), { acc: 0.5 });
        break;
      }
      case 'orb': {
        const z = FX.zone(c, pl.x + cs * 8, pl.y - 2 + sn * 8, { angle: a, life: 0.9 });
        addField(c, z);
        break;
      }
      case 'chain': {
        const first = nearestEnemy(pl.x, pl.y, c.r);
        if (!first) {
          const tp = targetPoint(pl, a, 0, 40);
          FX.zone(c, tp.x, tp.y, { angle: a });
          FX.bolt(pl.x, pl.y - 4, tp.x, tp.y, '#ffd93a', 0.2, 5);
          break;
        }
        const hit = new Set([first]);
        const pts = [{ x: pl.x, y: pl.y - 4 }, { x: first.x, y: first.y }];
        let last = first;
        for (let n = 1; n < (c.chain || 4); n++) {
          const nx = nearestEnemy(last.x, last.y, 70, hit);
          if (!nx) break;
          hit.add(nx); pts.push({ x: nx.x, y: nx.y }); last = nx;
        }
        FX.zone(c, first.x, first.y, { angle: a });
        FX.chain(pts, c.colors);
        hit.forEach(function (e) { sHit(c, e, 1, { knock: 30 }); });
        break;
      }
      case 'cone': {
        FX.zone(c, pl.x, pl.y, { angle: a });
        const half = 0.62;
        world.enemies.forEach(function (e) {
          if (e.dead) return;
          const dx = e.x - pl.x, dy = e.y - pl.y, d = Math.hypot(dx, dy);
          if (d > c.r + e.r) return;
          if (d > e.r + 8 && Math.abs(angDiff(Math.atan2(dy, dx), a)) > half) return;
          sHit(c, e, 1, { angle: a, knock: 90 });
        });
        break;
      }
      case 'line': {
        const z = FX.zone(c, pl.x + cs * 10, pl.y + sn * 10, { angle: a });
        addField(c, z);
        break;
      }
      case 'rain': case 'storm': case 'pull': {
        const tp = targetPoint(pl, a, 130, 60);
        addField(c, FX.zone(c, tp.x, tp.y, { angle: a }));
        break;
      }
      case 'wall': {
        const tp = targetPoint(pl, a, 0, 36);
        addField(c, FX.zone(c, tp.x, tp.y, { angle: a }));
        break;
      }
      case 'blast': {
        const tp = targetPoint(pl, a, 120, 55);
        FX.zone(c, tp.x, tp.y, { angle: a });
        world.enemies.forEach(function (e) {
          if (e.dead || Math.hypot(e.x - tp.x, e.y - tp.y) > c.r + e.r) return;
          sHit(c, e, 1, { knock: 130, angle: Math.atan2(e.y - tp.y, e.x - tp.x), cx: tp.x, cy: tp.y });
        });
        break;
      }
      case 'ring': {
        FX.zone(c, pl.x, pl.y, { angle: a });
        world.enemies.forEach(function (e) {
          if (e.dead || dist(e, pl) > c.r + e.r) return;
          sHit(c, e, 1, { knock: 120 });
        });
        break;
      }
      case 'buff': {
        pl.setBuff(c.buff, c.dur / 1000);
        FX.zone(c, pl.x, pl.y, { follow: pl });
        FX.text(pl.x, pl.y - 18, 'BUFF', c.colors[0], true);
        break;
      }
      case 'tornado': {
        const z = FX.zone(c, pl.x + cs * 24, pl.y + sn * 24, { angle: a, vx: cs * 55, vy: sn * 55 });
        addField(c, z, { acc: 0.3 });
        break;
      }
    }
  }

  /* ---------- Efek skill yang sedang aktif ---------- */
  function pullAll(z, strength, dt) {
    world.enemies.forEach(function (e) {
      if (e.dead) return;
      const dx = z.x - e.x, dy = z.y - e.y, d = Math.hypot(dx, dy);
      if (d > z.r + 10 || d < 3) return;
      const k = (e.isBoss ? 0.3 : 1) * strength * dt;
      GameMap.move(e, dx / d * k, dy / d * k, e.half);
    });
  }

  function tickField(f, dt, interval, dps, stCd) {
    const z = f.z, c = f.c;
    f.acc += dt;
    if (f.acc < interval) return;
    f.acc -= interval;
    world.enemies.forEach(function (e) {
      if (e.dead || dist(e, z) > z.r + e.r * 0.5) return;
      if (c.dmg > 0) {
        hitEnemy(e, SKILL_BASE * c.dmg * dps * interval, { color: c.colors[0], elem: [c.a, c.b], knock: 0, angle: Math.atan2(e.y - z.y, e.x - z.x) });
      }
      if (c.status && c.status !== 'pull' && c.status !== 'knock' && !(f.stCd.get(e) > 0)) {
        applyStatus(e, c.status, c.statusTime / 1000, z.x, z.y);
        f.stCd.set(e, stCd);
      }
    });
  }

  function processImpacts(f, radius, mult) {
    const z = f.z, c = f.c, imp = z.data.impacts || [];
    imp.forEach(function (im) {
      if (!im.landed || im.done) return;
      im.done = true;
      world.enemies.forEach(function (e) {
        if (e.dead || Math.hypot(e.x - im.x, e.y - im.y) > radius + e.r) return;
        sHit(c, e, mult, { knock: 60, angle: Math.atan2(e.y - im.y, e.x - im.x), cx: im.x, cy: im.y });
      });
    });
  }

  function updateFields(dt) {
    for (let i = fields.length - 1; i >= 0; i--) {
      const f = fields[i], z = f.z, c = f.c;
      f.stCd.forEach(function (v, k) {
        if (v - dt <= 0) f.stCd.delete(k); else f.stCd.set(k, v - dt);
      });

      switch (f.kind) {
        case 'area': case 'pool':
          tickField(f, dt, 0.5, 1, 1);
          break;
        case 'vortex':
          pullAll(z, 80, dt);
          tickField(f, dt, 0.5, 1, 1);
          break;
        case 'tornado':
          if (z.vx && GameMap.solidAt(z.x + z.vx * dt * 4, z.y + z.vy * dt * 4)) { z.vx = 0; z.vy = 0; }
          pullAll(z, 35, dt);
          tickField(f, dt, 0.3, 1.6, 1.5);
          break;
        case 'pull':
          pullAll(z, 90, dt);
          if (z.dead) {
            world.enemies.forEach(function (e) {
              if (e.dead || dist(e, z) > z.r * 0.5 + e.r) return;
              sHit(c, e, 1, { knock: 0 });
            });
          }
          break;
        case 'orb':
          if (!z.dead) {
            if (GameMap.solidAt(z.x, z.y)) z.age = z.life;
            else {
              for (let k = 0; k < world.enemies.length; k++) {
                const e = world.enemies[k];
                if (!e.dead && dist(e, z) < e.r + 9) { z.age = z.life; break; }
              }
            }
          } else {
            const rad = z.r * 1.3;
            Sound.play('explode');
            world.enemies.forEach(function (e) {
              if (e.dead || dist(e, z) > rad + e.r) return;
              sHit(c, e, 1, { knock: 110, angle: Math.atan2(e.y - z.y, e.x - z.x), cx: z.x, cy: z.y });
            });
          }
          break;
        case 'line':
          if (!z.dead) {
            world.enemies.forEach(function (e) {
              if (e.dead || f.hit.has(e) || dist(e, z) > 18 + e.r) return;
              f.hit.add(e);
              sHit(c, e, 1, { knock: 0, angle: z.angle });
            });
          }
          break;
        case 'rain':
          processImpacts(f, 20, 0.9);
          break;
        case 'storm':
          processImpacts(f, 18, 0.8);
          break;
        case 'wall':
          if (!z.dead && z.age > 0.1) {
            const bl = z.data.blocks || [];
            world.enemies.forEach(function (e) {
              if (e.dead) return;
              for (let k = 0; k < bl.length; k++) {
                const b = bl[k], hw = 6.5 + e.half;
                const dx = e.x - b.x, dy = e.y - b.y;
                if (Math.abs(dx) >= hw || Math.abs(dy) >= hw) continue;
                if (hw - Math.abs(dx) < hw - Math.abs(dy)) GameMap.move(e, (dx < 0 ? -1 : 1) * (hw - Math.abs(dx)), 0, e.half);
                else GameMap.move(e, 0, (dy < 0 ? -1 : 1) * (hw - Math.abs(dy)), e.half);
              }
            });
          }
          break;
      }
      if (z.dead) fields.splice(i, 1);
    }
  }

  /* Apakah titik menabrak tembok batu buatan pemain */
  function wallHit(x, y) {
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (f.kind !== 'wall' || f.z.dead || f.z.age < 0.1) continue;
      const bl = f.z.data.blocks || [];
      for (let k = 0; k < bl.length; k++) {
        if (Math.abs(x - bl[k].x) < 7 && Math.abs(y - bl[k].y) < 7) return true;
      }
    }
    return false;
  }

  /* =====================================================================
     PROYEKTIL
     ===================================================================== */
  function updatePlayerProj(p, dt) {
    const pl = world.player;
    p.age += dt;
    if (p.age > 6) return false;

    if (p.homing) {
      const t = nearestEnemy(p.x, p.y, 110);
      if (t) {
        const want = Math.atan2(t.y - p.y, t.x - p.x);
        let cur = Math.atan2(p.vy, p.vx);
        const d = angDiff(want, cur), lim = 5 * dt;
        cur += Math.max(-lim, Math.min(lim, d));
        p.vx = Math.cos(cur) * p.speed; p.vy = Math.sin(cur) * p.speed;
      }
    }
    if (p.kind === 'boom' && p.back) {
      const a = Math.atan2(pl.y - 2 - p.y, pl.x - p.x);
      p.vx = Math.cos(a) * p.speed * 1.15; p.vy = Math.sin(a) * p.speed * 1.15;
      if (Math.hypot(pl.x - p.x, pl.y - 2 - p.y) < 9) return false;
    }

    const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
    if (GameMap.solidAt(nx, ny)) {
      if (p.kind === 'boom' && !p.back) { p.back = true; p.hit.clear(); }
      else { FX.sparks(p.x, p.y, 5, [p.color, '#ffffff'], 30, 80, 0.25); return false; }
    } else { p.x = nx; p.y = ny; }

    p.trav += Math.hypot(p.vx, p.vy) * dt;
    if (p.kind === 'boom') {
      if (!p.back && p.trav >= p.range) { p.back = true; p.hit.clear(); }
    } else if (p.trav >= p.range) return false;

    if (Math.random() < dt * 40) FX.trail(p.x, p.y, p.color, 2);

    const ang = Math.atan2(p.vy, p.vx);
    for (let i = 0; i < world.enemies.length; i++) {
      const e = world.enemies[i];
      if (e.dead || p.hit.has(e)) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) > e.r + p.size + 1) continue;
      p.hit.add(e);
      hitEnemy(e, p.dmg, { angle: ang, color: p.color, elem: pl.element, knock: 50 });
      if (p.ricochet > 0) {
        const nt = nearestEnemy(p.x, p.y, 110, p.hit);
        if (nt) {
          const a2 = Math.atan2(nt.y - p.y, nt.x - p.x);
          p.vx = Math.cos(a2) * p.speed; p.vy = Math.sin(a2) * p.speed;
          p.ricochet--; p.trav = Math.max(0, p.trav - 50);
          FX.sparks(p.x, p.y, 4, [p.color, '#ffffff'], 40, 90, 0.2);
          continue;
        }
      }
      if (p.pierce > 0) p.pierce--;
      else if (p.kind !== 'boom') return false;
    }
    return true;
  }

  function updateEnemyProj(p, dt) {
    const pl = world.player;
    p.age += dt;
    if (p.age > p.life) return false;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (GameMap.solidAt(p.x, p.y) || wallHit(p.x, p.y)) {
      FX.sparks(p.x, p.y, 4, [p.color, '#ffffff'], 30, 70, 0.25);
      return false;
    }
    if (Math.random() < dt * 30) FX.trail(p.x, p.y, p.color, 2);
    if (pl && !pl.dead && pl.invuln <= 0 && Math.hypot(pl.x - p.x, pl.y - p.y) < p.size + 5) {
      const a = Math.atan2(p.vy, p.vx);
      pl.hurt(p.dmg, { kx: Math.cos(a) * 110, ky: Math.sin(a) * 110 });
      FX.sparks(p.x, p.y, 6, [p.color, '#ffffff'], 40, 100, 0.3);
      return false;
    }
    return true;
  }

  function enemyShot(en, ang, o) {
    o = o || {};
    const sp = o.speed || 120;
    projs.push({
      owner: 'e', x: en.x, y: en.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      dmg: o.dmg || en.atk || 5, color: o.color || '#ff5a2a', size: o.size || 3,
      life: 3.2, age: 0, element: o.element || en.element
    });
  }

  function enemyAoe(en, x, y, r, dmg, delay, colors) {
    aoes.push({ x: x, y: y, r: r, dmg: dmg, delay: delay || 0.8, age: 0, colors: colors || ['#ff5a2a', '#ffb347', '#ffffff'] });
  }

  function updateAoes(dt) {
    const pl = world.player;
    for (let i = aoes.length - 1; i >= 0; i--) {
      const a = aoes[i];
      a.age += dt;
      if (a.age < a.delay) continue;
      FX.explode(a.x, a.y, a.r, a.colors);
      Sound.play('explode');
      if (pl && !pl.dead && Math.hypot(pl.x - a.x, pl.y - a.y) < a.r + 5) {
        const an = Math.atan2(pl.y - a.y, pl.x - a.x);
        pl.hurt(a.dmg, { kx: Math.cos(an) * 170, ky: Math.sin(an) * 170 });
      }
      aoes.splice(i, 1);
    }
  }

  /* =====================================================================
     UPDATE dan GAMBAR
     ===================================================================== */
  function update(dt) {
    updateFields(dt);
    for (let i = projs.length - 1; i >= 0; i--) {
      const p = projs[i];
      const ok = p.owner === 'p' ? updatePlayerProj(p, dt) : updateEnemyProj(p, dt);
      if (!ok) projs.splice(i, 1);
    }
    updateAoes(dt);
  }

  function drawProj(ctx, p, cx, cy, t) {
    const sx = Math.round(p.x - cx), sy = Math.round(p.y - cy);
    if (sx < -12 || sy < -12 || sx > CFG.W + 12 || sy > CFG.H + 12) return;
    ctx.save();
    if (p.owner === 'e') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.4; ctx.fillStyle = p.color; disc(ctx, sx, sy, p.size + 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1; ctx.fillStyle = p.color; disc(ctx, sx, sy, p.size);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 1, sy - 1, 2, 2);
    } else {
      const an = Math.atan2(p.vy, p.vx), c = Math.cos(an), s = Math.sin(an);
      switch (p.type) {
        case 'ring': {
          ctx.fillStyle = p.color;
          for (let i = 0; i < 14; i++) {
            const a2 = t * 16 + i * TAU / 14;
            ctx.fillRect(Math.round(sx + Math.cos(a2) * 5), Math.round(sy + Math.sin(a2) * 5), 2, 2);
          }
          ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 1, sy - 1, 2, 2);
          break;
        }
        case 'orb': {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.35; ctx.fillStyle = p.color; disc(ctx, sx, sy, 6);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1; ctx.fillStyle = p.color; disc(ctx, sx, sy, 3);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 1, sy - 1, 2, 2);
          break;
        }
        default: {
          const len = p.type === 'knife' ? 5 : 9, th = p.type === 'bolt' ? 2 : 1;
          ctx.fillStyle = p.color;
          for (let i = 0; i < len; i++) ctx.fillRect(Math.round(sx - c * i), Math.round(sy - s * i), th, th);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(sx, sy, 2, 2);
        }
      }
    }
    ctx.restore();
  }

  function draw(ctx, cx, cy, t, layer) {
    if (layer === 0) {
      for (let i = 0; i < aoes.length; i++) {
        const a = aoes[i];
        const sx = a.x - cx, sy = a.y - cy;
        if (sx < -a.r - 10 || sy < -a.r - 10 || sx > CFG.W + a.r + 10 || sy > CFG.H + a.r + 10) continue;
        const k = Math.min(1, a.age / a.delay);
        ctx.save();
        ctx.globalAlpha = 0.18 + 0.12 * Math.sin(t * 24);
        ctx.fillStyle = '#ff2a3a'; disc(ctx, sx, sy, a.r);
        ctx.globalAlpha = 0.35 + 0.25 * k;
        ctx.fillStyle = a.colors[0]; disc(ctx, sx, sy, a.r * k);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = '#ffffff'; ringPx(ctx, sx, sy, a.r);
        ctx.restore();
      }
    } else {
      for (let i = 0; i < projs.length; i++) drawProj(ctx, projs[i], cx, cy, t);
    }
  }

  function reset(w) {
    world = w;
    projs.length = 0; aoes.length = 0; fields.length = 0;
  }

  return {
    reset: reset, attack: attack, skill: skill, update: update, draw: draw,
    enemyShot: enemyShot, enemyAoe: enemyAoe,
    count: function () { return projs.length + fields.length + aoes.length; }
  };
})();
