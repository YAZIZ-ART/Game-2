/* Aetheria — combat.js : serangan, skill kombinasi elemen, gelombang musuh */
'use strict';

const Combat = {
  enemies: [], wave: 0, score: 0, waveT: 1.5, kills: 0,

  reset: function () { this.enemies = []; this.wave = 0; this.score = 0; this.kills = 0; this.waveT = 1.5; },

  spawnWave: function (p) {
    this.wave++;
    const pool = ENEMY_IDS.filter(function (id) { return id !== 'boss'; }).slice(0, Math.min(5, 1 + Math.ceil(this.wave / 2)));
    const n = 3 + this.wave * 2;
    for (let i = 0; i < n; i++) {
      const pos = GameMap.randomFloor(p.x, p.y, 120);
      this.enemies.push(new Enemy(pool[Math.floor(Math.random() * pool.length)], pos.x, pos.y, this.wave));
    }
    if (this.wave % 5 === 0) {
      const pos = GameMap.randomFloor(p.x, p.y, 150);
      this.enemies.push(new Enemy('boss', pos.x, pos.y, this.wave));
    }
    UI.flash('Gelombang ' + this.wave);
  },

  hit: function (e, dmg, p) {
    dmg = Math.round(dmg);
    e.hurt(dmg, p.x, p.y);
    FX.text(e.x, e.y - 14, dmg, '#ffe066');
    FX.burst(e.x, e.y, ELEMENTS[p.elem].color, 5, 50);
  },

  attack: function (p) {
    if (p.atkCd > 0 || p.dead) return;
    const w = p.weapon;
    p.atkCd = w.speed;
    FX.slash(p.x + p.face.x * 10, p.y + p.face.y * 10, p.face.x, p.face.y, ELEMENTS[p.elem].color);
    const reach = w.range + 10;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d < reach + e.r && ((dx * p.face.x + dy * p.face.y) / d > 0.2 || d < e.r + 8)) this.hit(e, w.damage, p);
    }
  },

  skill: function (p) {
    if (p.dead) return;
    const c = p.combo();
    if (!c) return;
    if (p.skillCd > 0) return;
    if (p.mana < c.cost) { UI.flash('Mana kurang'); return; }
    p.mana -= c.cost; p.skillCd = c.cooldown;
    const radius = 55 + c.tier * 20;
    FX.ring(p.x, p.y, radius, c.color);
    FX.burst(p.x, p.y, c.glow, 24, 110);
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (Math.hypot(e.x - p.x, e.y - p.y) < radius + e.r) this.hit(e, p.weapon.damage * c.damage * 1.5, p);
    }
    UI.flash(c.name);
  },

  update: function (dt, p) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, p);
      if (e.hp <= 0) {
        this.score += e.xp; this.kills++;
        p.mana = Math.min(p.maxMana, p.mana + 3);
        FX.burst(e.x, e.y, '#ffffff', 12, 80);
        this.enemies.splice(i, 1);
      }
    }
    if (!this.enemies.length && !p.dead) {
      this.waveT -= dt;
      if (this.waveT <= 0) { this.spawnWave(p); this.waveT = 2.5; }
    }
  },

  draw: function (ctx, cam) { this.enemies.forEach(function (e) { e.draw(ctx, cam); }); }
};
