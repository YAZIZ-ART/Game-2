
'use strict';

const GameInput = (() => {

  const keys = {};
  const actions = {};

  function setKey(key, value) {
    keys[key] = value;
  }

  function setAction(name, value) {
    actions[name] = value;
  }

  // Keyboard
  window.addEventListener('keydown', e => {
    if ([
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      ' ',
      'Shift'
    ].includes(e.key)) {
      e.preventDefault();
    }

    setKey(e.key, true);

    if (e.repeat) return;

    if (e.key === ' ' || e.key.toLowerCase() === 'j')
      setAction('attack', true);

    if (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'q')
      setAction('skill', true);

    if (e.key.toLowerCase() === 'e')
      setAction('element', true);

    if (e.key === 'Shift')
      setAction('dash', true);

  }, { passive: false });

  window.addEventListener('keyup', e => {
    setKey(e.key, false);

    if (e.key === ' ' || e.key.toLowerCase() === 'j')
      setAction('attack', false);

    if (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'q')
      setAction('skill', false);

    if (e.key.toLowerCase() === 'e')
      setAction('element', false);

    if (e.key === 'Shift')
      setAction('dash', false);
  });

  // Touch controls
  document.querySelectorAll('[data-key]').forEach(btn => {
    const key = btn.dataset.key;

    const down = e => {
      e.preventDefault();
      btn.classList.add('active');
      setKey(key, true);
    };

    const up = e => {
      e.preventDefault();
      btn.classList.remove('active');
      setKey(key, false);
    };

    btn.addEventListener('pointerdown', down);

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(event => {
      btn.addEventListener(event, up);
    });
  });

  document.querySelectorAll('[data-action]').forEach(btn => {
    const name = btn.dataset.action;

    const down = e => {
      e.preventDefault();
      btn.classList.add('active');
      setAction(name, true);
    };

    const up = e => {
      e.preventDefault();
      btn.classList.remove('active');
      setAction(name, false);
    };

    btn.addEventListener('pointerdown', down);

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(event => {
      btn.addEventListener(event, up);
    });
  });

  return {

    down(key) {
      return !!keys[key];
    },

    action(name) {
      return !!actions[name];
    },

    consume(name) {
      const value = !!actions[name];
      actions[name] = false;
      return value;
    },

    vector() {
      return {
        x:
          (this.down('ArrowRight') || this.down('d') ? 1 : 0) -
          (this.down('ArrowLeft') || this.down('a') ? 1 : 0),

        y:
          (this.down('ArrowDown') || this.down('s') ? 1 : 0) -
          (this.down('ArrowUp') || this.down('w') ? 1 : 0)
      };
    }

  };

})();
