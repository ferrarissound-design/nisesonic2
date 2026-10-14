// グラフィック：ベクターで形を描き、Pixel.sprite でメガドライブ風のドット絵に変換して使う

// ---------- 色 ----------
const HC = {
  main: '#1aa89c',
  dark: '#0b6466',
  light: '#6fe4d4',
  skin: '#f8c890',
  skinDark: '#c8804c',
  red: '#e0302c',
  redDark: '#901a18',
  shoe: '#ff9a1e',
  shoeDark: '#b45a0c',
  white: '#ffffff',
  black: '#101018',
  lens: '#ffd23a',
  lensLight: '#fff4a6',
  strap: '#3a3a52',
  mouth: '#7a3b1a',
};
const HERO_PAL = Object.values(HC);
const RING_PAL = ['#a85c00', '#ffd23a', '#ffe98a', '#fffbe0'];

function shade(color, f) {
  const [r, g, b] = Pixel.rgb(color);
  const c = v => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}
// メガドライブの 1 チャンネル 8 段階に丸める
function mdColor(r, g, b) {
  const q = v => Math.round((Math.round((v / 255) * 7) / 7) * 255);
  return `rgb(${q(r)},${q(g)},${q(b)})`;
}

// ---------- ベクター補助 ----------
function ellipse(ctx, x, y, rx, ry, rot, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
  ctx.fill();
}
function tri(ctx, a, b, c, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.lineTo(c[0], c[1]);
  ctx.closePath();
  ctx.fill();
}
function limb(ctx, x0, y0, x1, y1, color, w) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

// ---------- 主人公（オリジナル：青緑のハリネズミ、赤いマフラー、ゴーグル） ----------
function vecHead(g, ox, oy, mood) {
  // トゲ
  tri(g, [ox - 3, oy - 7], [ox - 17, oy - 15], [ox - 7, oy - 1], HC.dark);
  tri(g, [ox - 5, oy - 3], [ox - 21, oy - 4], [ox - 5, oy + 4], HC.main);
  tri(g, [ox - 4, oy + 1], [ox - 17, oy + 9], [ox - 2, oy + 7], HC.dark);
  tri(g, [ox - 4, oy - 7], [ox - 6, oy - 19], [ox + 2, oy - 8], HC.main);
  tri(g, [ox + 0, oy - 8], [ox + 5, oy - 17], [ox + 5, oy - 6], HC.dark);
  ellipse(g, ox, oy, 9.5, 9.5, 0, HC.main);
  ellipse(g, ox - 3, oy - 4, 4, 3, -0.4, HC.light);
  // ゴーグル
  limb(g, ox - 8, oy - 4, ox + 1, oy - 8, HC.strap, 2.4);
  ellipse(g, ox + 3, oy - 8.5, 3.8, 3.2, 0, HC.strap);
  ellipse(g, ox + 3, oy - 8.5, 2.6, 2.1, 0, HC.lens);
  g.fillStyle = HC.lensLight;
  g.fillRect(ox + 2, oy - 10, 1.5, 1.5);
  // 口元
  ellipse(g, ox + 6, oy + 4, 5.5, 4, 0, HC.skin);
  // 目（左右が分かれた目）
  if (mood === 'hurt') {
    g.strokeStyle = HC.black;
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(ox + 4, oy - 3);
    g.lineTo(ox + 9, oy + 1);
    g.moveTo(ox + 9, oy - 3);
    g.lineTo(ox + 4, oy + 1);
    g.stroke();
  } else {
    ellipse(g, ox + 3.2, oy - 1, 2.2, 3.2, 0, HC.white);
    ellipse(g, ox + 4.2, oy - 0.8, 1.1, 2, 0, HC.black);
    ellipse(g, ox + 7.8, oy - 1, 2.6, 3.4, 0, HC.white);
    ellipse(g, ox + 8.9, oy - 0.8, 1.3, 2.3, 0, HC.black);
  }
  ellipse(g, ox + 11.5, oy + 2.4, 1.8, 1.5, 0, HC.black);
  g.strokeStyle = HC.mouth;
  g.lineWidth = 1;
  g.beginPath();
  if (mood === 'grin') g.arc(ox + 7.5, oy + 4.5, 2.6, 0.1, Math.PI * 0.85);
  else {
    g.moveTo(ox + 5.5, oy + 6.2);
    g.lineTo(ox + 9.5, oy + 5.8);
  }
  g.stroke();
}

function vecShoe(g, x, y, rot) {
  g.save();
  g.translate(x, y);
  g.rotate(rot || 0);
  ellipse(g, 2, -0.5, 6.2, 3.4, 0, HC.shoe);
  g.fillStyle = HC.white;
  g.fillRect(-4, 1.6, 12.5, 1.8);
  g.fillStyle = HC.shoeDark;
  g.fillRect(0, -3.4, 1.6, 4.6);
  g.restore();
}

function vecScarf(g, s, len) {
  ellipse(g, 0.5, -1.8, 6.6, 2.5, 0, HC.red);
  const l = len || 1;
  tri(g, [-3, -3.5], [-3 - 12 * l, -5 + Math.sin(s) * 3], [-3, 0], HC.red);
  tri(g, [-3, -1.5], [-3 - 10 * l, 1 + Math.cos(s) * 3], [-2, 1], HC.redDark);
}

function vecBall(g, t) {
  const r = 14;
  ellipse(g, 0, 0, r, r, 0, HC.main);
  g.save();
  g.rotate(t);
  g.strokeStyle = HC.dark;
  g.lineWidth = 2.6;
  for (let i = 0; i < 4; i++) {
    g.rotate(Math.PI / 2);
    g.beginPath();
    g.arc(r * 0.35, 0, r * 0.7, -1.2, 0.6);
    g.stroke();
  }
  ellipse(g, r * 0.35, r * 0.15, r * 0.34, r * 0.24, 0, HC.skin);
  g.strokeStyle = HC.red;
  g.lineWidth = 2.4;
  g.beginPath();
  g.arc(0, 0, r - 4, 2.2, 2.9);
  g.stroke();
  g.restore();
  g.strokeStyle = HC.light;
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(0, 0, r - 2.6, -2.5, -1.4);
  g.stroke();
}

function vecHero(g, pose, t, s) {
  if (pose === 'ball') {
    vecBall(g, t);
    return;
  }
  if (pose === 'crouch') {
    g.save();
    g.translate(0, 7);
    vecScarf(g, s, 0.7);
    ellipse(g, -1, 4, 9, 7, 0, HC.main);
    ellipse(g, 3, 5, 4, 4, 0, HC.skin);
    vecShoe(g, 5, 10.5, 0);
    vecShoe(g, -4, 10.5, 0);
    vecHead(g, 2, -6, 'normal');
    ellipse(g, 7, 6, 2.8, 2.8, 0, HC.skin);
    g.restore();
    return;
  }
  let lean = 0;
  let headX = 1;
  let headY = -9;
  let mood = 'normal';
  let legA = 0;
  let legB = 0;
  let armA = 0.5;
  let armB = -0.4;
  let figure8 = false;
  let scarfLen = 0.8;
  switch (pose) {
    case 'run':
      lean = 0.18;
      legA = Math.sin(t) * 1.0;
      legB = -legA;
      armA = -Math.sin(t) * 1.1;
      armB = -armA;
      headX = 3;
      scarfLen = 1.1;
      break;
    case 'dash':
      lean = 0.3;
      figure8 = true;
      headX = 4;
      mood = 'grin';
      armA = 1.3;
      armB = 1.0;
      scarfLen = 1.4;
      break;
    case 'up':
      headY -= 1;
      armA = 0.2;
      armB = -0.2;
      break;
    case 'hurt':
      lean = -0.3;
      mood = 'hurt';
      legA = 0.6;
      legB = -0.4;
      armA = -2.3;
      armB = -2.0;
      break;
    case 'dead':
      mood = 'hurt';
      legA = 0.8;
      legB = -0.8;
      armA = -2.5;
      armB = 2.5;
      break;
    case 'spring':
      armA = -2.8;
      armB = -2.6;
      legA = 0.15;
      legB = -0.15;
      mood = 'grin';
      scarfLen = 0.6;
      break;
    case 'skid':
      lean = -0.25;
      legA = 0.9;
      legB = 0.6;
      armA = -1.4;
      armB = -1.0;
      break;
    case 'balance':
      lean = 0.15 + Math.sin(t) * 0.1;
      armA = -2.2 + Math.sin(t);
      armB = -1.8 - Math.sin(t);
      mood = 'hurt';
      break;
    case 'push':
      lean = 0.45;
      legA = -0.6 + Math.sin(t) * 0.3;
      legB = 0.5;
      armA = 1.6;
      armB = 1.5;
      headX = 4;
      break;
    default:
      armA = 0.3;
      armB = -0.2;
      break;
  }

  g.save();
  g.translate(0, 8);
  g.rotate(lean);
  g.translate(0, -8);
  const hip = [0, 6];
  const leg = (a, back) => {
    const fx = hip[0] + Math.sin(a) * 10;
    const fy = hip[1] + Math.cos(a) * 9 + 2;
    limb(g, hip[0], hip[1], fx, fy, back ? HC.dark : HC.main, 3);
    vecShoe(g, fx + 1, fy + 2, a * 0.4);
  };
  const shoulder = [1, -1];
  const arm = (a, back) => {
    const hx = shoulder[0] + Math.sin(a) * 9;
    const hy = shoulder[1] + Math.cos(a) * 9;
    limb(g, shoulder[0], shoulder[1], hx, hy, back ? HC.skinDark : HC.skin, 2.2);
    ellipse(g, hx, hy, 2.7, 2.7, 0, back ? HC.skinDark : HC.skin);
  };
  vecScarf(g, s, scarfLen);
  if (figure8) {
    g.strokeStyle = HC.shoe;
    g.lineWidth = 3.6;
    g.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2 + t;
      const px = Math.sin(a) * 9;
      const py = 13 + Math.sin(a * 2) * 3.5;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.stroke();
    g.strokeStyle = HC.white;
    g.lineWidth = 1.2;
    g.stroke();
  } else {
    leg(legB, true);
  }
  arm(armB, true);
  ellipse(g, 0, 2, 7, 8.5, 0, HC.main);
  ellipse(g, 2.5, 3.5, 4, 5.5, 0, HC.skin);
  if (!figure8) leg(legA, false);
  vecHead(g, headX, headY, mood);
  arm(armA, false);
  g.restore();
}

// ポーズ名とコマ番号からドット絵を取り出す
const HERO_FRAMES = { run: 8, dash: 4, ball: 8, balance: 4, push: 4, stand: 2 };
function heroSprite(pose, fi) {
  const n = HERO_FRAMES[pose] || 1;
  fi = ((fi % n) + n) % n;
  return Pixel.sprite(`hero:${pose}:${fi}`, 72, 64, 36, 36, HERO_PAL, g => {
    const t = (fi / n) * Math.PI * 2;
    vecHero(g, pose, t, fi * 1.7);
  });
}

function drawHero(ctx, pose, fi, x, y, dir, angle) {
  const s = heroSprite(pose, fi);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (angle) ctx.rotate(angle);
  ctx.scale(dir || 1, 1);
  ctx.drawImage(s.c, -s.ox, -s.oy);
  ctx.restore();
}

function heroHeadSprite(scale, mood) {
  const sz = Math.ceil(52 * scale);
  return Pixel.sprite(`head:${scale}:${mood}`, sz, sz, Math.round(sz * 0.55), Math.round(sz * 0.55), HERO_PAL, g => {
    g.scale(scale, scale);
    vecHead(g, 0, 0, mood || 'grin');
  });
}

// ---------- リング・アイテム ----------
function drawRing(ctx, x, y, phase) {
  const fi = ((Math.floor((phase / (Math.PI * 2)) * 8) % 8) + 8) % 8;
  const s = Pixel.sprite(`ring:${fi}`, 18, 18, 9, 9, RING_PAL, g => {
    const w = Math.abs(Math.cos((fi / 8) * Math.PI)) * 5.5 + 1.2;
    g.lineWidth = 3.2;
    g.strokeStyle = RING_PAL[0];
    g.beginPath();
    g.ellipse(0, 0.6, w, 6, 0, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 2;
    g.strokeStyle = RING_PAL[1];
    g.beginPath();
    g.ellipse(0, 0, w, 6, 0, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = RING_PAL[3];
    g.fillRect(-w * 0.7 - 0.5, -4.5, 1.6, 1.6);
  }, false);
  Pixel.blit(ctx, s, x, y);
}

const MON_PAL = ['#3c3c46', '#c9c9d6', '#8a8a99', '#1a1a2e', '#dddddd', '#888888', '#ffffff', '#56c8ff', '#2a7ab0', '#ffe36b'];
function vecMonitorIcon(g, kind) {
  g.fillStyle = '#1a1a2e';
  g.fillRect(-8, -7, 16, 14);
  switch (kind) {
    case 'rings':
      g.lineWidth = 2;
      g.strokeStyle = RING_PAL[1];
      g.beginPath();
      g.ellipse(0, 0, 4, 5, 0, 0, Math.PI * 2);
      g.stroke();
      break;
    case 'shield':
      ellipse(g, 0, 0, 5.5, 5.5, 0, '#56c8ff');
      ellipse(g, -2, -2, 1.8, 1.8, 0, '#ffffff');
      break;
    case 'shoes':
      vecShoe(g, -2, 1, 0);
      break;
    case 'invincible':
      g.fillStyle = '#ffe36b';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        g.fillRect(Math.cos(a) * 4 - 1, Math.sin(a) * 4 - 1, 3, 3);
      }
      break;
    case 'life':
      g.save();
      g.scale(0.45, 0.45);
      vecHead(g, -2, 4, 'grin');
      g.restore();
      break;
  }
}
const ICON_PAL = MON_PAL.concat(HERO_PAL, RING_PAL);
function drawMonitorIcon(ctx, x, y, kind) {
  const s = Pixel.sprite(`icon:${kind}`, 20, 18, 10, 9, ICON_PAL, g => vecMonitorIcon(g, kind), false);
  Pixel.blit(ctx, s, x, y);
}
function drawMonitor(ctx, x, y, kind, frame) {
  const stat = (frame >> 3) % 6 === 0;
  const s = Pixel.sprite(`monitor:${kind}:${stat ? 's' + (frame % 3) : 'i'}`, 32, 34, 16, 31, ICON_PAL, g => {
    g.fillStyle = '#3c3c46';
    g.fillRect(-13, -4, 26, 4);
    g.fillStyle = '#c9c9d6';
    g.fillRect(-13, -28, 26, 25);
    g.fillStyle = '#8a8a99';
    g.fillRect(-13, -6, 26, 3);
    g.fillRect(11, -28, 2, 22);
    if (stat) {
      g.fillStyle = '#dddddd';
      g.fillRect(-9, -24, 18, 15);
      g.fillStyle = '#888888';
      for (let i = 0; i < 5; i++) g.fillRect(-9, -24 + i * 3 + (frame % 3), 18, 1);
    } else {
      g.save();
      g.translate(0, -16);
      vecMonitorIcon(g, kind);
      g.restore();
    }
    g.fillStyle = '#ffffff';
    g.fillRect(-9, -24, 2, 5);
  });
  Pixel.blit(ctx, s, x, y);
}
function drawBrokenMonitor(ctx, x, y) {
  const s = Pixel.sprite('monitor:broken', 32, 14, 16, 12, MON_PAL, g => {
    g.fillStyle = '#8a8a99';
    g.fillRect(-13, -6, 26, 6);
    g.fillStyle = '#3c3c46';
    g.fillRect(-10, -9, 8, 3);
    g.fillRect(3, -8, 7, 2);
  });
  Pixel.blit(ctx, s, x, y);
}

const SPRING_PAL = ['#8a8a99', '#c9c9d6', '#ffd23a', '#c48a00', '#ff3b3b', '#a51818', '#5b5b66'];
function drawSpring(ctx, x, y, dir, power, squash) {
  const ext = squash > 6 ? 16 : 8;
  const s = Pixel.sprite(`spring:${dir}:${power}:${ext}`, 48, 48, 24, 24, SPRING_PAL, g => {
    if (dir === 'right') {
      g.rotate(-Math.PI / 2);
      g.translate(14, 0);
    }
    if (dir === 'left') {
      g.rotate(Math.PI / 2);
      g.translate(-14, 0);
    }
    if (dir === 'up') g.translate(0, 20);
    else g.translate(0, 6);
    const top = power === 'red' ? '#ff3b3b' : '#ffd23a';
    const topDark = power === 'red' ? '#a51818' : '#c48a00';
    g.fillStyle = '#5b5b66';
    g.fillRect(-12, -4, 24, 4);
    g.strokeStyle = '#c9c9d6';
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i <= 4; i++) g.lineTo(i % 2 ? 7 : -7, -4 - (i / 4) * ext);
    g.stroke();
    g.fillStyle = topDark;
    g.fillRect(-14, -8 - ext, 28, 6);
    g.fillStyle = top;
    g.fillRect(-14, -9 - ext, 28, 4);
  });
  if (dir === 'up') Pixel.blit(ctx, s, x, y - 20);
  else Pixel.blit(ctx, s, x, y - 14);
}

function drawSpikes(ctx, x, y, w) {
  const s = Pixel.sprite(`spikes:${w}`, w + 4, 22, w / 2 + 2, 20, ['#5b5b66', '#e4e4ee', '#9b9bab', '#ffffff'], g => {
    const l = -w / 2;
    g.fillStyle = '#5b5b66';
    g.fillRect(l, -4, w, 4);
    for (let i = 0; i < w / 8; i++) {
      const sx = l + i * 8;
      tri(g, [sx, -4], [sx + 4, -16], [sx + 8, -4], '#e4e4ee');
      tri(g, [sx + 4, -16], [sx + 8, -4], [sx + 5, -4], '#9b9bab');
      g.fillStyle = '#ffffff';
      g.fillRect(sx + 3, -13, 1, 3);
    }
  });
  Pixel.blit(ctx, s, x, y);
}

function drawCheckpoint(ctx, x, y, a, active) {
  const fi = Math.round((a / (Math.PI * 2)) * 8) % 8;
  const s = Pixel.sprite(`check:${fi}:${active ? 1 : 0}`, 24, 64, 12, 60, ['#2a3dd6', '#c9c9d9', '#ff4040', '#3a60ff', '#ffffff', '#16207a'], g => {
    g.fillStyle = '#2a3dd6';
    g.fillRect(-2, -44, 4, 44);
    g.fillStyle = '#16207a';
    g.fillRect(1, -44, 1, 44);
    g.fillStyle = '#c9c9d9';
    g.fillRect(-4, -4, 8, 4);
    const ang = (fi / 8) * Math.PI * 2;
    const bx = Math.sin(ang) * 5;
    ellipse(g, bx, -49, 5, 5, 0, active ? '#ff4040' : '#3a60ff');
    g.fillStyle = '#ffffff';
    g.fillRect(bx - 2, -52, 2, 2);
  });
  Pixel.blit(ctx, s, x, y);
}

function vecBossFace(g) {
  ellipse(g, 0, 0, 11, 11, 0, '#f2b090');
  ellipse(g, -4, -2, 3.5, 2.5, 0, '#bde4ff');
  ellipse(g, 4, -2, 3.5, 2.5, 0, '#bde4ff');
  g.fillStyle = '#222222';
  g.fillRect(-8, -3, 16, 1);
  g.fillStyle = '#ff8a3a';
  g.beginPath();
  g.moveTo(-10, 5);
  g.quadraticCurveTo(0, -1, 10, 5);
  g.quadraticCurveTo(0, 3, -10, 5);
  g.fill();
  ellipse(g, 0, 2, 2, 1.6, 0, '#e08060');
}
const BOSS_PAL = ['#f2b090', '#bde4ff', '#222222', '#ff8a3a', '#e08060', '#e23a3a', '#c9c9d6', '#8a8a99', '#ffd23a', '#56c8ff', '#ff4b4b', '#ffe36b', '#ffffff', '#7fb8d8', '#5a5a6a'];
function drawGoalSign(ctx, x, y, w, face) {
  const s = Pixel.sprite(`goal:${w}:${face}`, 56, 72, 28, 68, BOSS_PAL.concat(HERO_PAL, ['#ffd23a', '#8d8d9a']), g => {
    g.fillStyle = '#8d8d9a';
    g.fillRect(-2, -30, 4, 30);
    g.fillStyle = '#ffd23a';
    g.fillRect(-w - 2, -64, w * 2 + 4, 36);
    g.fillStyle = '#ffffff';
    g.fillRect(-w, -62, w * 2, 32);
    if (w > 4) {
      g.save();
      g.translate(0, -46);
      g.scale(w / 22, 1);
      if (face === 'hero') {
        g.scale(1.15, 1.15);
        vecHead(g, -3, 1, 'grin');
      } else vecBossFace(g);
      g.restore();
    }
  });
  Pixel.blit(ctx, s, x, y);
}

// ---------- 敵 ----------
const BUG_PAL = ['#2b2b33', '#9b9bab', '#d9262a', '#7a1014', '#111111', '#5b6aa8', '#ffffff', '#ee2222', '#ff7070'];
function drawBug(ctx, x, y, dir, t) {
  const fi = (t >> 3) % 4;
  const s = Pixel.sprite(`bug:${fi}`, 40, 32, 20, 29, BUG_PAL, g => {
    const wa = (fi / 4) * Math.PI * 2;
    ellipse(g, 4, -5, 5, 5, 0, '#2b2b33');
    g.fillStyle = '#9b9bab';
    g.fillRect(4 + Math.cos(wa) * 3 - 1, -5 + Math.sin(wa) * 3 - 1, 2, 2);
    g.fillStyle = '#d9262a';
    g.beginPath();
    g.arc(2, -12, 12, Math.PI, 0);
    g.closePath();
    g.fill();
    g.fillStyle = '#ff7070';
    g.fillRect(-4, -21, 4, 2);
    g.fillStyle = '#7a1014';
    g.fillRect(-10, -13, 24, 2);
    ellipse(g, -2, -17, 2.5, 2.5, 0, '#111111');
    ellipse(g, 7, -17, 2, 2, 0, '#111111');
    ellipse(g, 9, -7, 1.6, 1.6, 0, '#111111');
    ellipse(g, -11, -12, 6, 6, 0, '#5b6aa8');
    ellipse(g, -13, -13, 2.5, 3, 0, '#ffffff');
    ellipse(g, -14, -13, 1, 1.6, 0, '#ee2222');
    g.fillStyle = '#9b9bab';
    g.fillRect(-12, -6, 3, 6);
  });
  Pixel.blit(ctx, s, x, y, dir > 0);
}

const BEE_PAL = ['#dcf0ff', '#ffd23a', '#222222', '#9b9bab', '#6a6aa8', '#ffffff', '#ee2222', '#c48a00'];
function drawBee(ctx, x, y, dir, t) {
  const fi = (t >> 1) % 2;
  const s = Pixel.sprite(`bee:${fi}`, 44, 32, 22, 16, BEE_PAL, g => {
    const flap = fi ? 5 : 2;
    ellipse(g, 2, -7 - flap / 2, 6, flap, -0.3, '#dcf0ff');
    ellipse(g, 7, -6 - flap / 2, 5, flap * 0.8, 0.2, '#dcf0ff');
    ellipse(g, 4, 0, 10, 6, 0, '#ffd23a');
    g.fillStyle = '#c48a00';
    g.fillRect(-4, 3, 16, 2);
    g.fillStyle = '#222222';
    g.fillRect(1, -6, 3, 12);
    g.fillRect(7, -5, 3, 10);
    tri(g, [13, -1], [19, 3], [12, 3], '#9b9bab');
    ellipse(g, -8, -1, 5.5, 5.5, 0, '#6a6aa8');
    ellipse(g, -10, -2, 2.4, 2.8, 0, '#ffffff');
    ellipse(g, -11, -2, 1, 1.5, 0, '#ee2222');
  });
  Pixel.blit(ctx, s, x, y, dir > 0);
}

function drawBossShip(ctx, x, y, dir, frame, flash, state) {
  const fl = state === 'dying' ? 'n' : (frame >> 1) % 2;
  const s = Pixel.sprite(`boss:${fl}:${flash ? 1 : 0}`, 80, 64, 40, 34, BOSS_PAL, g => {
    if (fl !== 'n') {
      const f = fl ? 8 : 5;
      tri(g, [20, 4], [28 + f, 8], [20, 12], '#ff8a3a');
      tri(g, [20, 6], [24 + f * 0.6, 8], [20, 10], '#ffe36b');
    }
    ellipse(g, 0, -14, 10, 10, 0, flash ? '#ffffff' : '#f2b090');
    g.fillStyle = '#222222';
    g.fillRect(-9, -16, 18, 2);
    ellipse(g, -4, -15, 3, 2.2, 0, '#bde4ff');
    ellipse(g, 4, -15, 3, 2.2, 0, '#bde4ff');
    g.fillStyle = '#ff8a3a';
    g.beginPath();
    g.moveTo(-11, -9);
    g.quadraticCurveTo(-4, -13, 0, -10);
    g.quadraticCurveTo(4, -13, 11, -9);
    g.quadraticCurveTo(0, -8, -11, -9);
    g.fill();
    g.fillStyle = flash ? '#ffffff' : '#e23a3a';
    g.fillRect(-10, -6, 20, 6);
    g.fillStyle = flash ? '#ffffff' : '#c9c9d6';
    g.beginPath();
    g.moveTo(-26, -4);
    g.lineTo(26, -4);
    g.quadraticCurveTo(24, 20, 0, 20);
    g.quadraticCurveTo(-24, 20, -26, -4);
    g.fill();
    g.fillStyle = flash ? '#ffffff' : '#8a8a99';
    g.fillRect(-26, -5, 52, 4);
    g.fillRect(-14, 15, 28, 3);
    g.fillStyle = '#ffd23a';
    g.fillRect(-18, 4, 6, 4);
    g.fillStyle = '#56c8ff';
    g.fillRect(-8, 4, 6, 4);
    g.fillStyle = '#ff4b4b';
    g.fillRect(2, 4, 6, 4);
    g.strokeStyle = '#7fb8d8';
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(0, -5, 18, Math.PI, 0);
    g.stroke();
    g.strokeStyle = '#ffffff';
    g.beginPath();
    g.arc(0, -5, 15, Math.PI * 1.15, Math.PI * 1.35);
    g.stroke();
  });
  Pixel.blit(ctx, s, x, y, dir > 0);
}

function drawBomb(ctx, x, y, t) {
  const fi = (t >> 2) % 2;
  const s = Pixel.sprite(`bomb:${fi}`, 18, 22, 9, 12, ['#2b2b33', '#5a5a6a', '#ff4b2b', '#ffd23a'], g => {
    ellipse(g, 0, 0, 6, 6, 0, '#2b2b33');
    g.fillStyle = '#5a5a6a';
    g.fillRect(-3, -4, 2, 2);
    g.fillStyle = fi ? '#ff4b2b' : '#ffd23a';
    g.fillRect(-1, -10, 2, 4);
  });
  Pixel.blit(ctx, s, x, y);
}

const FX_PAL = ['#ffffff', '#ffd23a', '#ff7a2b', '#ffe36b', '#a0a0a8', '#d04020'];
function drawBlast(ctx, x, y, t) {
  const fi = Math.min(12, t >> 1);
  const s = Pixel.sprite(`blast:${fi}`, 48, 48, 24, 24, FX_PAL, g => {
    const r = 6 + fi * 1.6;
    ellipse(g, 0, 0, r, r, 0, fi > 8 ? '#a0a0a8' : '#ff7a2b');
    if (fi < 10) ellipse(g, 0, 0, r * 0.55, r * 0.55, 0, '#ffe36b');
  });
  Pixel.blit(ctx, s, x, y);
}

const EXPLO = [[-4, -3, 0], [5, -6, 2], [-6, 5, 4], [6, 4, 6], [0, 0, 8]];
function drawExplosion(ctx, x, y, t) {
  const s = Pixel.sprite(`explo:${t}`, 48, 52, 24, 28, FX_PAL, g => {
    for (const [dx, dy, d] of EXPLO) {
      const lt = t - d;
      if (lt < 0 || lt > 20) continue;
      const r = 3 + lt * 0.6;
      ellipse(g, dx, dy - lt * 0.3, r, r, 0, lt < 6 ? '#ffffff' : lt < 12 ? '#ffd23a' : '#a0a0a8');
    }
  });
  Pixel.blit(ctx, s, x, y);
}

function drawAnimal(ctx, x, y, kind, t, flip) {
  const fi = kind === 'bird' ? (t >> 2) % 2 : 0;
  const s = Pixel.sprite(`animal:${kind}:${fi}`, 24, 26, 12, 16, ['#4fb3ff', '#2f80d0', '#ffb02e', '#000000', '#ffffff', '#ff8fb0', '#d0d0e0'], g => {
    if (kind === 'bird') {
      ellipse(g, 0, 0, 6, 5, 0, '#4fb3ff');
      tri(g, [-2, -1], [-8, fi ? -8 : 3], [2, -2], '#2f80d0');
      g.fillStyle = '#ffb02e';
      g.fillRect(5, -1, 3, 2);
      g.fillStyle = '#000000';
      g.fillRect(2, -3, 2, 2);
    } else {
      ellipse(g, 0, 0, 6, 5, 0, '#ffffff');
      g.fillStyle = '#ffffff';
      g.fillRect(1, -11, 2, 7);
      g.fillRect(4, -10, 2, 6);
      g.fillStyle = '#ff8fb0';
      g.fillRect(5, -1, 2, 2);
      g.fillStyle = '#000000';
      g.fillRect(3, -3, 2, 2);
    }
  });
  Pixel.blit(ctx, s, x, y, flip);
}

function drawShield(ctx, x, y, frame) {
  const fi = (frame >> 2) % 4;
  const s = Pixel.sprite(`shield:${fi}`, 52, 52, 26, 26, ['#5ac8ff', '#bdf0ff', '#2a7ab0'], g => {
    g.lineWidth = 2;
    g.strokeStyle = '#5ac8ff';
    g.beginPath();
    g.arc(0, 0, 21, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = '#bdf0ff';
    g.beginPath();
    g.arc(0, 0, 21, fi * 1.57, fi * 1.57 + 1.6);
    g.stroke();
    g.fillStyle = '#bdf0ff';
    g.fillRect(-12 + fi * 2, -14, 3, 3);
  }, false);
  ctx.globalAlpha = 0.85;
  Pixel.blit(ctx, s, x, y);
  ctx.globalAlpha = 1;
}

// 小さな四角だけで描くパーティクル
function drawSparkle(ctx, x, y, t) {
  const sz = t < 8 ? t : 16 - t;
  x = Math.round(x);
  y = Math.round(y);
  ctx.fillStyle = '#fffbe0';
  ctx.fillRect(x - sz, y, sz * 2, 1);
  ctx.fillRect(x, y - sz, 1, sz * 2);
  ctx.fillStyle = '#ffd23a';
  ctx.fillRect(x - 1, y - 1, 3, 3);
}
function drawDust(ctx, x, y, t) {
  const r = 1 + (t >> 2);
  ctx.fillStyle = t < 8 ? '#ffffff' : '#c9c9d9';
  ctx.fillRect(Math.round(x - r), Math.round(y - r), r * 2, r * 2);
}

// ---------- 地形 ----------
const CHUNK = 256;
function terrainColors(pal) {
  const C = c => Pixel.rgb(c);
  return {
    gl: C(pal.grassLight),
    g: C(pal.grass),
    gd: C(pal.grassDark),
    edge: C(shade(pal.dirtB, 0.45)),
    a: C(pal.dirtA),
    as: C(shade(pal.dirtA, 0.82)),
    ah: C(shade(pal.dirtA, 1.15)),
    b: C(pal.dirtB),
    bs: C(shade(pal.dirtB, 0.78)),
  };
}

function terrainChunk(level, pal, ci) {
  level.chunks = level.chunks || new Map();
  let c = level.chunks.get(ci);
  if (c) return c;
  const top = Math.floor(level.minY) - 2;
  const bottom = level.maxY + 280;
  const H = bottom - top;
  c = document.createElement('canvas');
  c.width = CHUNK;
  c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(CHUNK, H);
  const d = img.data;
  const T = terrainColors(pal);
  for (let x = 0; x < CHUNK; x++) {
    const wx = ci * CHUNK + x;
    if (wx >= level.w) break;
    const sh = level.h[wx];
    if (sh === Infinity) continue;
    const s = Math.round(sh);
    const zig = Math.abs((wx % 8) - 4) >> 1;
    const gdep = 6 + zig;
    for (let wy = Math.max(s, top); wy < bottom; wy++) {
      const dep = wy - s;
      let col;
      if (dep === 0) col = T.gl;
      else if (dep < 3) col = (wx + dep) % 7 === 0 ? T.gl : T.g;
      else if (dep < gdep) col = (wx + (dep >> 1)) % 3 === 0 ? T.gd : T.g;
      else if (dep < gdep + 2) col = T.edge;
      else {
        const bx = Math.floor(wx / 16);
        const by = Math.floor(wy / 16);
        const lx = ((wx % 16) + 16) % 16;
        const ly = ((wy % 16) + 16) % 16;
        const isA = (bx + by) % 2 === 0;
        if (isA) col = ly === 0 ? T.ah : lx === 4 || lx === 11 ? T.as : T.a;
        else col = lx === 4 || lx === 11 ? T.bs : T.b;
      }
      const i = ((wy - top) * CHUNK + x) * 4;
      d[i] = col[0];
      d[i + 1] = col[1];
      d[i + 2] = col[2];
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  c.top = top;
  level.chunks.set(ci, c);
  return c;
}

function drawTerrain(ctx, level, cam, pal) {
  const c0 = Math.floor(cam.x / CHUNK);
  const c1 = Math.floor((cam.x + VIEW_W) / CHUNK);
  for (let ci = c0; ci <= c1; ci++) {
    if (ci < 0) continue;
    const c = terrainChunk(level, pal, ci);
    ctx.drawImage(c, ci * CHUNK, c.top);
  }
  // 遠く離れたチャンクは捨ててメモリを節約
  if (level.chunks.size > 12) {
    for (const k of level.chunks.keys()) if (k < c0 - 3 || k > c1 + 3) level.chunks.delete(k);
  }
}

function drawBoxes(ctx, level, pal) {
  const T = terrainColors(pal);
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  for (const b of level.boxes) {
    if (b.dead || b.monitor || b.spikes) continue;
    const x = Math.round(b.x);
    const y = Math.round(b.y);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 1, y - 1, b.w + 2, b.h + 1);
    for (let yy = 0; yy < b.h; yy += 16) {
      for (let xx = 0; xx < b.w; xx += 16) {
        const isA = ((xx + yy) / 16) % 2 === 0;
        ctx.fillStyle = css(isA ? T.a : T.b);
        const w = Math.min(16, b.w - xx);
        const h = Math.min(16, b.h - yy);
        ctx.fillRect(x + xx, y + yy, w, h);
        ctx.fillStyle = css(isA ? T.as : T.bs);
        if (w > 4) ctx.fillRect(x + xx + 4, y + yy, 1, h);
        if (w > 11) ctx.fillRect(x + xx + 11, y + yy, 1, h);
        if (isA) {
          ctx.fillStyle = css(T.ah);
          ctx.fillRect(x + xx, y + yy, w, 1);
        }
      }
    }
    ctx.fillStyle = css(T.edge);
    ctx.fillRect(x, y + 6, b.w, 2);
    ctx.fillStyle = css(T.g);
    ctx.fillRect(x, y, b.w, 6);
    ctx.fillStyle = css(T.gd);
    for (let xx = 1; xx < b.w; xx += 3) ctx.fillRect(x + xx, y + 3, 1, 3);
    ctx.fillStyle = css(T.gl);
    ctx.fillRect(x, y, b.w, 1);
  }
}

function drawPlatforms(ctx, level, pal) {
  const T = terrainColors(pal);
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  for (const p of level.platforms) {
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 1, y - 1, p.w + 2, 9);
    ctx.fillRect(x + 7, y + 7, p.w - 14, 13);
    ctx.fillStyle = css(T.b);
    ctx.fillRect(x + 8, y + 7, p.w - 16, 12);
    ctx.fillStyle = css(T.a);
    for (let xx = 8; xx < p.w - 8; xx += 16) ctx.fillRect(x + xx, y + 7, Math.min(8, p.w - 8 - xx), 6);
    ctx.fillStyle = css(T.bs);
    ctx.fillRect(x + 8, y + 17, p.w - 16, 2);
    ctx.fillStyle = css(T.g);
    ctx.fillRect(x, y, p.w, 7);
    ctx.fillStyle = css(T.gd);
    for (let xx = 1; xx < p.w; xx += 3) ctx.fillRect(x + xx, y + 4, 1, 3);
    ctx.fillStyle = css(T.gl);
    ctx.fillRect(x, y, p.w, 1);
  }
}

function drawLoopBack(ctx, lp, pal, palName) {
  const R = lp.r + 26;
  const dark = shade(pal.dirtB, 0.78);
  const s = Pixel.sprite(`loop:${palName}:${lp.r}`, R * 2 + 4, R * 2 + 4, R + 2, R + 2, [pal.dirtA, pal.dirtB, dark, pal.grass, pal.grassLight, pal.grassDark], g => {
    g.strokeStyle = pal.dirtB;
    g.lineWidth = 22;
    g.beginPath();
    g.arc(0, 0, lp.r + 13, 0, Math.PI * 2);
    g.stroke();
    // 市松模様のブロック
    const n = Math.round(((lp.r + 13) * Math.PI * 2) / 16);
    for (let i = 0; i < n; i += 2) {
      g.strokeStyle = pal.dirtA;
      g.lineWidth = 11;
      g.beginPath();
      g.arc(0, 0, lp.r + 8, (i / n) * Math.PI * 2, ((i + 1) / n) * Math.PI * 2);
      g.stroke();
      g.strokeStyle = dark;
      g.beginPath();
      g.arc(0, 0, lp.r + 19, ((i + 1) / n) * Math.PI * 2, ((i + 2) / n) * Math.PI * 2);
      g.stroke();
    }
    g.strokeStyle = pal.grassDark;
    g.lineWidth = 5;
    g.beginPath();
    g.arc(0, 0, lp.r + 2, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = pal.grass;
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(0, 0, lp.r + 1, 0, Math.PI * 2);
    g.stroke();
  });
  Pixel.blit(ctx, s, lp.cx, lp.cy);
}

function drawDeco(ctx, d, frame, pal, palName) {
  if (d.type === 'palm') {
    const fi = (frame >> 4) % 4;
    const s = Pixel.sprite(`palm:${palName}:${fi}`, 64, 86, 32, 80, [pal.grass, pal.grassDark, pal.grassLight, '#9a6a3a', '#6b4626', '#c08850'], g => {
      g.strokeStyle = '#9a6a3a';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(0, 4);
      g.quadraticCurveTo(-6, -30, 2, -62);
      g.stroke();
      g.fillStyle = '#6b4626';
      for (let i = 0; i < 7; i++) g.fillRect(-4 + i * 0.6, -i * 9, 5, 1.5);
      const sway = [0, 1, 0, -1][fi] * 1.5;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        ellipse(g, 2 + Math.cos(a) * 14 + sway, -58 + Math.sin(a) * 6, 16, 4, a, pal.grassDark);
      }
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ellipse(g, 2 + Math.cos(a) * 12 + sway, -60 + Math.sin(a) * 5, 13, 3, a, pal.grass);
      }
      ellipse(g, 0 + sway, -62, 4, 2, 0, pal.grassLight);
    });
    Pixel.blit(ctx, s, d.x, d.y);
  } else if (d.type === 'flower') {
    const fi = (frame >> 4) % 2;
    const s = Pixel.sprite(`flower:${palName}:${fi}`, 20, 30, 10, 26, [pal.grassDark, pal.grass, '#ffe14a', '#ff8fd0', '#9a4a1a', '#c97010'], g => {
      g.fillStyle = pal.grassDark;
      g.fillRect(-1, -16, 2, 16);
      ellipse(g, -3, -6, 3, 1.5, -0.4, pal.grass);
      const petal = fi ? '#ffe14a' : '#ff8fd0';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + fi * 0.5;
        ellipse(g, Math.cos(a) * 4, -19 + Math.sin(a) * 4, 2.6, 2.6, 0, petal);
      }
      ellipse(g, 0, -19, 2.5, 2.5, 0, '#9a4a1a');
    });
    Pixel.blit(ctx, s, d.x, d.y);
  }
}

// ---------- 背景（パララックス） ----------
const BG = {};
function buildBackground(palName) {
  if (BG[palName]) return BG[palName];
  const pal = PALETTES[palName];
  const mk = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  };
  const farShade = shade(pal.far, 0.8);
  const ridge = x => 50 + Math.sin((x / 512) * Math.PI * 4) * 20 + Math.sin((x / 512) * Math.PI * 10) * 7;
  const far = mk(512, 110);
  let g = far.getContext('2d');
  g.fillStyle = pal.far;
  g.beginPath();
  g.moveTo(0, 110);
  for (let x = 0; x <= 512; x += 2) g.lineTo(x, ridge(x));
  g.lineTo(512, 110);
  g.fill();
  // 山肌の影は横じまで表現
  g.fillStyle = farShade;
  for (let x = 0; x < 512; x += 2) {
    const r = ridge(x);
    for (let y = Math.ceil((r + 14) / 6) * 6; y < 110; y += 6) g.fillRect(x, y, 2, 2);
  }
  g.fillStyle = pal.farTop;
  for (let x = 0; x < 512; x += 2) g.fillRect(x, ridge(x), 2, 2);
  Pixel.crispify(far, [pal.far, farShade, pal.farTop], null);

  const mid = mk(640, 90);
  g = mid.getContext('2d');
  const midShade = shade(pal.mid, 0.82);
  for (let i = 0; i < 6; i++) {
    const cx = i * 110 + 40;
    const r = 50 + (i % 3) * 14;
    const h = 60 + (i % 2) * 12;
    ellipse(g, cx, 90, r, h, 0, pal.mid);
    g.save();
    g.beginPath();
    g.ellipse(cx, 90, r, h, 0, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = pal.midTop;
    g.fillRect(cx - r, 0, r * 0.7, 90);
    g.fillStyle = midShade;
    for (let yy = 30; yy < 90; yy += 10) g.fillRect(cx - r, yy, r * 2, 3);
    g.restore();
  }
  Pixel.crispify(mid, [pal.mid, pal.midTop, midShade], shade(pal.mid, 0.55));

  const clouds = mk(600, 70);
  g = clouds.getContext('2d');
  const cloudShade = shade(pal.cloud, 0.85);
  const puff = (x, y, s) => {
    for (const [dx, dy, rx, ry, col] of [[0, 2, 22, 7, cloudShade], [0, 0, 20, 8, pal.cloud], [14, -5, 14, 9, pal.cloud], [-12, -2, 12, 7, pal.cloud]]) {
      ellipse(g, x + dx * s, y + dy * s, rx * s, ry * s, 0, col);
    }
  };
  puff(60, 30, 1);
  puff(230, 50, 0.7);
  puff(380, 22, 1.2);
  puff(520, 46, 0.8);
  Pixel.crispify(clouds, [pal.cloud, cloudShade], null);

  // 空は帯状のグラデーション
  const bands = [];
  const stops = pal.sky.map(c => Pixel.rgb(c));
  const N = 9;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const seg = t < 0.5 ? 0 : 1;
    const lt = seg === 0 ? t / 0.5 : (t - 0.5) / 0.5;
    const a = stops[seg];
    const b = stops[seg + 1];
    bands.push(mdColor(a[0] + (b[0] - a[0]) * lt, a[1] + (b[1] - a[1]) * lt, a[2] + (b[2] - a[2]) * lt));
  }
  BG[palName] = { far, mid, clouds, bands };
  return BG[palName];
}

function drawBackground(ctx, cam, palName, frame, level) {
  const pal = PALETTES[palName];
  const bg = buildBackground(palName);
  const vy = Math.round((cam.y - (level.maxY - 300)) * 0.05);
  const waterY = Math.round(140 - vy * 1.2);
  const bh = Math.ceil(waterY / bg.bands.length) + 1;
  for (let i = 0; i < bg.bands.length; i++) {
    ctx.fillStyle = bg.bands[i];
    ctx.fillRect(0, i * bh - 1, VIEW_W, bh + 1);
  }
  if (pal.sun) {
    const s = Pixel.sprite(`sun:${palName}`, 80, 80, 40, 40, [pal.sun, shade(pal.sun, 0.9)], g => {
      ellipse(g, 0, 0, 26, 26, 0, pal.sun);
      g.fillStyle = shade(pal.sun, 0.9);
      for (let y = 6; y < 26; y += 6) g.fillRect(-30, y, 60, 2);
    }, null);
    Pixel.blit(ctx, s, 240, 112 - vy);
  }
  const tile = (img, speed, y, drift) => {
    const w = img.width;
    const ox = -(((Math.floor(cam.x * speed + (drift || 0)) % w) + w) % w);
    for (let x = ox; x < VIEW_W; x += w) ctx.drawImage(img, x, Math.round(y));
  };
  tile(bg.clouds, 0.05, 6 - vy * 0.5, Math.floor(frame * 0.15));
  tile(bg.far, 0.1, waterY - 100);
  // 水面：行ごとに違う速さでスクロールする
  ctx.fillStyle = pal.water;
  ctx.fillRect(0, waterY, VIEW_W, VIEW_H - waterY);
  const cyc = (frame >> 3) % 3;
  for (let i = 0; i < 9; i++) {
    const yy = waterY + 2 + i * 8;
    const off = Math.floor(frame * (0.2 + i * 0.1) + cam.x * (0.15 + i * 0.06)) % 48;
    ctx.fillStyle = (i + cyc) % 3 === 0 ? '#ffffff' : pal.waterLine;
    for (let x = -off; x < VIEW_W; x += 48) ctx.fillRect(x + (i % 2) * 18, yy, 16 - i, 1);
  }
  tile(bg.mid, 0.3, waterY - 60);
}

// ---------- HUD ----------
const HUD_YELLOW = '#ffe000';
function drawHUD(ctx, game) {
  const flash = (game.frame >> 3) % 2 === 0;
  Text.draw(ctx, 'SCORE', 16, 9, HUD_YELLOW);
  Text.draw(ctx, String(game.score), 112, 9, '#ffffff', { align: 'right' });
  const t = Math.floor(game.time / 60);
  Text.draw(ctx, 'TIME', 16, 21, game.time > 9 * 3600 && flash ? '#ff3030' : HUD_YELLOW);
  Text.draw(ctx, `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, 112, 21, '#ffffff', { align: 'right' });
  Text.draw(ctx, 'RINGS', 16, 33, game.rings === 0 && flash ? '#ff3030' : HUD_YELLOW);
  Text.draw(ctx, String(game.rings), 112, 33, '#ffffff', { align: 'right' });

  Pixel.blit(ctx, heroHeadSprite(0.6, 'grin'), 22, VIEW_H - 16);
  Text.draw(ctx, 'NISE', 36, VIEW_H - 23, HUD_YELLOW);
  Text.draw(ctx, '×' + game.lives, 36, VIEW_H - 13, '#ffffff');

  if (game.player && game.player.shoes > 0) Text.draw(ctx, 'SPEED UP', VIEW_W - 8, 9, '#ff9a1e', { align: 'right' });
  if (game.player && game.player.invincible > 0) Text.draw(ctx, 'STAR', VIEW_W - 8, 21, '#ffe36b', { align: 'right' });
  if (game.paused) {
    ctx.fillStyle = 'rgba(0,0,30,0.5)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    Text.draw(ctx, 'PAUSE', VIEW_W / 2, VIEW_H / 2 - 7, '#ffffff', { align: 'center', scale: 2 });
  }
}
