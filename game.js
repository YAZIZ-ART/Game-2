
'use strict';

(() => {

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const status = document.getElementById('status');
  const errorBox = document.getElementById('error');

  // Kompatibilitas Assets
  if (typeof window.Assets === 'undefined') {

    window.Assets = {
      SPR: typeof SPR !== 'undefined' ? SPR : {},
      SND: typeof SND !== 'undefined' ? SND : null,

      drawArt: typeof drawArt === 'function'
        ? drawArt : null,

      drawWeapon: typeof drawWeapon === 'function'
        ? drawWeapon : null,

      drawMobBody: typeof drawMobBody === 'function'
        ? drawMobBody : null,

      drawBossBody: typeof drawBossBody === 'function'
        ? drawBossBody : null
    };

  }

  let width = 0;
  let height = 0;
  let lastTime = 0;

  function resize() {

    const dpr = Math.min(
      window.devicePixelRatio || 1,
      2
    );

    const rect = canvas.getBoundingClientRect();

    width = rect.width;
    height = rect.height;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.imageSmoothingEnabled = false;
  }

  window.addEventListener('resize', resize);
  resize();

  function showError(error) {

    errorBox.hidden = false;

    errorBox.textContent =
      'AETHERIA ERROR: ' +
      (error.message || String(error));

    status.textContent = 'Terjadi error';

  }

  window.addEventListener('error', e => {
    showError(e.error || e.message);
  });

  function checkModules() {

    if (typeof CHARACTERS === 'undefined') {
      throw new Error(
        'CHARACTERS tidak ditemukan. Periksa config.js.'
      );
    }

    if (typeof ELEMENTS === 'undefined') {
      throw new Error(
        'ELEMENTS tidak ditemukan. Periksa config.js.'
      );
    }

  }

  function render(time) {

    const delta = Math.min(
      0.05,
      (time - lastTime) / 1000 || 0
    );

    lastTime = time;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#090814';
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'center';

    ctx.fillStyle = '#e8ddff';
    ctx.font = 'bold 22px Arial';

    ctx.fillText(
      'AETHERIA',
      width / 2,
      height / 2 - 30
    );

    ctx.fillStyle = '#aaa0c4';
    ctx.font = '12px Arial';

    ctx.fillText(
      'Modul berhasil dimuat',
      width / 2,
      height / 2
    );

    const movement = GameInput.vector();

    if (movement.x || movement.y) {

      ctx.fillText(
        'Input: ' + movement.x + ', ' + movement.y,
        width / 2,
        height / 2 + 25
      );

    }

    requestAnimationFrame(render);
  }

  try {

    checkModules();

    status.textContent =
      'Aset karakter: ' +
      Object.keys(window.Assets.SPR).length;

    requestAnimationFrame(render);

  } catch (error) {

    showError(error);
    requestAnimationFrame(render);

  }

})();
