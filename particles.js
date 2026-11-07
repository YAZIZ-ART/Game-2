/* =====================================================================
   js/particles.js : partikel, cincin efek, teks damage, getar layar, kilat layar
   Urutan gambar di game.js:
     peta -> FX.draw(ctx,camX,camY,0)  (efek di tanah)
          -> musuh & pemain
          -> FX.draw(ctx,camX,camY,1)  (efek di atas) -> FX.drawOverlay(ctx)
   Awal frame : dt = FX.tick(dt)   (hitstop), lalu FX.update(dt)
   Kamera     : tambahkan FX.offset() ke posisi kamera saat menggambar
   ===================================================================== */
'use strict';

const FX = (function () {
  const TAU = Math.PI * 2, MAX = 1500;
  const parts = [], rings = [], texts = [];
  let shakeA = 0, shakeT = 0, shakeD = 1, ox = 0, oy = 0;
  let flashA = 0, flashT = 0, flashD = 1, flashC = '#fff';
  let stopT = 0, ambT = 0;
  const rnd = Math.random;

  function add(p) { if (parts.length < MAX) parts.push(p); }

  function clear() {
    parts.length = 0; rings.length = 0; texts.length = 0;
    shakeT = 0; flashT = 0; stopT = 0; ox = 0; oy = 0;
  }

  function burst(x, y, col, n, speed, life, size, grav) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, s = speed * (0.3 + rnd() * 0.7), l = life * (0.6 + rnd() * 0.6);
