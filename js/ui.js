/* =====================================================================
   js/ui.js : menu, pilih karakter, HUD, jeda, game over, kemenangan
   Dipakai game.js:
     UI.showLoading(p)  UI.showMenu(onMulai)  UI.showSelect(onPilih(id), onKembali)
     UI.hideMenu()      UI.startHud(player)   UI.updateHud(player, boss)
     UI.banner(teks, warna)  UI.toast(teks)
     UI.showPause(onLanjut, onMenu)  UI.showGameOver(stat, onUlang, onMenu)
     UI.showWin(stat, onLanjut, onMenu)  UI.hideOverlay()  UI.setTouch(true/false)
   ===================================================================== */
'use strict';

const UI = (function () {
  const $ = function (id) { return document.getElementById(id); };
  const hudEl = $('hud'), menuEl = $('menu'), dlgEl = $('dialog');
  let H = null;

  /* ---------- CSS tambahan (melengkapi css/main.css) ---------- */
  (function () {
    const s = document.createElement('style');
    s.textContent = [
      '.menu-grid{max-height:46%;touch-action:pan-y;-webkit-overflow-scrolling:touch}',
