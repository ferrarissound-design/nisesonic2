// 地形（高さマップ）とステージデータの生成
const VIEW_W = 424;
const VIEW_H = 240;

class Builder {
  constructor(len, startY) {
    this.h = new Float32Array(len).fill(Infinity);
    this.x = 0;
    this.y = startY;
    this.pending = [];
    this.boxes = [];
    this.platforms = [];
    this.loops = [];
    this.deco = [];
  }

  seg(len, fn) {
    for (let i = 0; i < len; i++) this.h[this.x + i] = fn(i / len);
    this.x += len;
    return this;
  }
  flat(len) {
    const y = this.y;
    return this.seg(len, () => y);
  }
  // なめらかな坂（dy > 0 で下り）
  slope(len, dy) {
    const y0 = this.y;
    this.seg(len, t => y0 + (dy * (1 - Math.cos(Math.PI * t))) / 2);
    this.y += dy;
    return this;
  }
  // 丘（height > 0 で盛り上がる）
  hill(len, height) {
    const y0 = this.y;
    return this.seg(len, t => y0 - (height * (1 - Math.cos(2 * Math.PI * t))) / 2);
  }
  // 終端がせり上がるジャンプ台
  ramp(len, rise) {
    const y0 = this.y;
    this.seg(len, t => y0 - rise * (1 - Math.cos((t * Math.PI) / 2)));
    this.y -= rise;
    return this;
  }
  gap(len, dy) {
    this.x += len;
    this.y += dy || 0;
    return this;
  }
  // 平地の上にループを置く
  loop(r) {
    const pad = 120;
    const cx = this.x + pad + r;
    this.loops.push({ cx, cy: this.y - r, r });
    this.flat(pad * 2 + r * 2);
    return cx;
  }

  // 後で地面の高さを見て y を決めるオブジェクト
  obj(type, dx, up, props) {
    this.pending.push({ type, x: this.x + dx, up: up || 0, refY: this.y, ...(props || {}) });
    return this;
  }
  rings(dx, up, n, spacing, props) {
    for (let i = 0; i < n; i++) this.obj('ring', dx + i * (spacing || 24), up, props);
    return this;
  }
  ringArc(dx, up, n, width, height) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      this.obj('ring', dx + t * width, up + Math.sin(t * Math.PI) * height);
    }
    return this;
  }
  box(dx, w, hgt, props) {
    this.pending.push({ type: '_box', x: this.x + dx, w, hgt, ...(props || {}) });
    return this;
  }
  platform(dx, up, w, move) {
    const y = this.y - up;
    const p = { x0: this.x + dx, y0: y, x: this.x + dx, y, w, h: 14, ax: 0, ay: 0, period: 180, phase: 0, dx: 0, dy: 0, ...(move || {}) };
    this.platforms.push(p);
    return this;
  }
  decor(type, dx) {
    this.deco.push({ type, x: this.x + dx });
    return this;
  }

  finish(meta) {
    const w = this.x;
    const h = this.h;
    const ground = x => {
      const xi = Math.round(x);
      if (xi < 0 || xi >= w) return Infinity;
      return h[xi];
    };
    let maxY = 0;
    for (let i = 0; i < w; i++) if (h[i] !== Infinity && h[i] > maxY) maxY = h[i];
    const objects = [];
    for (const p of this.pending) {
      const gy = p.abs ? p.refY : ground(p.x);
      const baseY = gy === Infinity ? p.refY : gy;
      if (p.type === '_box') {
        this.boxes.push({ x: p.x, y: baseY - p.hgt, w: p.w, h: p.hgt + 160, kind: p.kind || 'block' });
      } else {
        objects.push({ ...p, y: baseY - p.up, groundY: baseY });
      }
    }
    for (const d of this.deco) d.y = ground(d.x);
    return {
      w,
      h,
      ground,
      boxes: this.boxes,
      platforms: this.platforms,
      loops: this.loops,
      objects,
      deco: this.deco.filter(d => d.y !== Infinity),
      maxY,
      deathY: maxY + 160,
      ...meta,
    };
  }
}

// 地形の傾き（ラジアン）。y が下向きなので正の値は右下がり
function terrainAngle(level, x) {
  const xi = Math.round(x);
  let a = level.ground(xi - 6);
  let b = level.ground(xi + 6);
  let span = 12;
  if (a === Infinity || b === Infinity) {
    a = level.ground(xi - 1);
    b = level.ground(xi + 1);
    span = 2;
    if (a === Infinity || b === Infinity) return 0;
  }
  return Math.atan2(b - a, span);
}

const PALETTES = {
  hill: {
    sky: ['#2a6fd6', '#58a6f0', '#a8dcff'],
    far: '#3b78c4',
    farTop: '#6fb0e8',
    mid: '#1f8a4a',
    midTop: '#39b35f',
    water: '#2c63c9',
    waterLine: '#9fd2ff',
    dirtA: '#b8682b',
    dirtB: '#8e4a1c',
    grass: '#2fbf3a',
    grassDark: '#1a8a24',
    grassLight: '#7be36b',
    block: ['#c9894a', '#9a5f2a'],
    cloud: '#ffffff',
    sun: null,
  },
  sunset: {
    sky: ['#3a1f63', '#d0507a', '#ffb76b'],
    far: '#6b2f6e',
    farTop: '#a24a7c',
    mid: '#3d5a2a',
    midTop: '#5f8a34',
    water: '#a54a6a',
    waterLine: '#ffd0a0',
    dirtA: '#a3562e',
    dirtB: '#6e3420',
    grass: '#58b23a',
    grassDark: '#2f7a22',
    grassLight: '#b5e870',
    block: ['#b5704a', '#7c4128'],
    cloud: '#ffd7c2',
    sun: '#ffe08a',
  },
};

function buildAct1() {
  const B = new Builder(16000, 560);
  B.decor('palm', 40).decor('flower', 200).decor('flower', 260);
  B.rings(300, 26, 5).obj('monitor', 540, 0, { kind: 'rings' }).decor('palm', 620);
  B.flat(700);

  B.obj('bug', 240, 0).ringArc(80, 90, 5, 300, 30);
  B.hill(480, 70);

  B.rings(60, 26, 6).decor('flower', 40).decor('palm', 220);
  B.flat(300);

  for (let i = 0; i < 5; i++) B.obj('ring', 80 + i * 80, 30);
  B.obj('bug', 420, 0);
  B.slope(500, 150);

  B.flat(120);
  const lx = B.loop(80);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    B.pending.push({ type: 'ring', x: lx + Math.sin(a) * 60, up: 0, abs: true, refY: B.y - 82 + Math.cos(a) * 60 });
  }
  B.decor('palm', 160);
  B.obj('bug', 180, 0).decor('flower', 60);
  B.flat(260);

  B.ringArc(150, 30, 7, 300, 60).obj('bee', 300, 120);
  B.hill(600, 110);

  B.obj('spring', 120, 0, { dir: 'up', power: 'yellow' });
  B.platform(60, 190, 96);
  B.rings(80, 214, 3);
  B.flat(260);
  B.obj('monitor', 100, 190, { kind: 'shield', abs: true });
  B.platform(80, 190, 64);
  B.flat(220);

  B.rings(40, 30, 4);
  B.ramp(240, 70);
  B.ringArc(0, 60, 6, 240, 70);
  B.gap(260, 50);

  B.obj('bee', 220, 70).obj('checkpoint', 320, 0).decor('palm', 100);
  B.flat(440);

  B.platform(40, 10, 80);
  B.platform(200, 30, 72, { ax: 60, period: 200 });
  B.rings(176, 56, 3);
  B.platform(380, 10, 80);
  B.rings(390, 36, 3);
  B.gap(500);

  B.box(120, 64, 32).obj('spikes', 230, 0, { w: 32 }).box(300, 64, 64);
  B.rings(310, 88, 3).obj('bee', 420, 80);
  B.obj('monitor', 30, 0, { kind: 'rings' });
  B.flat(520);

  B.slope(400, 100);
  for (let i = 0; i < 3; i++) {
    B.ringArc(70, 26, 5, 160, 50);
    if (i === 1) B.obj('bug', 160, 0);
    B.hill(300, 45);
  }

  B.obj('spring', 140, 0, { dir: 'right' }).decor('flower', 60);
  B.flat(260);
  for (let i = 0; i < 6; i++) B.obj('ring', 80 + i * 90, 30);
  B.slope(620, 170);
  B.flat(80);
  B.loop(80);

  B.obj('monitor', 120, 0, { kind: 'shoes' }).decor('palm', 260);
  B.flat(400);
  B.obj('bug', 200, 0).ringArc(100, 80, 5, 200, 30);
  B.hill(400, 80);
  B.obj('monitor', 200, 0, { kind: 'life' });
  B.obj('goal', 500, 0).decor('palm', 700).decor('flower', 420);
  B.flat(900);
  B.box(0, 64, 400);
  B.flat(200);

  return B.finish({
    name: 'NISE HILL',
    act: 1,
    palette: 'hill',
    music: 'zone',
    start: { x: 96 },
  });
}

function buildAct2() {
  const B = new Builder(16000, 520);
  B.decor('palm', 60).decor('flower', 300);
  B.rings(260, 26, 5).obj('monitor', 480, 0, { kind: 'rings' });
  B.flat(620);

  B.obj('bee', 200, 70).ringArc(40, 40, 6, 260, 50);
  B.slope(400, 140);
  B.flat(160);
  B.loop(84);

  B.obj('bug', 160, 0).obj('bug', 320, 0);
  B.flat(420);

  B.platform(50, 0, 88);
  B.platform(210, 30, 80, { ay: 24, period: 160 });
  B.platform(370, 0, 80, { ax: 36, period: 220, phase: 1 });
  B.rings(220, 70, 3);
  B.gap(540);

  B.obj('checkpoint', 160, 0).obj('monitor', 260, 0, { kind: 'shield' });
  B.flat(360);

  B.box(40, 48, 40).box(140, 48, 80).rings(150, 104, 2, 20);
  B.obj('spikes', 230, 0, { w: 48 }).box(320, 48, 40).obj('bee', 260, 130);
  B.flat(460);

  B.obj('spring', 60, 0, { dir: 'up', power: 'red' });
  B.platform(150, 260, 120);
  B.rings(160, 284, 5, 20);
  B.obj('monitor', 220, 260, { kind: 'invincible', abs: true });
  B.flat(140);
  B.platform(90, 220, 80, { ax: 70, period: 240 });
  B.platform(180, 0, 72);
  B.gap(320);
  B.platform(10, 120, 80);
  B.flat(200);

  B.ramp(200, 60).rings(20, 28, 4);
  B.ringArc(0, 70, 7, 300, 80);
  B.gap(300, 60);

  B.obj('bug', 200, 0).decor('palm', 80);
  B.flat(360);
  for (let i = 0; i < 4; i++) {
    B.ringArc(70, 26, 5, 160, 50);
    if (i % 2 === 1) B.obj('bee', 150, 90);
    B.hill(320, 55);
  }
  B.obj('checkpoint', 120, 0);
  B.flat(300);
  B.slope(500, 140);
  B.flat(60);
  B.loop(84);

  B.obj('monitor', 100, 0, { kind: 'rings' }).obj('monitor', 160, 0, { kind: 'shield' });
  B.flat(500);
  // ボス戦エリア（1画面ぶん）
  const arenaX = B.x;
  B.flat(VIEW_W);
  B.box(0, 64, 400);
  B.flat(200);

  return B.finish({
    name: 'NISE HILL',
    act: 2,
    palette: 'sunset',
    music: 'sunset',
    start: { x: 96 },
    arena: { x: arenaX, w: VIEW_W },
  });
}

const ACTS = [buildAct1, buildAct2];
