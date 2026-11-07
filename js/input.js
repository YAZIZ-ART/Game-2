/* =====================================================================
   js/input.js : keyboard + joystick/tombol sentuh
   Pemakaian di game:
     Input.axis()        -> {x, y} arah gerak, panjang maksimal 1
     Input.held('attack')    -> true selama ditahan
     Input.pressed('skill')  -> true sekali saat baru ditekan (otomatis dibersihkan tiap frame)
     Input.endFrame()    -> dipanggil di akhir setiap frame oleh game.js
   Aksi: attack, skill, elem, dash, pause, interact
   ===================================================================== */
'use strict';

const Input = (function () {
  const KEYMAP = {
    attack:   ['KeyJ', 'KeyZ'],
    skill:    ['KeyK', 'KeyX'],
    elem:     ['KeyL', 'KeyC', 'KeyQ'],
    dash:     ['Space', 'ShiftLeft', 'ShiftRight'],
    pause:    ['Escape', 'KeyP'],
    interact: ['KeyE', 'Enter']
  };
  const MOVE = {
    up:    ['KeyW', 'ArrowUp'],
    down:  ['KeyS', 'ArrowDown'],
    left:  ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight']
  };

  const down = {};        // tombol keyboard yang sedang ditekan
  const heldAct = {};     // aksi yang sedang ditahan (keyboard atau sentuh)
  const pressedAct = {};  // aksi yang baru ditekan pada frame ini
  const touchHeld = {};   // aksi yang ditahan lewat tombol sentuh
  const stick = { x: 0, y: 0, id: null };

  function anyDown(codes) {
    for (let i = 0; i < codes.length; i++) if (down[codes[i]]) return true;
    return false;
  }

  function press(name) {
    if (!heldAct[name]) pressedAct[name] = true;
    heldAct[name] = true;
  }
  function release(name) { heldAct[name] = false; }

  /* ---------- Keyboard ---------- */
  window.addEventListener('keydown', function (e) {
    if (e.repeat) { if (isGameKey(e.code)) e.preventDefault(); return; }
    down[e.code] = true;
    for (const name in KEYMAP) {
      if (KEYMAP[name].indexOf(e.code) !== -1) press(name);
    }
    if (isGameKey(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) {
    down[e.code] = false;
    for (const name in KEYMAP) {
      if (KEYMAP[name].indexOf(e.code) !== -1 && !anyDown(KEYMAP[name]) && !touchHeld[name]) release(name);
    }
  });
  window.addEventListener('blur', function () {
    for (const k in down) down[k] = false;
    for (const n in heldAct) heldAct[n] = false;
    for (const n in touchHeld) touchHeld[n] = false;
    resetStick();
  });

  function isGameKey(code) {
    if (code === 'Space' || code.indexOf('Arrow') === 0) return true;
    for (const n in KEYMAP) if (KEYMAP[n].indexOf(code) !== -1) return true;
    for (const d in MOVE) if (MOVE[d].indexOf(code) !== -1) return true;
    return false;
  }

  /* ---------- Joystick sentuh ---------- */
  const DEAD = 0.18;

  function resetStick() {
    stick.x = 0; stick.y = 0; stick.id = null;
    const knob = document.getElementById('stick-knob');
    if (knob) knob.style.transform = 'translate(0px, 0px)';
  }

  function updateStick(e, el, knob) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const maxR = r.width * 0.30;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > maxR) { dx = dx / len * maxR; dy = dy / len * maxR; }
    knob.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
    let nx = dx / maxR, ny = dy / maxR;
    const m = Math.hypot(nx, ny);
    if (m < DEAD) { nx = 0; ny = 0; }
    stick.x = nx; stick.y = ny;
  }

  function bindStick() {
    const el = document.getElementById('stick');
    const knob = document.getElementById('stick-knob');
    if (!el || !knob) return;
    el.addEventListener('pointerdown', function (e) {
      if (stick.id !== null) return;
      stick.id = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      updateStick(e, el, knob);
      e.preventDefault();
    });
    el.addEventListener('pointermove', function (e) {
      if (e.pointerId !== stick.id) return;
      updateStick(e, el, knob);
      e.preventDefault();
    });
    const end = function (e) {
      if (e.pointerId !== stick.id) return;
      resetStick();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  }

  /* ---------- Tombol sentuh ---------- */
  function bindButton(id, name) {
    const b = document.getElementById(id);
    if (!b) return;
    b.addEventListener('pointerdown', function (e) {
      touchHeld[name] = true;
      press(name);
      b.classList.add('down');
      try { b.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });
    const up = function () {
      touchHeld[name] = false;
      b.classList.remove('down');
      if (!anyDown(KEYMAP[name])) release(name);
    };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
  }

  function init() {
    bindStick();
    bindButton('btn-attack', 'attack');
    bindButton('btn-skill', 'skill');
    bindButton('btn-elem', 'elem');
    // Cegah menu tekan-lama, zoom cubit, dan gulir di HP
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* ---------- API publik ---------- */
  return {
    axis: function () {
      let x = 0, y = 0;
      if (anyDown(MOVE.left))  x -= 1;
      if (anyDown(MOVE.right)) x += 1;
      if (anyDown(MOVE.up))    y -= 1;
      if (anyDown(MOVE.down))  y += 1;
      if (x !== 0 || y !== 0) {
        const l = Math.hypot(x, y);
        return { x: x / l, y: y / l };
      }
      return { x: stick.x, y: stick.y };
    },
    held:    function (name) { return !!heldAct[name]; },
    pressed: function (name) { return !!pressedAct[name]; },
    endFrame: function () { for (const n in pressedAct) pressedAct[n] = false; },
    isTouch: function () { return window.matchMedia && window.matchMedia('(pointer: coarse)').matches; }
  };
})();
