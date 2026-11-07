/* Aetheria — input.js : keyboard + kontrol sentuh */
'use strict';

const Input = (function () {
  const held = {}, hit = {};
  const moveKeys = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' };
  const actKeys = { j: 'attack', z: 'attack', k: 'skill', x: 'skill', l: 'elem', c: 'elem', ' ': 'dash', shift: 'dash' };
  let tx = 0, ty = 0;

  function name(e) { return e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase(); }

  window.addEventListener('keydown', function (e) {
    const k = name(e);
    if (moveKeys[k]) { held[moveKeys[k]] = true; e.preventDefault(); }
    if (actKeys[k]) {
      if (!held[actKeys[k]]) hit[actKeys[k]] = true;
      held[actKeys[k]] = true;
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', function (e) {
    const k = name(e);
    if (moveKeys[k]) held[moveKeys[k]] = false;
    if (actKeys[k]) held[actKeys[k]] = false;
  });

  function bindButton(id, action) {
    const el = document.getElementById(id);
    if (!el) return;
    const down = function (e) { e.preventDefault(); if (!held[action]) hit[action] = true; held[action] = true; };
    const up = function (e) { e.preventDefault(); held[action] = false; };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
    el.addEventListener('mousedown', down);
    el.addEventListener('mouseup', up);
    el.addEventListener('mouseleave', up);
  }
  bindButton('btn-attack', 'attack');
  bindButton('btn-skill', 'skill');
  bindButton('btn-elem', 'elem');
  bindButton('btn-dash', 'dash');

  const stick = document.getElementById('stick');
  const knob = document.getElementById('stick-knob');
  if (stick) {
    let tid = null;
    const update = function (t) {
      const r = stick.getBoundingClientRect();
      const R = r.width / 2 || 1;
      let dx = t.clientX - (r.left + R), dy = t.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1, m = Math.min(d, R);
      dx = dx / d * m; dy = dy / d * m;
      tx = dx / R; ty = dy / R;
      if (knob) knob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
    };
    const reset = function () { tid = null; tx = 0; ty = 0; if (knob) knob.style.transform = 'translate(-50%, -50%)'; };
    stick.addEventListener('touchstart', function (e) { e.preventDefault(); tid = e.changedTouches[0].identifier; update(e.changedTouches[0]); }, { passive: false });
    stick.addEventListener('touchmove', function (e) {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === tid) update(e.changedTouches[i]);
    }, { passive: false });
    stick.addEventListener('touchend', function (e) { e.preventDefault(); reset(); }, { passive: false });
    stick.addEventListener('touchcancel', reset);
  }

  return {
    dir: function () {
      let x = (held.right ? 1 : 0) - (held.left ? 1 : 0) + tx;
      let y = (held.down ? 1 : 0) - (held.up ? 1 : 0) + ty;
      const l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      return { x: x, y: y };
    },
    held: function (n) { return !!held[n]; },
    pressed: function (n) { const v = !!hit[n]; hit[n] = false; return v; },
    clear: function () { for (const k in hit) hit[k] = false; }
  };
})();
