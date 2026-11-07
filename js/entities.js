/* =====================================================================
   js/entities.js : Pemain, Musuh (termasuk bos), dan Pickup (orb)
   Dipakai oleh combat.js dan game.js.

   Player : x y aim element elem2 weapon hp mp level atkMult def
            update(dt, ax, ay)  draw(ctx, camX, camY, t)
            canAttack() useAttack()  canSkill() useSkill()  currentCombo() cycleElement()
            dash(ax, ay)  hurt(dmg, opts)  heal(n)  spendMp(n)  addXp(n)
   Enemy  : x y hp maxHp atk dead data
            update(dt, player)  draw(ctx, camX, camY, t)
            hurt(dmg, opts)  addStatus(name, detik)  has(name)
            boss: e.spawnRequests = [{type,x,y}] dibaca game.js
   Enemy memanggil (ada di combat.js):
            Combat.enemyShot(enemy, sudut, {speed, dmg, color, size})
            Combat.enemyAoe(enemy, x, y, radius, dmg, tunda, warna[])
   opts hurt: {kx, ky} dorongan, {dot:true} damage berkala, {ignoreInvuln:true}
   ===================================================================== */
'use strict';

/* ---------- Bantuan ---------- */
function dirFromAngle(a) {
  const c = Math.cos(a), s = Math.sin(a);
  if (Math.abs(c) > Math.abs(s)) return c > 0 ? 'right' : 'left';
  return s > 0 ? 'down' : 'up';
}
function angTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }

/* Siluet putih untuk efek berkedip saat terkena serangan */
const _whiteCache = new Map();
function whiteOf(img) {
  let w = _whiteCache.get(img);
  if (w) return w;
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, c.width, c.height);
  _whiteCache.set(img, c);
  return c;
}
function drawShadow(ctx, sx, sy, w, h) {
  ctx.fillStyle = 'rgba(5,3,15,0.38)';
  for (let i = -h; i <= h; i++) {
    const half = Math.round(w * Math.sqrt(1 - (i * i) / (h * h + 0.01)));
    ctx.fillRect(Math.round(sx) - half, Math.round(sy) + i, half * 2, 1);
  }
}

/* ---------- Dasar semua makhluk ---------- */
class Entity {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.hp = 1; this.maxHp = 1;
    this.half = 5;            // setengah ukuran kotak tabrakan
    this.r = 6;               // radius kena serang
    this.kx = 0; this.ky = 0; // kecepatan dorongan
    this.flash = 0;
    this.dead = false;
    this.st = {};             // status: nama -> sisa detik
    this.dotAcc = 0;
    this.resist = 1;          // pengali lama status
    this.animT = Math.random() * 5;
  }
  has(name) { return (this.st[name] || 0) > 0; }
  addStatus(name, sec) {
    if (this.dead) return;
    this.st[name] = Math.max(this.st[name] || 0, (sec / 1000 > 20 ? sec : sec) * this.resist);
  }
  stunned() { return this.has('stun') || this.has('freeze'); }
  speedMult() { return this.has('slow') ? 0.5 : 1; }
  updateStatus(dt) {
    let dot = 0;
    for (const n in this.st) {
      if (this.st[n] > 0) {
        this.st[n] -= dt;
        if (n === 'burn')  dot += STATUS.burn.tick * (this.dotScale || 1);
        if (n === 'bleed') dot += STATUS.bleed.tick * (this.dotScale || 1);
        if (this.st[n] <= 0) this.st[n] = 0;
      }
    }
    if (dot > 0) {
      this.dotAcc += dot * dt;
      if (this.dotAcc >= 1) {
        const d = Math.floor(this.dotAcc);
        this.dotAcc -= d;
        const dealt = this.hurt(d, { dot: true });
        if (dealt > 0) FX.text(this.x, this.y - 12, dealt, this.has('burn') ? STATUS.burn.color : STATUS.bleed.color, false);
      }
    }
  }
  applyKnock(dt) {
    if (Math.abs(this.kx) < 1 && Math.abs(this.ky) < 1) { this.kx = 0; this.ky = 0; return; }
    const steps = Math.ceil(Math.max(Math.abs(this.kx), Math.abs(this.ky)) * dt / 4) || 1;
    for (let i = 0; i < steps; i++) GameMap.move(this, this.kx * dt / steps, this.ky * dt / steps, this.half);
    const k = Math.exp(-9 * dt);
    this.kx *= k; this.ky *= k;
  }
  moveBy(dx, dy) { return GameMap.move(this, dx, dy, this.half); }
}

/* =====================================================================
   PEMAIN
   ===================================================================== */
class Player extends Entity {
  constructor(charId) {
    super(GameMap.spawn.x, GameMap.spawn.y);
    this.ch = getCharacter(charId);
    this.id = this.ch.id;
    this.weapon = WEAPONS[this.ch.weapon];
    this.element = this.ch.element;
    this.others = ELEMENT_ORDER.filter(function (e) { return e !== this.ch.element; }, this);
    this.otherIdx = 0;
    this.elem2 = this.others[0];

    this.level = 1; this.xp = 0;
    this.atkTimer = 0; this.skillTimer = 0; this.dashCd = 0; this.dashT = 0;
    this.dashDx = 0; this.dashDy = 1;
    this.invuln = 0; this.atkAnim = 0; this.atkAnimDur = 0.18;
    this.swing = 1;
    this.dir = 'down'; this.faceAngle = Math.PI / 2; this.aim = this.faceAngle;
    this.moving = false;
    this.buff = null;
    this.skillCd = 1.4;
    this.kills = 0;
    this.recalc(true);
  }

  recalc(full) {
    const ch = this.ch, P = CFG.PLAYER, l = this.level - 1;
    this.maxHp = Math.round(P.baseHp * ch.hp * (1 + 0.15 * l));
    this.maxMp = Math.round(P.baseMp * ch.mp * (1 + 0.10 * l));
    this.atkMult = ch.atk * (1 + 0.12 * l);
    this.def = 8 * ch.def * (1 + 0.12 * l);
    this.speed = 62 * ch.spd;
    this.xpNext = Math.round(P.xpBase * Math.pow(P.xpGrowth, l));
    if (full) { this.hp = this.maxHp; this.mp = this.maxMp; }
  }

  currentCombo() { return getCombo(this.element, this.elem2); }
  cycleElement() {
    this.otherIdx = (this.otherIdx + 1) % this.others.length;
    this.elem2 = this.others[this.otherIdx];
    return this.currentCombo();
  }

  canAttack() { return this.atkTimer <= 0 && !this.stunned() && !this.dead && this.dashT <= 0; }
  useAttack() {
    this.atkTimer = this.weapon.cd / 1000;
    this.atkAnim = this.atkAnimDur;
    this.swing = -this.swing;
    this.dir = dirFromAngle(this.aim);
  }
  canSkill() {
    const c = this.currentCombo();
    return !!c && this.skillTimer <= 0 && this.mp >= c.mp && !this.stunned() && !this.dead;
  }
  useSkill() {
    const c = this.currentCombo();
    this.mp -= c.mp;
    this.skillTimer = this.skillCd;
    this.atkAnim = this.atkAnimDur * 1.5;
    this.dir = dirFromAngle(this.aim);
    return c;
  }
  spendMp(n) { if (this.mp < n) return false; this.mp -= n; return true; }
  heal(n) {
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + n);
    return this.hp - before;
  }

  addXp(n) {
    this.xp += n;
    let gained = 0;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++; gained++;
      this.recalc(false);
      this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * 0.4));
      this.mp = this.maxMp;
    }
    if (gained) { FX.levelUp(this.x, this.y); Sound.play('levelup'); FX.text(this.x, this.y - 18, 'LV ' + this.level, '#ffd24a', true); }
    return gained;
  }

  setBuff(b, seconds) { this.buff = { speed: b.speed || 1, def: b.def || 1, regen: b.regen || 0, t: seconds }; }

  dash(ax, ay) {
    if (this.dashCd > 0 || this.stunned() || this.dead || this.dashT > 0) return false;
    let dx = ax, dy = ay;
    if (Math.hypot(dx, dy) < 0.2) { dx = Math.cos(this.faceAngle); dy = Math.sin(this.faceAngle); }
    const l = Math.hypot(dx, dy) || 1;
    this.dashDx = dx / l; this.dashDy = dy / l;
    this.dashT = CFG.PLAYER.dashTime / 1000;
    this.dashCd = CFG.PLAYER.dashCd / 1000;
    this.invuln = Math.max(this.invuln, this.dashT + 0.08);
    this.faceAngle = Math.atan2(this.dashDy, this.dashDx);
    this.dir = dirFromAngle(this.faceAngle);
    Sound.play('dash');
    FX.ring(this.x, this.y + 4, 3, 14, 0.25, ELEMENTS[this.element].glow, 0);
    return true;
  }

  hurt(amount, o) {
    o = o || {};
    if (this.dead) return 0;
    if (this.invuln > 0 && !o.ignoreInvuln && !o.dot) return 0;
    const def = this.def * (this.buff ? this.buff.def : 1);
    let dmg = o.dot ? amount : Math.max(1, Math.round(amount * (1 - def / (def + 60))));
    this.hp -= dmg;
    this.flash = 0.12;
    if (o.kx !== undefined) { this.kx += o.kx; this.ky += o.ky; }
    if (!o.dot) {
      this.invuln = 0.55;
      FX.shake(3, 0.16); FX.flash('#ff2a4a', 0.18, 0.15);
      FX.hit(this.x, this.y, '#ff5a6a', o.kx !== undefined ? Math.atan2(o.ky, o.kx) : undefined, 1);
      FX.text(this.x, this.y - 14, dmg, '#ff6a7a', false);
      Sound.play('hurt');
    }
    if (this.hp <= 0) { this.hp = 0; this.dead = true; FX.death(this.x, this.y, this.ch.color, 14); Sound.play('die'); }
    return dmg;
  }

  update(dt, ax, ay) {
    if (this.dead) return;
    this.animT += dt;
    this.atkTimer = Math.max(0, this.atkTimer - dt);
    this.skillTimer = Math.max(0, this.skillTimer - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.atkAnim = Math.max(0, this.atkAnim - dt);

    this.updateStatus(dt);
    if (this.buff) {
      this.buff.t -= dt;
      this.hp = Math.min(this.maxHp, this.hp + this.buff.regen * dt);
      if (this.buff.t <= 0) this.buff = null;
    }
    this.mp = Math.min(this.maxMp, this.mp + (CFG.PLAYER.mpRegen + (this.buff ? this.buff.regen : 0)) * dt);

    this.moving = false;
    if (this.dashT > 0) {
      this.dashT -= dt;
      const sp = CFG.PLAYER.dashSpeed;
      this.moveBy(this.dashDx * sp * dt, this.dashDy * sp * dt);
      this._ai = (this._ai || 0) + dt;
      if (this._ai > 0.03) {
        this._ai = 0;
        FX.afterimage(this.x, this.y - 3, Assets.charFrame(this.id, this.dir, 0), 0.55);
        FX.dust(this.x, this.y + 5);
      }
      this.moving = true;
    } else if (!this.stunned()) {
      const len = Math.hypot(ax, ay);
      if (len > 0.05) {
        const sp = this.speed * this.speedMult() * (this.buff ? this.buff.speed : 1);
        this.moveBy(ax * sp * dt, ay * sp * dt);
        this.faceAngle = Math.atan2(ay, ax);
        if (this.atkAnim <= 0) this.dir = dirFromAngle(this.faceAngle);
        this.moving = true;
        this._ft = (this._ft || 0) + dt;
        if (this._ft > 0.16) { this._ft = 0; FX.dust(this.x, this.y + 5); }
      }
    }
    this.applyKnock(dt);

    // aura elemen di kaki
    if (Math.random() < dt * 5) {
      const el = ELEMENTS[this.element];
      FX.add({ x: this.x + (Math.random() - 0.5) * 12, y: this.y + 4, vy: -12 - Math.random() * 14, life: 0.6, size: 2, size1: 0, color: [el.color, el.glow], add: true });
    }
    if (this.stunned()) FX.status(this.x, this.y - 4, this.has('freeze') ? 'freeze' : 'stun', dt);
    if (this.has('burn')) FX.status(this.x, this.y, 'burn', dt);
  }

  draw(ctx, cx, cy, t) {
    if (this.dead) return;
    const sx = this.x - cx, sy = this.y - cy;
    const el = ELEMENTS[this.element];

    drawShadow(ctx, sx, sy + 6, 7, 2);
    // cahaya elemen di tanah
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.22 + Math.sin(t * 4) * 0.06;
    ctx.fillStyle = el.color;
    for (let i = -3; i <= 3; i++) {
      const half = Math.round(10 * Math.sqrt(1 - (i * i) / 12));
      ctx.fillRect(Math.round(sx) - half, Math.round(sy + 6 + i), half * 2, 1);
    }
    ctx.restore();

    const frame = this.moving ? (Math.floor(this.animT * 9) % 2) : 0;
    const img = Assets.charFrame(this.id, this.dir, frame);
    const bob = this.moving && frame ? -1 : 0;
    const blink = this.invuln > 0 && this.dashT <= 0 && Math.floor(t * 22) % 2 === 0;

    ctx.save();
    if (blink) ctx.globalAlpha = 0.45;
    if (this.dashT > 0) ctx.globalAlpha = 0.8;
    const ix = Math.round(sx - img.width / 2), iy = Math.round(sy - 11 + bob);
    // senjata di belakang badan kalau menghadap atas
    if (this.dir === 'up') this.drawWeapon(ctx, sx, sy);
    ctx.drawImage(img, ix, iy);
    if (this.flash > 0) { ctx.globalAlpha = 0.85; ctx.drawImage(whiteOf(img), ix, iy); }
    ctx.restore();
    if (this.dir !== 'up') this.drawWeapon(ctx, sx, sy);

    if (this.has('freeze')) { ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = '#bfeaff'; ctx.fillRect(Math.round(sx) - 6, Math.round(sy) - 9, 12, 16); ctx.restore(); }
  }

  drawWeapon(ctx, sx, sy) {
    if (this.atkAnim <= 0) return;
    const k = 1 - this.atkAnim / (this.atkAnimDur * (this.weapon.kind === 'smash' ? 1 : 1.5));
    const sweep = this.weapon.kind === 'thrust' || this.weapon.kind === 'projectile' ? 0 : 1.7 * this.swing;
    const a = this.aim + (-sweep / 2 + sweep * Math.max(0, Math.min(1, k)));
    const push = this.weapon.kind === 'thrust' ? 6 + 8 * Math.sin(Math.PI * Math.max(0, Math.min(1, k))) : 9;
    const icon = Assets.weaponIcon(this.weapon.id);
    ctx.save();
    ctx.translate(Math.round(sx + Math.cos(a) * push), Math.round(sy - 2 + Math.sin(a) * push));
    ctx.rotate(a + Math.PI / 4);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(icon, -icon.width / 2, -icon.height / 2);
    ctx.restore();
  }
}

/* =====================================================================
   MUSUH
   ===================================================================== */
const BIOME_ENEMY = { api: 'slime_api', air: 'slime_air', tanah: 'golem_tanah', petir: 'wisp_petir', udara: 'sprite_udara' };
function enemyForBiome(b) { return BIOME_ENEMY[b] || null; }

class Enemy extends Entity {
  constructor(typeId, x, y, level) {
    super(x, y);
    const d = ENEMIES[typeId];
    this.data = d; this.type = typeId;
    this.level = level || 1;
    const lv = this.level - 1;
    this.maxHp = Math.round(d.hp * (1 + 0.22 * lv));
    this.hp = this.maxHp;
    this.atk = Math.round(d.atk * (1 + 0.15 * lv));
    this.speed = d.spd;
    this.xp = Math.round(d.xp * (1 + 0.12 * lv));
    this.element = d.element;
    this.half = Math.max(4, Math.floor(d.size / 2) - 1);
    this.r = d.size / 2 + 1;
    this.isBoss = d.behavior === 'boss';
    this.atkTimer = 0.6;
    this.shootTimer = 0.6 + Math.random() * (d.shootCd ? d.shootCd / 1000 : 1);
    this.state = 'idle'; this.t = 0;
    this.wanderT = 0; this.wdx = 0; this.wdy = 0;
    this.hpShow = 0; this.aggro = false; this.active = !this.isBoss;
    this.stuckT = 0; this.sideDir = Math.random() < 0.5 ? 1 : -1;
    this.telegraph = 0;
    this.spawnRequests = [];
    this.phase = 1;
    this.lockAngle = 0;
    if (this.isBoss) { this.resist = 0.35; this.t = 1.5; }
  }

  addStatus(name, sec) {
    if (this.isBoss && name === 'freeze') name = 'slow';
    super.addStatus(name, sec);
  }

  hurt(amount, o) {
    o = o || {};
    if (this.dead) return 0;
    const dmg = Math.max(1, Math.round(amount));
    this.hp -= dmg;
    this.flash = 0.1;
    this.hpShow = 2.5;
    this.aggro = true; this.active = true;
    if (o.kx !== undefined && !this.isBoss) { this.kx += o.kx; this.ky += o.ky; }
    else if (o.kx !== undefined) { this.kx += o.kx * 0.2; this.ky += o.ky * 0.2; }
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
    return dmg;
  }

  wander(dt, mult) {
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.wanderT = 0.8 + Math.random() * 1.6;
      if (Math.random() < 0.35) { this.wdx = 0; this.wdy = 0; }
      else { const a = Math.random() * Math.PI * 2; this.wdx = Math.cos(a); this.wdy = Math.sin(a); }
    }
    const sp = this.speed * 0.4 * (mult || 1) * this.speedMult();
    this.step(this.wdx * sp * dt, this.wdy * sp * dt);
  }

  /* Bergerak dan menyelinap di sekitar rintangan kalau tersangkut */
  step(dx, dy) {
    const px = this.x, py = this.y;
    const hit = this.moveBy(dx, dy);
    if ((hit.x || hit.y) && Math.hypot(this.x - px, this.y - py) < Math.hypot(dx, dy) * 0.3) {
      this.stuckT += 0.016;
      if (this.stuckT > 0.25) {
        const l = Math.hypot(dx, dy) || 1;
        this.moveBy(-dy / l * Math.hypot(dx, dy) * this.sideDir * 1.4, dx / l * Math.hypot(dx, dy) * this.sideDir * 1.4);
        if (this.stuckT > 0.8) { this.stuckT = 0; this.sideDir = -this.sideDir; }
      }
    } else this.stuckT = Math.max(0, this.stuckT - 0.02);
    return hit;
  }
  moveToward(a, dt, mult) {
    const sp = this.speed * (mult || 1) * this.speedMult();
    this.step(Math.cos(a) * sp * dt, Math.sin(a) * sp * dt);
  }

  contact(pl, dist, ang) {
    if (pl.dead || this.atkTimer > 0) return;
    if (dist < this.r + 6 + 2) {
      this.atkTimer = this.isBoss ? 1.1 : 0.95;
      pl.hurt(this.atk, { kx: Math.cos(ang) * 150, ky: Math.sin(ang) * 150 });
    }
  }

  shoot(ang, o) {
    if (typeof Combat === 'undefined') return;
    const el = ELEMENTS[o && o.element ? o.element : this.element];
    Combat.enemyShot(this, ang, Object.assign({ speed: this.data.projSpeed || 120, dmg: this.atk, color: el.color, size: 3 }, o || {}));
  }

  update(dt, pl) {
    if (this.dead) return;
    this.animT += dt;
    this.atkTimer = Math.max(0, this.atkTimer - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.hpShow = Math.max(0, this.hpShow - dt);
    this.telegraph = Math.max(0, this.telegraph - dt);
    this.updateStatus(dt);
    if (this.dead) return;
    this.applyKnock(dt);

    // efek status
    for (const n in this.st) if (this.st[n] > 0) FX.status(this.x, this.y, n, dt);
    if (this.stunned()) return;

    const dx = pl.x - this.x, dy = pl.y - this.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const ang = Math.atan2(dy, dx);
    const sees = !this.has('blind') && !pl.dead && (dist < (this.data.aggro || 150) || this.aggro);

    if (this.has('confuse')) { this.wander(dt, 2.2); return; }
    if (this.has('fear') && !pl.dead) { this.moveToward(ang + Math.PI, dt, 1.2); return; }

    if (this.isBoss) { this.bossAI(dt, pl, dist, ang); return; }
    if (!sees) { this.wander(dt); this.state = 'idle'; return; }
    this.aggro = dist < 260;

    switch (this.data.behavior) {
      case 'ranged': {
        if (dist > 115) this.moveToward(ang, dt, 1);
        else if (dist < 70) this.moveToward(ang + Math.PI, dt, 0.9);
        else this.moveToward(ang + Math.PI / 2 * this.sideDir, dt, 0.5);
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && dist < (this.data.range || 110) + 40) {
          this.telegraph = 0.3;
          this.shootTimer = (this.data.shootCd || 1800) / 1000;
          this._pendingShot = 0.3;
        }
        if (this._pendingShot > 0) {
          this._pendingShot -= dt;
          if (this._pendingShot <= 0) { this.shoot(angTo(this.x, this.y, pl.x, pl.y)); FX.sparks(this.x, this.y, 5, [ELEMENTS[this.element].color, '#fff'], 30, 80, 0.25, ang, 0.5); }
        }
        break;
      }
      case 'charge': {
        this.t -= dt;
        if (this.state === 'idle') {
          if (dist > 95) this.moveToward(ang, dt, 1);
          else { this.state = 'wind'; this.t = 0.55; this.telegraph = 0.55; this.lockAngle = ang; }
        } else if (this.state === 'wind') {
          this.lockAngle = ang;
          if (this.t <= 0) { this.state = 'dash'; this.t = 0.42; Sound.play('dash'); }
        } else if (this.state === 'dash') {
          this.moveToward(this.lockAngle, dt, 4.6);
          if (Math.random() < dt * 40) FX.trail(this.x, this.y, ELEMENTS[this.element].color, 3);
          this.contact(pl, dist, ang);
          if (this.t <= 0) { this.state = 'rest'; this.t = 0.9; }
        } else if (this.t <= 0) this.state = 'idle';
        break;
      }
      default:   // chase
        this.moveToward(ang, dt, 1);
    }
    if (this.state !== 'dash' && this.state !== 'wind') this.contact(pl, dist, ang);
  }

  /* ---------- Bos: Penjaga Aetheria ---------- */
  bossAI(dt, pl, dist, ang) {
    if (!this.active) {
      if (dist < 190) this.active = true; else return;
    }
    if (pl.dead) return;
    const enraged = this.hp < this.maxHp * 0.5;
    if (enraged && this.phase === 1) {
      this.phase = 2;
      FX.flash('#b06cff', 0.4, 0.4); FX.shake(6, 0.5); FX.ring(this.x, this.y, 4, 60, 0.5, '#b06cff', 1);
      FX.text(this.x, this.y - 24, 'MURKA!', '#ff6a7a', true);
      this.speed *= 1.25;
    }
    const gap = enraged ? 1.1 : 1.8;
    this.t -= dt;

    if (this.state === 'idle') {
      if (dist > 60) this.moveToward(ang, dt, 1);
      this.contact(pl, dist, ang);
      if (this.t <= 0) {
        const pool = enraged ? ['burst', 'slam', 'charge', 'summon', 'slam'] : ['burst', 'slam', 'charge'];
        this.ability = pool[(Math.random() * pool.length) | 0];
        this.state = 'wind';
        this.t = this.ability === 'charge' ? 0.7 : 0.6;
        this.telegraph = this.t;
        this.lockAngle = ang;
        if (this.ability === 'slam') {
          const r = 42, el = ELEMENTS[ELEMENT_ORDER[(Math.random() * 5) | 0]];
          this.slamAt = { x: pl.x, y: pl.y };
          if (typeof Combat !== 'undefined') Combat.enemyAoe(this, pl.x, pl.y, r, Math.round(this.atk * 1.6), 0.9, [el.color, el.glow, '#ffffff']);
          this.t = 0.9; this.telegraph = 0.9;
        }
      }
    } else if (this.state === 'wind') {
      if (this.ability === 'charge') this.lockAngle = ang;
      if (this.t <= 0) {
        if (this.ability === 'burst') {
          const n = enraged ? 16 : 12, off = Math.random() * 6.28, el = ELEMENTS[ELEMENT_ORDER[(Math.random() * 5) | 0]];
          for (let i = 0; i < n; i++) this.shoot(off + i * Math.PI * 2 / n, { speed: 95, color: el.color, element: el.id, size: 3 });
          FX.ring(this.x, this.y, 4, 36, 0.35, el.color, 1); Sound.play('zap');
          this.state = 'idle'; this.t = gap;
        } else if (this.ability === 'charge') {
          this.state = 'dash'; this.t = 0.5; Sound.play('dash');
        } else if (this.ability === 'summon') {
          for (let i = 0; i < 2; i++) {
            const a = Math.random() * 6.28;
            this.spawnRequests.push({ type: ELEMENT_ORDER.map(function (e) { return BIOME_ENEMY[e]; })[(Math.random() * 5) | 0], x: this.x + Math.cos(a) * 36, y: this.y + Math.sin(a) * 36 });
          }
          FX.ring(this.x, this.y, 4, 44, 0.4, '#b06cff', 1); FX.sparks(this.x, this.y, 20, ['#b06cff', '#ffffff'], 40, 120, 0.5);
          this.state = 'idle'; this.t = gap;
        } else {              // slam: ledakan ditangani Combat.enemyAoe
          this.state = 'idle'; this.t = gap;
        }
      }
    } else if (this.state === 'dash') {
      this.moveToward(this.lockAngle, dt, 4.2);
      if (Math.random() < dt * 50) FX.trail(this.x, this.y, '#b06cff', 5);
      this.contact(pl, dist, ang);
      if (this.t <= 0) { this.state = 'idle'; this.t = gap; }
    }
  }

  draw(ctx, cx, cy, t) {
    if (this.dead) return;
    const sx = this.x - cx, sy = this.y - cy;
    const d = this.data;
    if (sx < -50 || sy < -50 || sx > CFG.W + 50 || sy > CFG.H + 50) return;
    const frame = Math.floor((this.animT + this.x * 0.02) * 4) % 2;
    const img = Assets.enemyFrame(this.type, frame);
    let dw = img.width, dh = img.height;
    if (dw !== d.size + 6 && dw > 40) { dh = Math.round(dh * (d.size + 6) / dw); dw = d.size + 6; }
    const wind = this.state === 'wind' && this.telegraph > 0;
    const shake = wind ? Math.round(Math.sin(t * 60)) : 0;
    const ix = Math.round(sx - dw / 2) + shake, iy = Math.round(sy - dh / 2 - 1);

    drawShadow(ctx, sx, sy + d.size / 2, d.size * 0.5, 2);
    ctx.save();
    if (this.has('freeze')) ctx.globalAlpha = 0.9;
    ctx.drawImage(img, ix, iy, dw, dh);
    if (this.flash > 0) { ctx.globalAlpha = 0.85; ctx.drawImage(whiteOf(img), ix, iy, dw, dh); }
    if (this.has('freeze')) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#bfeaff'; ctx.fillRect(ix, iy, dw, dh); }
    ctx.restore();

    // peringatan sebelum menyerang
    if (this.telegraph > 0 && (this.state === 'wind' || this._pendingShot > 0)) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 40);
      ctx.fillStyle = '#ff3a4a';
      ctx.fillRect(Math.round(sx) - 1, Math.round(sy - d.size / 2 - 11), 2, 5);
      ctx.fillRect(Math.round(sx) - 1, Math.round(sy - d.size / 2 - 4), 2, 2);
      if (this.state === 'wind' && this.ability !== 'slam' && (d.behavior === 'charge' || this.ability === 'charge')) {
        ctx.globalAlpha = 0.25;
        for (let i = 12; i < 70; i += 3) ctx.fillRect(Math.round(sx + Math.cos(this.lockAngle) * i), Math.round(sy + Math.sin(this.lockAngle) * i), 2, 2);
      }
      ctx.restore();
    }

    // bar HP kecil (bos memakai bar besar di UI)
    if (!this.isBoss && this.hpShow > 0 && this.hp < this.maxHp) {
      const w = Math.max(14, d.size), bx = Math.round(sx - w / 2), by = Math.round(sy - d.size / 2 - 7);
      ctx.fillStyle = '#0d0a1c'; ctx.fillRect(bx - 1, by - 1, w + 2, 4);
      ctx.fillStyle = '#5a1020'; ctx.fillRect(bx, by, w, 2);
      ctx.fillStyle = '#ff4a5a'; ctx.fillRect(bx, by, Math.max(1, Math.round(w * this.hp / this.maxHp)), 2);
    }
  }
}

/* Dorong musuh yang saling bertumpuk supaya tidak menyatu */
function separateEnemies(list) {
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.dead) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j];
      if (b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) > 16 || Math.abs(dy) > 16) continue;
      const d = Math.hypot(dx, dy) || 0.01, min = a.r + b.r - 2;
      if (d < min) {
        const push = (min - d) * 0.5 / d;
        if (!a.isBoss) GameMap.move(a, -dx * push, -dy * push, a.half);
        if (!b.isBoss) GameMap.move(b, dx * push, dy * push, b.half);
      }
    }
  }
}

/* =====================================================================
   PICKUP (orb XP, HP, MP)
   ===================================================================== */
const PICKUP = {
  xp: { color: '#b56bff', glow: '#e4d0ff' },
  hp: { color: '#ff5a6a', glow: '#ffc0c8' },
  mp: { color: '#4aa8ff', glow: '#bfe0ff' }
};

class Pickup {
  constructor(type, x, y, value) {
    this.type = type; this.x = x; this.y = y; this.value = value;
    const a = Math.random() * Math.PI * 2, s = 30 + Math.random() * 50;
    this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s;
    this.age = 0; this.dead = false;
    this.life = type === 'xp' ? 1e9 : 18;
  }
  update(dt, pl) {
    this.age += dt;
    if (this.age > this.life) { this.dead = true; return; }
    const k = Math.exp(-6 * dt);
    this.vx *= k; this.vy *= k;
    GameMap.move(this, this.vx * dt, this.vy * dt, 2);
    if (pl.dead) return;
    const dx = pl.x - this.x, dy = pl.y - this.y, d = Math.hypot(dx, dy) || 1;
    if (this.age > 0.4 && d < 70) {
      const sp = 60 + (70 - d) * 5;
      this.x += dx / d * sp * dt; this.y += dy / d * sp * dt;
    }
    if (d < 8 && this.age > 0.25) {
      this.dead = true;
      const c = PICKUP[this.type];
      if (this.type === 'xp') pl.addXp(this.value);
      else if (this.type === 'hp') { const h = pl.heal(this.value); if (h > 0) FX.text(pl.x, pl.y - 14, '+' + Math.round(h), '#7dff9a', false); }
      else if (this.type === 'mp') pl.mp = Math.min(pl.maxMp, pl.mp + this.value);
      FX.pickup(pl.x, pl.y, c.color); Sound.play('pickup');
    }
    if (Math.random() < dt * 6) FX.add({ x: this.x, y: this.y, vy: -8, life: 0.4, size: 2, size1: 0, color: PICKUP[this.type].color, add: true });
  }
  draw(ctx, cx, cy, t) {
    const c = PICKUP[this.type];
    const sx = Math.round(this.x - cx), sy = Math.round(this.y - cy + Math.sin(t * 5 + this.x) * 1.5);
    if (sx < -10 || sy < -10 || sx > CFG.W + 10 || sy > CFG.H + 10) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35; ctx.fillStyle = c.color; ctx.fillRect(sx - 4, sy - 4, 8, 8);
    ctx.restore();
    ctx.fillStyle = c.color; ctx.fillRect(sx - 2, sy - 2, 4, 4);
    ctx.fillStyle = c.glow; ctx.fillRect(sx - 1, sy - 2, 2, 2);
  }
}

/* Hasil jatuhan saat musuh mati */
function dropLoot(e) {
  const out = [];
  const n = e.isBoss ? 12 : 1 + Math.floor(e.xp / 9);
  const each = Math.max(1, Math.ceil(e.xp / n));
  for (let i = 0; i < n; i++) out.push(new Pickup('xp', e.x, e.y, each));
  if (Math.random() < (e.isBoss ? 1 : 0.14)) out.push(new Pickup('hp', e.x, e.y, e.isBoss ? 60 : 18));
  if (Math.random() < (e.isBoss ? 1 : 0.14)) out.push(new Pickup('mp', e.x, e.y, e.isBoss ? 40 : 14));
  return out;
}
