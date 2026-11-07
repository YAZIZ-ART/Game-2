/* =====================================================================
   js/particles.js : partikel, efek elemen, tebasan, ledakan, petir, getar layar
   Semua efek digambar pixel-style. Urutan gambar di game.js:
     peta -> FX.draw(ctx,camX,camY,0)  (efek di tanah)
          -> musuh & pemain
          -> FX.draw(ctx,camX,camY,1)  (efek di atas) -> FX.drawOverlay(ctx)
   Awal frame : dt = FX.tick(dt)   (hitstop), lalu FX.update(dt)
   Kamera     : tambahkan FX.offset() ke posisi kamera saat menggambar
   ===================================================================== */
'use strict';

const FX = (function () {
  const TAU = Math.PI * 2;
  const MAX = 2200;
  const parts = [];
  const zones = [];
  const texts = [];
  let shakeP = 0, shakeT = 0, shakeDur = 1;
  let flashA = 0, flashT = 0, flashDur = 1, flashCol = '#fff';
  let stopT = 0;
  const poolCache = {};
