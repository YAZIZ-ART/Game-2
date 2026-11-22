/* ============================================================
   WORLD: peta (dari tileset Brown Rock), kamera, gambar karakter/monster
   ============================================================ */
'use strict';
const WORLD = 2400;
/* potongan dari BROWNROCK_Full_Tileset_V1.png (file asli tidak diubah): [x,y,w,h] */
const TILE = {
  grass:[1390,60,64,64], stone:[230,524,79,84],
  treeA:[1316,314,98,152], treeB:[1476,324,83,140], treeC:[1796,324,83,140],
  bushA:[1547,592,83,70], bushB:[1867,592,83,70],
  rock:[233,68,80,57], boulder:[390,170,55,86], pillar:[353,481,30,127],
  houseR:[1032,34,250,242], houseG:[1015,332,200,279], houseY:[1024,641,256,222],
  fence:[1018,896,142,96], sign:[995,289,51,120], crate:[1248,513,32,40],
};
const G = {
  state:'boot', P:null, mons:[], projs:[], orbs:[], zones:[], timers:[], nums:[], obst:[], decor:[], decals:[],
  t:0, kills:0, eliteKills:0, cam:{x:0,y:0,shake:0}, view:{w:480,h:270,z:2}, auto:true, spawnT:0, bossT:0, boss:null, levelUps:0,
  canvas:null, ctx:null, groundPat:null,
};

function buildWorld(){
  const rnd = mulberry32(20261122);
  G.obst = []; G.decor = []; G.decals = [];
  const C = WORLD / 2;
  const add = (k, x, y, sc, r, block) => { const t = TILE[k]; const o = { k, x, y, sc, r: r || 0, w: t[2], h: t[3] }; G.decor.push(o); if (block && r) G.obst.push({ x, y, r }); return o; };
  // plaza batu di tengah + jalan ke rumah
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) G.decals.push({ k:'stone', x:C + i * 66, y:C + j * 70, sc:.9 });
  const houses = [[560,560,'houseR'],[1850,640,'houseG'],[640,1820,'houseY'],[1800,1780,'houseR']];
  for (const h of houses) {
    const dx = h[0] - C, dy = h[1] - C, L = Math.hypot(dx, dy);
    for (let d = 140; d < L - 90; d += 74) G.decals.push({ k:'stone', x:C + dx / L * d + rnd() * 10 - 5, y:C + dy / L * d + rnd() * 10 - 5, sc:.8 });
    const sc = .55, hw = 250 * sc;
    add(h[2], h[0], h[1], sc, 0, false);
    for (let i = -2; i <= 2; i++) G.obst.push({ x:h[0] + i * hw * .2, y:h[1] - 8, r:hw * .12 + 6 });
    add('fence', h[0] + 120, h[1] + 30, .8, 0, false);
    add('crate', h[0] - 95, h[1] + 4, 1, 9, true);
    add('sign', h[0] + 70, h[1] + 52, .6, 4, true);
  }
  const free = (x, y, pad) => dist(x, y, C, C) > 230 && !houses.some(h => dist(x, y, h[0], h[1]) < 150 + (pad || 0));
  // pagar hutan di tepi (dua baris pohon)
  const treeK = ['treeA','treeB','treeC'];
  for (let row = 0; row < 2; row++) for (let i = 0; i < WORLD; i += 46) {
    const o = row * 23 + 24 + rnd() * 8, p = i + rnd() * 10;
    for (const pos of [[p,o],[p,WORLD - o],[o,p],[WORLD - o,p]]) add(treeK[Math.floor(rnd() * 3)], pos[0], pos[1] + 30, .85, 10, true);
  }
  // kelompok pohon
  for (let c = 0; c < 18; c++) {
    const cx = 160 + rnd() * (WORLD - 320), cy = 160 + rnd() * (WORLD - 320); if (!free(cx, cy, 20)) continue;
    const n = 3 + Math.floor(rnd() * 6);
    for (let i = 0; i < n; i++) { const a = rnd() * 6.28, d = rnd() * 80, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; if (free(x, y)) add(pick2(rnd, treeK), x, y, .8 + rnd() * .2, 9, true); }
    for (let i = 0; i < 2; i++) { const a = rnd() * 6.28, d = 40 + rnd() * 60, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; if (free(x, y)) add(rnd() < .5 ? 'bushA' : 'bushB', x, y, .6, 0, false); }
  }
  for (let i = 0; i < 40; i++) { const x = 120 + rnd() * (WORLD - 240), y = 120 + rnd() * (WORLD - 240); if (free(x, y)) add(rnd() < .5 ? 'bushA' : 'bushB', x, y, .55 + rnd() * .15, 0, false); }
  for (let i = 0; i < 26; i++) { const x = 140 + rnd() * (WORLD - 280), y = 140 + rnd() * (WORLD - 280); if (free(x, y)) { const k = rnd() < .55 ? 'boulder' : (rnd() < .5 ? 'rock' : 'pillar'); add(k, x, y, k === 'boulder' ? .62 : (k === 'pillar' ? .55 : 1), k === 'rock' ? 8 : 11, true); } }
  G.decor.sort((a, b) => a.y - b.y);
}
function pick2(rnd, a){ return a[Math.floor(rnd() * a.length)]; }

function makeGround(){
  const t = Assets.img.tiles; if (!t) return;
  const [gx, gy, gw, gh] = TILE.grass, c = document.createElement('canvas'); c.width = gw * 2; c.height = gh * 2;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.drawImage(t, gx, gy, gw, gh, 0, 0, gw, gh);
  x.save(); x.scale(-1, 1); x.drawImage(t, gx, gy, gw, gh, -gw * 2, 0, gw, gh); x.restore();
  x.save(); x.scale(1, -1); x.drawImage(t, gx, gy, gw, gh, 0, -gh * 2, gw, gh); x.restore();
  x.save(); x.scale(-1, -1); x.drawImage(t, gx, gy, gw, gh, -gw * 2, -gh * 2, gw, gh); x.restore();
  G.groundPat = G.ctx.createPattern(c, 'repeat');
}

/* tabrakan lingkaran dengan rintangan; mengembalikan posisi yang sudah didorong keluar */
function collide(x, y, r){
  x = clamp(x, 34, WORLD - 34); y = clamp(y, 34, WORLD - 34);
  for (const o of G.obst) {
    const dx = x - o.x, dy = y - o.y; if (Math.abs(dx) > 60 || Math.abs(dy) > 60) continue;
    const d = Math.hypot(dx, dy), m = o.r + r;
    if (d < m && d > 0.001) { x = o.x + dx / d * m; y = o.y + dy / d * m; }
  }
  return { x, y };
}
function blockedAt(x, y, r){ for (const o of G.obst) if (dist(x, y, o.x, o.y) < o.r + r) return true; return false; }

/* ---------------- gambar karakter (sprite sheet asli + layer senjata) ---------------- */
const SHADOW = (ctx, x, y, rx, ry, a) => { ctx.fillStyle = `rgba(0,0,0,${a == null ? .28 : a})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 6.283); ctx.fill(); };
function drawCharFrame(ctx, name, sheet, frame, dir, x, y, alpha){
  const ci = Assets.img['c:' + name + sheet]; if (!ci) return;
  const wi = Assets.img['w:' + name + sheet], bb = MANIFEST.chars[name].bbox;
  const sx = frame * 192, sy = dir * 192, dx = Math.round(x - 96), dy = Math.round(y - bb[3] - 1);
  if (alpha != null) ctx.globalAlpha = alpha;
  if (dir === 0 && wi) ctx.drawImage(wi, sx, sy, 192, 192, dx, dy, 192, 192);
  ctx.drawImage(ci, sx, sy, 192, 192, dx, dy, 192, 192);
  if (dir !== 0 && wi) ctx.drawImage(wi, sx, sy, 192, 192, dx, dy, 192, 192);
  if (alpha != null) ctx.globalAlpha = 1;
}
/* efek elemen karakter (128px) */
function drawElem(ctx, name, skill, frac, dir, x, y, s){
  const e = Assets.img['e:' + name]; if (!e) return;
  const used = MANIFEST.chars[name].element_sheet.frames_used[skill - 1];
  const f = Math.min(used - 1, Math.floor(frac * used));
  ctx.drawImage(e, f * 128, (4 * (skill - 1) + dir) * 128, 128, 128, Math.round(x - 64 * s), Math.round(y - 70 * s), 128 * s, 128 * s);
}
function drawAura(ctx, name, t, x, y){
  const e = Assets.img['e:' + name]; if (!e) return;
  const f = Math.floor(t * 12) % 8; ctx.globalAlpha = .75;
  ctx.drawImage(e, f * 128, 12 * 128, 128, 128, Math.round(x - 64), Math.round(y - 74), 128, 128); ctx.globalAlpha = 1;
}

const FLASH = document.createElement('canvas'); FLASH.width = FLASH.height = 64; const FCTX = FLASH.getContext('2d');
function drawMonster(ctx, m){
  const d = m.def, sh = d.sheet, info = MANIFEST.mons[sh];
  let key, fr, row = m.dir;
  if (m.state === 'hurt') { key = 'hurt'; fr = Math.min(info.hurt.n - 1, Math.floor(m.st * 28)); row = 0; }
  else if (m.state === 'attack') { key = 'slash'; fr = Math.min(info.slash.n - 1, Math.floor(m.st / .09)); }
  else if (m.stun > 0) { key = 'idle'; fr = Math.floor(G.t * 3) % info.idle.n; }
  else { key = 'walk'; fr = 1 + Math.floor(m.wt * 9) % (info.walk.n - 1); }
  const img = Assets.img['m:' + sh + key]; if (!img) return;
  const s = d.scale, bb = info.bbox, dx = Math.round(m.x - 32 * s), dy = Math.round(m.y - (bb[3] + 1) * s);
  SHADOW(ctx, m.x, m.y - 1, 11 * s, 4 * s);
  if (m.frozen > 0) { ctx.fillStyle = 'rgba(120,200,255,.35)'; ctx.beginPath(); ctx.ellipse(m.x, m.y - 14 * s, 16 * s, 22 * s, 0, 0, 6.283); ctx.fill(); }
  if (m.flash > 0) {
    FCTX.clearRect(0, 0, 64, 64); FCTX.drawImage(img, fr * 64, row * 64, 64, 64, 0, 0, 64, 64);
    FCTX.globalCompositeOperation = 'source-atop'; FCTX.fillStyle = 'rgba(255,255,255,.75)'; FCTX.fillRect(0, 0, 64, 64); FCTX.globalCompositeOperation = 'source-over';
    ctx.drawImage(FLASH, 0, 0, 64, 64, dx, dy, 64 * s, 64 * s);
  } else ctx.drawImage(img, fr * 64, row * 64, 64, 64, dx, dy, 64 * s, 64 * s);
  // bar HP + level
  if (m.hp < m.maxHp || d.tier !== 'Normal') {
    const w = 26 * Math.max(1, s * .8), x0 = m.x - w / 2, y0 = dy + 8 * s;
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x0 - 1, y0 - 1, w + 2, 4);
    ctx.fillStyle = d.tier === 'Boss' ? '#ff4a6a' : (d.tier === 'Unik' ? '#ffb347' : '#6adf6a'); ctx.fillRect(x0, y0, w * clamp(m.hp / m.maxHp, 0, 1), 2);
  }
  ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
  const ty = dy + 5 * s; ctx.strokeText('Lv' + m.lv, m.x, ty); ctx.fillText('Lv' + m.lv, m.x, ty);
  if (m.stun > 0 && m.frozen <= 0) { ctx.fillStyle = '#ffe36a'; for (let i = 0; i < 3; i++) { const a = G.t * 5 + i * 2.1; ctx.fillRect(m.x + Math.cos(a) * 8 - 1, dy + 12 * s + Math.sin(a) * 3, 3, 3); } }
}

/* ---------------- render dunia ---------------- */
function drawWorld(ctx){
  const v = G.view, cam = G.cam, P = G.P;
  const cx = Math.round(cam.x + (cam.shake ? rand(-cam.shake, cam.shake) : 0)), cy = Math.round(cam.y + (cam.shake ? rand(-cam.shake, cam.shake) : 0));
  ctx.setTransform(v.z, 0, 0, v.z, -cx * v.z, -cy * v.z); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#243d1e'; ctx.fillRect(cx - 4, cy - 4, v.w + 8, v.h + 8);
  if (G.groundPat) { ctx.fillStyle = G.groundPat; ctx.fillRect(cx - 4, cy - 4, v.w + 8, v.h + 8); }
  const tiles = Assets.img.tiles, inView = (x, y, m) => x > cx - m && x < cx + v.w + m && y > cy - m && y < cy + v.h + m + 120;
  if (tiles) for (const d of G.decals) if (inView(d.x, d.y, 80)) { const t = TILE[d.k]; ctx.drawImage(tiles, t[0], t[1], t[2], t[3], Math.round(d.x - t[2] * d.sc / 2), Math.round(d.y - t[3] * d.sc / 2), t[2] * d.sc, t[3] * d.sc); }
  // batas peta gelap
  FX.draw(ctx, 'ground');
  for (const z of G.zones) if (z.draw) z.draw(ctx);
  // y-sort
  const list = [];
  for (const o of G.decor) if (inView(o.x, o.y, 150)) list.push({ y:o.y, d:o, k:0 });
  for (const m of G.mons) if (inView(m.x, m.y, 60)) list.push({ y:m.y, d:m, k:1 });
  if (P) list.push({ y:P.y, d:P, k:2 });
  if (P && P.clone) list.push({ y:P.clone.y, d:P.clone, k:3 });
  for (const o of G.orbs) if (inView(o.x, o.y, 20)) list.push({ y:o.y - 1, d:o, k:4 });
  for (const e of (G.extras || [])) list.push({ y:e.y, d:e, k:5 });
  list.sort((a, b) => a.y - b.y);
  for (const it of list) {
    if (it.k === 0 && tiles) { const o = it.d, t = TILE[o.k], w = t[2] * o.sc, h = t[3] * o.sc; ctx.drawImage(tiles, t[0], t[1], t[2], t[3], Math.round(o.x - w / 2), Math.round(o.y - h + (o.k.startsWith('tree') ? 6 : 0)), w, h); }
    else if (it.k === 1) drawMonster(ctx, it.d);
    else if (it.k === 2) drawPlayer(ctx, P, 1);
    else if (it.k === 3) drawPlayer(ctx, P, .5, it.d);
    else if (it.k === 4) drawOrb(ctx, it.d);
    else if (it.k === 5) it.d.draw(ctx);
  }
  for (const p of G.projs) drawProj(ctx, p);
  FX.draw(ctx, 'top');
  // angka damage
  ctx.textAlign = 'center';
  for (const n of G.nums) {
    const a = clamp(1 - n.t / n.life, 0, 1), y = n.y - n.t * 22;
    ctx.globalAlpha = a; ctx.font = (n.crit ? 'bold 13px' : 'bold 9px') + ' monospace'; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(n.txt, n.x, y); ctx.fillStyle = n.color; ctx.fillText(n.txt, n.x, y);
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
function drawOrb(ctx, o){
  const d = MANIFEST.fx['xp-orb'], img = Assets.img['fx:xp-orb'];
  if (o.heal) { ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('❤️', o.x, o.y - 2 + Math.sin(G.t * 5) * 1.5); return; }
  if (!img) { ctx.fillStyle = '#7ef'; ctx.fillRect(o.x - 2, o.y - 4, 4, 4); return; }
  const f = Math.floor(G.t * d.fps + o.ph * 10) % d.n, s = .5 + Math.min(.4, o.v / 80);
  ctx.drawImage(img, (f % d.cols) * d.fw, Math.floor(f / d.cols) * d.fh, d.fw, d.fh, Math.round(o.x - d.pivot[0] * s), Math.round(o.y - d.pivot[1] * s), d.fw * s, d.fh * s);
}
function drawProj(ctx, p){
  ctx.save(); ctx.translate(p.x, p.y - 14); ctx.rotate(p.ang);
  if (p.kind === 'crystal') {
    const im = Assets.img['fx:ice-lance'], d = MANIFEST.fx['ice-lance'];
    if (im) { const f = Math.floor(p.t * d.fps) % d.n, s = p.big ? .9 : .55; ctx.drawImage(im, (f % d.cols) * d.fw, Math.floor(f / d.cols) * d.fh, d.fw, d.fh, -d.pivot[0] * s, -d.pivot[1] * s, d.fw * s, d.fh * s); }
    else { ctx.fillStyle = '#7ef0ff'; ctx.fillRect(-6, -2, 12, 4); }
  } else if (p.kind === 'wind') {
    ctx.shadowColor = '#aef'; ctx.shadowBlur = 8; ctx.strokeStyle = '#e8ffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-14, 0, 24, -1.0, 1.0); ctx.stroke();
    ctx.strokeStyle = '#6fd0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-18, 0, 20, -.9, .9); ctx.stroke();
  } else {
    ctx.fillStyle = '#fff'; ctx.fillRect(-4, -2, 8, 4);
  }
  ctx.restore();
}
