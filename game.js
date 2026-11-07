/* Aetheria — game.js : loop utama dan alur game */
'use strict';

const Game = {
  canvas: null, ctx: null, state: 'loading', player: null, cam: { x: 0, y: 0 }, last: 0,

  init: function () {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    Assets.load(function () {
      UI.init();
      Game.toMenu();
      requestAnimationFrame(Game.loop);
    });
  },

  toMenu: function () {
    this.state = 'menu';
    UI.showMenu(function (id) { Game.start(id); });
  },

  start: function (charId) {
    GameMap.generate();
    FX.clear(); Combat.reset(); Input.clear();
    this.player = new Player(charId);
    UI.hideMenu();
    this.state = 'play';
  },

  update: function (dt) {
    const p = this.player;
    if (!p) return;
    if (!p.dead) {
      p.update(dt, Input.dir());
      if (Input.held('attack')) Combat.attack(p);
      if (Input.pressed('skill')) Combat.skill(p);
      if (Input.pressed('elem')) { p.cycleElem(); const c = p.combo(); UI.flash(c ? c.name : ''); }
      if (Input.pressed('dash')) p.dash();
    }
    Combat.update(dt, p);
    FX.update(dt);
    this.cam.x = Math.max(0, Math.min(GameMap.w - CFG.W, p.x - CFG.W / 2));
    this.cam.y = Math.max(0, Math.min(GameMap.h - CFG.H, p.y - CFG.H / 2));
    UI.updateHud(p, Combat, dt);
    if (p.dead && this.state === 'play') {
      this.state = 'over';
      UI.showDialog('KALAH', 'Gelombang ' + Combat.wave + '\nSkor ' + Combat.score + '\nMusuh dikalahkan ' + Combat.kills, 'Menu', function () { Game.toMenu(); });
    }
  },

  render: function () {
    const ctx = this.ctx;
    ctx.fillStyle = '#0a0a14'; ctx.fillRect(0, 0, CFG.W, CFG.H);
    if (!this.player || this.state === 'menu') return;
    GameMap.draw(ctx, this.cam);
    Combat.draw(ctx, this.cam);
    this.player.draw(ctx, this.cam);
    FX.draw(ctx, this.cam);
  },

  loop: function (t) {
    const dt = Math.min(0.05, (t - Game.last) / 1000 || 0);
    Game.last = t;
    if (Game.state === 'play' || Game.state === 'over') Game.update(dt);
    Game.render();
    requestAnimationFrame(Game.loop);
  }
};

Game.init();
