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
      '.card canvas{width:100%;aspect-ratio:1;display:block;image-rendering:pixelated;background:#000}',
      '.card b{display:block;margin-top:.4em;font-weight:normal;font-size:.9em}',
      '.sel-info{min-height:4.2em;font-size:.85em;line-height:1.8;color:var(--text)}',
      '.row{display:flex;gap:1em;justify-content:center}',
      '.loadbar{width:40%;height:1em;border:2px solid var(--panel-edge)}',
      '.loadbar>div{height:100%;width:0;background:var(--xp)}',
      '.hud-combo{position:absolute;top:17%;right:2%;text-align:right;line-height:1.7;color:var(--muted);text-shadow:1px 1px 0 #000}',
      '.hud-combo b{color:var(--gold);font-weight:normal}',
      '.hud-combo.low{opacity:.45}',
      '.hud-boss{position:absolute;top:2%;left:50%;transform:translateX(-50%);width:30%;text-align:center;color:var(--text);text-shadow:1px 1px 0 #000}',
      '.hud-boss .bar{margin-top:.4em}',
      '.hud-boss .bar-fill{background:linear-gradient(#b06cff,#6a2fb0)}',
      '#dialog.center{align-items:center;background:rgba(5,3,15,.62)}',
      '.ov-box{display:flex;flex-direction:column;align-items:center;gap:1.2em;padding:1.6em 2.4em;text-align:center;background:var(--panel);border:2px solid var(--panel-edge)}',
      '.ov-title{font-size:2em;color:var(--gold);text-shadow:0 0 12px currentColor}',
      '#buttons #btn-dash{right:54%;bottom:60%;width:28%;aspect-ratio:1}'
    ].join('\n');
    document.head.appendChild(s);
  })();

  /* ---------- Bantuan DOM ---------- */
  function div(cls, text) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    if (text !== undefined) d.textContent = text;
    return d;
  }
  function btn(label, fn) {
    const b = document.createElement('button');
    b.className = 'btn'; b.type = 'button'; b.textContent = label;
    b.addEventListener('click', function () { Sound.play('select'); fn(); });
    return b;
  }
  function portraitCanvas(id, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d');
    const img = Assets.portrait(id);
    x.imageSmoothingEnabled = img.width > 160;      // gambar HD dihaluskan, pixel art tetap tajam
    const s = Math.max(size / img.width, size / img.height);
    const w = img.width * s, h = img.height * s;
    x.drawImage(img, (size - w) / 2, 0, w, h);
    return c;
  }
  function setText(n, v) { if (n._v !== v) { n._v = v; n.textContent = v; } }
  function setW(n, f) {
    const v = Math.max(0, Math.min(100, Math.round(f * 100))) + '%';
    if (n._w !== v) { n._w = v; n.style.width = v; }
  }
  function fmtTime(s) {
    s = Math.floor(s);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }
  function goFullscreen() {
    try {
      const d = document.documentElement;
      if (!document.fullscreenElement && d.requestFullscreen) {
        d.requestFullscreen().then(function () {
          if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(function () {});
        }).catch(function () {});
      }
    } catch (e) { /* abaikan */ }
  }

  /* =====================================================================
     MENU
     ===================================================================== */
  function showLoading(p) {
    menuEl.classList.remove('hidden');
    if (!menuEl.querySelector('.loadbar')) {
      menuEl.innerHTML = '';
      menuEl.appendChild(div('menu-title', 'Aetheria'));
      menuEl.appendChild(div('menu-sub', 'Memuat...'));
      const bar = div('loadbar'); bar.appendChild(div());
      menuEl.appendChild(bar);
    }
    menuEl.querySelector('.loadbar > div').style.width = Math.round(p * 100) + '%';
  }

  function showMenu(onStart) {
    hideOverlay();
    hudEl.innerHTML = ''; H = null;
    menuEl.classList.remove('hidden');
    menuEl.innerHTML = '';
    const t = div('menu-title'); t.innerHTML = 'Aetheria<br>Echoes of the Five Elements';
    menuEl.appendChild(t);
    menuEl.appendChild(div('menu-sub', 'Fantasy 2D Pixel Art Action RPG'));
    menuEl.appendChild(btn('Mulai', function () { goFullscreen(); onStart(); }));
    menuEl.appendChild(div('menu-sub', Input.isTouch()
      ? 'Joystick kiri untuk gerak. Tombol kanan: Serang, Skill, Elemen, Dash.'
      : 'WASD/Panah gerak, J serang, K skill, L ganti elemen, Spasi dash, P jeda.'));
    menuEl.appendChild(div('menu-sub', 'Ganti elemen kedua lalu pakai Skill untuk kombinasi baru.'));
  }

  function hideMenu() { menuEl.classList.add('hidden'); menuEl.innerHTML = ''; }

  function showSelect(onPick, onBack) {
    menuEl.classList.remove('hidden');
    menuEl.innerHTML = '';
    menuEl.appendChild(div('menu-sub', 'Pilih karakter'));
    const grid = div('menu-grid');
    // input.js memblokir gulir sentuh di seluruh halaman; grid ini dikecualikan
    grid.addEventListener('touchmove', function (e) { e.stopPropagation(); }, { passive: true });
    const info = div('sel-info');
    const cards = [];
    let sel = CHARACTERS[0];

    function pick(ch, card) {
      sel = ch;
      cards.forEach(function (c) { c.classList.remove('selected'); });
      card.classList.add('selected');
      const w = WEAPONS[ch.weapon], el = ELEMENTS[ch.element];
      info.innerHTML = '<span style="color:var(--gold)">' + ch.name + '</span> ' + el.icon + ' ' + el.name +
        '<br>Senjata: ' + w.name + ' (' + w.skill + ')' +
        '<br>HP x' + ch.hp + ' MP x' + ch.mp + ' ATK x' + ch.atk + ' DEF x' + ch.def + ' SPD x' + ch.spd;
    }

    CHARACTERS.forEach(function (ch) {
      const card = div('card');
      card.appendChild(portraitCanvas(ch.id, 96));
      card.appendChild(Object.assign(document.createElement('b'), { textContent: ch.name }));
      const sm = document.createElement('small');
      sm.textContent = ELEMENTS[ch.element].icon + ' ' + WEAPONS[ch.weapon].name;
      card.appendChild(sm);
      card.addEventListener('click', function () { Sound.play('select'); pick(ch, card); });
      grid.appendChild(card);
      cards.push(card);
    });

    const row = div('row');
    row.appendChild(btn('Kembali', onBack));
    row.appendChild(btn('Mulai petualangan', function () { onPick(sel.id); }));
    menuEl.appendChild(grid);
    menuEl.appendChild(info);
    menuEl.appendChild(row);
    pick(CHARACTERS[0], cards[0]);
  }

  /* =====================================================================
     OVERLAY (jeda, kalah, menang)
     ===================================================================== */
  function overlay(title, lines, buttons, color) {
    dlgEl.innerHTML = '';
    dlgEl.classList.add('center');
    dlgEl.classList.remove('hidden');
    const box = div('ov-box');
    const t = div('ov-title', title);
    if (color) t.style.color = color;
    box.appendChild(t);
    lines.forEach(function (l) { box.appendChild(div('menu-sub', l)); });
    const row = div('row');
    buttons.forEach(function (b) { row.appendChild(btn(b[0], b[1])); });
    box.appendChild(row);
    dlgEl.appendChild(box);
  }
  function hideOverlay() { dlgEl.classList.add('hidden'); dlgEl.innerHTML = ''; }

  function showPause(onResume, onMenu) {
    overlay('Jeda', [], [['Lanjut', onResume], ['Menu utama', onMenu]]);
  }
  function statLines(s) {
    return ['Level ' + s.level + '   Musuh dikalahkan ' + s.kills, 'Waktu ' + fmtTime(s.time)];
  }
  function showGameOver(s, onRetry, onMenu) {
    overlay('Kamu kalah', statLines(s), [['Coba lagi', onRetry], ['Menu utama', onMenu]], '#ff6a7a');
  }
  function showWin(s, onContinue, onMenu) {
    overlay('Penjaga Aetheria runtuh', statLines(s), [['Lanjut jelajah', onContinue], ['Menu utama', onMenu]]);
  }

  /* =====================================================================
     HUD
     ===================================================================== */
  function startHud(pl) {
    hudEl.innerHTML = '';
    const top = div('hud-top');
    const pc = portraitCanvas(pl.id, 64);
    pc.className = 'hud-portrait';
    top.appendChild(pc);

    const info = div('hud-info');
    const nameRow = div();
    const name = div(); name.style.display = 'inline'; name.className = 'hud-name'; name.textContent = pl.ch.name;
    const lvl = document.createElement('span'); lvl.className = 'hud-level';
    nameRow.appendChild(name); nameRow.appendChild(lvl);
    info.appendChild(nameRow);

    function bar(cls, thin, withText) {
      const b = div('bar' + (thin ? ' thin' : ''));
      const f = div('bar-fill ' + cls); b.appendChild(f);
      let tx = null;
      if (withText) { tx = div('bar-text'); b.appendChild(tx); }
      info.appendChild(b);
      return { fill: f, text: tx };
    }
    const hp = bar('hp', false, true), mp = bar('mp', false, true), xp = bar('xp', true, false);
    top.appendChild(info);
    hudEl.appendChild(top);

    const els = div('hud-elements');
    const slots = {};
    ELEMENT_ORDER.forEach(function (id) {
      const s = div('elem-slot', ELEMENTS[id].icon);
      s.dataset.elem = id;
      els.appendChild(s);
      slots[id] = s;
    });
    hudEl.appendChild(els);

    const combo = div('hud-combo');
    hudEl.appendChild(combo);

    const bossBox = div('hud-boss hidden');
    const bossName = div(); bossName.textContent = 'Penjaga Aetheria';
    const bb = div('bar'); const bf = div('bar-fill'); bb.appendChild(bf);
    bossBox.appendChild(bossName); bossBox.appendChild(bb);
    hudEl.appendChild(bossBox);

    H = { lvl: lvl, hp: hp, mp: mp, xp: xp, slots: slots, combo: combo, bossBox: bossBox, bossFill: bf };
  }

  function updateHud(pl, boss) {
    if (!H) return;
    setText(H.lvl, 'Lv ' + pl.level);
    setW(H.hp.fill, pl.hp / pl.maxHp);
    setText(H.hp.text, Math.ceil(pl.hp) + '/' + pl.maxHp);
    setW(H.mp.fill, pl.mp / pl.maxMp);
    setText(H.mp.text, Math.floor(pl.mp) + '/' + pl.maxMp);
    setW(H.xp.fill, pl.xp / pl.xpNext);

    ELEMENT_ORDER.forEach(function (id) {
      const on = id === pl.element || id === pl.elem2;
      if (H.slots[id]._on !== on) { H.slots[id]._on = on; H.slots[id].classList.toggle('active', on); }
    });

    const c = pl.currentCombo();
    if (c) {
      const key = c.key + '|' + (pl.mp >= c.mp);
      if (H.combo._k !== key) {
        H.combo._k = key;
        H.combo.innerHTML = '<b>' + c.name + '</b><br>' + ELEMENTS[c.a].icon + '+' + ELEMENTS[c.b].icon + ' ' + c.mp + ' MP';
        H.combo.classList.toggle('low', pl.mp < c.mp);
      }
    }

    const showBoss = !!boss && boss.active && !boss.dead;
    if (H.bossBox._s !== showBoss) { H.bossBox._s = showBoss; H.bossBox.classList.toggle('hidden', !showBoss); }
    if (showBoss) setW(H.bossFill, boss.hp / boss.maxHp);
  }

  function banner(text, color) {
    if (!H) return;
    const old = hudEl.querySelectorAll('.combo-banner');
    for (let i = 0; i < old.length; i++) old[i].remove();
    const b = div('combo-banner', text);
    if (color) { b.style.borderColor = color; b.style.color = color; }
    hudEl.appendChild(b);
    setTimeout(function () { b.remove(); }, 1400);
  }

  function toast(text) {
    if (!H) return;
    const old = hudEl.querySelectorAll('.toast');
    for (let i = 0; i < old.length; i++) old[i].remove();
    const t = div('toast', text);
    hudEl.appendChild(t);
    setTimeout(function () { t.remove(); }, 2000);
  }

  function setTouch(on) {
    const t = $('touch');
    if (t) t.style.visibility = on ? 'visible' : 'hidden';
  }

  return {
    showLoading: showLoading, showMenu: showMenu, hideMenu: hideMenu, showSelect: showSelect,
    showPause: showPause, showGameOver: showGameOver, showWin: showWin, hideOverlay: hideOverlay,
    startHud: startHud, updateHud: updateHud, banner: banner, toast: toast, setTouch: setTouch
  };
})();
