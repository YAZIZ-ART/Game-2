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
  const hudEl = $('hud'), menuEl = $('menu'), dlgEl = $('dialog'), uiEl = $('ui'), touchEl = $('touch');
  let H = null, selId = 'akira', bannerEl = null, toastEl = null, bannerTm = 0, toastTm = 0;

  const KIND = { nova: 'Ledakan', cone: 'Semburan', wave: 'Gelombang', rain: 'Hujan serangan', zone: 'Area',
    aura: 'Aura', chain: 'Rantai kilat', heal: 'Pemulihan', shield: 'Perisai', dash: 'Terjang kilat' };

  function mk(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function portraitCanvas(id, size) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const x = c.getContext('2d');
