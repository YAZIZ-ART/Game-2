/* Aetheria — ui.js : menu pilih karakter, HUD, dialog (DOM) */
'use strict';

const UI = {
  menu: null, hud: null, dialog: null, bars: null, flashEl: null, flashT: 0,

  el: function (tag, css, text, parent) {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  },

  init: function () {
    this.menu = document.getElementById('menu');
    this.hud = document.getElementById('hud');
    this.dialog = document.getElementById('dialog');
    const layer = 'position:absolute;left:0;top:0;right:0;bottom:0;';
    this.menu.style.cssText = layer + 'display:none;overflow:auto;background:rgba(8,6,22,.96);color:#fff;font-family:monospace;pointer-events:auto;z-index:50;padding:8px;box-sizing:border-box;';
    this.dialog.style.cssText = layer + 'display:none;background:rgba(0,0,0,.75);color:#fff;font-family:monospace;pointer-events:auto;z-index:60;align-items:center;justify-content:center;flex-direction:column;text-align:center;';
    this.hud.style.cssText = layer + 'pointer-events:none;color:#fff;font-family:monospace;font-size:10px;z-index:10;';

    const box = this.el('div', 'position:absolute;left:6px;top:6px;width:42%;max-width:180px;', '', this.hud);
    this.bars = {
      name: this.el('div', 'font-weight:bold;margin-bottom:2px;text-shadow:1px 1px #000;', '', box),
      hp: this.bar(box, '#e03c3c'),
      mana: this.bar(box, '#3c8de0'),
      elem: this.el('div', 'margin-top:2px;text-shadow:1px 1px #000;', '', box)
    };
    this.bars.info = this.el('div', 'position:absolute;right:6px;top:6px;text-align:right;text-shadow:1px 1px #000;', '', this.hud);
    this.flashEl = this.el('div', 'position:absolute;left:0;right:0;top:34%;text-align:center;font-size:16px;font-weight:bold;text-shadow:2px 2px #000;opacity:0;', '', this.hud);
    this.hud.style.display = 'none';
  },

  bar: function (parent, color) {
    const o = this.el('div', 'height:6px;background:rgba(0,0,0,.6);margin-bottom:2px;border:1px solid #000;', '', parent);
    return this.el('div', 'height:100%;width:100%;background:' + color + ';', '', o);
  },

  showMenu: function (onPick) {
    const m = this.menu;
    m.innerHTML = '';
    m.style.display = 'block';
    this.hud.style.display = 'none';
    this.el('div', 'text-align:center;font-size:15px;font-weight:bold;color:#ffd93a;margin:4px 0;', CFG.GAME_TITLE, m);
    this.el('div', 'text-align:center;font-size:10px;margin-bottom:8px;color:#b8b0e0;', 'Pilih karakter', m);
    const grid = this.el('div', 'display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px;', '', m);
    const self = this;
    CHARACTER_IDS.forEach(function (id) {
      const c = CHARACTERS[id], el = ELEMENTS[c.element];
      const b = self.el('button', 'background:' + el.dark + ';color:#fff;border:2px solid ' + el.color + ';border-radius:6px;padding:6px 4px;font-family:monospace;font-size:11px;text-align:center;', '', grid);
      self.el('div', 'font-weight:bold;', el.icon + ' ' + c.name, b);
      self.el('div', 'font-size:9px;color:#ddd;', WEAPONS[c.weapon].name + ' / ' + el.name, b);
      b.addEventListener('click', function () { onPick(id); });
    });
  },

  hideMenu: function () { this.menu.style.display = 'none'; this.hud.style.display = 'block'; },

  showDialog: function (title, text, btn, cb) {
    const d = this.dialog;
    d.innerHTML = '';
    d.style.display = 'flex';
    this.el('div', 'font-size:18px;font-weight:bold;color:#ff6b6b;margin-bottom:8px;', title, d);
    this.el('div', 'font-size:11px;margin-bottom:12px;white-space:pre-line;', text, d);
    const b = this.el('button', 'padding:8px 18px;font-family:monospace;font-size:13px;border-radius:6px;border:2px solid #ffd93a;background:#2a2142;color:#fff;', btn, d);
    b.addEventListener('click', function () { UI.hideDialog(); cb(); });
  },

  hideDialog: function () { this.dialog.style.display = 'none'; },

  flash: function (msg) {
    if (!this.flashEl) return;
    this.flashEl.textContent = msg; this.flashEl.style.opacity = '1'; this.flashT = 1.2;
  },

  updateHud: function (p, C, dt) {
    const b = this.bars;
    b.name.textContent = p.name + ' (' + p.weapon.name + ')';
    b.hp.style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
    b.mana.style.width = Math.max(0, p.mana / p.maxMana * 100) + '%';
    const cb = p.combo();
    b.elem.textContent = ELEMENTS[p.elem].icon + '+' + ELEMENTS[p.second].icon + ' ' + (cb ? cb.name : '-') + (p.skillCd > 0 ? ' (' + p.skillCd.toFixed(1) + 's)' : '');
    b.info.textContent = 'Gelombang ' + C.wave + ' | Skor ' + C.score;
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) this.flashEl.style.opacity = '0'; }
  }
};
