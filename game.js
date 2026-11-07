/* =====================================================================
   js/game.js : loop utama, alur menu -> pilih karakter -> main -> kalah/menang
   Harus dimuat paling akhir (lihat urutan di index.html).
   ===================================================================== */
'use strict';

(function () {
  /* ---------- Tampilkan pesan kalau ada file yang belum ada / error ---------- */
  function fatal(msg) {
    let b = document.getElementById('fatal');
    if (!b) {
      b = document.createElement('pre');
      b.id = 'fatal';
      b.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99999;margin:0;padding:8px;' +
        'background:rgba(120,0,0,.94);color:#fff;font:12px monospace;white-space:pre-wrap;max-height:60%;overflow:auto';
      document.body.appendChild(b);
    }
    b.textContent = msg;
  }

  const CHECK = [
    ['CFG', 'config.js', function () { return CFG; }],
    ['Input', 'input.js', function () { return Input; }],
    ['Assets', 'assets.js', function () { return Assets; }],
    ['Sound', 'assets.js', function () { return Sound; }],
    ['FX', 'particles.js', function () { return FX; }],
    ['GameMap', 'map.js', function () { return GameMap; }],
    ['Player', 'entities.js', function () { return Player; }],
    ['Combat', 'combat.js', function () { return Combat; }],
    ['UI', 'ui.js', function () { return UI; }]
  ];
  const missing = [];
  CHECK.forEach(function (c) {
    try { c[2](); } catch (e) { missing.push('js/' + c[1] + '   (' + c[0] + ')'); }
  });
  if (missing.length) {
    fatal('File berikut belum ada atau error saat dimuat:\n' + missing.join('\n') +
      '\n\nPastikan nama file di folder js sama dengan yang dipanggil index.html.');
    return;
  }

  /* ---------- Keadaan game ---------- */
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const W = { player: null, enemies: [], pickups: [] };
  const SECTORS = GameMap.SECTORS;
  const MAX_ENEMIES = 45;

  let state = 'loading';       // loading | menu | play | pause | dead | won | error
  let last = 0, clock = 0, playT = 0;
  let boss = null, deadT = 0, winT = 0, spawnT = 2;
  let charId = 'akira', dashQ = false;

  /* ---------- Bantuan ---------- */
  function nearest(x, y, range) {
    let best = null, bd = range;
    for (let i = 0; i < W.enemies.length; i++) {
      const e = W.enemies[i];
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function spawnOne(biome, px, py, minD, maxD) {
    const type = enemyForBiome(biome);
    if (!type) return null;
    const p = GameMap.randomSpot(biome, px, py, minD, maxD);
    const lv = 1 + Math.floor(Math.hypot(p.x - GameMap.spawn.x, p.y - GameMap.spawn.y) / 230);
    const e = new Enemy(type, p.x, p.y, lv);
    W.enemies.push(e);
    return e;
  }

  function countEnemies() {
    let n = 0;
    for (let i = 0; i < W.enemies.length; i++) if (!W.enemies[i].isBoss && !W.enemies[i].dead) n++;
    return n;
  }

  /* ---------- Mulai / menu ---------- */
  function start(id) {
    charId = id;
    GameMap.build();
    FX.clear();
    W.player = new Player(id);
    W.enemies = [];
    W.pickups = [];
    Combat.reset(W);

    SECTORS.forEach(function (b) {
      for (let i = 0; i < 9; i++) spawnOne(b, GameMap.spawn.x, GameMap.spawn.y, 150, 1e9);
    });
    boss = new Enemy('guardian', GameMap.bossPos.x, GameMap.bossPos.y, 2);
    W.enemies.push(boss);

    Camera.snap(W.player);
    playT = 0; deadT = 0; winT = 0; spawnT = 2; dashQ = false;
    UI.hideMenu();
    UI.hideOverlay();
    UI.startHud(W.player);
    UI.setTouch(true);
    Sound.music('bgm');
    state = 'play';
    UI.toast('Jelajahi lima wilayah. Penjaga ada di utara.');
  }

  function showTitle() { UI.showMenu(showSelect); }
  function showSelect() { UI.showSelect(start, showTitle); }

  function toMenu() {
    state = 'menu';
    UI.hideOverlay();
    UI.setTouch(false);
    Sound.music(null);
    showTitle();
  }

  function setPause(on) {
    if (on && state === 'play') {
      state = 'pause';
      UI.showPause(function () { setPause(false); }, toMenu);
    } else if (!on && state === 'pause') {
      state = 'play';
      UI.hideOverlay();
    }
  }

  function stats() { return { level: W.player.level, kills: W.player.kills, time: playT }; }

  /* ---------- Kejadian ---------- */
  function onKill(e) {
    FX.death(e.x, e.y, ELEMENTS[e.element].color, Math.round(e.data.size / 2));
    dropLoot(e).forEach(function (p) { W.pickups.push(p); });
    W.player.kills++;
    if (e.isBoss) {
      FX.flash('#ffffff', 0.6, 0.5); FX.shake(8, 0.6); FX.hitstop(0.12);
      Sound.play('explode');
      winT = 2.2;
      boss = null;
    }
  }

  function spawnFromBoss(b) {
    b.spawnRequests.forEach(function (r) {
      if (countEnemies() >= MAX_ENEMIES + 6) return;
      let x = r.x, y = r.y;
      if (GameMap.solidAt(x, y)) { x = b.x; y = b.y; }
      const e = new Enemy(r.type, x, y, 2);
      e.aggro = true;
      W.enemies.push(e);
    });
    b.spawnRequests.length = 0;
  }

  /* ---------- Update ---------- */
  function update(dt) {
    dt = FX.tick(dt);
    const pl = W.player;
    playT += dt;

    const canAct = state === 'play' && !pl.dead;
    const ax = canAct ? Input.axis() : { x: 0, y: 0 };
    pl.update(dt, ax.x, ax.y);

    if (canAct) {
      const tg = nearest(pl.x, pl.y, 150);
      pl.aim = tg ? Math.atan2(tg.y - pl.y, tg.x - pl.x) : pl.faceAngle;

      if (Input.pressed('elem')) {
        const c = pl.cycleElement();
        Sound.play('elem');
        UI.banner(c.name + '  ' + ELEMENTS[c.a].icon + '+' + ELEMENTS[c.b].icon, ELEMENTS[c.b].color);
      }
      if (Input.pressed('dash') || dashQ) pl.dash(ax.x, ax.y);
      if (Input.pressed('skill')) {
        const c = pl.currentCombo();
        if (pl.canSkill()) Combat.skill(pl);
        else if (c && pl.mp < c.mp && !pl.stunned()) UI.toast('MP tidak cukup');
      }
      if (Input.held('attack') && pl.canAttack()) Combat.attack(pl);
    }
    dashQ = false;

    // musuh
    for (let i = 0; i < W.enemies.length; i++) {
      const e = W.enemies[i];
      if (e.dead) continue;
      const d = Math.hypot(e.x - pl.x, e.y - pl.y);
      if (e.isBoss || d < 420 || e.aggro) e.update(dt, pl);
      if (e.spawnRequests.length) spawnFromBoss(e);
    }
    separateEnemies(W.enemies);

    Combat.update(dt);
    FX.update(dt);

    for (let i = W.enemies.length - 1; i >= 0; i--) {
      if (W.enemies[i].dead) { onKill(W.enemies[i]); W.enemies.splice(i, 1); }
    }
    for (let i = W.pickups.length - 1; i >= 0; i--) {
      const p = W.pickups[i];
      p.update(dt, pl);
      if (p.dead) W.pickups.splice(i, 1);
    }

    // musuh baru muncul pelan-pelan
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnT = 3.5;
      if (countEnemies() < MAX_ENEMIES) {
        let b = GameMap.biomeAt(pl.x, pl.y);
        if (SECTORS.indexOf(b) < 0) b = SECTORS[(Math.random() * SECTORS.length) | 0];
        const e = spawnOne(b, pl.x, pl.y, 170, 420);
        if (e && Math.hypot(e.x - pl.x, e.y - pl.y) < 110) W.enemies.pop();
      }
    }

    Camera.follow(pl, dt);
    FX.ambient(Camera.x, Camera.y, dt);

    if (pl.dead && state === 'play') { state = 'dead'; deadT = 1.4; }
    if (state === 'dead') {
      deadT -= dt;
      if (deadT <= 0) {
        state = 'over';
        UI.setTouch(false);
        UI.showGameOver(stats(), function () { start(charId); }, toMenu);
      }
    }
    if (winT > 0 && state === 'play') {
      winT -= dt;
      if (winT <= 0) {
        state = 'won';
        UI.showWin(stats(), function () { state = 'play'; UI.hideOverlay(); }, toMenu);
      }
    }

    UI.updateHud(pl, boss);
  }

  /* ---------- Gambar ---------- */
  function draw() {
    const pl = W.player;
    const cam = Camera.pos(), cx = cam.x, cy = cam.y;

    GameMap.drawBackground(ctx, cx, cy, clock);
    GameMap.draw(ctx, cx, cy, clock);
    FX.draw(ctx, cx, cy, 0);
    Combat.draw(ctx, cx, cy, clock, 0);

    for (let i = 0; i < W.pickups.length; i++) W.pickups[i].draw(ctx, cx, cy, clock);

    const list = [];
    for (let i = 0; i < W.enemies.length; i++) if (!W.enemies[i].dead) list.push(W.enemies[i]);
    list.push(pl);
    list.sort(function (a, b) { return a.y - b.y; });
    for (let i = 0; i < list.length; i++) list[i].draw(ctx, cx, cy, clock);

    Combat.draw(ctx, cx, cy, clock, 1);
    FX.draw(ctx, cx, cy, 1);
    FX.drawOverlay(ctx);
  }

  /* ---------- Loop ---------- */
  function loop(ts) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0, (ts - last) / 1000));
    last = ts;
    clock += dt;

    if (state === 'loading' || state === 'menu' || state === 'error') { Input.endFrame(); return; }

    try {
      if (Input.pressed('pause')) {
        if (state === 'play') setPause(true);
        else if (state === 'pause') setPause(false);
      }
      if (state === 'play' || state === 'dead') update(dt);
      draw();
    } catch (err) {
      state = 'error';
      fatal('Error di game: ' + err.message + '\n' + (err.stack || '').split('\n').slice(0, 4).join('\n'));
    }
    Input.endFrame();
  }

  /* ---------- Tombol Dash (sentuh) ---------- */
  const bd = document.getElementById('btn-dash');
  if (bd) {
    bd.addEventListener('pointerdown', function (e) { dashQ = true; bd.classList.add('down'); e.preventDefault(); });
    const up = function () { bd.classList.remove('down'); };
    bd.addEventListener('pointerup', up);
    bd.addEventListener('pointercancel', up);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) setPause(true);
  });

  /* ---------- Mulai ---------- */
  UI.setTouch(false);
  UI.showLoading(0);
  Assets.load(function (p) { UI.showLoading(p); }).then(function () {
    state = 'menu';
    showTitle();
  }).catch(function (err) {
    fatal('Gagal memuat aset: ' + err.message);
  });
  requestAnimationFrame(loop);
})();
