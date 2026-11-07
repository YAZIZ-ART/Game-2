/* Aetheria — entities.js : Player dan Enemy */
'use strict';

class Player {
  constructor(charId) {
    const c = CHARACTERS[charId] || CHARACTERS[CHARACTER_IDS[0]];
    this.id = c.id; this.name = c.name;
    this.weapon = WEAPONS[c.weapon];
    this.elem = c.element;
    this.second = this.nextElem(this.elem);
    this.maxHp = c.hp; this.hp = c.hp;
    this.maxMana = c.mana; this.mana = c.mana;
    this.speed = c.speed;
    this.x = GameMap.w / 2; this.y = GameMap.h / 2;
    this.r = 6;
    this.face = { x: 1, y: 0 };
    this.atkCd = 0; this.skillCd = 0; this.dashCd = 0; this.dashT = 0; this.inv = 0;
    this.dashDir = { x: 1, y: 0 };
    this.dead = false;
  }

  nextElem(after) {
    const list = ELEMENT_IDS.filter(function (e) { return e !== this.elem; }, this);
    if (!this.second) return list[0];
    const i = list.indexOf(after);
    return list[(i + 1) % list.length];
  }

  cycleElem() { this.second = this.nextElem(this.second); }
  combo() { return getCombo(this.elem, this.second); }

  move(dx, dy) {
    if (!GameMap.blocked(this.x + dx, this.y, this.r)) this.x += dx;
    if (!GameMap.blocked(this.x, this.y + dy, this.r)) this.y += dy;
  }

  dash() {
    if (this.dashCd > 0 || this.dashT > 0) return;
    this.dashT = 0.18; this.dashCd = 0.9; this.inv = 0.28;
    this.dashDir = { x: this.face.x, y: this.face.y };
    FX.burst(this.x, this.y, ELEMENTS[this.elem].glow, 8, 40);
  }

  hurt(d) {
    if (this.inv > 0 || this.dead) return;
    this.hp -= d; this.inv = 0.6;
    FX.text(this.x, this.y - 12, '-' + Math.round(d), '#ff6b6b');
    FX.burst(this.x, this.y, '#ff4040', 8, 50);
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
  }

  update(dt, dir) {
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.move(this.dashDir.x * this.speed * 3.2 * dt, this.dashDir.y * this.speed * 3.2 * dt);
    } else {
      if (dir.x || dir.y) {
        const l = Math.hypot(dir.x, dir.y);
        this.face = { x: dir.x / l, y: dir.y / l };
      }
      this.move(dir.x * this.speed * dt, dir.y * this.speed * dt);
    }
    this.atkCd = Math.max(0, this.atkCd - dt);
    this.skillCd = Math.max(0, this.skillCd - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.inv = Math.max(0, this.inv - dt);
    this.mana = Math.min(this.maxMana, this.mana + 6 * dt);
  }

  draw(ctx, cam) {
    const s = Assets.sprite('characters', this.id);
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    if (this.inv > 0 && Math.floor(this.inv * 20) % 2) ctx.globalAlpha = 0.4;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - 6, y + 8, 12, 3);
    ctx.drawImage(s, x - 12, y - 16, 24, 24);
    ctx.globalAlpha = 1;
    ctx.fillStyle = ELEMENTS[this.elem].color;
    ctx.fillRect(x + Math.round(this.face.x * 12) - 1, y + Math.round(this.face.y * 12) - 1, 3, 3);
  }
}

class Enemy {
  constructor(type, x, y, wave) {
    const d = ENEMIES[type];
    this.type = type; this.name = d.name; this.element = d.element;
    this.boss = type === 'boss';
    this.maxHp = Math.round(d.hp * (1 + wave * 0.12)); this.hp = this.maxHp;
    this.damage = d.damage; this.speed = d.speed; this.xp = d.xp;
    this.x = x; this.y = y;
    this.r = this.boss ? 14 : 7;
    this.atkCd = 0; this.kx = 0; this.ky = 0;
  }

  hurt(dmg, fx, fy) {
    this.hp -= dmg;
    const l = Math.hypot(this.x - fx, this.y - fy) || 1;
    this.kx = (this.x - fx) / l * (this.boss ? 50 : 140);
    this.ky = (this.y - fy) / l * (this.boss ? 50 : 140);
  }

  update(dt, p) {
    const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy) || 1;
    let vx = this.kx, vy = this.ky;
    this.kx *= 0.85; this.ky *= 0.85;
    if (d > this.r + 5) { vx += dx / d * this.speed; vy += dy / d * this.speed; }
    if (!GameMap.blocked(this.x + vx * dt, this.y, this.r - 1)) this.x += vx * dt;
    if (!GameMap.blocked(this.x, this.y + vy * dt, this.r - 1)) this.y += vy * dt;
    this.atkCd = Math.max(0, this.atkCd - dt);
    if (d < this.r + p.r + 2 && this.atkCd <= 0) { p.hurt(this.damage); this.atkCd = 0.9; }
  }

  draw(ctx, cam) {
    const s = Assets.sprite('enemies', this.type);
    const size = this.boss ? 48 : 20;
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - size / 3, y + size / 3, size * 0.66, 3);
    ctx.drawImage(s, x - size / 2, y - size * 0.7, size, size);
    if (this.hp < this.maxHp) {
      const w = this.boss ? 40 : 16;
      ctx.fillStyle = '#300'; ctx.fillRect(x - w / 2, y - size * 0.8, w, 2);
      ctx.fillStyle = '#f44'; ctx.fillRect(x - w / 2, y - size * 0.8, w * this.hp / this.maxHp, 2);
    }
  }
}
