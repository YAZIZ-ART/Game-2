/* ============================================================
   UI: menu utama, pilih karakter, HUD, level-up, jeda, game over, loop utama
   ============================================================ */
'use strict';
const UI = {
  sel:'Arcelia', settings:{ mus:true, musV:35, sfx:true, sfxV:70, auto:true }, hudT:0, chipSig:'', gestured:false, scale:1,
  show(id){ $('#' + id).classList.remove('hidden'); }, hide(id){ $('#' + id).classList.add('hidden'); },
  hideAll(){ ['titleScr', 'selScr', 'hud', 'lvScr', 'pauseScr', 'deadScr', 'optScr', 'credScr', 'loadScr', 'banner'].forEach(i => this.hide(i)); },

  /* ----- ukuran layar ----- */
  fit(){
    const vv = window.visualViewport, vw = Math.round(vv ? vv.width : innerWidth), vh = Math.round(vv ? vv.height : innerHeight), wrap = $('#wrap');
    wrap.style.width = vw + 'px'; wrap.style.height = vh + 'px';
    // ukuran UI diatur per kelompok lewat CSS (clamp/dvh/vw); tidak ada scale global dan terpisah dari zoom kamera
    const dpr = Math.min(devicePixelRatio || 1, 2), cv = G.canvas;
    let cw = Math.round(vw * dpr), ch = Math.round(vh * dpr); if (cw > 2200) { ch = Math.round(ch * 2200 / cw); cw = 2200; }
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    // zoom kamera: lebih jauh dari sebelumnya, menyesuaikan tinggi layar; area terlihat mengikuti rasio layar (tidak gepeng)
    const eff = cw / vw, zc = clamp(vh / 360, 1.25, 2.6), Z = Math.max(1, Math.round(zc * eff * 2) / 2);
    G.view = { w:cw / Z, h:ch / Z, z:Z }; G.ctx.imageSmoothingEnabled = false;
    if (G.groundPat) makeGround();
  },
  loadSettings(){
    try { const s = JSON.parse(localStorage.getItem('aetheria.settings') || 'null'); if (s) Object.assign(this.settings, s); } catch (e) {}
    this.applySettings();
  },
  saveSettings(){ try { localStorage.setItem('aetheria.settings', JSON.stringify(this.settings)); } catch (e) {} },
  applySettings(){
    const s = this.settings; Snd.on = s.sfx; Snd.vol = s.sfxV / 100; Music.on = s.mus; Music.setVol(s.musV / 100 * .6); G.auto = s.auto;
    if (!s.mus) Music.stop(); else if (this.gestured) Music.start();
    $('#oMus').checked = s.mus; $('#oMusV').value = s.musV; $('#oSfx').checked = s.sfx; $('#oSfxV').value = s.sfxV; $('#oAuto').checked = s.auto;
    $('#bAuto').classList.toggle('on', s.auto);
  },
  isFull(){ return !!(document.fullscreenElement || document.webkitFullscreenElement); },
  goFull(toggle){
    const el = document.documentElement;
    try {
      if (this.isFull()) { if (toggle) (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      const rq = el.requestFullscreen || el.webkitRequestFullscreen; if (rq) { const p = rq.call(el, { navigationUI:'hide' }); if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {}); }
    } catch (e) {}
  },
  gesture(){ if (this.gestured) return; this.gestured = true; Snd.init(); this.applySettings(); Music.start(G.state === 'play' ? 'battle' : 'menu'); },

  /* ----- menu utama ----- */
  toTitle(){
    this.hideAll(); G.state = 'title'; G.P = null; G.mons = []; G.projs = []; G.orbs = []; G.zones = []; G.timers = []; G.nums = []; FX.clear(); G.extras = [];
    this.show('titleScr'); Music.start('menu'); this.menuScene();
  },
  menuScene(){
    const C = WORLD / 2, names = ['Azarel', 'Guts', 'Lunaria', 'Draven'];
    G.extras = names.map((n, i) => ({ y:C + 10 + (i % 2) * 34, x:C - 60 + i * 40, n, draw(ctx) { const bob = Math.sin(G.t * 2.4 + i) * .6; drawAura(ctx, this.n, G.t + i, this.x, this.y); SHADOW(ctx, this.x, this.y - 1, 12, 4.5); drawCharFrame(ctx, this.n, 1, 0, 2, this.x, this.y + bob); } }));
    names.forEach(n => Assets.loadChar(n, true));
  },

  /* ----- pilih karakter ----- */
  toSelect(){
    this.hideAll(); G.state = 'select'; G.extras = []; this.show('selScr');
    const t = $('#tiles'); t.innerHTML = '';
    CHAR_ORDER.forEach(n => {
      const b = document.createElement('button'); b.className = 'tile'; b.dataset.n = n; const c = document.createElement('canvas'); c.width = c.height = 64; b.appendChild(c);
      b.onclick = () => { Snd.play('menu'); this.select(n); }; t.appendChild(b);
      Assets.loadChar(n, true).then(() => this.drawTile(n, c));
    });
    this.select(this.sel);
  },
  drawTile(n, c){
    const x = c.getContext('2d'), ci = Assets.img['c:' + n + '1'], wi = Assets.img['w:' + n + '1']; if (!ci) return; x.imageSmoothingEnabled = false; x.clearRect(0, 0, 64, 64);
    const bb = MANIFEST.chars[n].bbox, sx = 96 - 32, sy = bb[1] - 6, sr = 2 * 192; if (wi) x.drawImage(wi, sx, sr + sy, 64, 64, 0, 0, 64, 64); x.drawImage(ci, sx, sr + sy, 64, 64, 0, 0, 64, 64); if (wi) x.drawImage(wi, sx, sr + sy, 64, 64, 0, 0, 64, 64);
  },
  select(n){
    this.sel = n; const c = CHAR_STATS[n], m = MANIFEST.chars[n];
    $$('.tile').forEach(t => t.classList.toggle('sel', t.dataset.n === n));
    $('#cName').textContent = n.toUpperCase(); $('#cTitle').textContent = c.title + ' • ' + c.elem;
    const rows = [['HP', c.hp, 160, '#ff6a7a', Math.round(c.hp)], ['MP', c.mp, 130, '#6aa8ff', Math.round(c.mp)], ['ATK', c.atk, 17, '#ffb04a', c.atk], ['DEF', c.def, 8, '#9ad0ff', c.def], ['SPD', c.spd, 112, '#7dffb0', c.spd], ['ASPD', c.aspd, 1.5, '#ffe36a', c.aspd.toFixed(2)], ['CRIT', c.crit, .2, '#ff7ad9', Math.round(c.crit * 100) + '%'], ['EXP', c.expMul, 1.15, '#d0a0ff', 'x' + c.expMul.toFixed(2)]];
    $('#cStats').innerHTML = rows.map(r => `<div class="row"><label>${r[0]}</label><div class="v"><i style="width:${clamp(r[1] / r[2], .05, 1) * 100}%;background:${r[3]}"></i></div><b>${r[4]}</b></div>`).join('');
    $('#cPassName').textContent = 'PASIF: ' + c.passive.name; $('#cPassDesc').textContent = c.passive.desc;
    $('#cSkills').innerHTML = m.skills.map((s, i) => `<div class="sk"><i>${i + 1}</i><b>${s.name}</b><u>CD ${s.cooldown_s}s</u></div>`).join('') + `<div class="sk"><i>⚔</i><b>Senjata: ${m.weapon}</b></div>`;
    Assets.loadChar(n, true);
  },
  drawPreview(){
    const cv = $('#prevCv'), x = cv.getContext('2d'), n = this.sel, m = MANIFEST.chars[n]; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, 256, 256); x.imageSmoothingEnabled = false;
    if (!Assets.img['c:' + n + '1']) return;
    const d = m.skills[0], total = d.frames * d.frame_ms / 1000 + .8, t = G.t % total, fr = Math.min(d.frames - 1, Math.floor(t / (d.frame_ms / 1000))), playing = t < d.frames * d.frame_ms / 1000;
    x.setTransform(3, 0, 0, 3, 0, 0); SHADOW(x, 42.7, 70, 14, 5, .35);
    drawAura(x, n, G.t, 42.7, 70); drawCharFrame(x, n, 1, playing ? fr : 0, 2, 42.7, 70); if (playing) drawElem(x, n, 1, t / (d.frames * d.frame_ms / 1000), 2, 42.7, 70, 1);
    x.setTransform(1, 0, 0, 1, 0, 0);
  },

  /* ----- mulai game ----- */
  async start(name){
    this.hideAll(); this.show('loadScr'); $('#loadTxt').textContent = 'Menyiapkan ' + name + '…'; $('#loadBar').style.width = '10%';
    const jobs = [Assets.loadChar(name)]; for (const k in MONSTERS) jobs.push(Assets.loadMonster(MONSTERS[k].sheet));
    const ids = new Set(['ice-lance', 'hit-spark', 'crit-hit', 'poof', 'level-up', 'xp-orb']); const b = CHAR_STATS[name].basic; if (b.fx) ids.add(b.fx);
    CHAR_SKILLS[name].forEach(s => s.fx.forEach(f => ids.add(f.id))); ids.forEach(i => jobs.push(Assets.loadFx(i)));
    let done = 0; jobs.forEach(j => j.then(() => { done++; $('#loadBar').style.width = (10 + 90 * done / jobs.length) + '%'; })); await Promise.all(jobs);
    G.mons = []; G.projs = []; G.orbs = []; G.zones = []; G.timers = []; G.nums = []; G.extras = []; G.kills = 0; G.eliteKills = 0; G.t = 0; G.spawnT = 0; G.bossT = 0; G.boss = null; G.levelUps = 0; FX.clear();
    G.P = newPlayer(name); const P = G.P; G.cam.x = P.x - 240; G.cam.y = P.y - 150; Input.pressed = {}; Input.held = {}; Input.joy.x = Input.joy.y = 0; G.hist = null;
    this.hideAll(); this.show('hud'); this.chipSig = '';
    const sk = MANIFEST.chars[name].skills; ['s1', 's2', 's3'].forEach((id, i) => { $('#' + id).title = sk[i].name; });
    this.drawPortrait(); G.state = 'play'; Music.start('battle'); this.banner('MISI: BERTAHAN & NAIK LEVEL!');
  },
  drawPortrait(){
    const c = $('#portrait'), x = c.getContext('2d'), n = G.P.name, ci = Assets.img['c:' + n + '1'], wi = Assets.img['w:' + n + '1']; x.imageSmoothingEnabled = false; x.clearRect(0, 0, 48, 48); if (!ci) return;
    const bb = MANIFEST.chars[n].bbox, sx = 96 - 24, sy = 2 * 192 + bb[1] - 2; x.drawImage(ci, sx, sy, 48, 48, 0, 0, 48, 48); if (wi) x.drawImage(wi, sx, sy, 48, 48, 0, 0, 48, 48);
  },
  banner(txt){ const b = $('#banner'); b.textContent = txt; b.classList.remove('hidden'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; clearTimeout(this.bt); this.bt = setTimeout(() => b.classList.add('hidden'), 2600); },

  /* ----- HUD ----- */
  hud(dt){
    if (!G.P || !$('#hud') || $('#hud').classList.contains('hidden')) return; this.hudT -= dt; if (this.hudT > 0) return; this.hudT = .06;
    const P = G.P, s = P.st, need = expNeed(P.c, P.lv);
    $('#hpF').style.width = clamp(P.hp / s.maxHp * 100, 0, 100) + '%'; $('#hpT').textContent = Math.ceil(P.hp) + ' / ' + Math.round(s.maxHp) + (P.abs.t > 0 && P.abs.v > 0 ? ' +' + Math.round(P.abs.v) : '');
    $('#mpF').style.width = clamp(P.mp / s.maxMp * 100, 0, 100) + '%'; $('#mpT').textContent = Math.floor(P.mp) + ' / ' + Math.round(s.maxMp);
    $('#xpF').style.width = clamp(P.exp / need * 100, 0, 100) + '%'; $('#xpT').textContent = 'EXP ' + Math.floor(P.exp) + ' / ' + need;
    const tm = Math.floor(G.t), mm = String(Math.floor(tm / 60)).padStart(2, '0'), ss = String(tm % 60).padStart(2, '0');
    $('#stat').textContent = `Lv${P.lv}  ${mm}:${ss}  ☠${G.kills}`;
    const sk = MANIFEST.chars[P.name].skills;
    ['s1', 's2', 's3'].forEach((id, i) => { const b = $('#' + id), cd = P.cd[i]; $('em', b).style.height = (cd > 0 ? cd / sk[i].cooldown_s * 100 : 0) + '%'; $('span', b).textContent = cd > 0 ? Math.ceil(cd) : ['⚔', '✦', '★'][i]; });
    const d = $('#dashB'); $('em', d).style.height = (P.dashCd > 0 ? P.dashCd / (2.8 * s.dashCd) * 100 : 0) + '%';
    for (let i = 0; i < 3; i++) {
      const b = $('#p' + i), a = P.powers.active[i], sp = $('span', b);
      if (!a) { b.classList.add('empty'); sp.textContent = '·'; $('u', b).textContent = 'QER'[i]; $('em', b).style.height = '0'; continue; }
      b.classList.remove('empty'); const pw = POWER_BY_ID[a.id]; $('u', b).textContent = 'QER'[i]; $('em', b).style.height = (P.pcd[i] > 0 ? P.pcd[i] / pw.cd * 100 : 0) + '%'; sp.textContent = P.pcd[i] > 0 ? Math.ceil(P.pcd[i]) : pw.icon; b.title = pw.name + ' Lv' + a.lv;
    }
    const sig = JSON.stringify(P.powers); if (sig !== this.chipSig) {
      this.chipSig = sig; const ch = [];
      P.powers.passive.forEach(a => ch.push(['passive', POWER_BY_ID[a.id].icon, a.lv])); P.powers.active.forEach(a => ch.push(['active', POWER_BY_ID[a.id].icon, a.lv])); if (P.powers.curse) ch.push(['curse', POWER_BY_ID[P.powers.curse.id].icon, P.powers.curse.lv]);
      $('#chips').innerHTML = ch.map(c => `<span class="chip ${c[0]}">${c[1]}<small>${c[2]}</small></span>`).join('');
    }
    const bb = $('#bossBar'); if (G.boss && !G.boss.dead) { bb.classList.remove('hidden'); $('#bossName').textContent = 'MINOTAUR Lv' + G.boss.lv; $('#bossF').style.width = clamp(G.boss.hp / G.boss.maxHp * 100, 0, 100) + '%'; } else bb.classList.add('hidden');
    $('#vig').classList.toggle('low', P.hp / s.maxHp < .3 && !P.dead);
  },

  /* ----- level up ----- */
  openLevelUp(){
    G.state = 'levelup'; G.rerollUsed = false; G.confirming = false; G.picked = null; Input.pressed = {}; Input.held = {}; Input.joy.x = Input.joy.y = 0;
    $('#lvTitle').textContent = 'LEVEL UP!  Lv ' + G.P.lv; this.renderCards(rollChoices()); this.show('lvScr');
    const r = $('#bReroll'); r.disabled = false; r.textContent = '🎲 ACAK ULANG (1)'; r.style.opacity = 1;
  },
  renderCards(cards){
    const box = $('#cards'); box.innerHTML = ''; G.picked = null; $('#bConfirm').disabled = true; $('#pickInfo').textContent = 'Ketuk satu kartu untuk memilih';
    cards.forEach(c => {
      const b = document.createElement('button'); let h;
      if (c.ritual) { b.className = 'card misc'; h = `<div class="tag" style="color:#8de08d">RITUAL</div><div class="ic">🕯</div><h3>Ritual Pemurnian</h3><div class="eff">Lepaskan kutukan yang sedang aktif</div><div class="dsc">Kamu telah mengalahkan ${RITUAL_KILLS}+ monster Unik/Bos selama dikutuk. Kutukan boleh dilepas tanpa konsekuensi.</div>`; }
      else if (c.fallback) { b.className = 'card misc'; h = `<div class="tag" style="color:#8de08d">BERKAH</div><div class="ic">🌟</div><h3>Berkah Dasar</h3><div class="eff">ATK +6% permanen & pulihkan 30% HP</div><div class="dsc">Semua kekuatan sudah penuh atau slot terisi.</div>`; }
      else {
        const p = c.p; b.className = 'card ' + p.type; const tn = { passive:'PASIF', active:'AKTIF', curse:'KUTUKAN' }[p.type];
        h = `<div class="tag">${tn} · ${c.up ? 'NAIK LEVEL' : 'BARU'}</div><div class="ic">${p.icon}</div><h3>${p.name}</h3><div class="lv">Lv ${c.lv - 1} ➜ Lv ${c.lv}</div><div class="eff">${p.lvDesc(c.lv)}</div>`;
        if (p.type === 'curse') h += `<div class="gain">▲ ${p.gain}</div><div class="cost">▼ ${p.cost}</div><div class="meta">Maks 1 kutukan. Dilepas lewat Ritual Pemurnian.</div>`;
        else h += `<div class="dsc">${p.desc}</div>` + (p.type === 'active' ? `<div class="meta">CD ${p.cd} dtk • MP ${p.mp}</div>` : '');
      }
      b.innerHTML = h; b.onclick = () => this.pickCard(c, b); box.appendChild(b);
    });
  },
  pickCard(c, el){
    if (G.confirming) return; G.picked = c; Snd.play('menu', .6);
    $$('#cards .card').forEach(x => x.classList.toggle('sel', x === el)); $('#bConfirm').disabled = false;
    let nm, ds;
    if (c.ritual) { nm = 'Ritual Pemurnian'; ds = 'Lepaskan kutukan yang sedang aktif.'; }
    else if (c.fallback) { nm = 'Berkah Dasar'; ds = 'ATK +6% permanen & pulihkan 30% HP.'; }
    else { nm = c.p.name + ' Lv ' + c.lv; ds = c.p.lvDesc(c.lv) + ' — ' + (c.p.type === 'curse' ? c.p.gain + ' / Harga: ' + c.p.cost : c.p.desc); }
    $('#pickInfo').textContent = nm + ': ' + ds;
  },
  confirm(){ if (G.confirming || !G.picked) return; G.confirming = true; $('#bConfirm').disabled = true; this.choose(G.picked); },
  choose(c){
    takeCard(c); G.levelUps--; this.hide('lvScr'); Input.pressed = {};
    if (G.levelUps > 0) this.openLevelUp(); else G.state = 'play';
  },
  reroll(){ if (G.rerollUsed || G.confirming) return; G.rerollUsed = true; Snd.play('pick', .6); this.renderCards(rollChoices()); const r = $('#bReroll'); r.textContent = '🎲 SUDAH DIPAKAI'; r.style.opacity = .4; },

  /* ----- jeda / mati ----- */
  pause(){ if (G.state !== 'play') return; G.state = 'paused'; Input.pressed = {}; Input.held = {}; this.show('pauseScr'); },
  resume(){ this.hide('pauseScr'); this.hide('optScr'); G.state = 'play'; Input.pressed = {}; },
  showDead(){
    const P = G.P, tm = Math.floor(G.t); $('#dSum').innerHTML = `${P.name} gugur di Level ${P.lv}<br>Waktu bertahan ${Math.floor(tm / 60)}m ${tm % 60}s<br>Monster dikalahkan ${G.kills}`;
    this.hide('hud'); this.show('deadScr'); Music.start('menu');
  },
};

/* ================= BOOT ================= */
function render(){
  const ctx = G.ctx, cv = G.canvas;
  if (G.state === 'title' || G.state === 'select') {
    const C = WORLD / 2, v = G.view; G.cam.x = C - v.w / 2 + Math.sin(G.t * .25) * 24; G.cam.y = C - v.h / 2 - 10 + Math.cos(G.t * .2) * 6; G.cam.shake = 0;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
  drawWorld(ctx);
}
let lastT = performance.now();
function loop(now){
  const dt = Math.min(.1, (now - lastT) / 1000); lastT = now;
  try {
    if (G.state === 'play') stepGame(dt);
    else if (G.state === 'dead') { FX.update(dt); G.t += dt; for (const n of G.nums) n.t += dt; }
    else if (G.state === 'title' || G.state === 'select') { G.t += dt; FX.update(dt); }
    if (G.state === 'select') UI.drawPreview();
    render(); UI.hud(dt);
  } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}
window.addEventListener('load', async () => {
  G.canvas = $('#cv'); G.ctx = G.canvas.getContext('2d'); UI.fit(); addEventListener('resize', () => UI.fit()); addEventListener('orientationchange', () => setTimeout(() => UI.fit(), 200));
  Input.init(); UI.loadSettings(); buildWorld();
  addEventListener('pointerdown', () => UI.gesture(), { capture:true });
  addEventListener('click', () => { if (!UI.isFull() && !UI.noAutoFull) UI.goFull(false); }, { capture:true });
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => { setTimeout(() => UI.fit(), 80); setTimeout(() => UI.fit(), 400); }));
  $('#bFull').addEventListener('click', e => { e.stopPropagation(); UI.noAutoFull = false; UI.goFull(true); });
  $('#bFull2').addEventListener('pointerdown', e => { e.preventDefault(); UI.goFull(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (G.state === 'play') UI.pause(); if (Music.ctx) Music.ctx.suspend(); } else if (Music.ctx && Music.on) Music.ctx.resume(); });
  UI.show('loadScr');
  const jobs = [Assets.load('tiles', 'assets/tileset/BROWNROCK_Full_Tileset_V1.png'), Assets.loadFx('level-up'), Assets.loadFx('xp-orb'), Assets.loadFx('hit-spark'), Assets.loadFx('crit-hit'), Assets.loadFx('poof')];
  let n = 0; jobs.forEach(j => j.then(() => { n++; $('#loadBar').style.width = (n / jobs.length * 100) + '%'; }));
  await Promise.all(jobs); makeGround();
  G.banner = t => UI.banner(t);
  // tombol
  const on = (id, fn) => $('#' + id).addEventListener('click', () => { Snd.play('select', .6); fn(); });
  on('bPlay', () => UI.toSelect()); on('bOpt', () => { UI.optFrom = 'titleScr'; UI.hide('titleScr'); UI.show('optScr'); }); on('bCred', () => { UI.hide('titleScr'); UI.show('credScr'); });
  on('bCredBack', () => { UI.hide('credScr'); UI.show('titleScr'); });
  on('bOptBack', () => { UI.hide('optScr'); UI.saveSettings(); if (G.state === 'paused') UI.show('pauseScr'); else UI.show('titleScr'); });
  on('bBack', () => UI.toTitle()); on('bGo', () => UI.start(UI.sel));
  on('bResume', () => UI.resume()); on('bOpt2', () => { UI.hide('pauseScr'); UI.show('optScr'); }); on('bQuit', () => UI.toTitle());
  on('bRetry', () => UI.start(G.P.name)); on('bMenu', () => UI.toTitle());
  on('bReroll', () => UI.reroll()); $('#bConfirm').addEventListener('click', () => { if (!G.confirming && G.picked) Snd.play('select', .6); UI.confirm(); });
  $('#bPause').addEventListener('pointerdown', e => { e.preventDefault(); UI.pause(); });
  $('#bAuto').addEventListener('pointerdown', e => { e.preventDefault(); UI.settings.auto = !UI.settings.auto; UI.applySettings(); UI.saveSettings(); });
  const bind = (id, key, num) => $('#' + id).addEventListener('input', e => { UI.settings[key] = num ? +e.target.value : e.target.checked; UI.applySettings(); UI.saveSettings(); });
  bind('oMus', 'mus'); bind('oMusV', 'musV', 1); bind('oSfx', 'sfx'); bind('oSfxV', 'sfxV', 1); bind('oAuto', 'auto');
  UI.toTitle(); requestAnimationFrame(loop);
});
