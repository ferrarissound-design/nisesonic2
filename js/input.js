// キーボード・タッチ・ゲームパッドの入力をまとめる
const Input = (() => {
  const held = { left: false, right: false, up: false, down: false, jump: false, start: false };
  const prev = { ...held };
  const pressed = { ...held };
  const keys = {};
  const touch = { left: false, right: false, up: false, down: false, jump: false, start: false };
  // フレームの間に押して離した入力も 1 フレームだけ拾う
  const latch = {};

  const MAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    KeyZ: 'jump', KeyX: 'jump', KeyC: 'jump', Space: 'jump', KeyK: 'jump', KeyJ: 'jump',
    Enter: 'start', KeyP: 'start', Escape: 'start',
  };

  window.addEventListener('keydown', e => {
    const a = MAP[e.code];
    if (a) {
      keys[a] = true;
      latch[a] = true;
      e.preventDefault();
    }
    if (e.code === 'KeyM') Sound.toggleMute();
    Sound.init();
  });
  window.addEventListener('keyup', e => {
    const a = MAP[e.code];
    if (a) {
      keys[a] = false;
      e.preventDefault();
    }
  });
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
  });

  function bindTouch() {
    const buttons = document.querySelectorAll('[data-btn]');
    buttons.forEach(el => {
      const names = el.dataset.btn.split(' ');
      const on = e => {
        e.preventDefault();
        Sound.init();
        names.forEach(n => {
          touch[n] = true;
          latch[n] = true;
        });
        el.classList.add('on');
      };
      const off = e => {
        e.preventDefault();
        names.forEach(n => (touch[n] = false));
        el.classList.remove('on');
      };
      el.addEventListener('touchstart', on, { passive: false });
      el.addEventListener('touchend', off, { passive: false });
      el.addEventListener('touchcancel', off, { passive: false });
      el.addEventListener('mousedown', on);
      el.addEventListener('mouseup', off);
      el.addEventListener('mouseleave', off);
    });
  }

  function pollPad() {
    const out = { left: false, right: false, up: false, down: false, jump: false, start: false };
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] || 0;
      const ay = p.axes[1] || 0;
      const b = i => p.buttons[i] && p.buttons[i].pressed;
      out.left = out.left || ax < -0.4 || b(14);
      out.right = out.right || ax > 0.4 || b(15);
      out.up = out.up || ay < -0.5 || b(12);
      out.down = out.down || ay > 0.5 || b(13);
      out.jump = out.jump || b(0) || b(1) || b(2) || b(3);
      out.start = out.start || b(9);
    }
    return out;
  }

  function update() {
    const pad = pollPad();
    for (const k in held) {
      prev[k] = held[k];
      held[k] = !!(keys[k] || touch[k] || pad[k] || latch[k]);
      pressed[k] = held[k] && !prev[k];
      latch[k] = false;
    }
  }

  function anyPressed() {
    return pressed.jump || pressed.start;
  }

  return { held, pressed, update, bindTouch, anyPressed };
})();
