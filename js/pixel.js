// ドット絵化の仕組み：ベクターで描いた絵を「限られた色＋ふち取り」のドット絵に変換してキャッシュする
const OUTLINE = '#0c0c24';

const Pixel = (() => {
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  const colorCache = {};

  function rgb(color) {
    if (colorCache[color]) return colorCache[color];
    pctx.clearRect(0, 0, 1, 1);
    pctx.fillStyle = color;
    pctx.fillRect(0, 0, 1, 1);
    const d = pctx.getImageData(0, 0, 1, 1).data;
    colorCache[color] = [d[0], d[1], d[2]];
    return colorCache[color];
  }

  // アルファを 0/255 に二値化し、色をパレットの最も近い色に寄せ、外側に 1px のふちを付ける
  function crispify(canvas, palette, outline) {
    const g = canvas.getContext('2d', { willReadFrequently: true });
    const w = canvas.width;
    const h = canvas.height;
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    const pal = palette ? palette.map(rgb) : null;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 120) {
        d[i + 3] = 0;
        continue;
      }
      d[i + 3] = 255;
      if (pal) {
        let best = 0;
        let bd = Infinity;
        for (let k = 0; k < pal.length; k++) {
          const p = pal[k];
          const dr = d[i] - p[0];
          const dg = d[i + 1] - p[1];
          const db = d[i + 2] - p[2];
          const dist = dr * dr * 3 + dg * dg * 4 + db * db * 2;
          if (dist < bd) {
            bd = dist;
            best = k;
          }
        }
        d[i] = pal[best][0];
        d[i + 1] = pal[best][1];
        d[i + 2] = pal[best][2];
      }
    }
    if (outline) {
      const oc = rgb(outline);
      const solid = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) solid[i] = d[i * 4 + 3] ? 1 : 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          if (solid[i]) continue;
          if ((x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w])) {
            d[i * 4] = oc[0];
            d[i * 4 + 1] = oc[1];
            d[i * 4 + 2] = oc[2];
            d[i * 4 + 3] = 255;
          }
        }
      }
    }
    g.putImageData(img, 0, 0);
    return canvas;
  }

  const cache = new Map();
  // key ごとに一度だけ描いて使い回す
  function sprite(key, w, h, ox, oy, palette, draw, outline) {
    let s = cache.get(key);
    if (s) return s;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.translate(ox, oy);
    draw(g);
    crispify(c, palette, outline === undefined ? OUTLINE : outline);
    s = { c, ox, oy };
    cache.set(key, s);
    return s;
  }

  function blit(ctx, s, x, y, flip) {
    x = Math.round(x);
    y = Math.round(y);
    if (!flip) {
      ctx.drawImage(s.c, x - s.ox, y - s.oy);
    } else {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(-1, 1);
      ctx.drawImage(s.c, -s.ox, -s.oy);
      ctx.restore();
    }
  }

  return { rgb, crispify, sprite, blit };
})();

// ---------- ドット文字（5×7） ----------
const FONT = (() => {
  const src = {
    A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
    B: '####.|#...#|#...#|####.|#...#|#...#|####.',
    C: '.###.|#...#|#....|#....|#....|#...#|.###.',
    D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
    E: '#####|#....|#....|####.|#....|#....|#####',
    F: '#####|#....|#....|####.|#....|#....|#....',
    G: '.###.|#...#|#....|#.###|#...#|#...#|.####',
    H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
    I: '.###.|..#..|..#..|..#..|..#..|..#..|.###.',
    J: '..###|...#.|...#.|...#.|#..#.|#..#.|.##..',
    K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
    L: '#....|#....|#....|#....|#....|#....|#####',
    M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
    N: '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#',
    O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
    P: '####.|#...#|#...#|####.|#....|#....|#....',
    Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
    R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
    S: '.####|#....|#....|.###.|....#|....#|####.',
    T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
    U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
    V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
    W: '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#',
    X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
    Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
    Z: '#####|....#|...#.|..#..|.#...|#....|#####',
    0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
    1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
    2: '.###.|#...#|....#|...#.|..#..|.#...|#####',
    3: '####.|....#|....#|.###.|....#|....#|####.',
    4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
    5: '#####|#....|####.|....#|....#|#...#|.###.',
    6: '.###.|#....|#....|####.|#...#|#...#|.###.',
    7: '#####|....#|...#.|..#..|.#...|.#...|.#...',
    8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
    9: '.###.|#...#|#...#|.####|....#|....#|.###.',
    "'": '..#..|..#..|.#...|.....|.....|.....|.....',
    '"': '.#.#.|.#.#.|#.#..|.....|.....|.....|.....',
    '.': '.....|.....|.....|.....|.....|.##..|.##..',
    ',': '.....|.....|.....|.....|.##..|..#..|.#...',
    '!': '..#..|..#..|..#..|..#..|..#..|.....|..#..',
    '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
    '-': '.....|.....|.....|.###.|.....|.....|.....',
    ':': '.....|.##..|.##..|.....|.##..|.##..|.....',
    '/': '....#|...#.|...#.|..#..|.#...|.#...|#....',
    '×': '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....',
    '<': '..#..|.#...|#####|.#...|..#..|.....|.....',
    '>': '..#..|...#.|#####|...#.|..#..|.....|.....',
    '^': '..#..|.###.|#.#.#|..#..|..#..|..#..|.....',
    '~': '..#..|..#..|..#..|#.#.#|.###.|..#..|.....',
    ' ': '.....|.....|.....|.....|.....|.....|.....',
  };
  const glyphs = {};
  for (const k in src) glyphs[k] = src[k].split('|');
  return glyphs;
})();

const Text = (() => {
  const cache = new Map();
  function glyph(ch, color, scale) {
    const key = ch + color + scale;
    let c = cache.get(key);
    if (c) return c;
    const rows = FONT[ch] || FONT['?'];
    c = document.createElement('canvas');
    c.width = 5 * scale;
    c.height = 7 * scale;
    const g = c.getContext('2d');
    g.fillStyle = color;
    for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (rows[y][x] === '#') g.fillRect(x * scale, y * scale, scale, scale);
    cache.set(key, c);
    return c;
  }
  function width(str, scale) {
    return str.length * 6 * (scale || 1) - (scale || 1);
  }
  // opts: scale, align('left'|'center'|'right'), outline(色 or false)
  function draw(ctx, str, x, y, color, opts) {
    opts = opts || {};
    const scale = opts.scale || 1;
    str = String(str).toUpperCase();
    let sx = Math.round(x);
    if (opts.align === 'center') sx -= Math.floor(width(str, scale) / 2);
    else if (opts.align === 'right') sx -= width(str, scale);
    y = Math.round(y);
    const out = opts.outline === undefined ? OUTLINE : opts.outline;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === ' ') continue;
      const gx = sx + i * 6 * scale;
      if (out) {
        const o = glyph(ch, out, scale);
        const s = Math.max(1, Math.floor(scale / 2));
        ctx.drawImage(o, gx - s, y);
        ctx.drawImage(o, gx + s, y);
        ctx.drawImage(o, gx, y - s);
        ctx.drawImage(o, gx, y + s);
        ctx.drawImage(o, gx + s, y + s);
      }
      ctx.drawImage(glyph(ch, color || '#ffffff', scale), gx, y);
    }
  }
  return { draw, width };
})();
